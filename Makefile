VERSION :=$(shell git describe --tags --always)
LDFLAGS := "-s -w -X main.version=$(VERSION)"
OUT_DIR := dist
CMD := ./cmd/rmfakecloud
BINARY := rmfakecloud
BUILD = CGO_ENABLED=0 go build -ldflags $(LDFLAGS) -o $(@) $(CMD)
ASSETS = ui/dist
GOFILES := $(shell find . -iname '*.go' ! -iname "*_test.go")
GOFILES += $(ASSETS)
UIFILES := $(shell find ui/src)
UIFILES += $(shell find ui/public)
UIFILES += ui/package.json
TARGETS := $(addprefix $(OUT_DIR)/$(BINARY)-, x64 armv6 armv7 arm64 win64)
NPM	= cd ui; npm

.PHONY: all build dev image lint test e2e e2e-ui clean

build: $(OUT_DIR)/$(BINARY)-x64

all: $(TARGETS)

$(OUT_DIR)/$(BINARY)-x64:$(GOFILES)
	GOOS=linux GOARCH=amd64 $(BUILD)

$(OUT_DIR)/$(BINARY)-armv6:$(GOFILES)
	GOOS=linux GOARCH=arm GOARM=6 $(BUILD)

$(OUT_DIR)/$(BINARY)-armv7:$(GOFILES)
	GOOS=linux GOARCH=arm GOARM=7 $(BUILD)

$(OUT_DIR)/$(BINARY)-win64:$(GOFILES)
	GOOS=windows GOARCH=amd64 $(BUILD)

$(OUT_DIR)/$(BINARY)-arm64:$(GOFILES)
	GOOS=linux GOARCH=arm64 $(BUILD)

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
	go test -race ./...

# Playwright (e2e/) in its docker image against an empty instance built from the Dockerfile
# the image tag follows the pinned @playwright/test version
export PLAYWRIGHT_VERSION := $(shell sed -n 's/.*"@playwright\/test": "\(.*\)".*/\1/p' e2e/package.json)
e2e:
	docker compose up --build --detach --force-recreate e2e
	docker compose run --rm --no-deps --user $$(id -u):$$(id -g) playwright; status=$$?; docker compose rm --stop --force e2e; exit $$status

# Playwright UI on http://localhost:8081, start the instance first: docker compose up -d --build e2e
e2e-ui:
	docker compose run --rm --no-deps --user $$(id -u):$$(id -g) -p 8081:8081 playwright sh -c "npm ci && npx playwright test --ui-host=0.0.0.0 --ui-port=8081"
