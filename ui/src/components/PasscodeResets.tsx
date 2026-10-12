import { useCallback, useEffect, useState } from "react";

import { approvePasscodeReset, dismissPasscodeReset, listPasscodeResets } from "../api";
import { useServerEvent } from "../events";
import { formatDate } from "../format";
import type { PasscodeReset } from "../types";
import { Alert, Button } from "./ui";

// passcode (PIN) reset requests from the tablet, shown while logged in
export default function PasscodeResets() {
  const [resets, setResets] = useState<PasscodeReset[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    listPasscodeResets()
      .then((list) => {
        setResets(list ?? []);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);
  // pushed by the server when the tablet asks or a request is handled
  useServerEvent("passcode", load);
  useServerEvent("open", load);

  const act = (request: Promise<unknown>) => request.then(load).catch((e: Error) => setError(e.message));

  if (error) {
    return <div className="px-4 pt-3"><Alert>{error}</Alert></div>;
  }
  if (resets.length === 0) return null;

  return (
    <div className="divide-y divide-line border-b border-line bg-accent/10 px-4">
      {resets.map((r) => (
        <div key={r.RequestID} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <div><strong>Passcode reset requested</strong> — {r.DeviceName || "device"}</div>
            <div className="text-sm text-muted">{r.DeviceID} · {formatDate(r.Created)}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act(dismissPasscodeReset(r.RequestID))}>Dismiss</Button>
            <Button size="sm" variant="primary" onClick={() => act(approvePasscodeReset(r.RequestID))}>Approve</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
