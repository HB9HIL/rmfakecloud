VERSION :=$(shell git describe --tags --always)
LDFLAGS := "-s -w -X main.version=$(VERSION)"
OUT_DIR := dist
CMD := ./cmd/rmfakecloud
BINARY := rmfakecloud
BUILD = go build -ldflags $(LDFLAGS) -o $(@) $(CMD) 
ASSETS = ui/dist
GOFILES := $(shell find . -iname '*.go' ! -iname "*_test.go")
GOFILES += $(ASSETS)
UIFILES := $(shell find ui/src)
UIFILES += $(shell find ui/public)
UIFILES += ui/package.json
TARGETS := $(addprefix $(OUT_DIR)/$(BINARY)-, x64 armv6 armv7 arm64 win64)
NPM	= cd ui; npm

.PHONY: all build dev image lint test clean

build: $(OUT_DIR)/$(BINARY)-x64

all: $(TARGETS)

$(OUT_DIR)/$(BINARY)-x64:$(GOFILES)
	GOOS=linux $(BUILD)

$(OUT_DIR)/$(BINARY)-armv6:$(GOFILES)
	GOARCH=arm GOARM=6 $(BUILD)

$(OUT_DIR)/$(BINARY)-armv7:$(GOFILES)
	GOARCH=arm GOARM=7 $(BUILD)

$(OUT_DIR)/$(BINARY)-win64:$(GOFILES)
	GOOS=windows $(BUILD)

$(OUT_DIR)/$(BINARY)-arm64:$(GOFILES)
	GOARCH=arm64 $(BUILD)

dev:
	mkdir -p data
	DEV_UID=$$(id -u) DEV_GID=$$(id -g) docker compose up --build --watch

image:
	docker build -t rmfakecloud --build-arg VERSION=$(VERSION) .

$(ASSETS): $(UIFILES) ui/package-lock.json
	$(NPM) run build

ui/package-lock.json: ui/node_modules ui/package.json
	$(NPM) install
	@touch -mr $(shell ls -Atd $? | head -1) $@

ui/node_modules:
	mkdir -p $@

clean:
	rm -f $(OUT_DIR)/*
	rm -fr $(ASSETS)

# same checks as CI, ui/dist is only built if missing
lint:
	@test -e $(ASSETS) || $(MAKE) $(ASSETS)
	@test -z "$$(gofmt -l cmd internal)" || { gofmt -l cmd internal; exit 1; }
	go vet ./...

test:
	@test -e $(ASSETS) || $(MAKE) $(ASSETS)
	go test ./...

