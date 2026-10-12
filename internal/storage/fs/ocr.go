package fs

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ddvk/rmfakecloud/internal/storage"
	"github.com/ddvk/rmfakecloud/internal/storage/models"
	log "github.com/sirupsen/logrus"
)

const (
	ocrQueueSize = 100
	// big scans take a while and the service runs one job at a time
	ocrTimeout = time.Hour
)

type ocrJob struct {
	uid, docID string
}

var ocrClient = &http.Client{Timeout: ocrTimeout}

// the document was deleted or changed while the ocr ran, or the pdf has text already
var errOCRUnchanged = errors.New("unchanged")

// queueOCR adds a text layer to the pdf of the document in the background, when an ocr service is configured
func (fs *FileSystemStorage) queueOCR(uid, docID string) {
	if fs.ocrJobs == nil {
		return
	}
	select {
	case fs.ocrJobs <- ocrJob{uid, docID}:
	default:
		log.Warn("ocr queue full, skipping ", docID)
	}
}

// ponytail: in-memory queue, lost on restart
func (fs *FileSystemStorage) ocrWorker() {
	for job := range fs.ocrJobs {
		err := fs.ocrDocument(job.uid, job.docID)
		if errors.Is(err, errOCRUnchanged) {
			continue
		}
		if err != nil {
			log.Warn("ocr ", job.docID, ": ", err)
			continue
		}
		log.Info("ocr: added text layer to ", job.docID)
		if fs.OnDocumentChanged != nil {
			fs.OnDocumentChanged(job.uid)
		}
	}
}

func pdfEntry(doc *models.HashDoc) *models.HashEntry {
	for _, e := range doc.Files {
		if e.EntryName == doc.EntryName+storage.PdfFileExt {
			return e
		}
	}
	return nil
}

// ocrDocument sends the pdf to the ocr service and replaces it with the result
func (fs *FileSystemStorage) ocrDocument(uid, docID string) error {
	tree, err := fs.GetCachedTree(uid)
	if err != nil {
		return err
	}
	doc, err := tree.FindDoc(docID)
	if err != nil {
		return err
	}
	entry := pdfEntry(doc)
	if entry == nil {
		return errors.New("no pdf")
	}
	oldHash := entry.Hash

	blobStorage := fs.BlobStorage(uid)
	pdf, err := blobStorage.GetReader(oldHash)
	if err != nil {
		return err
	}
	defer pdf.Close()

	resp, err := ocrClient.Post(strings.TrimSuffix(fs.Cfg.OCRURL, "/")+"/ocr", "application/pdf", pdf)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusNoContent:
		log.Info("ocr: pdf has text already: ", docID)
		return errOCRUnchanged
	default:
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("%s: %s", resp.Status, msg)
	}

	hash, size, err := storePayload(fs.getUserBlobPath(uid), resp.Body)
	if err != nil {
		return err
	}

	return updateTree(tree, blobStorage, func(t *models.HashTree) error {
		doc, err := t.FindDoc(docID)
		if err != nil {
			return errOCRUnchanged
		}
		e := pdfEntry(doc)
		if e == nil || e.Hash != oldHash {
			return errOCRUnchanged
		}
		doc.Size += size - e.Size
		e.Hash = hash
		e.Size = size
		if err := doc.Rehash(); err != nil {
			return err
		}
		index, err := doc.IndexReader()
		if err != nil {
			return err
		}
		if err := blobStorage.Write(doc.Hash, index); err != nil {
			return err
		}
		return t.Rehash()
	})
}
