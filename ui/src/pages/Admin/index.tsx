import { useState, type MouseEvent } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { toast } from "react-toastify";

import { deleteUser, type listUsers } from "../../api";
import { Button, Dialog } from "../../components/ui";
import { formatDate } from "../../format";
import type { User } from "../../types";
import UserForm from "./UserForm";

export default function Admin() {
  const users = useLoaderData<typeof listUsers>();
  const revalidator = useRevalidator();
  const [editing, setEditing] = useState<User | "new" | null>(null);

  const close = () => setEditing(null);
  const saved = () => {
    close();
    revalidator.revalidate();
  };

  async function remove(e: MouseEvent, userid: string) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete user: ${userid}?`)) return;
    try {
      await deleteUser(userid);
      revalidator.revalidate();
    } catch (err) {
      toast.error(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">Users</h1>
        <Button variant="primary" onClick={() => setEditing("new")}>New User</Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <th className="py-2 pr-3 font-normal">User ID</th>
            <th className="pr-3 font-normal">Email</th>
            <th className="hidden pr-3 font-normal md:table-cell">Name</th>
            <th className="pr-3 font-normal">Role</th>
            <th className="hidden pr-3 font-normal md:table-cell">Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.userid} className="cursor-pointer border-b border-line hover:bg-line/30" onClick={() => setEditing(u)}>
              <td className="py-2.5 pr-3 font-medium">{u.userid}</td>
              <td className="pr-3 break-all">{u.email}</td>
              <td className="hidden pr-3 md:table-cell">{u.name}</td>
              <td className="pr-3 text-muted">{u.isAdmin && "admin"}</td>
              <td className="hidden pr-3 whitespace-nowrap text-muted md:table-cell">{formatDate(u.CreatedAt)}</td>
              <td className="text-right">
                <Button size="sm" variant="danger" onClick={(e) => remove(e, u.userid)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? "New user" : `Change user: ${editing?.userid}`}
      >
        <UserForm user={editing === "new" || editing === null ? undefined : editing} onDone={saved} onCancel={close} />
      </Dialog>
    </div>
  );
}
