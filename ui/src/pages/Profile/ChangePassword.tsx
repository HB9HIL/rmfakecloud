import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";

import { changePassword, logout } from "../../api";
import { Alert, Button } from "../../components/ui";
import PasswordField from "./PasswordField";

// a new password ends all web sessions, including this one
export default function ChangePassword({ userId }: { userId: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The new passwords don't match");
      return;
    }
    try {
      await changePassword(userId, current, password);
      toast.success("Password changed, please log in again");
      await logout();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PasswordField label="Current password" name="currentPassword" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      <PasswordField label="New password" name="newPassword" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      <PasswordField label="Confirm new password" name="confirmNewPassword" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" variant="primary">Save</Button>
    </form>
  );
}
