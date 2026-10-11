package app

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/config"
	"github.com/ddvk/rmfakecloud/internal/messages"
	"github.com/ddvk/rmfakecloud/internal/model"
)

type tablet struct {
	t     *testing.T
	url   string
	token string
}

func (tb *tablet) do(method, path string, body []byte) (int, []byte) {
	tb.t.Helper()
	req, err := http.NewRequest(method, tb.url+path, bytes.NewReader(body))
	if err != nil {
		tb.t.Fatal(err)
	}
	if tb.token != "" {
		req.Header.Set("Authorization", "Bearer "+tb.token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		tb.t.Fatal(err)
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		tb.t.Fatal(err)
	}
	return resp.StatusCode, b
}

func (tb *tablet) json(method, path string, req, resp any) int {
	tb.t.Helper()
	body, err := json.Marshal(req)
	if err != nil {
		tb.t.Fatal(err)
	}
	status, b := tb.do(method, path, body)
	if resp != nil && status == http.StatusOK {
		if err := json.Unmarshal(b, resp); err != nil {
			tb.t.Fatalf("%s %s: %v", method, path, err)
		}
	}
	return status
}

// newTablet starts the server with one sync15 user and pairs a tablet like the device does
func newTablet(t *testing.T) *tablet {
	cfg := &config.Config{
		DataDir:      t.TempDir(),
		JWTSecretKey: []byte("test"),
		CloudHost:    "local.test",
		StorageURL:   "https://local.test",
	}
	app := NewApp(cfg)

	user, err := model.NewUser("test", "test")
	if err != nil {
		t.Fatal(err)
	}
	user.Sync15 = true
	if err := app.userStorer.RegisterUser(user); err != nil {
		t.Fatal(err)
	}

	srv := httptest.NewServer(app.router)
	t.Cleanup(srv.Close)
	tb := &tablet{t: t, url: srv.URL}

	code, err := app.codeConnector.NewCode(user.ID)
	if err != nil {
		t.Fatal(err)
	}
	status, deviceToken := tb.do(http.MethodPost, "/token/json/2/device/new",
		[]byte(`{"code":"`+code+`","deviceDesc":"remarkable","deviceID":"rm-test"}`))
	if status != http.StatusOK {
		t.Fatalf("device token: status %d", status)
	}
	// a code can be used only once
	if status, _ := tb.do(http.MethodPost, "/token/json/2/device/new", []byte(`{"code":"`+code+`"}`)); status != http.StatusBadRequest {
		t.Errorf("reused code: status %d, want 400", status)
	}

	tb.token = string(deviceToken)
	status, userToken := tb.do(http.MethodPost, "/token/json/2/user/new", nil)
	if status != http.StatusOK {
		t.Fatalf("user token: status %d", status)
	}
	tb.token = string(userToken)
	return tb
}

// blob ids and root hashes are sha256 hex strings, the generation is derived from their length
func hash(s string) string {
	return fmt.Sprintf("%x", sha256.Sum256([]byte(s)))
}

func TestSyncUnauthorized(t *testing.T) {
	tb := newTablet(t)
	tb.token = "invalid"
	if status, _ := tb.do(http.MethodGet, "/sync/v3/root", nil); status != http.StatusUnauthorized {
		t.Errorf("status %d, want 401", status)
	}
}

func TestSyncRoot(t *testing.T) {
	tb := newTablet(t)

	if status := tb.json(http.MethodGet, "/sync/v3/root", nil, nil); status != http.StatusNotFound {
		t.Fatalf("root of a new account: status %d, want 404", status)
	}

	// blobs are written first, then the root is pointed to the new index
	blob := []byte("3\n")
	index1, index2 := hash(string(blob)), hash("index2")
	if status, _ := tb.do(http.MethodPut, "/sync/v3/files/"+index1, blob); status != http.StatusOK {
		t.Fatalf("write blob: status %d", status)
	}
	status, got := tb.do(http.MethodGet, "/sync/v3/files/"+index1, nil)
	if status != http.StatusOK || !bytes.Equal(got, blob) {
		t.Fatalf("read blob: status %d, content %q", status, got)
	}

	var first messages.SyncRootV3Response
	if status := tb.json(http.MethodPut, "/sync/v3/root", messages.SyncRootV3Request{Hash: index1}, &first); status != http.StatusOK {
		t.Fatalf("first root: status %d", status)
	}
	if first.Generation <= 0 || first.Hash != index1 {
		t.Fatalf("first root: %+v", first)
	}

	var second messages.SyncRootV3Response
	if status := tb.json(http.MethodPut, "/sync/v3/root", messages.SyncRootV3Request{Hash: index2, Generation: first.Generation}, &second); status != http.StatusOK {
		t.Fatalf("second root: status %d", status)
	}
	if second.Generation <= first.Generation {
		t.Errorf("generation %d after %d", second.Generation, first.Generation)
	}

	// another device still knows the first generation
	if status := tb.json(http.MethodPut, "/sync/v3/root", messages.SyncRootV3Request{Hash: hash("stale"), Generation: first.Generation}, nil); status != http.StatusPreconditionFailed {
		t.Errorf("stale generation: status %d, want 412", status)
	}

	var root messages.SyncRootV3Response
	tb.json(http.MethodGet, "/sync/v3/root", nil, &root)
	if root != second {
		t.Errorf("root %+v, want %+v", root, second)
	}

	status, b := tb.do(http.MethodGet, "/sync/v4/root", nil)
	var v4 messages.SyncRootV4Response
	if err := json.Unmarshal(b, &v4); status != http.StatusOK || err != nil {
		t.Fatalf("v4 root: status %d, %v", status, err)
	}
	if v4.Hash != second.Hash || v4.Generation != second.Generation || v4.SchemaVersion != SchemaVersion {
		t.Errorf("v4 root %+v", v4)
	}
}

func TestSyncCheckFiles(t *testing.T) {
	tb := newTablet(t)
	blob := []byte("stored")
	stored, missing := hash(string(blob)), hash("missing")
	if status, _ := tb.do(http.MethodPut, "/sync/v3/files/"+stored, blob); status != http.StatusOK {
		t.Fatalf("write blob: status %d", status)
	}

	var res messages.MissingFiles
	if status := tb.json(http.MethodPost, "/sync/v3/check-files", messages.CheckFiles{Files: []string{stored, missing}}, &res); status != http.StatusOK {
		t.Fatalf("check-files: status %d", status)
	}
	if len(res.MissingFiles) != 1 || res.MissingFiles[0] != missing {
		t.Errorf("missing files %v, want [%s]", res.MissingFiles, missing)
	}
}

// the generation is derived from the history size, only sha256 hex roots keep it counting
func TestSyncRootRejectsInvalidHash(t *testing.T) {
	tb := newTablet(t)
	for _, h := range []string{"short", hash("x") + "0", hash("x")[:32] + "\n" + hash("x")[33:], strings.Repeat("g", 64)} {
		if status := tb.json(http.MethodPut, "/sync/v3/root", messages.SyncRootV3Request{Hash: h}, nil); status != http.StatusBadRequest {
			t.Errorf("root %q: status %d, want 400", h, status)
		}
	}
	if status := tb.json(http.MethodGet, "/sync/v3/root", nil, nil); status != http.StatusNotFound {
		t.Errorf("an invalid root was stored: status %d", status)
	}
}
