// ocrserver adds a text layer to scanned pdfs with ocrmypdf, rmfakecloud calls it when RM_OCR_URL is set.
// No authentication, keep it in an internal network.
package main

import (
	"bytes"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
)

// ocrmypdf exit codes
const (
	// the output was written but fails the qpdf check
	invalidOutputPDF = 4
	// a page has text already
	alreadyDoneOCR = 6
)

// the qpdf check ocrmypdf runs on its output, exit code 3 when it finds problems
const checkPDF = "import pikepdf, sys; sys.exit(3 if pikepdf.open(sys.argv[1]).check() else 0)"

// inputInvalid tells if the input fails the check already, e.g. scanner jpegs qpdf can't decode
// but other readers can. ocrmypdf only passed them through, its output is as good as the input.
func inputInvalid(r *http.Request, file string) bool {
	err := exec.CommandContext(r.Context(), "python3", "-c", checkPDF, file).Run()
	var exit *exec.ExitError
	return errors.As(err, &exit) && exit.ExitCode() == 3
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	languages := env("OCR_LANGUAGES", "deu+eng")
	port := env("PORT", "8080")

	// ponytail: one job at a time, ocrmypdf uses all cores per job
	var mu sync.Mutex
	http.HandleFunc("POST /ocr", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()

		dir, err := os.MkdirTemp("", "ocr")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer os.RemoveAll(dir)
		in, out := filepath.Join(dir, "in.pdf"), filepath.Join(dir, "out.pdf")

		f, err := os.Create(in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_, err = io.Copy(f, r.Body)
		f.Close()
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// only add the text layer: no pdf/a, no image optimization (it can corrupt jpegs),
		// no deskew or rotation, the pages must stay as they are for the annotations
		var stderr bytes.Buffer
		cmd := exec.CommandContext(r.Context(), "ocrmypdf", "--output-type", "pdf", "--optimize", "0", "-l", languages, in, out)
		cmd.Stderr = &stderr
		err = cmd.Run()

		var exit *exec.ExitError
		switch {
		case err == nil:
			w.Header().Set("Content-Type", "application/pdf")
			http.ServeFile(w, r, out)
		case errors.As(err, &exit) && exit.ExitCode() == alreadyDoneOCR:
			w.WriteHeader(http.StatusNoContent)
		case errors.As(err, &exit) && exit.ExitCode() == invalidOutputPDF && inputInvalid(r, in):
			log.Print("ocrmypdf: the input fails the pdf check already, keeping the output")
			w.Header().Set("Content-Type", "application/pdf")
			http.ServeFile(w, r, out)
		default:
			msg := stderr.Bytes()
			msg = msg[max(0, len(msg)-1000):]
			log.Printf("ocrmypdf: %v: %s", err, msg)
			http.Error(w, string(msg), http.StatusUnprocessableEntity)
		}
	})

	log.Printf("listening on :%s, languages %s", port, languages)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
