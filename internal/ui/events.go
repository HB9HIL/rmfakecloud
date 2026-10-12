package ui

import (
	"io"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	// proxies close idle connections, a comment line keeps the stream open
	eventsKeepAlive = 30 * time.Second
	// the browser reconnects on its own, which checks the session again
	eventsMaxAge = 10 * time.Minute
)

// events streams server-sent events to the web ui, so it reloads documents and passcode resets when they change
func (app *ReactAppWrapper) events(c *gin.Context) {
	events, stop := app.h.Subscribe(userID(c))
	defer stop()

	keepAlive := time.NewTicker(eventsKeepAlive)
	defer keepAlive.Stop()
	maxAge := time.After(eventsMaxAge)

	c.Header("Cache-Control", "no-cache")
	// nginx would buffer the stream
	c.Header("X-Accel-Buffering", "no")
	c.Stream(func(w io.Writer) bool {
		select {
		case e := <-events:
			c.SSEvent(e, "")
		case <-keepAlive.C:
			_, _ = io.WriteString(w, ": keep-alive\n\n")
		case <-maxAge:
			return false
		case <-c.Request.Context().Done():
			return false
		}
		return true
	})
}
