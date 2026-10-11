import { useState, type MouseEvent } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { toast } from "react-toastify";

import { deleteIntegration, type listIntegrations } from "../../api";
import { Button, Dialog } from "../../components/ui";
import type { Integration } from "../../types";
import IntegrationForm from "./IntegrationForm";

export default function Integrations() {
  const integrations = useLoaderData<typeof listIntegrations>();
  const revalidator = useRevalidator();
  const [editing, setEditing] = useState<Integration | "new" | null>(null);

  const close = () => setEditing(null);
  const saved = () => {
    close();
    revalidator.revalidate();
  };

  async function remove(e: MouseEvent, i: Integration) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete integration: ${i.Name}?`)) return;
    try {
      await deleteIntegration(i.ID);
      revalidator.revalidate();
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">Integrations</h1>
        <Button variant="primary" onClick={() => setEditing("new")}>New Integration</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <th className="py-2 pr-3 font-normal">Name</th>
            <th className="pr-3 font-normal">Provider</th>
            <th className="hidden pr-3 font-normal md:table-cell">ID</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {integrations.length === 0 && (
            <tr>
              <td colSpan={4} className="py-10 text-center text-muted">No integrations yet.</td>
            </tr>
          )}
          {integrations.map((i) => (
            <tr key={i.ID} className="cursor-pointer border-b border-line hover:bg-line/30" onClick={() => setEditing(i)}>
              <td className="py-2.5 pr-3 font-medium">{i.Name}</td>
              <td className="pr-3 text-muted">{i.Provider}</td>
              <td className="hidden pr-3 font-mono text-xs text-muted md:table-cell">{i.ID}</td>
              <td className="text-right">
                <Button size="sm" variant="danger" onClick={(e) => remove(e, i)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? "New integration" : `Change integration: ${editing?.Name}`}
      >
        <IntegrationForm integration={editing === "new" || editing === null ? undefined : editing} onDone={saved} onCancel={close} />
      </Dialog>
    </div>
  );
}
