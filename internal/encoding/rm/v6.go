package rm

import (
	"encoding/binary"
	"fmt"
	"math"
)

// v6 tagged field type constants (low 4 bits of a tag varuint).
const (
	tagID      = 0xF
	tagLength4 = 0xC
	tagByte8   = 0x8
	tagByte4   = 0x4
	tagByte1   = 0x1
)

// v6 block type constants.
const (
	blockTypeGlyphItem = 0x03
	blockTypeLineItem  = 0x05
)

// v6 item type bytes inside a value subblock.
const (
	glyphItemType = 0x01
	lineItemType  = 0x03
)

// v6Reader is a cursor-based binary reader over a byte slice.
type v6Reader struct {
	data []byte
	pos  int
}

func (r *v6Reader) remaining() int {
	return len(r.data) - r.pos
}

func (r *v6Reader) readVaruint() (uint32, error) {
	var result uint32
	var shift uint
	for r.pos < len(r.data) {
		b := r.data[r.pos]
		r.pos++
		result |= uint32(b&0x7F) << shift
		shift += 7
		if b&0x80 == 0 {
			return result, nil
		}
	}
	return 0, fmt.Errorf("v6: unexpected end of varuint")
}

func (r *v6Reader) readUint8() (uint8, error) {
	if r.remaining() < 1 {
		return 0, fmt.Errorf("v6: unexpected EOF reading uint8")
	}
	v := r.data[r.pos]
	r.pos++
	return v, nil
}

func (r *v6Reader) readUint16() (uint16, error) {
	if r.remaining() < 2 {
		return 0, fmt.Errorf("v6: unexpected EOF reading uint16")
	}
	v := binary.LittleEndian.Uint16(r.data[r.pos:])
	r.pos += 2
	return v, nil
}

func (r *v6Reader) readUint32() (uint32, error) {
	if r.remaining() < 4 {
		return 0, fmt.Errorf("v6: unexpected EOF reading uint32")
	}
	v := binary.LittleEndian.Uint32(r.data[r.pos:])
	r.pos += 4
	return v, nil
}

func (r *v6Reader) readFloat32() (float32, error) {
	if r.remaining() < 4 {
		return 0, fmt.Errorf("v6: unexpected EOF reading float32")
	}
	bits := binary.LittleEndian.Uint32(r.data[r.pos:])
	r.pos += 4
	return math.Float32frombits(bits), nil
}

func (r *v6Reader) readFloat64() (float64, error) {
	if r.remaining() < 8 {
		return 0, fmt.Errorf("v6: unexpected EOF reading float64")
	}
	bits := binary.LittleEndian.Uint64(r.data[r.pos:])
	r.pos += 8
	return math.Float64frombits(bits), nil
}

func (r *v6Reader) readCrdtId() error {
	if _, err := r.readUint8(); err != nil {
		return err
	}
	if _, err := r.readVaruint(); err != nil {
		return err
	}
	return nil
}

// readTag reads a tagged field header, returning the index and type.
func (r *v6Reader) readTag() (index uint32, tagType uint32, err error) {
	x, err := r.readVaruint()
	if err != nil {
		return 0, 0, err
	}
	return x >> 4, x & 0xF, nil
}

// checkTag peeks at the next tag; returns true and consumes it if it matches,
// otherwise restores the position.
func (r *v6Reader) checkTag(expectedIndex, expectedType uint32) bool {
	saved := r.pos
	index, tagType, err := r.readTag()
	if err != nil || index != expectedIndex || tagType != expectedType {
		r.pos = saved
		return false
	}
	return true
}

// expectTag reads and validates the next tag, returning an error on mismatch.
func (r *v6Reader) expectTag(expectedIndex, expectedType uint32) error {
	saved := r.pos
	index, tagType, err := r.readTag()
	if err != nil {
		return err
	}
	if index != expectedIndex || tagType != expectedType {
		r.pos = saved
		return fmt.Errorf("v6: expected tag idx=%d type=0x%x, got idx=%d type=0x%x at pos %d",
			expectedIndex, expectedType, index, tagType, saved)
	}
	return nil
}

func (r *v6Reader) readTaggedId(index uint32) error {
	if err := r.expectTag(index, tagID); err != nil {
		return err
	}
	return r.readCrdtId()
}

func (r *v6Reader) readTaggedInt(index uint32) (uint32, error) {
	if err := r.expectTag(index, tagByte4); err != nil {
		return 0, err
	}
	return r.readUint32()
}

func (r *v6Reader) readTaggedFloat(index uint32) (float32, error) {
	if err := r.expectTag(index, tagByte4); err != nil {
		return 0, err
	}
	return r.readFloat32()
}

func (r *v6Reader) readTaggedDouble(index uint32) (float64, error) {
	if err := r.expectTag(index, tagByte8); err != nil {
		return 0, err
	}
	return r.readFloat64()
}

func (r *v6Reader) readSubblockHeader(index uint32) (uint32, error) {
	if err := r.expectTag(index, tagLength4); err != nil {
		return 0, err
	}
	return r.readUint32()
}

// parseV6 parses a v6 .rm file from raw bytes (including the header).
func parseV6(data []byte) (*Rm, error) {
	r := &v6Reader{data: data, pos: HeaderLen}

	var lines []Line
	var highlights []Highlight

	for r.pos < len(data) {
		blockStart := r.pos

		blockLength, err := r.readUint32()
		if err != nil {
			break
		}

		if blockStart+4+int(blockLength) > len(data) {
			break
		}

		r.pos++ // unknown
		r.pos++ // minVersion
		currentVersion, err := r.readUint8()
		if err != nil {
			break
		}
		blockType, err := r.readUint8()
		if err != nil {
			break
		}

		blockEnd := r.pos + int(blockLength)

		switch blockType {
		case blockTypeLineItem:
			line, err := parseV6LineBlock(r, currentVersion, blockEnd)
			if err == nil && line != nil {
				lines = append(lines, *line)
			}
		case blockTypeGlyphItem:
			hl, err := parseV6GlyphBlock(r, blockEnd)
			if err == nil && hl != nil {
				highlights = append(highlights, *hl)
			}
		}

		r.pos = blockEnd
	}

	result := &Rm{
		Version:    V6,
		Layers:     []Layer{{Lines: lines}},
		Highlights: highlights,
	}
	return result, nil
}

// parseV6LineBlock extracts a stroke from a v6 line-item block.
func parseV6LineBlock(r *v6Reader, blockVersion uint8, blockEnd int) (*Line, error) {
	// SceneItemBlock: parent_id, item_id, left_id, right_id, deleted_length
	if err := r.readTaggedId(1); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(2); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(3); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(4); err != nil {
		return nil, err
	}
	deletedLength, err := r.readTaggedInt(5)
	if err != nil {
		return nil, err
	}
	if deletedLength > 0 {
		return nil, nil
	}

	// Value subblock
	if !r.checkTag(6, tagLength4) {
		return nil, nil
	}
	valueLength, err := r.readUint32()
	if err != nil {
		return nil, err
	}
	valueEnd := r.pos + int(valueLength)

	itemType, err := r.readUint8()
	if err != nil {
		return nil, err
	}
	if itemType != lineItemType {
		r.pos = valueEnd
		return nil, nil
	}

	// Line data: tool, color, thickness_scale, starting_length, points
	pen, err := r.readTaggedInt(1)
	if err != nil {
		return nil, err
	}
	color, err := r.readTaggedInt(2)
	if err != nil {
		return nil, err
	}
	thicknessScale, err := r.readTaggedDouble(3)
	if err != nil {
		return nil, err
	}
	if _, err := r.readTaggedFloat(4); err != nil { // startingLength
		return nil, err
	}

	// Points subblock
	pointsLength, err := r.readSubblockHeader(5)
	if err != nil {
		return nil, err
	}
	pointsEnd := r.pos + int(pointsLength)

	pointVersion := 1
	if blockVersion >= 2 {
		pointVersion = 2
	}
	pointSize := 24
	if pointVersion == 2 {
		pointSize = 14
	}
	numPoints := int(pointsLength) / pointSize

	// v6 uses a center-origin X coordinate system (X=0 at page center).
	// Shift to match the v3/v5 left-origin system (X=0 at left edge).
	xOffset := float32(Width) / 2

	points := make([]Point, 0, numPoints)
	for i := 0; i < numPoints; i++ {
		x, err := r.readFloat32()
		if err != nil {
			return nil, err
		}
		x += xOffset
		y, err := r.readFloat32()
		if err != nil {
			return nil, err
		}

		var speed, direction, width, pressure float32

		if pointVersion == 2 {
			rawSpeed, err := r.readUint16()
			if err != nil {
				return nil, err
			}
			rawWidth, err := r.readUint16()
			if err != nil {
				return nil, err
			}
			rawDirection, err := r.readUint8()
			if err != nil {
				return nil, err
			}
			rawPressure, err := r.readUint8()
			if err != nil {
				return nil, err
			}
			speed = float32(rawSpeed)
			direction = float32(rawDirection)
			width = float32(rawWidth) / 4
			pressure = float32(rawPressure) / 255
		} else {
			speed, err = r.readFloat32()
			if err != nil {
				return nil, err
			}
			speed *= 4
			direction, err = r.readFloat32()
			if err != nil {
				return nil, err
			}
			direction = 255 * direction / (2 * math.Pi)
			width, err = r.readFloat32()
			if err != nil {
				return nil, err
			}
			pressure, err = r.readFloat32()
			if err != nil {
				return nil, err
			}
		}

		points = append(points, Point{
			X:         x,
			Y:         y,
			Speed:     speed,
			Direction: direction,
			Width:     width,
			Pressure:  pressure,
		})
	}

	r.pos = pointsEnd

	// Skip remaining fields (timestamp, move_id)
	r.pos = valueEnd

	line := &Line{
		BrushType:  BrushType(pen),
		BrushColor: BrushColor(color),
		BrushSize:  BrushSize(thicknessScale),
		Points:     points,
	}
	return line, nil
}

// parseV6GlyphBlock extracts a highlight from a v6 glyph-item block.
func parseV6GlyphBlock(r *v6Reader, blockEnd int) (*Highlight, error) {
	if err := r.readTaggedId(1); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(2); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(3); err != nil {
		return nil, err
	}
	if err := r.readTaggedId(4); err != nil {
		return nil, err
	}
	deletedLength, err := r.readTaggedInt(5)
	if err != nil {
		return nil, err
	}
	if deletedLength > 0 {
		return nil, nil
	}

	// Value subblock
	if !r.checkTag(6, tagLength4) {
		return nil, nil
	}
	valueLength, err := r.readUint32()
	if err != nil {
		return nil, err
	}
	valueEnd := r.pos + int(valueLength)

	itemType, err := r.readUint8()
	if err != nil {
		return nil, err
	}
	if itemType != glyphItemType {
		r.pos = valueEnd
		return nil, nil
	}

	// Optional tags 2 and 3
	if r.checkTag(2, tagByte4) {
		r.pos += 4
	}
	if r.checkTag(3, tagByte4) {
		r.pos += 4
	}

	// Color
	color, err := r.readTaggedInt(4)
	if err != nil {
		return nil, err
	}

	// Text subblock
	textSubLen, err := r.readSubblockHeader(5)
	if err != nil {
		return nil, err
	}
	textSubEnd := r.pos + int(textSubLen)

	strLen, err := r.readVaruint()
	if err != nil {
		return nil, err
	}
	r.pos++ // isAscii byte

	if r.remaining() < int(strLen) {
		return nil, fmt.Errorf("v6: unexpected EOF reading glyph text")
	}
	text := string(r.data[r.pos : r.pos+int(strLen)])
	r.pos = textSubEnd

	// Rects subblock
	rectsSubLen, err := r.readSubblockHeader(6)
	if err != nil {
		return nil, err
	}
	rectsSubEnd := r.pos + int(rectsSubLen)

	numRects, err := r.readVaruint()
	if err != nil {
		return nil, err
	}

	rects := make([]HighlightRect, 0, numRects)
	for i := uint32(0); i < numRects; i++ {
		x, err := r.readFloat64()
		if err != nil {
			return nil, err
		}
		y, err := r.readFloat64()
		if err != nil {
			return nil, err
		}
		w, err := r.readFloat64()
		if err != nil {
			return nil, err
		}
		h, err := r.readFloat64()
		if err != nil {
			return nil, err
		}
		rects = append(rects, HighlightRect{X: x, Y: y, W: w, H: h})
	}
	r.pos = rectsSubEnd

	// Optional explicit RGBA color (firmware 3.6+, tag 10, byte4).
	// Packed uint32 unpacks to (R, G, B, A) per rmscene's read_color_optional.
	var rgba *[4]uint8
	if r.pos < valueEnd && r.checkTag(10, tagByte4) {
		packed, err := r.readUint32()
		if err != nil {
			return nil, err
		}
		rgba = &[4]uint8{
			uint8((packed >> 16) & 0xFF),
			uint8((packed >> 8) & 0xFF),
			uint8(packed & 0xFF),
			uint8((packed >> 24) & 0xFF),
		}
	}

	r.pos = valueEnd

	if len(rects) == 0 {
		return nil, nil
	}

	return &Highlight{
		Color:     BrushColor(color),
		ColorRGBA: rgba,
		Text:      text,
		Rects:     rects,
	}, nil
}
