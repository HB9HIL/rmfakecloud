package fs

import (
	"os"
	"path"
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
