Integration is the [feature added in reMarkable
2.10](https://support.remarkable.com/hc/en-us/articles/4406214540945)
that allows to browse, download and upload document from location
outside of the tablet.

Add and edit your integrations on the Integrations page of the web UI. They are
stored in your [`.userprofile`](userprofile.md).


## WebDAV

Any WebDAV service, for example a Nextcloud/Owncloud instance.

| Field | Description |
|-------|-------------|
| Address | WebDAV url, e.g. `https://home.example.com/remote.php/dav/files/user42/` |
| Username / Password | Credentials for the WebDAV service |
| Insecure | Skip the certificate check |


## FTP

| Field | Description |
|-------|-------------|
| Address | FTP server, e.g. `ftp.example.com:21`. Prefix `ftps://` for implicit TLS, `ftpes://` for explicit TLS |
| Username / Password | Credentials for the FTP server |
| Active transfers | Use active instead of passive mode |


## Dropbox

| Field | Description |
|-------|-------------|
| Access Token | A Dropbox access token, created in the [Dropbox App Console](https://www.dropbox.com/developers/apps) |


## Local File System

!!! warning
    Experimental and not suited for multiple users yet

You can share a dedicated path on your system. This can be a simple directory or a mount point using FUSE or whatever.
The tablet can't access anything outside of this path.

For security reasons the web UI can't create or edit this integration, it shows
the entry to add to your [`.userprofile`](userprofile.md) instead:

```yaml
integrations:
  - provider: localfs
    id: [generate some uuid]
    name: [some name]
    path: /some/path/with/files
```


## ICS Calendar

Shows a calendar from an ICS url on the tablet.

| Field | Description |
|-------|-------------|
| ICS URL | Url of the `.ics` file |
| Insecure | Skip the certificate check |


## Messaging webhook

Messaging are a type of integration added in software 3.17.

Originally designed for Slack, this feature allows you to send your current sheet as an attachment to a Slack Canvas. The default behavior uses AI to transcribe the handwritten content on your sheet and posts both the text and the image to Slack.

The Webhook integration extends this capability by sending your sheet to an external automation platform (like [n8n](https://n8n.io/), [Make.com](https://www.make.com/), ...) or custom service. This is especially useful if you want to: use your own AI pipeline or don't want AI to be involved at all, or store and process sheets in a custom backend, ...

| Field | Description |
|-------|-------------|
| Endpoint | Url that receives a multipart POST with the metadata (`data`) and the sheet as PNG (`attachment`) |

The webhook gives you full control: you decide what happens with your data.
