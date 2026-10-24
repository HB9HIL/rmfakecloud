# rmfakecloud

This is a replacement of the cloud, in case you want to sync/backup your files and have full control of the hosting environment.

See the [project documentation](https://hb9hil.github.io/rmfakecloud/) for setup and configuration.

## Supported Devices

| Device               | Is Supported |
| -------------------- | ------------ |
| reMarkable 1         | ✅           |
| reMarkable 2         | ✅           |
| reMarkable Paper Pro | ✅           |
| reMarkable Paper Pro Move | ✅           |
| reMarkable Paper Pure| ✅           |

The current release of rmfakecloud supports file synchronization up to **reMarkable software 3.27.1**. Newer releases have not been tested yet.

See the [documentation](https://hb9hil.github.io/rmfakecloud/remarkable/setup/) for how to setup your device to use rmfakecloud.


## Feature Parity With Official Cloud

| Features | Supported | Notes |
| -------- | --------- | ----- |
| File synchronization (1.0) | ✅ |  |
| File synchronization (1.5, 2, 3, 4) | ✅ |  |
| [Send document by email](https://hb9hil.github.io/rmfakecloud/install/configuration/#email-settings) | ✅ |  |
| [Handwriting recognition](https://hb9hil.github.io/rmfakecloud/install/configuration/#handwriting-recognition) | ✅ |  |
| Handwriting search | ❌ |  |
| [Screen sharing](https://hb9hil.github.io/rmfakecloud/install/configuration/#screen-sharing) | ✅ |  |
| [Storage integrations](https://hb9hil.github.io/rmfakecloud/usage/integrations/) | ✅ |  |
| Integration with Dropbox | 🟡 | [WIP](https://github.com/hb9hil/rmfakecloud/blob/master/internal/integrations/dropbox.go) |
| Integration with Google Drive | 🟡 | [WIP](https://github.com/ddvk/rmfakecloud/pull/241) |
| Integration with OneDrive | ❌ |  |
| Integration with WebDAV | ✅ | Nextcloud, Owncloud, ... |
| Integration with FTP | ✅ |  |
| Messaging integrations | ✅ |  |
| [Messaging integration through webhook](https://hb9hil.github.io/rmfakecloud/usage/integrations/#messaging-webhook) | ✅ |  |
| Calendar integration | ✅ | ICS currently supported
| Messaging integration to Slack | 🟡 | Not directly, use a webhook with zapier/make/n8n |
| Archive document to cloud | 🟡 | It works but the information is not saved |
| [Passcode (PIN) reset](https://hb9hil.github.io/rmfakecloud/usage/passcode-reset/) | ✅ | reMarkable 1 / reMarkable 2 only |
| Document rendering in web interface | ❌ | [WIP](https://github.com/ddvk/rmfakecloud/issues/255) |


## Breaking Changes

- For SW >= 3.15 `STORAGE_URL` should not be set (or only https://some.ho.st without a port should be used)
- after v0.0.3 the files in `/data` will have to be manually moved to the user that will be created
- with v0.0.5 the new diff sync15 is added as an option, in order to use it modify the user with `setuser -u user -s`
  or modify the profile and add `sync15:true`
  a full resync will be needed (the tablet will do it), the old files are kept as they were and everything is put in a new directory

## Development

`make dev` starts everything in docker compose: the UI with hot reload on
http://localhost:3001, the backend on http://localhost:3000 (rebuilt on Go
changes) and mailpit for outgoing mails on http://localhost:8025. The first
login creates the admin user. `make test` and `make lint` run natively with Go.
`make e2e` runs the Playwright tests in `e2e/` in the Playwright docker image
against an empty instance built from the Dockerfile; traces and screenshots of
failed tests land in `e2e/test-results` (open traces on https://trace.playwright.dev).
For writing tests start that instance with `docker compose up -d --build e2e` and
the Playwright UI with `make e2e-ui`, then open http://localhost:8081.

Releases: note the changes under `## [Unreleased]` in `CHANGELOG.md`, move them
into a `## [X.Y.Z] - date` section and push the tag `vX.Y.Z`. The release
workflow runs the tests, takes that section as the release notes and attaches
binaries for Linux (amd64, arm64, armv7, armv6) and Windows (amd64). The Docker
workflow pushes the multi-arch image `ghcr.io/hb9hil/rmfakecloud:X.Y.Z` (also
tagged `latest`). Every push to `master` publishes
`ghcr.io/hb9hil/rmfakecloud:<git describe>` and `:bleeding_edge`

### Caveats/ WARNING

- (applies when you don't have security, version <= 0.0.3) connecting to the api will delete all your files, unless you mark them as not synced `synced:false` prior to syncing (advisable just to disconnect, reconnect the cloud)
- **if you delete files from the users directory** on the host, on the next sync those will be deleted from the device
- if you delete the whole user directory (by mistake) on the host, you should disconnect the cloud from the device and reconnect it
- after an official update, the proxy and hosts file changes will be removed, the tablet will automatically disconnect from the cloud (by sending an invalid token to the official cloud and getting 403)
  just reinstall the proxy and reconnect to your cloud

## Troubleshooting
- check the connectivity between the tablet and the host:
    ping my.remarkable.com (should be localhost)
    ping local.remarkable.com (should be localhost)
    ping thehostpc
    wget -qO- http://host:3000 (or relevant ports, should get Working...)
    wget -qO- https://local.appspot.com (should get Working...)

- check that the proxy is running and certs are installed:
    ```
    echo Q | openssl s_client -connect localhost:443  -verify_hostname local.appspot.com -CAfile /etc/ssl/certs/ca-certificates.crt 2>&1 | grep Verify
    ```
    You should see: *Verify return code: 0 (ok)*

- if both (host and tablet) are on a wifi make sure "Client Isolation" is not activated on the AP

- check if the proxy is configured correctly
    ```
    systemctl status proxy

    #or

    journalctl -u proxy
    ```
- check whether the CA cert was installed correctly
    when doing `update-ca-certificates` there should have been `1 added`
    check the logs

- check xochitls's logs, stop the service, start manually with more logging
    ```
    systemctl stop xochitl
    QT_LOGGING_RULES=rm.network.*=true xochitl | grep -A3 QUrl

    ```
    if you see *SSL Handshake failed* then something is wrong with the certs
- check sync logs
   ```
   journalctl -u rm-sync
   ```
