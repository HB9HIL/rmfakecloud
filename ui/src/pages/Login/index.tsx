import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { ApiError, login } from "../../api";
import { cardClass } from "../../components/styles";
import { Alert, Button, Field } from "../../components/ui";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password, code);
      navigate("/documents", { replace: true });
    } catch (err) {
      // the password was right, the second factor is missing or wrong
      if (err instanceof ApiError && err.message === "totp") {
        setError(needCode ? "Invalid code" : "");
        setNeedCode(true);
        setCode("");
      } else {
        setError(`Can't login: ${(err as Error).message}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <form onSubmit={handleSubmit} className={`${cardClass} w-full max-w-sm p-6 sm:p-8`}>
        <h1 className="mb-6 font-serif text-2xl">Log in</h1>
        {error && <Alert>{error}</Alert>}
        <Field
          label="Username"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy || needCode}
          autoComplete="username"
          autoFocus
        />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy || needCode}
          autoComplete="current-password"
        />
        {needCode && (
          <Field
            label="Code"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            disabled={busy}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            hint="Enter the code from your authenticator app"
            autoFocus
          />
        )}
        <Button type="submit" variant="primary" className="mt-2 w-full" disabled={busy}>Login</Button>
      </form>
    </div>
  );
}
