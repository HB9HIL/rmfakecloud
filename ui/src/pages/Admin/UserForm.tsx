import { useState, type FormEvent } from "react";

import { createUser, updateUser } from "../../api";
import { Alert, Button, Field } from "../../components/ui";
import type { User } from "../../types";

// new user without `user`, otherwise change its email or password
export default function UserForm({ user, onDone, onCancel }: { user?: User; onDone: () => void; onCancel: () => void }) {
  const [userid, setUserid] = useState(user?.userid ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (user) await updateUser(userid, email, password);
      else await createUser(userid, email, password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <Field label="User ID" name="userid" value={userid} onChange={(e) => setUserid(e.target.value)} disabled={!!user} required />
      <Field label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field
        label={user ? "New password" : "Password"}
        name="newPassword"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        hint={user && "Leave empty to keep the current password"}
        required={!user}
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">Save</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
