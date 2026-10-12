package fs

import (
	"net/url"
	"os"
	"path"
	"strings"
	"testing"
	"time"

	"github.com/ddvk/rmfakecloud/internal/config"
)

// a root request waits for the lock held by another request instead of failing
func TestRootLockWaits(t *testing.T) {
	fs := NewStorage(&config.Config{DataDir: t.TempDir()})
	uid := "test"
	if err := os.MkdirAll(fs.getUserBlobPath(uid), 0700); err != nil {
		t.Fatal(err)
	}

	lock, err := lockHistory(path.Join(fs.getUserBlobPath(uid), historyFile))
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error)
	go func() {
		_, _, _, _, err := fs.LoadBlob(uid, rootBlob)
		done <- err
	}()
	time.Sleep(50 * time.Millisecond)
	if err := lock.Unlock(); err != nil {
		t.Fatal(err)
	}

	if err := <-done; err != ErrorNotFound {
		t.Errorf("got %v, want %v", err, ErrorNotFound)
	}
}

func TestSignURLParamsBoundaries(t *testing.T) {
	key := []byte("key")
	a, err := SignURLParams([]string{"ab", "c", "1", "read"}, key)
	if err != nil {
		t.Fatal(err)
	}
	b, err := SignURLParams([]string{"a", "bc", "1", "read"}, key)
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Error("shifted parts give the same signature")
	}
}

func TestBlobURLVerifies(t *testing.T) {
	fs := NewStorage(&config.Config{DataDir: t.TempDir(), JWTSecretKey: []byte("key")})
	if _, _, err := fs.GetBlobURL("test", "../x", false); err == nil {
		t.Error("signed an id with path separators")
	}

	blobURL, _, err := fs.GetBlobURL("test", "abc", true)
	if err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(blobURL)
	if err != nil {
		t.Fatal(err)
	}
	q := u.Query()
	parts := []string{q.Get(paramUID), q.Get(paramBlobID), q.Get(paramExp), q.Get(paramScope)}
	if err := VerifyURLParams(parts, q.Get(paramExp), q.Get(paramSignature), fs.Cfg.JWTSecretKey); err != nil {
		t.Errorf("own url does not verify: %v", err)
	}
	parts[0] = "other"
	if err := VerifyURLParams(parts, q.Get(paramExp), q.Get(paramSignature), fs.Cfg.JWTSecretKey); err == nil {
		t.Error("url verifies for another user")
	}
}

// the tree knows the file type of an upload, also when an older cache stored the name there
func TestBlobDocumentPayloadType(t *testing.T) {
	fs := NewStorage(&config.Config{DataDir: t.TempDir()})
	uid := "test"
	if err := os.MkdirAll(fs.getUserBlobPath(uid), 0700); err != nil {
		t.Fatal(err)
	}
	doc, err := fs.CreateBlobDocument(uid, "blah.pdf", "", strings.NewReader("dummy"))
	if err != nil {
		t.Fatal(err)
	}
	payloadType := func() string {
		tree, err := fs.GetCachedTree(uid)
		if err != nil {
			t.Fatal(err)
		}
		d, err := tree.FindDoc(doc.ID)
		if err != nil {
			t.Fatal(err)
		}
		return d.PayloadType
	}
	if got := payloadType(); got != "pdf" {
		t.Errorf("new upload: got %q, want pdf", got)
	}

	tree, _ := fs.GetCachedTree(uid)
	d, _ := tree.FindDoc(doc.ID)
	d.PayloadType = "blah"
	tree.CacheVersion = 0
	if err := fs.SaveCachedTree(uid, tree); err != nil {
		t.Fatal(err)
	}
	if got := payloadType(); got != "pdf" {
		t.Errorf("outdated cache: got %q, want pdf", got)
	}
}
