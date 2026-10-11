import { useState, type FormEvent } from "react";

import { createIntegration, updateIntegration } from "../../api";
import { inputClass } from "../../components/styles";
import { Alert, Button, Field } from "../../components/ui";
import type { Integration } from "../../types";

const providers = [
  ["localfs", "Directory in file system"],
  ["webdav", "WebDAV"],
  ["ftp", "FTP"],
  ["dropbox", "Dropbox"],
  ["webhook", "Messaging webhook"],
  ["ics", "ICS Calendar"],
];

// new integration without `integration`, otherwise edit it
export default function IntegrationForm({
  integration,
  onDone,
  onCancel,
}: {
  integration?: Integration;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Integration>(integration ?? { ID: "", Name: "", Provider: "localfs" });
  const [error, setError] = useState("");

  const set = (field: keyof Integration) => (e: { target: HTMLInputElement | HTMLSelectElement }) =>
    setForm({ ...form, [field]: e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (integration) await updateIntegration(form);
      else await createIntegration(form);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const p = form.Provider;
  const checkbox = (field: "ActiveTransfers" | "Insecure", label: string) => (
    <label className="mb-4 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={!!form[field]} onChange={set(field)} />
      {label}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <Field label="Name" placeholder="Integration name" value={form.Name} onChange={set("Name")} required />
      <div className="mb-4">
        <label htmlFor="provider" className="mb-1 block text-sm font-medium">Provider</label>
        <select id="provider" className={inputClass} value={p} onChange={set("Provider")}>
          {providers.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {(p === "webdav" || p === "ftp") && (
        <>
          <Field label="Address" placeholder="Server URL" value={form.Address ?? ""} onChange={set("Address")} />
          <Field label="Username" value={form.Username ?? ""} onChange={set("Username")} />
          <Field label="Password" type="password" value={form.Password ?? ""} onChange={set("Password")} autoComplete="new-password" />
        </>
      )}
      {p === "ftp" && checkbox("ActiveTransfers", "Use active transfers")}
      {p === "ics" && (
        <>
          <Field label="ICS URL" placeholder="https://example.com/calendar.ics" value={form.Address ?? ""} onChange={set("Address")} />
          {checkbox("Insecure", "Ignore TLS certificate errors")}
        </>
      )}
      {p === "localfs" && <Field label="Path" value={form.Path ?? ""} onChange={set("Path")} />}
      {p === "dropbox" && <Field label="Access token" value={form.Accesstoken ?? ""} onChange={set("Accesstoken")} />}
      {p === "webhook" && (
        <Field label="Endpoint" placeholder="https://automation.example.com/webhook/0123-456789-abc" value={form.Endpoint ?? ""} onChange={set("Endpoint")} />
      )}

      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
