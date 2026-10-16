package fs

import (
	"io"
	"net/url"
	"os"
	"path"
	"strings"
	"testing"
	"testing/iotest"
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

// an untouched upload is exported as stored, seekable so the ui can serve ranges of it
func TestExportUntouchedIsSeekable(t *testing.T) {
	fs := NewStorage(&config.Config{DataDir: t.TempDir()})
	uid := "test"
	if err := os.MkdirAll(fs.getUserBlobPath(uid), 0700); err != nil {
		t.Fatal(err)
	}
	doc, err := fs.CreateBlobDocument(uid, "blah.pdf", "", strings.NewReader("%PDF-dummy"))
	if err != nil {
		t.Fatal(err)
	}
	r, err := fs.Export(uid, doc.ID)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	rs, ok := r.(io.ReadSeeker)
	if !ok {
		t.Fatalf("got %T, want an io.ReadSeeker", r)
	}
	if _, err := rs.Seek(5, io.SeekStart); err != nil {
		t.Fatal(err)
	}
	if b, _ := io.ReadAll(rs); string(b) != "dummy" {
		t.Errorf("got %q after seeking, want the stored bytes", b)
	}
}

// an aborted upload leaves no truncated blob behind
func TestStoreBlobAbortedUpload(t *testing.T) {
	fs := NewStorage(&config.Config{DataDir: t.TempDir()})
	uid := "test"
	if err := os.MkdirAll(fs.getUserBlobPath(uid), 0700); err != nil {
		t.Fatal(err)
	}

	broken := io.MultiReader(strings.NewReader("partial"), iotest.ErrReader(io.ErrUnexpectedEOF))
	if _, err := fs.StoreBlob(uid, "abc", broken, 0); err != io.ErrUnexpectedEOF {
		t.Fatalf("got %v, want %v", err, io.ErrUnexpectedEOF)
	}
	entries, err := os.ReadDir(fs.getUserBlobPath(uid))
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Errorf("blob dir not empty: %v", entries)
	}

	if _, err := fs.StoreBlob(uid, "abc", strings.NewReader("ok"), 0); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(path.Join(fs.getUserBlobPath(uid), "abc"))
	if err != nil || string(b) != "ok" {
		t.Errorf("got %q, %v", b, err)
	}
}
