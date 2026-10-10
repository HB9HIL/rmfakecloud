package exporter

import (
	"bytes"
	"compress/zlib"
	"fmt"
	"io"
	"strings"
)

// pdfPage is a single page with its size in points and its content stream
type pdfPage struct {
	width, height float64
	content       []byte
}

// writePDF writes a minimal PDF containing the given pages.
// All pages share the graphics state /GSH, used for semi-transparent highlighter strokes.
func writePDF(w io.Writer, pages []pdfPage) error {
	var buf bytes.Buffer
	var offsets []int
	obj := func(header string, stream []byte) {
		offsets = append(offsets, buf.Len())
		fmt.Fprintf(&buf, "%d 0 obj\n%s\n", len(offsets), header)
		if stream != nil {
			buf.WriteString("stream\n")
			buf.Write(stream)
			buf.WriteString("\nendstream\n")
		}
		buf.WriteString("endobj\n")
	}

	// objects: 1 catalog, 2 page tree, 3 graphics states, then page and content per page
	kids := make([]string, len(pages))
	for i := range pages {
		kids[i] = fmt.Sprintf("%d 0 R", 4+2*i)
	}

	buf.WriteString("%PDF-1.4\n")
	obj("<< /Type /Catalog /Pages 2 0 R >>", nil)
	obj(fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>", strings.Join(kids, " "), len(pages)), nil)
	obj("<< /GSH << /CA 0.4 /ca 0.4 >> >>", nil)
	for i, p := range pages {
		var z bytes.Buffer
		zw := zlib.NewWriter(&z)
		if _, err := zw.Write(p.content); err != nil {
			return err
		}
		if err := zw.Close(); err != nil {
			return err
		}
		obj(fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Resources << /ExtGState 3 0 R >> /Contents %d 0 R >>",
			p.width, p.height, 5+2*i), nil)
		obj(fmt.Sprintf("<< /Length %d /Filter /FlateDecode >>", z.Len()), z.Bytes())
	}

	xref := buf.Len()
	fmt.Fprintf(&buf, "xref\n0 %d\n0000000000 65535 f \n", len(offsets)+1)
	for _, o := range offsets {
		fmt.Fprintf(&buf, "%010d 00000 n \n", o)
	}
	fmt.Fprintf(&buf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(offsets)+1, xref)

	_, err := w.Write(buf.Bytes())
	return err
}
