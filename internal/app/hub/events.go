package hub

import "sync"

// Events for the web ui, sent as server-sent events: something changed, the browser reloads it
const (
	EventDocuments = "documents"
	EventPasscode  = "passcode"
)

type browsers struct {
	mu   sync.Mutex
	subs map[string]map[chan string]struct{}
}

// Subscribe returns the web ui events of a user, stop ends the subscription
func (h *Hub) Subscribe(uid string) (events <-chan string, stop func()) {
	// one pending event is enough, they only say what to reload
	ch := make(chan string, 2)
	h.browsers.mu.Lock()
	if h.browsers.subs[uid] == nil {
		h.browsers.subs[uid] = make(map[chan string]struct{})
	}
	h.browsers.subs[uid][ch] = struct{}{}
	h.browsers.mu.Unlock()

	return ch, func() {
		h.browsers.mu.Lock()
		delete(h.browsers.subs[uid], ch)
		if len(h.browsers.subs[uid]) == 0 {
			delete(h.browsers.subs, uid)
		}
		h.browsers.mu.Unlock()
	}
}

// Publish sends an event to every web ui session of the user, without blocking on slow ones
func (h *Hub) Publish(uid, event string) {
	h.browsers.mu.Lock()
	defer h.browsers.mu.Unlock()
	for ch := range h.browsers.subs[uid] {
		select {
		case ch <- event:
		default:
		}
	}
}
