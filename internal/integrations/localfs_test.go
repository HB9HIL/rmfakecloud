package integrations

import (
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
