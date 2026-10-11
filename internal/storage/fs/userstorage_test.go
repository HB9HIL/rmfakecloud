package fs

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/config"
	"github.com/ddvk/rmfakecloud/internal/model"
)

// ids resolving to the users directory or DATADIR must not remove anything
func TestRemoveUserRejectsDirIDs(t *testing.T) {
	dataDir := t.TempDir()
	fs := NewStorage(&config.Config{DataDir: dataDir})
	user, err := model.NewUser("alice", "secret")
	if err != nil {
		t.Fatal(err)
	}
	if err := fs.RegisterUser(user); err != nil {
		t.Fatal(err)
	}

	for _, uid := range []string{"", ".", "..", "a/.."} {
		if err := fs.RemoveUser(uid); err == nil {
			t.Errorf("RemoveUser(%q) succeeded", uid)
		}
		if _, err := fs.GetUser(uid); err == nil {
			t.Errorf("GetUser(%q) succeeded", uid)
		}
	}

	if _, err := os.Stat(filepath.Join(dataDir, userDir, "alice", profileName)); err != nil {
		t.Errorf("alice is gone: %v", err)
	}
}
