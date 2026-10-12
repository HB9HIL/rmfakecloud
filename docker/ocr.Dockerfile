# OCR service for rmfakecloud (RM_OCR_URL), see docs/install/docker.md
# More languages: derive from this image, apt-get install tesseract-ocr-<lang> and set OCR_LANGUAGES
FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS gobuilder
ARG TARGETOS TARGETARCH TARGETVARIANT
WORKDIR /src
COPY go.mod go.sum ./
COPY cmd/ocrserver ./cmd/ocrserver
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH GOARM=${TARGETVARIANT#v} go build -ldflags "-s -w" -o /ocrserver ./cmd/ocrserver

FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ocrmypdf tesseract-ocr-deu tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*
COPY --from=gobuilder /ocrserver /usr/local/bin/ocrserver
USER nobody
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/ocrserver"]
