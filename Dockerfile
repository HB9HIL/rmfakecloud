ARG VERSION=0.0.0
FROM --platform=$BUILDPLATFORM node:26 AS uibuilder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# node >= 25 no longer ships corepack, it picks pnpm from packageManager in package.json
RUN npm install -g corepack && corepack enable pnpm

WORKDIR /src
COPY ui/package.json ui/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY ui .
RUN pnpm build

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
