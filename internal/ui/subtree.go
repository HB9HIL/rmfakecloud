package ui

import "github.com/ddvk/rmfakecloud/internal/ui/viewmodel"

// the web ui calls the top level "root", the storage uses an empty parent
func parentID(id string) string {
	if id == "root" {
		return ""
	}
	return id
}

// descendants returns the ids below the entry, deepest first so they can be deleted in order
func descendants(tree *viewmodel.DocumentTree, id string) []string {
	var collect func(entries []viewmodel.Entry) []string
	collect = func(entries []viewmodel.Entry) (ids []string) {
		for _, e := range entries {
			if d, ok := e.(*viewmodel.Directory); ok {
				ids = append(ids, collect(d.Entries)...)
				ids = append(ids, d.ID)
			} else if d, ok := e.(*viewmodel.Document); ok {
				ids = append(ids, d.ID)
			}
		}
		return ids
	}
	var find func(entries []viewmodel.Entry) []string
	find = func(entries []viewmodel.Entry) []string {
		for _, e := range entries {
			if d, ok := e.(*viewmodel.Directory); ok {
				if d.ID == id {
					return collect(d.Entries)
				}
				if ids := find(d.Entries); ids != nil {
					return ids
				}
			}
		}
		return nil
	}
	if ids := find(tree.Entries); ids != nil {
		return ids
	}
	return find(tree.Trash)
}
