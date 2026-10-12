package fs

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/config"
)

func TestOCRDocument(t *testing.T) {
	const uid = "test"
	tests := []struct {
		name    string
		respond func(fs *FileSystemStorage, docID string, w http.ResponseWriter)
		wantErr error
		want    string
	}{
		{"text layer added", func(_ *FileSystemStorage, _ string, w http.ResponseWriter) {
			io.WriteString(w, "%PDF-ocr")
		}, nil, "%PDF-ocr"},
		{"has text already", func(_ *FileSystemStorage, _ string, w http.ResponseWriter) {
			w.WriteHeader(http.StatusNoContent)
		}, errOCRUnchanged, "%PDF-scan"},
		{"deleted while running", func(fs *FileSystemStorage, docID string, w http.ResponseWriter) {
			if err := fs.DeleteBlobDocument(uid, docID); err != nil {
				t.Fatal(err)
			}
			io.WriteString(w, "%PDF-ocr")
		}, errOCRUnchanged, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// no OCRURL yet, the worker must not pick up the upload
			fs := NewStorage(&config.Config{DataDir: t.TempDir()})
			if err := os.MkdirAll(fs.getUserBlobPath(uid), 0700); err != nil {
				t.Fatal(err)
			}
			doc, err := fs.CreateBlobDocument(uid, "scan.pdf", "", strings.NewReader("%PDF-scan"))
			if err != nil {
				t.Fatal(err)
			}
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if b, _ := io.ReadAll(r.Body); r.URL.Path != "/ocr" || string(b) != "%PDF-scan" {
					t.Errorf("got %s %q", r.URL.Path, b)
				}
				tt.respond(fs, doc.ID, w)
			}))
			defer srv.Close()
			fs.Cfg.OCRURL = srv.URL

			if err := fs.ocrDocument(uid, doc.ID); !errors.Is(err, tt.wantErr) {
				t.Fatalf("got error %v, want %v", err, tt.wantErr)
			}
			if tt.want == "" {
				return
			}
			r, err := fs.Export(uid, doc.ID)
			if err != nil {
				t.Fatal(err)
			}
			defer r.Close()
			if b, _ := io.ReadAll(r); string(b) != tt.want {
				t.Errorf("exported %q, want %q", b, tt.want)
			}
		})
	}
}
