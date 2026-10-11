package model

import (
	"testing"
	"time"
)

// RFC 6238 appendix B, SHA1, last 6 digits
func TestTOTPCode(t *testing.T) {
	key := []byte("12345678901234567890")
	vectors := map[int64]string{
		59:          "287082",
		1111111109:  "081804",
		1111111111:  "050471",
		1234567890:  "005924",
		2000000000:  "279037",
		20000000000: "353130",
	}
	for ts, want := range vectors {
		if got := totpCode(key, ts/totpPeriod); got != want {
			t.Errorf("t=%d: got %s, want %s", ts, got, want)
		}
	}
}

func TestCheckTOTP(t *testing.T) {
	secret, err := NewTOTPSecret()
	if err != nil {
		t.Fatal(err)
	}
	u := &User{TOTPSecret: secret}
	key, _ := totpEncoding.DecodeString(secret)
	now := time.Unix(1700000000, 0)
	step := now.Unix() / totpPeriod

	if u.CheckTOTP(totpCode(key, step+2), now) {
		t.Error("code outside the window accepted")
	}
	if !u.CheckTOTP(totpCode(key, step), now) {
		t.Error("valid code rejected")
	}
	if u.CheckTOTP(totpCode(key, step), now) {
		t.Error("code accepted twice")
	}
	if u.CheckTOTP(totpCode(key, step-1), now) {
		t.Error("older code accepted after a newer one")
	}
	if !u.CheckTOTP(totpCode(key, step+1), now) {
		t.Error("next code rejected")
	}
	if (&User{}).CheckTOTP("123456", now) {
		t.Error("code accepted without a secret")
	}
}
