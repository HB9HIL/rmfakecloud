package integrations

import (
	"io"
	"io/fs"
	"os"
	"path"
	"strings"

	"github.com/ddvk/rmfakecloud/internal/messages"
	"github.com/ddvk/rmfakecloud/internal/model"
	log "github.com/sirupsen/logrus"
)

const (
	loggerfs = "[localfs] "
)

type localFS struct {
	rootPath string
}

// cleanPath anchors p at "/" so ".." cannot leave the root path
func cleanPath(p string) string {
	return path.Clean("/" + p)
}

// rootRel turns a path into one relative to the os.Root
func rootRel(p string) string {
	if r := strings.TrimPrefix(cleanPath(p), "/"); r != "" {
		return r
	}
	return "."
}

// newLocalFS localfs integration
func newLocalFS(i model.IntegrationConfig) *localFS {
	return &localFS{
		rootPath: i.Path,
	}
}

func (d *localFS) GetMetadata(fileID string) (*messages.IntegrationMetadata, error) {
	decoded, err := decodeName(fileID)
	if err != nil {
		return nil, err
	}

	ext := path.Ext(decoded)
	contentType := contentTypeFromExt(ext)

	return &messages.IntegrationMetadata{
		ID:               fileID,
		Name:             path.Base(decoded),
		Thumbnail:        []byte{},
		SourceFileType:   contentType,
		ProvidedFileType: contentType,
		FileType:         strings.TrimPrefix(ext, "."),
	}, nil
}

// List populates the response
func (d *localFS) List(folder string, depth int) (*messages.IntegrationFolder, error) {
	response := messages.NewIntegrationFolder(folder, "")

	if folder == rootFolder {
		folder = "/"
		response.Name = "LocalFS root"
	} else {
		decoded, err := decodeName(folder)
		if err != nil {
			return nil, err
		}
		folder = decoded
		response.Name = path.Base(folder)
	}

	startPath := cleanPath(folder)

	log.Infof("[localfs] query for '%s' depth %d: ", startPath, depth)

	// os.Root also stops symlinks from leaving the root path
	root, err := os.OpenRoot(d.rootPath)
	if err != nil {
		return nil, err
	}
	defer root.Close()

	err = visitDir("", startPath, depth, response, func(s string) ([]fs.FileInfo, error) {
		di, err := fs.ReadDir(root.FS(), rootRel(s))
		if err != nil {
			return nil, err
		}
		result := make([]fs.FileInfo, 0, len(di))
		for _, d := range di {
			fi, err := d.Info()
			if err != nil {
				log.Warnf("[localfs] cant get fileinfo %v", err)
				continue
			}
			result = append(result, fi)
		}
		return result, nil
	})
	if err != nil {
		return nil, err
	}

	return response, nil
}

func (d *localFS) Download(fileID string) (io.ReadCloser, int64, error) {
	decoded, err := decodeName(fileID)
	if err != nil {
		return nil, 0, err
	}

	log.Infof("[localfs] getting local file %s", cleanPath(decoded))

	res, err := os.OpenInRoot(d.rootPath, rootRel(decoded))
	if err != nil {
		return nil, 0, err
	}
	st, err := res.Stat()
	if err != nil {
		res.Close()
		return nil, 0, err
	}
	return res, st.Size(), nil
}

func (d *localFS) Upload(folderID, name, fileType string, reader io.ReadCloser) (id string, err error) {
	folder := "/"
	if folderID != rootFolder {
		folder, err = decodeName(folderID)
		if err != nil {
			return
		}
	}
	filePath := cleanPath(path.Join(folder, name+"."+fileType))
	log.Trace(loggerfs, "Cleaned: ", filePath)

	log.Trace(loggerfs, "Uploading to: ", filePath)
	root, err := os.OpenRoot(d.rootPath)
	if err != nil {
		return
	}
	defer root.Close()
	writer, err := root.Create(rootRel(filePath))
	if err != nil {
		return
	}
	defer writer.Close()

	_, err = io.Copy(writer, reader)

	if err != nil {
		return
	}
	id = encodeName(filePath)
	return
}
