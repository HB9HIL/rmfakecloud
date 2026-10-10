package exporter

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strconv"

	"github.com/ddvk/rmfakecloud/internal/archive"
	"github.com/ddvk/rmfakecloud/internal/encoding/rm"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// page size in points for notebooks without a background PDF
const notebookWidth, notebookHeight = 445.0, 594.0

// shader tool of newer firmware, not defined in the rm package
const shader rm.BrushType = 23

// stroke colors as RGB, values from rmscene/rmc
var brushColors = map[rm.BrushColor][3]float64{
	rm.Black:            {0, 0, 0},
	rm.Grey:             {0.565, 0.565, 0.565},
	rm.White:            {1, 1, 1},
	rm.HighlightYellow:  {0.984, 0.969, 0.098},
	rm.HighlightGreen:   {0, 1, 0},
	rm.HighlightPink:    {1, 0.753, 0.796},
	rm.Blue:             {0.306, 0.412, 0.788},
	rm.Red:              {0.702, 0.243, 0.224},
	rm.GreyOverlap:      {0.490, 0.490, 0.490},
	rm.HighlightDynamic: {0.984, 0.969, 0.098},
	rm.Green2:           {0.631, 0.847, 0.490},
	rm.Cyan:             {0.545, 0.816, 0.898},
	rm.Magenta:          {0.718, 0.510, 0.804},
	rm.Yellow2:          {0.969, 0.910, 0.318},
}

func init() {
	model.ConfigPath = "disable"
}

// RenderPDF renders all pages of an archive to PDF.
// If the archive has a background PDF, the annotations are stamped onto its pages.
func RenderPDF(a *MyArchive, w io.Writer) (err error) {
	// a broken document must not take down the server
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("pdf export failed: %v", r)
		}
	}()

	if len(a.Pages) == 0 {
		if a.PayloadReader != nil {
			_, err := io.Copy(w, a.PayloadReader)
			return err
		}
		return errors.New("the document has no pages")
	}

	if a.PayloadReader == nil {
		return writePDF(w, annotationPages(a.Pages, nil))
	}

	ctx := context.Background()
	conf := model.NewDefaultConfiguration()
	background, err := arrangeBackground(ctx, a.PayloadReader, a.Pages, conf)
	if err != nil {
		return fmt.Errorf("can't read background pdf: %w", err)
	}
	dims, err := api.PageDims(ctx, background, conf)
	if err != nil {
		return fmt.Errorf("can't read background pdf: %w", err)
	}

	var annotations bytes.Buffer
	if err := writePDF(&annotations, annotationPages(a.Pages, dims)); err != nil {
		return err
	}
	wm, err := api.PDFMultiWatermarkForReadSeeker(ctx, bytes.NewReader(annotations.Bytes()), 1, 1,
		"scalefactor:1 abs, pos:bl, rot:0", true, false, types.POINTS)
	if err != nil {
		return err
	}
	if _, err := background.Seek(0, io.SeekStart); err != nil {
		return err
	}
	return api.AddWatermarks(ctx, background, w, nil, wm, conf)
}

// arrangeBackground returns the background PDF with its pages in the order of the archive pages.
// Pages deleted on the tablet are dropped, inserted notebook pages get a blank page.
func arrangeBackground(ctx context.Context, bg io.ReadSeeker, pages []archive.Page, conf *model.Configuration) (io.ReadSeeker, error) {
	count, err := api.PageCount(ctx, bg, conf)
	if err != nil {
		return nil, err
	}

	// a blank page is appended after the last page if needed
	blank := count + 1
	order := make([]string, len(pages))
	arranged := len(pages) != count
	needsBlank := false
	for i, p := range pages {
		page := p.DocPage + 1
		if p.DocPage < 0 || p.DocPage >= count {
			page, needsBlank = blank, true
		}
		arranged = arranged || page != i+1
		order[i] = strconv.Itoa(page)
	}

	if _, err := bg.Seek(0, io.SeekStart); err != nil {
		return nil, err
	}
	if !arranged {
		return bg, nil
	}

	if needsBlank {
		var buf bytes.Buffer
		if err := api.InsertPages(ctx, bg, &buf, []string{strconv.Itoa(count)}, false, nil, conf); err != nil {
			return nil, err
		}
		bg = bytes.NewReader(buf.Bytes())
	}
	var out bytes.Buffer
	if err := api.Collect(ctx, bg, &out, order, conf); err != nil {
		return nil, err
	}
	return bytes.NewReader(out.Bytes()), nil
}

// annotationPages draws the strokes of each page onto a page of the matching background size
func annotationPages(pages []archive.Page, dims []types.Dim) []pdfPage {
	result := make([]pdfPage, len(pages))
	for i, p := range pages {
		width, height := notebookWidth, notebookHeight
		if i < len(dims) {
			width, height = dims[i].Width, dims[i].Height
		}

		scale := height / float64(rm.Height)
		if height/width < 1.33 {
			scale = width / float64(rm.Width)
		}
		xShift := 0.0
		// v6 strokes on a PDF page are in device pixels (226 dpi) with x=Width/2 at the page center
		if i < len(dims) && p.DocPage >= 0 && p.Data != nil && p.Data.Version == rm.V6 {
			scale = 72.0 / 226.0
			xShift = width/2 - float64(rm.Width)/2*scale
		}

		// notebook pages can be extended downwards beyond the screen height
		if i >= len(dims) && p.Data != nil {
			for _, layer := range p.Data.Layers {
				for _, line := range layer.Lines {
					for _, pt := range line.Points {
						height = max(height, float64(pt.Y+pt.Width)*scale)
					}
				}
			}
		}

		var content []byte
		if p.Data != nil {
			content = drawStrokes(p.Data, scale, xShift, height)
		}
		result[i] = pdfPage{width: width, height: height, content: content}
	}
	return result
}

// drawStrokes returns a content stream with all strokes of a page.
// Pen strokes are drawn segment by segment with the width of each point, round caps join them smoothly.
// Highlighter and shader strokes are drawn as one semi-transparent path, so overlapping segments don't add up.
func drawStrokes(page *rm.Rm, scale, xShift, height float64) []byte {
	var b bytes.Buffer
	b.WriteString("1 J 1 j\n")
	for _, layer := range page.Layers {
		for _, line := range layer.Lines {
			if len(line.Points) == 0 || line.BrushType == rm.Eraser || line.BrushType == rm.EraseArea {
				continue
			}

			color := brushColors[line.BrushColor]
			transparent := line.BrushType == rm.Highlighter || line.BrushType == rm.HighlighterV5 || line.BrushType == shader
			if transparent && (line.BrushColor == rm.Black || line.BrushColor == rm.Grey || line.BrushColor == rm.White) {
				color = brushColors[rm.HighlightYellow]
			}
			fmt.Fprintf(&b, "q %.3f %.3f %.3f RG\n", color[0], color[1], color[2])

			if transparent {
				var width float64
				for _, p := range line.Points {
					width += float64(p.Width)
				}
				fmt.Fprintf(&b, "/GSH gs %.2f w", width/float64(len(line.Points))*scale)
				for i, p := range line.Points {
					op := "l"
					if i == 0 {
						op = "m"
					}
					fmt.Fprintf(&b, " %.2f %.2f %s", float64(p.X)*scale+xShift, height-float64(p.Y)*scale, op)
				}
				b.WriteString(" S\nQ\n")
				continue
			}

			prev := line.Points[0]
			for _, p := range line.Points {
				fmt.Fprintf(&b, "%.2f w %.2f %.2f m %.2f %.2f l S\n", float64(p.Width)*scale,
					float64(prev.X)*scale+xShift, height-float64(prev.Y)*scale,
					float64(p.X)*scale+xShift, height-float64(p.Y)*scale)
				prev = p
			}
			b.WriteString("Q\n")
		}
	}
	return b.Bytes()
}
