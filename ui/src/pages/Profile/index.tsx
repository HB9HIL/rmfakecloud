import { useUser } from "../../auth";
import { cardClass } from "../../components/styles";
import ChangePassword from "./ChangePassword";
import TwoFactor from "./TwoFactor";

export default function Profile() {
  const user = useUser()!;
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <div>
        <h1 className="font-serif text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          {user.UserID}
          {user.scopes === "sync15" && " · sync 1.5"}
        </p>
      </div>
      <section className={`${cardClass} p-6`}>
        <h2 className="mb-4 font-serif text-xl">Password</h2>
        <ChangePassword userId={user.UserID} />
      </section>
      <section className={`${cardClass} p-6`}>
        <h2 className="mb-4 font-serif text-xl">Two-factor login</h2>
        <TwoFactor />
      </section>
    </div>
  );
}
