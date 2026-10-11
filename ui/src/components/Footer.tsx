import { useEffect, useState } from "react";

import { getVersion } from "../api";

// the build version, rendered inside the logged in layout
export default function Footer() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    let live = true;
    getVersion()
      .then((r) => live && setVersion(r.version))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!version) return null;
  return <footer className="border-t border-line px-4 py-1 text-right text-xs text-muted">rmfakecloud {version}</footer>;
}
