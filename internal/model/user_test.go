package model

import (
	"encoding/json"
	"strings"
	"testing"
)

// the id is used as directory name
func TestNewUserInvalidID(t *testing.T) {
	for _, id := range []string{"", ".", "..", "/"} {
		if _, err := NewUser(id, "pass"); err == nil {
			t.Errorf("id %q accepted", id)
		}
	}
}

// the password hash and the totp secret never leave the server as json
func TestUserJSONHidesSecrets(t *testing.T) {
	u, err := NewUser("alice", "pass")
	if err != nil {
		t.Fatal(err)
	}
	u.TOTPSecret = "JBSWY3DPEHPK3PXP"
	b, err := json.Marshal(u)
	if err != nil {
		t.Fatal(err)
	}
	for _, secret := range []string{u.Password, u.TOTPSecret} {
		if strings.Contains(string(b), secret) {
			t.Errorf("json contains %q", secret)
		}
	}
	y, err := u.Serialize()
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(y), u.Password) {
		t.Error("profile yaml lost the password hash")
	}
}
