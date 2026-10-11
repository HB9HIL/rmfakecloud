package ui

import (
	"sync"
	"time"
)

const (
	loginMaxFailures = 5
	loginBlockTime   = 15 * time.Minute
)

type loginAttempt struct {
	count int
	until time.Time
}

// loginLimiter blocks an ip after too many failed logins
// ponytail: process memory, lost on restart, per-instance only
type loginLimiter struct {
	mu       sync.Mutex
	attempts map[string]*loginAttempt
}

func newLoginLimiter() *loginLimiter {
	return &loginLimiter{attempts: map[string]*loginAttempt{}}
}

func (l *loginLimiter) blocked(ip string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	a, ok := l.attempts[ip]
	return ok && now.Before(a.until) && a.count >= loginMaxFailures
}

func (l *loginLimiter) fail(ip string, now time.Time) {
	l.mu.Lock()
	defer l.mu.Unlock()
	for k, a := range l.attempts {
		if !now.Before(a.until) {
			delete(l.attempts, k)
		}
	}
	a, ok := l.attempts[ip]
	if !ok {
		a = &loginAttempt{until: now.Add(loginBlockTime)}
		l.attempts[ip] = a
	}
	a.count++
}

func (l *loginLimiter) reset(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.attempts, ip)
}
