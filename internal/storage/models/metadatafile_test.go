package models

import (
	"encoding/json"
	"testing"
)

// newer firmware writes textScale as a float
func TestContentFileFloatTextScale(t *testing.T) {
	var c ContentFile
	if err := json.Unmarshal([]byte(`{"fileType":"epub","textScale":0.8}`), &c); err != nil {
		t.Fatal(err)
	}
	if c.TextScale != 0.8 {
		t.Errorf("got %v, want 0.8", c.TextScale)
	}
}
