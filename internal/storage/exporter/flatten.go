package exporter

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"
)

// annotation flags that hide a form field
const flagHidden, flagNoView = 1 << 1, 1 << 5

// flattenForms draws the appearance of all visible form fields into the page content and removes the form.
// Viewers draw form fields on top of the page content, so they would cover the stamped annotations.
func flattenForms(c context.Context, rs io.ReadSeeker, conf *model.Configuration) (io.ReadSeeker, error) {
	pdf, err := api.ReadAndValidate(c, rs, conf)
	if err != nil {
		return nil, err
	}
	catalog, err := pdf.Catalog()
	if err != nil {
		return nil, err
	}
	if _, found := catalog.Find("AcroForm"); !found {
		_, err := rs.Seek(0, io.SeekStart)
		return rs, err
	}

	for nr := 1; nr <= pdf.PageCount; nr++ {
		if err := flattenPage(c, pdf, nr); err != nil {
			return nil, fmt.Errorf("page %d: %w", nr, err)
		}
	}
	delete(catalog, "AcroForm")

	var out bytes.Buffer
	if err := api.WriteContext(c, pdf, &out); err != nil {
		return nil, err
	}
	return bytes.NewReader(out.Bytes()), nil
}

// flattenPage replaces the widget annotations of a page by drawing their appearance streams as form XObjects
func flattenPage(c context.Context, pdf *model.Context, nr int) error {
	page, _, inherited, err := pdf.PageDict(c, nr, false)
	if err != nil {
		return err
	}
	annots, err := pdf.DereferenceArray(page["Annots"])
	if err != nil || len(annots) == 0 {
		return err
	}

	resources, err := pdf.DereferenceDict(page["Resources"])
	if err != nil {
		return err
	}
	if resources == nil {
		resources = types.NewDict()
		if inherited != nil && inherited.Resources != nil {
			resources = inherited.Resources
		}
		page["Resources"] = resources
	}
	xobjects, err := pdf.DereferenceDict(resources["XObject"])
	if err != nil {
		return err
	}
	if xobjects == nil {
		xobjects = types.NewDict()
		resources["XObject"] = xobjects
	}

	var content bytes.Buffer
	var keep types.Array
	for i, a := range annots {
		annot, err := pdf.DereferenceDict(a)
		if err != nil {
			return err
		}
		if subtype := annot.NameEntry("Subtype"); subtype == nil || *subtype != "Widget" {
			keep = append(keep, a)
			continue
		}
		if flags := annot.IntEntry("F"); flags != nil && *flags&(flagHidden|flagNoView) != 0 {
			continue
		}
		ref := appearance(pdf, annot)
		if ref == nil {
			continue
		}
		cm, err := appearanceMatrix(pdf, annot, *ref)
		if err != nil {
			return err
		}
		// names must be unique across pages, resource dicts can be shared
		name := fmt.Sprintf("RMFlat%d_%d", nr, i)
		xobjects[name] = *ref
		fmt.Fprintf(&content, "q %s cm /%s Do Q\n", cm, name)
	}

	if len(keep) == 0 {
		delete(page, "Annots")
	} else {
		page["Annots"] = keep
	}
	if content.Len() == 0 {
		return nil
	}
	return pdf.AppendContent(page, content.Bytes())
}

// appearance returns the normal appearance stream of a widget, for checkboxes and radio buttons the selected state
func appearance(pdf *model.Context, annot types.Dict) *types.IndirectRef {
	ap, err := pdf.DereferenceDict(annot["AP"])
	if err != nil || ap == nil {
		return nil
	}
	normal := ap["N"]
	if states, err := pdf.DereferenceDict(normal); err == nil && states != nil {
		state := annot.NameEntry("AS")
		if state == nil {
			return nil
		}
		normal = states[*state]
	}
	ref, ok := normal.(types.IndirectRef)
	if !ok {
		return nil
	}
	return &ref
}

// appearanceMatrix returns the cm operands that map the appearance BBox (after its Matrix) onto the widget Rect
func appearanceMatrix(pdf *model.Context, annot types.Dict, ref types.IndirectRef) (string, error) {
	sd, _, err := pdf.DereferenceStreamDict(ref)
	if err != nil || sd == nil {
		return "", fmt.Errorf("appearance stream: %v", err)
	}
	rect, err := numbers(pdf, annot["Rect"], 4)
	if err != nil {
		return "", err
	}
	bbox, err := numbers(pdf, sd.Dict["BBox"], 4)
	if err != nil {
		return "", err
	}
	m := []float64{1, 0, 0, 1, 0, 0}
	if sd.Dict["Matrix"] != nil {
		if m, err = numbers(pdf, sd.Dict["Matrix"], 6); err != nil {
			return "", err
		}
	}

	// bounding box of the BBox corners transformed by Matrix
	x0, y0, x1, y1 := math.Inf(1), math.Inf(1), math.Inf(-1), math.Inf(-1)
	for _, p := range [][2]float64{{bbox[0], bbox[1]}, {bbox[2], bbox[1]}, {bbox[0], bbox[3]}, {bbox[2], bbox[3]}} {
		x := m[0]*p[0] + m[2]*p[1] + m[4]
		y := m[1]*p[0] + m[3]*p[1] + m[5]
		x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
	}
	if x1 <= x0 || y1 <= y0 {
		return "", fmt.Errorf("empty appearance bbox")
	}

	rx0, ry0 := min(rect[0], rect[2]), min(rect[1], rect[3])
	sx := (max(rect[0], rect[2]) - rx0) / (x1 - x0)
	sy := (max(rect[1], rect[3]) - ry0) / (y1 - y0)
	return fmt.Sprintf("%.4f 0 0 %.4f %.4f %.4f", sx, sy, rx0-x0*sx, ry0-y0*sy), nil
}

// numbers dereferences an array of n numbers
func numbers(pdf *model.Context, o types.Object, n int) ([]float64, error) {
	a, err := pdf.DereferenceArray(o)
	if err != nil {
		return nil, err
	}
	if len(a) != n {
		return nil, fmt.Errorf("expected %d numbers, got %d", n, len(a))
	}
	result := make([]float64, n)
	for i, v := range a {
		if result[i], err = pdf.DereferenceNumber(v); err != nil {
			return nil, err
		}
	}
	return result, nil
}
