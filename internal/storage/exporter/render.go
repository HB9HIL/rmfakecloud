package exporter

import (
	"bytes"
	"io"
)

type SeekCloser struct {
	*bytes.Reader
}

// Close closes
func (*SeekCloser) Close() error {
	return nil
}

func NewSeekCloser(b []byte) io.ReadSeekCloser {

	r := &SeekCloser{
		Reader: bytes.NewReader(b),
	}
	return r
}
