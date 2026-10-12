package ui

import (
	"slices"
	"testing"

	"github.com/ddvk/rmfakecloud/internal/ui/viewmodel"
)

func TestDescendants(t *testing.T) {
	leaf := &viewmodel.Document{ID: "doc"}
	inner := &viewmodel.Directory{ID: "inner", Entries: []viewmodel.Entry{leaf}}
	outer := &viewmodel.Directory{ID: "outer", Entries: []viewmodel.Entry{inner}}
	trashed := &viewmodel.Directory{ID: "trashed", Entries: []viewmodel.Entry{&viewmodel.Document{ID: "old"}}}
	tree := &viewmodel.DocumentTree{Entries: []viewmodel.Entry{outer}, Trash: []viewmodel.Entry{trashed}}

	if got := descendants(tree, "outer"); !slices.Equal(got, []string{"doc", "inner"}) {
		t.Errorf("outer: %v, want deepest first", got)
	}
	if got := descendants(tree, "trashed"); !slices.Equal(got, []string{"old"}) {
		t.Errorf("trashed: %v", got)
	}
	if got := descendants(tree, "doc"); got != nil {
		t.Errorf("a document has no descendants: %v", got)
	}
	// moving outer into inner would be a cycle
	if !slices.Contains(descendants(tree, "outer"), "inner") {
		t.Error("cycle not detected")
	}
	if parentID("root") != "" || parentID("x") != "x" {
		t.Error("parentID")
	}
}
