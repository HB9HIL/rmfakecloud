package config

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func clientIP(t *testing.T, trust, remoteAddr, xff string) string {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()
	if err := r.SetTrustedProxies(parseTrustedProxies(trust)); err != nil {
		t.Fatal(err)
	}
	var ip string
	r.GET("/", func(c *gin.Context) { ip = c.ClientIP() })
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = remoteAddr
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	r.ServeHTTP(httptest.NewRecorder(), req)
	return ip
}

func TestTrustedProxies(t *testing.T) {
	tests := []struct {
		name, trust, remote, xff, want string
	}{
		{"off ignores the header", "", "203.0.113.9:1234", "1.2.3.4", "203.0.113.9"},
		{"false ignores the header", "false", "127.0.0.1:1234", "1.2.3.4", "127.0.0.1"},
		{"proxy on loopback", "1", "127.0.0.1:1234", "198.51.100.7", "198.51.100.7"},
		{"spoofed entry is skipped", "1", "172.18.0.2:1234", "1.2.3.4, 198.51.100.7", "198.51.100.7"},
		{"public peer is not a proxy", "1", "203.0.113.9:1234", "1.2.3.4", "203.0.113.9"},
		{"cidr list", "203.0.113.0/24, 10.0.0.1", "203.0.113.9:1234", "1.2.3.4, 198.51.100.7", "198.51.100.7"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := clientIP(t, tt.trust, tt.remote, tt.xff); got != tt.want {
				t.Errorf("got %s, want %s", got, tt.want)
			}
		})
	}
}
