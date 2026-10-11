import { useCallback, useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-toastify";

import apiservice from "../../services/api.service";

export default function TwoFactor() {
  const [totp, setTotp] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiservice.getTOTP()
      .then(setTotp)
      .catch((e) => setError(e.toString()));
  }, []);

  useEffect(load, [load]);

  function handleSubmit(event) {
    event.preventDefault();
    const request = totp.enabled
      ? apiservice.disableTOTP(code)
      : apiservice.enableTOTP(totp.secret, code);
    request
      .then(() => {
        toast.success(totp.enabled ? "Two-factor login disabled" : "Two-factor login enabled");
        setCode("");
        setError(null);
        load();
      })
      .catch((e) => setError(e.message));
  }

  if (!totp) return null;

  return (
    <>
      <h3 className="mt-4">Two-factor login</h3>
      {totp.enabled ? (
        <p>Enabled. Enter a code from your authenticator app to disable it.</p>
      ) : (
        <>
          <p>Scan the QR code with an authenticator app, then enter the code it shows.</p>
          <div className="bg-white p-3 mb-2 d-inline-block">
            <QRCodeSVG value={totp.uri} size={180} />
          </div>
          <p className="font-monospace text-break small">{totp.secret}</p>
        </>
      )}
      <Form onSubmit={handleSubmit} autoComplete="off">
        <Form.Group controlId="formTotpCode" className="mb-3">
          <Form.Label>Code</Form.Label>
          <Form.Control
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
          />
        </Form.Group>
        {error && <div className="alert alert-danger">{error}</div>}
        <Button variant={totp.enabled ? "danger" : "primary"} type="submit">
          {totp.enabled ? "Disable" : "Enable"}
        </Button>
      </Form>
    </>
  );
}
