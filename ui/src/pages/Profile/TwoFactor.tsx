import { useState, type FormEvent } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-toastify";

import { disableTOTP, enableTOTP, type getTOTP } from "../../api";
import { Alert, Button, Field } from "../../components/ui";

export default function TwoFactor() {
  const totp = useLoaderData<typeof getTOTP>();
  const revalidator = useRevalidator();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (totp.enabled) await disableTOTP(code);
      else await enableTOTP(totp.secret, code);
      toast.success(totp.enabled ? "Two-factor login disabled" : "Two-factor login enabled");
      setCode("");
      setError("");
      revalidator.revalidate();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      {totp.enabled ? (
        <p className="mb-4 text-sm">Enabled. Enter a code from your authenticator app to disable it.</p>
      ) : (
        <>
          <p className="mb-4 text-sm">Scan the QR code with an authenticator app, then enter the code it shows.</p>
          {/* dark modules on white, so it scans in the dark theme too */}
          <div className="mb-3 inline-block rounded bg-white p-3">
            <QRCodeSVG value={totp.uri} size={180} />
          </div>
          <p className="mb-4 font-mono text-sm break-all text-muted">{totp.secret}</p>
        </>
      )}
      <form onSubmit={handleSubmit} autoComplete="off">
        <Field
          label="Code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          required
        />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" variant={totp.enabled ? "danger" : "primary"}>{totp.enabled ? "Disable" : "Enable"}</Button>
      </form>
    </>
  );
}
