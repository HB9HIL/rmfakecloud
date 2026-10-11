package rm

import (
	"os"
	"path/filepath"
	"testing"
)

// shader tool of newer firmware (rmscene Pen.SHADER)
const shader BrushType = 23

func load(t *testing.T, name string, ver Version) *Rm {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	rm := New()
	if err := rm.UnmarshalBinary(b); err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	if rm.Version != ver {
		t.Fatalf("%s: version %d, want %d", name, rm.Version, ver)
	}
	return rm
}

func lines(rm *Rm) []Line {
	var all []Line
	for _, l := range rm.Layers {
		all = append(all, l.Lines...)
	}
	return all
}

func TestUnmarshalV3(t *testing.T) {
	rm := load(t, "test_v3.rm", V3)
	if len(lines(rm)) == 0 {
		t.Error("no lines")
	}
}

func TestUnmarshalV5(t *testing.T) {
	rm := load(t, "test_v5.rm", V5)
	all := lines(rm)
	if len(all) == 0 {
		t.Fatal("no lines")
	}
	for _, l := range all {
		if l.BrushSize != Medium {
			t.Errorf("brush size %v, want %v", l.BrushSize, Medium)
		}
	}
}

// highlights are a v6 concept, v5 highlighting is a stroke with HighlighterV5
func TestV3V5NoHighlights(t *testing.T) {
	for name, ver := range map[string]Version{"test_v3.rm": V3, "test_v5.rm": V5} {
		if rm := load(t, name, ver); len(rm.Highlights) != 0 {
			t.Errorf("%s: %d highlights, want none", name, len(rm.Highlights))
		}
	}
}

func TestUnmarshalV6(t *testing.T) {
	for _, name := range []string{
		"Normal_A_stroke_2_layers.rm",
		"Color_and_tool_v3.14.4.rm",
		"More_color_highlight_shader_v3.15.4.2.rm",
	} {
		rm := load(t, name, V6)
		all := lines(rm)
		if len(all) == 0 {
			t.Errorf("%s: no lines", name)
		}
		for _, l := range all {
			if len(l.Points) == 0 {
				t.Errorf("%s: line without points", name)
				break
			}
		}
	}
}

// a page with text only has neither strokes nor highlights
func TestUnmarshalV6TextOnly(t *testing.T) {
	rm := load(t, "Bold_Heading_Bullet_Normal.rm", V6)
	if n := len(lines(rm)); n != 0 {
		t.Errorf("%d lines, want 0", n)
	}
	if n := len(rm.Highlights); n != 0 {
		t.Errorf("%d highlights, want 0", n)
	}
}

// expectations from rmscene tests/test_scene_stream.py
func TestUnmarshalV6Highlight(t *testing.T) {
	rm := load(t, "Wikipedia_highlighted_p1.rm", V6)
	if len(rm.Highlights) == 0 {
		t.Fatal("no highlights")
	}
	hl := rm.Highlights[0]
	if want := "The reMarkable uses electronic paper"; hl.Text != want {
		t.Errorf("text %q, want %q", hl.Text, want)
	}
	if len(hl.Rects) == 0 {
		t.Fatal("highlight without rects")
	}
	// rmscene: x -810.11 with the origin at the page center
	if x := hl.Rects[0].X - float64(Width)/2; x < -810.12 || x > -810.10 {
		t.Errorf("rect x %.2f from center, want -810.11", x)
	}
}

// expectations from rmscene tests/test_color_tool.py
func TestUnmarshalV6ColorAndTool(t *testing.T) {
	rm := load(t, "Color_and_tool_v3.14.4.rm", V6)

	colors := map[BrushColor]bool{}
	for _, l := range lines(rm) {
		colors[l.BrushColor] = true
		switch l.BrushColor {
		case HighlightDynamic:
			if l.BrushType != shader {
				t.Errorf("highlight colored line with tool %d, want shader", l.BrushType)
			}
		case Green2, Cyan, Magenta:
			if l.BrushType != BallPointV5 {
				t.Errorf("color %d with tool %d, want ballpoint", l.BrushColor, l.BrushType)
			}
		}
	}
	for _, c := range []BrushColor{HighlightDynamic, Green2, Cyan} {
		if !colors[c] {
			t.Errorf("no line with color %d", c)
		}
	}

	found := false
	for _, hl := range rm.Highlights {
		found = found || hl.Color == HighlightDynamic
	}
	if !found {
		t.Error("no highlight with color HighlightDynamic")
	}
}

// one ballpoint stroke per pen color, highlighter and shader strokes (firmware 3.15)
func TestUnmarshalV6MoreColors(t *testing.T) {
	rm := load(t, "More_color_highlight_shader_v3.15.4.2.rm", V6)

	ballpoint := map[BrushColor]bool{}
	tools := map[BrushType]bool{}
	for _, l := range lines(rm) {
		tools[l.BrushType] = true
		if l.BrushType == BallPointV5 {
			ballpoint[l.BrushColor] = true
		}
	}
	for _, c := range []BrushColor{Black, Grey, White, Blue, Red, Green2, Cyan, Magenta, Yellow2} {
		if !ballpoint[c] {
			t.Errorf("no ballpoint stroke with color %d", c)
		}
	}
	for _, tool := range []BrushType{HighlighterV5, shader} {
		if !tools[tool] {
			t.Errorf("no stroke with tool %d", tool)
		}
	}
}

// strokes of newer firmware carry an explicit color, e.g. a shader with a custom color
func TestUnmarshalV6LineRGBA(t *testing.T) {
	rm := load(t, "Colors_argb.rm", V6)
	for _, l := range lines(rm) {
		if l.ColorRGBA != nil {
			return
		}
	}
	t.Error("no line with an RGBA color")
}

// the values are part of the file format and match rmscene's PenColor enum
func TestBrushColorValues(t *testing.T) {
	for i, c := range []BrushColor{Black, Grey, White, HighlightYellow, HighlightGreen, HighlightPink,
		Blue, Red, GreyOverlap, HighlightDynamic, Green2, Cyan, Magenta, Yellow2} {
		if uint32(c) != uint32(i) {
			t.Errorf("color %d has value %d", i, c)
		}
	}
}
