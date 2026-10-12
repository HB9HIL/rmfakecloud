You can evaluate the program with:

```sh
docker run -it --rm -p 3000:3000 ghcr.io/hb9hil/rmfakecloud
```

For normal usage, you need a volume to store user configuration and documents:

```sh
docker run -it --rm -p 3000:3000 -p 8883:8883 -v ./data:/data -e JWT_SECRET_KEY='something' ghcr.io/hb9hil/rmfakecloud
```

Explore others configuration variables on [the dedicated page](configuration.md).


## docker-compose file

```yaml
services:
  rmfakecloud:
    image: ghcr.io/hb9hil/rmfakecloud
    container_name: rmfakecloud
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "8883:8883"
    env_file:
      - env
    volumes:
      - ./data:/data
```

In this example, an external file named `env` is provided that contains the environment variables. Any of the [ways to set environment variables](https://docs.docker.com/compose/environment-variables/set-environment-variables/) for docker compose will work.

For the possible environment variables, please have a look in the [configuration](configuration.md) section.

## OCR for scanned PDFs

The image `ghcr.io/hb9hil/rmfakecloud-ocr` runs [OCRmyPDF](https://ocrmypdf.readthedocs.io/) and adds a text layer to uploaded scans, so they can be searched on the tablet and in the web UI. Add it next to rmfakecloud and point `RM_OCR_URL` to it:

```yaml
services:
  rmfakecloud:
    # ...
    environment:
      RM_OCR_URL: http://ocr:8080

  ocr:
    image: ghcr.io/hb9hil/rmfakecloud-ocr
    restart: unless-stopped
    environment:
      OCR_LANGUAGES: deu+eng
```

The service has no authentication, don't publish its port.

`OCR_LANGUAGES` takes the Tesseract languages joined with `+`, the image contains `deu` and `eng`. For other languages, build your own image on top of it:

```dockerfile
FROM ghcr.io/hb9hil/rmfakecloud-ocr
USER root
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr-fra && rm -rf /var/lib/apt/lists/*
USER nobody
```

## Rebuild the image

```sh
make image
```
