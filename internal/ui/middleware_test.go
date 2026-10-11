package ui

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ddvk/rmfakecloud/internal/common"
	"github.com/ddvk/rmfakecloud/internal/config"
	"github.com/ddvk/rmfakecloud/internal/model"
	"github.com/ddvk/rmfakecloud/internal/storage/fs"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

func TestAuthMiddlewareUsesProfile(t *testing.T) {
	cfg := &config.Config{DataDir: t.TempDir(), JWTSecretKey: []byte("key")}
	storage := fs.NewStorage(cfg)
	app := &ReactAppWrapper{cfg: cfg, userStorer: storage}

	user, err := model.NewUser("alice", "old")
	if err != nil {
		t.Fatal(err)
	}
	if err := storage.RegisterUser(user); err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	auth := r.Group("", app.authMiddleware())
	auth.GET("/user", func(c *gin.Context) { c.Status(http.StatusOK) })
	auth.GET("/admin", app.adminMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })

	token := func(issued time.Time) string {
		s, err := common.SignClaims(&WebUserClaims{
			UserID: "alice",
			Roles:  []string{AdminRole},
			RegisteredClaims: jwt.RegisteredClaims{
				IssuedAt:  jwt.NewNumericDate(issued),
				ExpiresAt: jwt.NewNumericDate(issued.Add(time.Hour)),
				Audience:  []string{WebUsage},
			},
		}, cfg.JWTSecretKey)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	status := func(path, tok string) int {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+tok)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Code
	}

	old := token(time.Now().Add(-time.Minute))
	if got := status("/user", old); got != http.StatusOK {
		t.Fatalf("valid session: got %d", got)
	}
	if got := status("/admin", old); got != http.StatusForbidden {
		t.Errorf("admin role from the token: got %d, want 403", got)
	}

	if err := user.SetPassword("new"); err != nil {
		t.Fatal(err)
	}
	if err := storage.UpdateUser(user); err != nil {
		t.Fatal(err)
	}
	if got := status("/user", old); got != http.StatusUnauthorized {
		t.Errorf("session after password change: got %d, want 401", got)
	}
	fresh := token(time.Now())
	if got := status("/user", fresh); got != http.StatusOK {
		t.Errorf("new session: got %d, want 200", got)
	}

	if err := storage.RemoveUser("alice"); err != nil {
		t.Fatal(err)
	}
	if got := status("/user", fresh); got != http.StatusUnauthorized {
		t.Errorf("deleted user: got %d, want 401", got)
	}
}
