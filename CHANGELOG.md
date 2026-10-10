# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The first release of the curated `rmfakecloud` fork by @HB9HIL. I forked this project to fix some issues and make it easier to build and continue maintaining it. The original project is [here](https://github.com/ddvk/rmfakecloud). Unfortunately, it seems to have fallen into a deep sleep and the original author is barely responding to issues or PRs. I will try to keep this fork alive and up to date with the latest upstream changes. Big thanks to @ddvk for creating this project. I will do my very best to keep this fork alive and up to date.

### Changes in this fork for now:

#### Chore
- Updated go version and external modules to the latest versions (by @HB9HIL)
- Replaced the unmaintained `rmapi` dependency with the archive and `.rm` decoding code from [ddvk/rmapi](https://github.com/ddvk/rmapi), which can also parse the v6 format (by @HB9HIL)