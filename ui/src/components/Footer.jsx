import { useEffect, useState } from "react";

import apiservice from "../services/api.service";
import { useAuthState } from "../common/useAuthContext";

// the build version, only for logged in users
export default function Footer() {
  const { state: { user } } = useAuthState();
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!user) {
      setVersion("");
      return;
    }
    apiservice
      .getVersion()
      .then((r) => setVersion(r.version))
      .catch(() => setVersion(""));
  }, [user]);

  if (!version) return null;
  return <footer className="app-footer">rmfakecloud {version}</footer>;
}
