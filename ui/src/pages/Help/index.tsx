import { Link } from "react-router";

export default function Help() {
  return (
    <div className="prose mx-auto max-w-prose px-4 py-10">
      <h1>Help</h1>
      <p>
        rmfakecloud is a self-hosted replacement for the reMarkable cloud: your tablet syncs with this server
        instead of my.remarkable.com.
      </p>

      <h2>Connect a tablet</h2>
      <p>
        Point the tablet to this server (see the <a href="https://hb9hil.github.io/rmfakecloud/">documentation</a>),
        then enter the one-time code from <Link to="/connect">Connect</Link> on the tablet.
      </p>

      <h2>Documents</h2>
      <ul>
        <li>Click a folder in the tree to open it, click it again to close it.</li>
        <li>Uploads (PDF, EPUB, .rmdoc) go to the open folder, by drag and drop or by clicking the upload area.</li>
        <li>Open a document to view it, download it as PDF with your annotations or as .rmdoc.</li>
        <li>
          From the command line, <a href="https://github.com/ddvk/rmapi">rmapi</a> works with this server:{" "}
          <code>RMAPI_HOST=https://rmfakecloud.example.com rmapi</code>
        </li>
      </ul>

      <h2>Screen share</h2>
      <p>
        Open <Link to="/screenshare">Screen Share</Link>, then start sharing on the tablet. The page connects as soon
        as the tablet is ready.
      </p>

      <h2>Integrations</h2>
      <p>
        <Link to="/integrations">Integrations</Link> make WebDAV, FTP, Dropbox, a local folder, a messaging webhook or
        an ICS calendar available on the tablet.
      </p>

      <h2>As an app</h2>
      <ul>
        <li>Android: install it from the Chrome menu (Install app or Add to Home screen). Then you can share PDFs and EPUBs from other apps to rmfakecloud.</li>
        <li>iPhone and iPad: in Safari, tap Share, then Add to Home Screen. Documents are saved with Share instead of downloads.</li>
      </ul>

      <h2>Account</h2>
      <p>
        Change your password and turn on two-factor login in your <Link to="/profile">profile</Link>.
      </p>

      <h2>More</h2>
      <p>
        The <a href="https://hb9hil.github.io/rmfakecloud/">documentation</a> covers installation and configuration.
        Bugs and ideas are welcome on <a href="https://github.com/hb9hil/rmfakecloud">GitHub</a>.
      </p>
    </div>
  );
}
