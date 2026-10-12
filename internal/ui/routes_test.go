package ui

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/ddvk/rmfakecloud/internal/config"
	"github.com/gin-gonic/gin"
)

func TestStaticFiles(t *testing.T) {
	files := fstest.MapFS{
		"index.html":      {Data: []byte("<!doctype html>")},
		"sw.js":           {Data: []byte("//")},
		"manifest.json":   {Data: []byte("{}")},
		"assets/app-1.js": {Data: []byte("//")},
	}
	app := &ReactAppWrapper{fs: http.FS(files), prefix: "/assets", cfg: &config.Config{}}
	gin.SetMode(gin.TestMode)
	r := gin.New()
	app.RegisterRoutes(r)

	tests := []struct {
		path, contentType, cacheControl string
		status                          int
	}{
		{"/sw.js", "text/javascript; charset=utf-8", "no-cache", http.StatusOK},
		{"/manifest.json", "application/json", "no-cache", http.StatusOK},
		{"/assets/app-1.js", "text/javascript; charset=utf-8", "public, max-age=31536000, immutable", http.StatusOK},
		{"/documents/x", "text/html; charset=utf-8", "no-cache", http.StatusOK},
		{"/assets/missing.js", "", "", http.StatusNotFound},
	}
	for _, tt := range tests {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tt.path, nil))
		if w.Code != tt.status {
			t.Errorf("%s: status %d, want %d", tt.path, w.Code, tt.status)
		}
		if got := w.Header().Get("Cache-Control"); got != tt.cacheControl {
			t.Errorf("%s: Cache-Control %q, want %q", tt.path, got, tt.cacheControl)
		}
		if tt.status != http.StatusOK {
			continue
		}
		if got := w.Header().Get("Content-Type"); got != tt.contentType {
			t.Errorf("%s: Content-Type %q, want %q", tt.path, got, tt.contentType)
		}
	}
}
