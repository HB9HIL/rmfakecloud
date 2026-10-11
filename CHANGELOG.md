# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

#### Chore
- Updated the documentation: integrations, configuration, reverse proxies, outdated steps (by @HB9HIL)

#### Fixes
- `make all` builds the right architectures on any host, e.g. on Apple Silicon (by @HB9HIL)
- `RM_TRUST_PROXY=1` trusted X-Forwarded-For from any client, which allowed bypassing the login limiter and fail2ban. It now only trusts proxies on loopback and private networks, or a list of proxy IPs/CIDRs (by @HB9HIL)
- The signature of sync blob URLs could be reused for another user's blobs on instances with several users (by @HB9HIL)

## [0.3.0] - 2026-10-11

#### Features
- Optional two-factor login (TOTP) for the web UI (by @HB9HIL)
- Failed web UI logins are limited per IP address (by @HB9HIL)

#### Chore
- Cypress runs in Chrome instead of the deprecated Electron (by @HB9HIL)
- Cleaned up the styles and page layouts of the web UI (by @HB9HIL)
- Cypress tests for the web UI on a phone (by @HB9HIL)

#### Fixes
- Concurrent sync requests wait for the root lock instead of failing with 500 (by @HB9HIL)
- The cached sync tree is written atomically, a crash no longer leaves it truncated (by @HB9HIL)
- The PDF export uses the exact stroke colors of newer firmware (by @HB9HIL)
- The web UI works on mobile devices, the document tree slides in from the side (by @HB9HIL)

## [0.2.1] - 2026-10-11

#### Fixes
- The LocalFS integration no longer allows access outside of its folder via `..` (by @HB9HIL)
- Logout clears the session cookie (by @HB9HIL)
- User ids `.` and `..` are rejected (by @HB9HIL)
- Email bodies are encoded as quoted-printable, as declared (by @HB9HIL)
- The JWT secret, WebDAV passwords and cookies are no longer logged (by @HB9HIL)

#### Chore
- Removed the unused `ui/public/pdf.worker.js` (by @HB9HIL)

## [0.2.0] - 2026-10-11

#### Chore
- Simplify local development (by @HB9HIL)
- The UI uses npm instead of pnpm (by @HB9HIL)
- The UI is linted in CI (by @HB9HIL)
- Updated the UI build tooling, which also fixes the `npm audit` findings (by @HB9HIL)
- Updated the UI libraries to React 19 and others (by @HB9HIL)
- Tests for the `.rm` parser, the archive and the PDF export (by @HB9HIL)
- Test for pairing and the sync API of the tablet (by @HB9HIL)
- Cypress tests for the web UI, run with `make e2e` and in CI (by @HB9HIL)
- One CI workflow instead of five, images and releases are only published after the tests pass (by @HB9HIL)

#### Fixes
- A stale generation on `PUT /sync/v3/root` returns 412 instead of 500 (by @HB9HIL)

## [0.1.0] - 2026-10-10

The first release of the curated `rmfakecloud` fork by @HB9HIL. I forked this project to fix some issues and make it easier to build and continue maintaining it. The original project is [here](https://github.com/ddvk/rmfakecloud). Unfortunately, it seems to have fallen into a deep sleep and the original author is barely responding to issues or PRs. I will try to keep this fork alive and up to date with the latest upstream changes. Big thanks to @ddvk for creating this project. I will do my very best to keep this fork alive and up to date.

### Changes in this fork for now:

#### Chore
- Updated go version and external modules to the latest versions (by @HB9HIL)
- Replaced the unmaintained `rmapi` dependency with the archive and `.rm` decoding code from [ddvk/rmapi](https://github.com/ddvk/rmapi), which can also parse the v6 format (by @HB9HIL)
- Replaced the commercial `unipdf` library with a small PDF renderer in pure Go, no cgo needed (by @HB9HIL)
- Releases are built from this changelog, with binaries for Linux (amd64, arm64, armv7, armv6) and Windows (amd64). The Docker image moved to `ghcr.io/hb9hil/rmfakecloud` (by @HB9HIL)
- Removed the unmaintained Helm chart, it shipped a fixed default JWT secret and a HorizontalPodAutoscaler for an API removed in Kubernetes 1.26 (by @HB9HIL)

#### Features
- PDF export of notebooks and annotated PDFs written with firmware 3.x (v6 format) (by @HB9HIL)

#### Fixes
- Pages without annotations are no longer dropped from the PDF export, so annotations stay on the right page ([ddvk#228](https://github.com/ddvk/rmfakecloud/issues/228)) (by @HB9HIL)
- Pages inserted, deleted or moved on the tablet are reflected in the PDF export of annotated PDFs (by @HB9HIL)
- Annotations on PDF forms are no longer covered by the form fields, the fields are flattened in the export (by @HB9HIL)
- Stroke colors are rendered correctly, previously all strokes were black (by @HB9HIL)
- Highlighter and shader strokes are semi-transparent (by @HB9HIL)
- Notebook pages extended downwards are exported completely (by @HB9HIL)