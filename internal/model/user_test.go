package model

import "testing"

// the id is used as directory name
func TestNewUserInvalidID(t *testing.T) {
	for _, id := range []string{"", ".", "..", "/"} {
		if _, err := NewUser(id, "pass"); err == nil {
			t.Errorf("id %q accepted", id)
		}
	}
}
