package exporter

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/archive"
	"github.com/ddvk/rmfakecloud/internal/encoding/rm"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

func loadRm(t *testing.T, name string) *rm.Rm {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../../encoding/rm/testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	page := rm.New()
	if err := page.UnmarshalBinary(b); err != nil {
		t.Fatal(err)
	}
	return page
}

// validPDF checks the PDF and returns its page sizes
func validPDF(t *testing.T, b []byte) [][2]float64 {
	t.Helper()
	ctx := context.Background()
	conf := model.NewDefaultConfiguration()
	if err := api.Validate(ctx, bytes.NewReader(b), conf, nil); err != nil {
		t.Fatalf("invalid pdf: %v", err)
	}
	dims, err := api.PageDims(ctx, bytes.NewReader(b), conf)
	if err != nil {
		t.Fatal(err)
	}
	var sizes [][2]float64
	for _, d := range dims {
		sizes = append(sizes, [2]float64{d.Width, d.Height})
	}
	return sizes
}

func TestRenderNotebook(t *testing.T) {
	a := &MyArchive{Zip: archive.Zip{Pages: []archive.Page{
		{Data: loadRm(t, "test_v5.rm")},
		{Data: loadRm(t, "Color_and_tool_v3.14.4.rm")},
		{}, // blank page
	}}}
	var out bytes.Buffer
	if err := RenderPDF(a, &out); err != nil {
		t.Fatal(err)
	}
	sizes := validPDF(t, out.Bytes())
	if len(sizes) != 3 {
		t.Fatalf("%d pages, want 3", len(sizes))
	}
	if sizes[2] != [2]float64{notebookWidth, notebookHeight} {
		t.Errorf("blank page size %v", sizes[2])
	}
}

// the background pages are reordered like the archive pages, pages inserted on the tablet get a blank page
func TestRenderAnnotatedPDF(t *testing.T) {
	var bg bytes.Buffer
	if err := writePDF(&bg, []pdfPage{{width: 100, height: 100}, {width: 200, height: 200}, {width: 300, height: 300}}); err != nil {
		t.Fatal(err)
	}
	a := &MyArchive{
		Zip: archive.Zip{Pages: []archive.Page{
			{DocPage: 2, Data: loadRm(t, "Wikipedia_highlighted_p1.rm")},
			{DocPage: 0},
			{DocPage: -1, Data: loadRm(t, "Normal_A_stroke_2_layers.rm")},
		}},
		PayloadReader: NewSeekCloser(bg.Bytes()),
	}
	var out bytes.Buffer
	if err := RenderPDF(a, &out); err != nil {
		t.Fatal(err)
	}
	sizes := validPDF(t, out.Bytes())
	if len(sizes) != 3 {
		t.Fatalf("%d pages, want 3", len(sizes))
	}
	if sizes[0][0] != 300 || sizes[1][0] != 100 {
		t.Errorf("page sizes %v, want 300 then 100", sizes)
	}
}

// rawPDF builds a PDF from numbered objects, the first one is the catalog
func rawPDF(objs ...string) []byte {
	var b bytes.Buffer
	b.WriteString("%PDF-1.7\n")
	offsets := make([]int, len(objs))
	for i, o := range objs {
		offsets[i] = b.Len()
		fmt.Fprintf(&b, "%d 0 obj\n%s\nendobj\n", i+1, o)
	}
	xref := b.Len()
	fmt.Fprintf(&b, "xref\n0 %d\n0000000000 65535 f \n", len(objs)+1)
	for _, o := range offsets {
		fmt.Fprintf(&b, "%010d 00000 n \n", o)
	}
	fmt.Fprintf(&b, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objs)+1, xref)
	return b.Bytes()
}

func stream(dict, data string) string {
	return fmt.Sprintf("<< %s /Length %d >>\nstream\n%s\nendstream", dict, len(data), data)
}

func TestFlattenForms(t *testing.T) {
	in := rawPDF(
		"<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [4 0 R] >> >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 7 0 R /Annots [4 0 R 6 0 R] >>",
		"<< /Type /Annot /Subtype /Widget /FT /Tx /T (field) /DA (/Helv 0 Tf 0 g) /Rect [10 10 110 30] /AP << /N 5 0 R >> >>",
		stream("/Type /XObject /Subtype /Form /BBox [0 0 100 20]", "0 0 1 rg 0 0 100 20 re f"),
		"<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] >>",
		stream("", "0 g 50 50 20 20 re f"),
	)

	ctx := context.Background()
	conf := model.NewDefaultConfiguration()
	out, err := flattenForms(ctx, bytes.NewReader(in), conf)
	if err != nil {
		t.Fatal(err)
	}
	pdf, err := api.ReadAndValidate(ctx, out, conf)
	if err != nil {
		t.Fatal(err)
	}

	catalog, err := pdf.Catalog()
	if err != nil {
		t.Fatal(err)
	}
	if _, found := catalog.Find("AcroForm"); found {
		t.Error("AcroForm still present")
	}
	page, _, _, err := pdf.PageDict(ctx, 1, false)
	if err != nil {
		t.Fatal(err)
	}
	annots, err := pdf.DereferenceArray(page["Annots"])
	if err != nil {
		t.Fatal(err)
	}
	if len(annots) != 1 {
		t.Errorf("%d annotations, want only the link", len(annots))
	}
	content, err := pdf.PageContent(page, 1)
	if err != nil {
		t.Fatal(err)
	}
	// the 100x20 appearance is drawn at the widget rect
	if want := "q 1.0000 0 0 1.0000 10.0000 10.0000 cm /RMFlat1_0 Do Q"; !strings.Contains(string(content), want) {
		t.Errorf("content %q does not draw the widget appearance", content)
	}
}

// PDFs without a form are passed through unchanged
func TestFlattenFormsWithoutForm(t *testing.T) {
	var in bytes.Buffer
	if err := writePDF(&in, []pdfPage{{width: 100, height: 100}}); err != nil {
		t.Fatal(err)
	}
	out, err := flattenForms(context.Background(), bytes.NewReader(in.Bytes()), model.NewDefaultConfiguration())
	if err != nil {
		t.Fatal(err)
	}
	var got bytes.Buffer
	if _, err := got.ReadFrom(out); err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got.Bytes(), in.Bytes()) {
		t.Error("pdf without form was changed")
	}
}

func TestDrawStrokes(t *testing.T) {
	points := []rm.Point{{X: 0, Y: 0, Width: 2}, {X: 10, Y: 10, Width: 2}}
	page := &rm.Rm{Layers: []rm.Layer{{Lines: []rm.Line{
		{BrushType: rm.BallPointV5, BrushColor: rm.Blue, Points: points},
		{BrushType: rm.HighlighterV5, BrushColor: rm.Black, Points: points},
		{BrushType: rm.Eraser, BrushColor: rm.Red, Points: points},
	}}}}
	content := string(drawStrokes(page, 1, 0, 100))

	if !strings.Contains(content, "0.306 0.412 0.788 RG") {
		t.Error("blue stroke not drawn in blue")
	}
	// a black highlighter is drawn yellow and semi-transparent
	if !strings.Contains(content, "0.984 0.969 0.098 RG\n/GSH gs") {
		t.Error("highlighter not drawn yellow with transparency")
	}
	if strings.Contains(content, "0.702 0.243 0.224 RG") {
		t.Error("eraser stroke drawn")
	}
}

func TestDrawTextHighlights(t *testing.T) {
	page := &rm.Rm{Highlights: []rm.Highlight{
		{Color: rm.HighlightGreen, Rects: []rm.HighlightRect{{X: 10, Y: 20, W: 30, H: 5}}},
		{Color: rm.HighlightDynamic, ColorRGBA: &[4]uint8{255, 0, 0, 255}, Rects: []rm.HighlightRect{{X: 0, Y: 0, W: 1, H: 1}}},
	}}
	content := string(drawStrokes(page, 1, 0, 100))

	// box from the top left corner, PDF y grows upwards
	if !strings.Contains(content, "0.000 1.000 0.000 rg /GSH gs 10.00 75.00 30.00 5.00 re f") {
		t.Errorf("green highlight box missing:\n%s", content)
	}
	if !strings.Contains(content, "1.000 0.000 0.000 rg") {
		t.Error("RGBA highlight color ignored")
	}
}
