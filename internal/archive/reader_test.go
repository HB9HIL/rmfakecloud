package archive

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"os"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/encoding/rm"
)

func docPages(z *Zip) []int {
	var result []int
	for _, p := range z.Pages {
		result = append(result, p.DocPage)
	}
	return result
}

func equal(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestInitPages(t *testing.T) {
	for _, tc := range []struct {
		name    string
		content Content
		want    []int
	}{
		{
			name:    "pageCount only",
			content: Content{PageCount: 3},
			want:    []int{0, 1, 2},
		},
		{
			name:    "pages",
			content: Content{Pages: []string{"a", "b"}},
			want:    []int{0, 1},
		},
		{
			// a page inserted on the tablet maps to -1
			name:    "redirectionPageMap",
			content: Content{Pages: []string{"a", "b", "c"}, RedirectionMap: []int{1, -1, 0}},
			want:    []int{1, -1, 0},
		},
		{
			// sorted by idx, deleted pages dropped, pages without redir have no background page
			name: "cPages",
			content: Content{CPagesData: &CPages{Pages: []CPageEntry{
				{ID: "c", Idx: CPageStringValue{Value: "bc"}, Redir: &CPageNumberValue{Value: 2}},
				{ID: "a", Idx: CPageStringValue{Value: "ba"}, Redir: &CPageNumberValue{Value: 0}},
				{ID: "d", Idx: CPageStringValue{Value: "bb"}, Deleted: &CPageNumberValue{Value: 1}},
				{ID: "n", Idx: CPageStringValue{Value: "bd"}},
			}}},
			want: []int{0, 2, -1},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			z := &Zip{Content: tc.content}
			z.InitPages()
			if got := docPages(z); !equal(got, tc.want) {
				t.Errorf("doc pages %v, want %v", got, tc.want)
			}
		})
	}
}

func TestReadV6Archive(t *testing.T) {
	const doc = "8b1c4d1e-3f6a-4c2b-9d5e-7a8b9c0d1e2f"
	const page1, page2 = "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"

	strokes, err := os.ReadFile("../encoding/rm/testdata/Normal_A_stroke_2_layers.rm")
	if err != nil {
		t.Fatal(err)
	}
	content, err := json.Marshal(Content{
		FileType: "notebook",
		CPagesData: &CPages{Pages: []CPageEntry{
			{ID: page2, Idx: CPageStringValue{Value: "bb"}},
			{ID: page1, Idx: CPageStringValue{Value: "ba"}},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for name, data := range map[string][]byte{
		doc + ".content":                     content,
		doc + ".pagedata":                    []byte("Blank\nBlank\n"),
		doc + "/" + page2 + ".rm":            strokes,
		doc + "/" + page1 + "-metadata.json": []byte(`{"layers":[{"name":"Layer 1"}]}`),
	} {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write(data); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	z := NewZip()
	if err := z.Read(bytes.NewReader(buf.Bytes()), int64(buf.Len())); err != nil {
		t.Fatal(err)
	}
	if z.UUID != doc {
		t.Errorf("uuid %q, want %q", z.UUID, doc)
	}
	if len(z.Pages) != 2 {
		t.Fatalf("%d pages, want 2", len(z.Pages))
	}
	if z.Pages[0].Data != nil {
		t.Error("page 1 has strokes, it has no .rm file")
	}
	if len(z.Pages[0].Metadata.Layers) != 1 {
		t.Error("metadata of page 1 not read")
	}
	if z.Pages[1].Data == nil || z.Pages[1].Data.Version != rm.V6 {
		t.Fatal("strokes of page 2 not read as v6")
	}
	if z.Pages[1].Pagedata != "Blank" {
		t.Errorf("pagedata %q, want Blank", z.Pages[1].Pagedata)
	}
}
