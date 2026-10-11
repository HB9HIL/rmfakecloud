import Container from "react-bootstrap/Container";

const Home = () => {
  return (
    <Container className="py-3">
      <main>
        <h1>Welcome to your own reMarkable Cloud!</h1>
        <p>
          rmfakecloud is an unofficial replacement for the proprietary
          reMarkable Cloud, to sync and back up your files on a server you
          control. It is actively maintained
          on <a href="https://github.com/hb9hil/rmfakecloud">GitHub</a>.
        </p>
        <h2>Tips</h2>
        <ul>
          <li>
            Manage files with <a href="https://github.com/ddvk/rmapi">rmapi</a> by
            pointing it to this instance: <code>RMAPI_HOST=https://rmfakecloud.example.com rmapi</code>
          </li>
          <li>
            The <a href="https://hb9hil.github.io/rmfakecloud/">documentation</a> covers
            the configuration and the Read on reMarkable extension, the <a href="https://github.com/hb9hil/rmfakecloud/blob/master/README.md">README</a> the
            current state of the project.
          </li>
          <li>
            Uploads go to the selected folder in Documents. Click a folder to
            select it, click it again to open or close it.
          </li>
        </ul>
      </main>
    </Container>
  );
};

export default Home;
