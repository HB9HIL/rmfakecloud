import { useState } from "react";
import { Link, NavLink } from "react-router";
import { BsList, BsXLg } from "react-icons/bs";

import { logout } from "../api";
import { isAdmin, useUser } from "../auth";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui";

const links = [
  { to: "/documents", label: "Documents" },
  { to: "/integrations", label: "Integrations" },
  { to: "/connect", label: "Connect" },
  { to: "/screenshare", label: "Screen Share" },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return `py-2 text-sm md:py-0 ${
    isActive ? "text-ink underline decoration-accent decoration-2 underline-offset-[6px]" : "text-muted hover:text-ink"
  }`;
}

export default function Header() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="relative border-b border-line">
      <div className="flex h-14 items-center gap-6 px-4">
        <Link to="/documents" className="font-serif text-xl tracking-tight">rmfakecloud</Link>

        {user && (
          // stacked below the bar on phones, inline from md upwards
          <nav
            className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-14 z-20 flex-col border-b border-line bg-paper px-4 pb-3 md:static md:flex md:flex-1 md:flex-row md:items-center md:gap-5 md:border-0 md:p-0`}
          >
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={close}>{l.label}</NavLink>
            ))}
            {isAdmin(user) && <NavLink to="/admin" className={linkClass} onClick={close}>Admin</NavLink>}
            <div className="mt-2 flex items-center gap-3 border-t border-line pt-3 md:mt-0 md:ml-auto md:border-0 md:pt-0">
              <NavLink to="/help" className={linkClass} onClick={close}>Help</NavLink>
              <NavLink id="userMenu" to="/profile" className={linkClass} onClick={close}>{user.UserID}</NavLink>
              <Button variant="ghost" size="sm" onClick={() => { close(); logout(); }}>Log out</Button>
            </div>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user && (
            <Button variant="ghost" size="sm" className="md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <BsXLg /> : <BsList />}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
