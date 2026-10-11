ARG VERSION=0.0.0
FROM --platform=$BUILDPLATFORM node:26 AS uibuilder
WORKDIR /src
COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui .
RUN npm run build

FROM golang:1.26-bookworm AS gobuilder
ARG VERSION
WORKDIR /src
COPY . .
COPY --from=uibuilder /src/dist ./ui/dist
#RUN apk add git
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    go generate ./... && CGO_ENABLED=0 go build -ldflags "-s -w -X main.version=${VERSION}" -o rmfakecloud-docker ./cmd/rmfakecloud/

FROM scratch
EXPOSE 3000
ADD ./docker/rootfs.tar /
COPY --from=gobuilder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=gobuilder /src/rmfakecloud-docker /
ENTRYPOINT ["/rmfakecloud-docker"]
