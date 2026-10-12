package hub

import "testing"

func TestPublishSubscribe(t *testing.T) {
	h := &Hub{browsers: browsers{subs: map[string]map[chan string]struct{}{}}}
	events, stop := h.Subscribe("a")
	other, stopOther := h.Subscribe("b")
	defer stopOther()

	h.Publish("a", EventDocuments)
	if got := <-events; got != EventDocuments {
		t.Errorf("got %q", got)
	}
	select {
	case e := <-other:
		t.Errorf("other user got %q", e)
	default:
	}
	// a session that doesn't read must not block the publisher
	for range 10 {
		h.Publish("a", EventPasscode)
	}
	stop()
	h.Publish("a", EventPasscode)
	if len(h.browsers.subs) != 1 {
		t.Errorf("subscription not removed: %v", h.browsers.subs)
	}
}
