package ui

import (
	"testing"
	"time"
)

func TestLoginLimiter(t *testing.T) {
	l := newLoginLimiter()
	now := time.Unix(1700000000, 0)
	ip := "192.0.2.1"

	for i := 0; i < loginMaxFailures; i++ {
		if l.blocked(ip, now) {
			t.Fatalf("blocked after %d failures", i)
		}
		l.fail(ip, now)
	}
	if !l.blocked(ip, now) {
		t.Error("not blocked after max failures")
	}
	if l.blocked("192.0.2.2", now) {
		t.Error("other ip blocked")
	}
	if l.blocked(ip, now.Add(loginBlockTime)) {
		t.Error("still blocked after the block time")
	}

	l.reset(ip)
	if l.blocked(ip, now) {
		t.Error("blocked after reset")
	}
}
