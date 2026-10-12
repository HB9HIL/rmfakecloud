# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

#### Features
- The document viewer has a table of contents, search, text selection and printing (by @HB9HIL)
- Uploaded PDFs without text get a searchable text layer when an OCR service is configured (`RM_OCR_URL`, image `ghcr.io/hb9hil/rmfakecloud-ocr`) (by @HB9HIL)
- The web UI installs as an app on phones and tablets, on Android files can be shared to it (by @HB9HIL)
- `RM_SESSION_TTL` sets how long a web UI login lasts (by @HB9HIL)
- New Helm chart, published as `oci://ghcr.io/hb9hil/charts/rmfakecloud` with every release, optionally with the OCR service in the pod (by @HB9HIL)

#### Fixes
- The document viewer works on iOS before 26.2 and Samsung Internet (by @HB9HIL)
- A new version no longer loads assets of the old one from the browser cache (by @HB9HIL)

## [0.5.0] - 2026-10-12

#### Features
- File handling in the web UI works like a desktop file manager: context menu, keyboard shortcuts, inline renaming and drag and drop (by @HB9HIL)
- Deleting in the web UI moves to the trash, with undo (by @HB9HIL)
- Large documents open faster, the viewer loads only the pages it shows (by @HB9HIL)
- The document list and passcode reset requests update live (by @HB9HIL)

#### Fixes
- Deleting a folder also deletes its contents (by @HB9HIL)
- A folder can't be moved into itself (by @HB9HIL)
- Changes in the web UI notify the tablet to sync (by @HB9HIL)
- A document that can't be shown as a PDF no longer replaces the whole page with an error (by @HB9HIL)
- The document list shows the right icons for PDFs and EPUBs again (by @HB9HIL)
- Fix UI freeze while loading huge pdf/epubs (by @HB9HIL)

## [0.4.1] - 2026-10-11

#### Fixes
- Widen the notebook pages to nothing get cut off in the PDF export (by @HB9HIL)

## [0.4.0] - 2026-10-11

#### Features
- New look for the web UI: a paper-like design, light and dark theme follow the system and can be switched (by @HB9HIL)

#### Chore
- The web UI is written in TypeScript and uses Tailwind CSS instead of Bootstrap and React Router for data loading (by @HB9HIL)
- CI no longer cancels a running build on master when a new commit is pushed, so the `bleeding_edge` image always gets finished (by @HB9HIL)

#### Fixes
- "Select all" in the document list selects the documents for deleting (by @HB9HIL)
- Screen sharing notices a dropped connection right away (by @HB9HIL)

## [0.3.3] - 2026-10-11

#### Chore
- The Docker image cross-compiles the Go binary for arm instead of building under QEMU, all platforms build in one job (by @HB9HIL)

#### Fixes
- Text highlights in PDFs and EPUBs (firmware 3.x) show up in the PDF export (by @HB9HIL)
- The document viewer no longer draws a white box wider than the page (by @HB9HIL)
- `GET /sync/v3/missing` lists the blobs the current root references but the server doesn't have, instead of always an empty list (by @HB9HIL)

## [0.3.2] - 2026-10-11

#### Features
- The web UI shows the server version in the footer when logged in (by @HB9HIL)

#### Chore
- Documented the screen sharing setup for tablet software up to 3.26 (by @HB9HIL)

#### Fixes
- Documents with a fractional text scale from newer firmware can be exported again ([ddvk#499](https://github.com/ddvk/rmfakecloud/pull/499)) (by @cyc115)
- Web screen sharing decodes frames that arrive in several messages correctly ([ddvk#457](https://github.com/ddvk/rmfakecloud/pull/457)) (by @rmitchellscott)
- `check-files` reports blobs missing on the server, so the tablet uploads them again (by @HB9HIL)
- The sync root only accepts sha256 hashes, other values could break the generation counter (by @HB9HIL)

## [0.3.1] - 2026-10-11

Security Release

#### Chore
- Updated the documentation: integrations, configuration, reverse proxies, outdated steps (by @HB9HIL)

#### Fixes
- `make all` builds the right architectures on any host, e.g. on Apple Silicon (by @HB9HIL)
- `RM_TRUST_PROXY=1` trusted X-Forwarded-For from any client, which allowed bypassing the login limiter and fail2ban. It now only trusts proxies on loopback and private networks, or a list of proxy IPs/CIDRs (by @HB9HIL)
- The signature of sync blob URLs could be reused for another user's blobs on instances with several users (by @HB9HIL)
- Deleting a user with the id `.` or `..` removed all users or the whole data directory (by @HB9HIL)
- Changing the password and registering no longer return the user profile with the password hash and integration credentials (by @HB9HIL)
- A password change ends all web UI sessions of the user, deleted users and removed admin rights apply immediately instead of after up to 24 hours (by @HB9HIL)
- Screen sharing rooms are only visible and usable by their own user, also over MQTT (by @HB9HIL)
- The local file system integration no longer follows symlinks out of its directory (by @HB9HIL)
- A login with an unknown user takes as long as one with a wrong password, so it no longer reveals which users exist (by @HB9HIL)
- User ids can contain `-`, the characters `[\]^` are removed (by @HB9HIL)
- Small fixes in the upload handlers of the tablet API (by @HB9HIL)

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
