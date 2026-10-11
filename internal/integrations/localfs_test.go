package integrations

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func testLocalFS() localFS {
	return localFS{
		rootPath: "./testfs",
	}
}

func TestListFilesLocal(t *testing.T) {
	w := testLocalFS()
	res, err := w.List("root", 2)
	if err != nil {
		t.Error(err)
	}
	assert.Equal(t, 1, len(res.SubFolders))
	assert.Equal(t, 2, len(res.Files))
}

func TestLocalFSDecodePath(t *testing.T) {
	w := testLocalFS()

	// /dir1
	res, err := w.List("L2RpcjE=", 2)

	if assert.NoError(t, err) {
		assert.Equal(t, 1, len(res.Files))
	}
}

func TestLocalFSTraversal(t *testing.T) {
	w := testLocalFS()

	// ../localfs.go and ../testfs exist next to the root path and must not be reachable
	if _, _, err := w.Download(encodeName("../localfs.go")); err == nil {
		t.Error("download outside of the root path")
	}
	if _, err := w.List(encodeName("../testfs"), 1); err == nil {
		t.Error("list outside of the root path")
	}
}

// symlinks inside the root path must not lead out of it
func TestLocalFSSymlinkEscape(t *testing.T) {
	outside := t.TempDir()
	if err := os.WriteFile(filepath.Join(outside, "secret.pdf"), []byte("secret"), 0600); err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, "out")); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join(outside, "secret.pdf"), filepath.Join(root, "link.pdf")); err != nil {
		t.Fatal(err)
	}
	w := localFS{rootPath: root}

	if _, _, err := w.Download(encodeName("/link.pdf")); err == nil {
		t.Error("download through a file symlink")
	}
	if _, _, err := w.Download(encodeName("/out/secret.pdf")); err == nil {
		t.Error("download through a dir symlink")
	}
	if _, err := w.List(encodeName("/out"), 1); err == nil {
		t.Error("list through a dir symlink")
	}
	if _, err := w.Upload(encodeName("/out"), "new", "pdf", io.NopCloser(strings.NewReader("x"))); err == nil {
		t.Error("upload through a dir symlink")
	}
	if _, err := os.Stat(filepath.Join(outside, "new.pdf")); err == nil {
		t.Error("file written outside of the root path")
	}

	// regular files still work
	id, err := w.Upload(rootFolder, "doc", "pdf", io.NopCloser(strings.NewReader("x")))
	if err != nil {
		t.Fatal(err)
	}
	r, size, err := w.Download(id)
	if err != nil {
		t.Fatal(err)
	}
	r.Close()
	assert.Equal(t, int64(1), size)
}
