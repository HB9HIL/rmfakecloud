import { useSyncExternalStore } from "react";
import { redirect } from "react-router";

import type { Claims } from "./types";

// the logged in user (decoded session JWT), kept in localStorage across reloads
const key = "currentUser";
const listeners = new Set<() => void>();
let current = read();

function read(): Claims | null {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function getUser() {
  return current;
}

export function setUser(user: Claims | null) {
  current = user;
  try {
    if (user) localStorage.setItem(key, JSON.stringify(user));
    else localStorage.removeItem(key);
  } catch {
    // storage blocked, the session lasts until reload
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUser() {
  return useSyncExternalStore(subscribe, getUser);
}

export function isAdmin(user: Claims | null) {
  return user?.Roles?.includes("Admin") ?? false;
}

// route loaders
export function requireUser() {
  if (!getUser()) throw redirect("/login");
  return null;
}

export function requireAdmin() {
  if (!isAdmin(getUser())) throw redirect("/");
  return null;
}
