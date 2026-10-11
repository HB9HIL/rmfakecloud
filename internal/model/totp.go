package model

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// RFC 6238 defaults, supported by every authenticator app
const (
	totpPeriod = 30
	totpDigits = 6
	totpWindow = 1
)

var totpEncoding = base32.StdEncoding.WithPadding(base32.NoPadding)

// NewTOTPSecret generates a random base32 secret
func NewTOTPSecret() (string, error) {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return totpEncoding.EncodeToString(b), nil
}

// TOTPURI returns the otpauth uri for the authenticator app
func TOTPURI(secret, account string) string {
	q := url.Values{}
	q.Set("secret", secret)
	q.Set("issuer", "rmfakecloud")
	return "otpauth://totp/" + url.PathEscape("rmfakecloud:"+account) + "?" + q.Encode()
}

// CheckTOTP checks the code against the user's secret, every time step is accepted only once
func (u *User) CheckTOTP(code string, now time.Time) bool {
	key, err := totpEncoding.DecodeString(strings.ToUpper(u.TOTPSecret))
	if err != nil || len(key) == 0 || len(code) != totpDigits {
		return false
	}
	current := now.Unix() / totpPeriod
	for step := current - totpWindow; step <= current+totpWindow; step++ {
		if step <= u.TOTPLastStep {
			continue
		}
		if subtle.ConstantTimeCompare([]byte(totpCode(key, step)), []byte(code)) == 1 {
			u.TOTPLastStep = step
			return true
		}
	}
	return false
}

func totpCode(key []byte, step int64) string {
	msg := make([]byte, 8)
	binary.BigEndian.PutUint64(msg, uint64(step))
	mac := hmac.New(sha1.New, key)
	mac.Write(msg)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	value := binary.BigEndian.Uint32(sum[offset:offset+4]) & 0x7fffffff
	return fmt.Sprintf("%0*d", totpDigits, value%1000000)
}
