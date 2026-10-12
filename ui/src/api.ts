import { jwtDecode } from "jwt-decode";

import { setUser } from "./auth";
import type { Claims, DocumentTree, Integration, PasscodeReset, ScreenshareOffer, SignalPayload, TOTPStatus, User } from "./types";

const root = "/ui/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${root}/${path}`, init);
  const isJson = r.headers.get("Content-Type")?.startsWith("application/json");
  if (!r.ok) {
    const body: unknown = isJson ? await r.json().catch(() => null) : await r.text();
    // the session expired or was revoked, the app falls back to the login page
    if (r.status === 401 && path !== "login") setUser(null);
    const message =
      body && typeof body === "object" && "error" in body ? String(body.error)
      : typeof body === "string" && body ? body
      : r.statusText || String(r.status);
    throw new ApiError(r.status, message, body);
  }
  if (init?.method === "HEAD") return undefined as T;
  return (isJson ? r.json() : r.text()) as Promise<T>;
}

function send(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// session

export async function login(email: string, password: string, code: string) {
  const token = await request<string>("login", send("POST", { email, password, code }));
  const user = jwtDecode<Claims>(token);
  setUser(user);
  return user;
}

export async function logout() {
  setUser(null);
  await request("logout").catch(() => {});
}

export const checkSession = () => request("", { method: "HEAD" });
export const getVersion = () => request<{ version: string }>("version");
export const getCode = () => request<string>("newcode");

// documents

export const listDocuments = () => request<DocumentTree>("documents");
export const deleteDocument = (id: string) => request(`documents/${id}`, { method: "DELETE" });
export const createFolder = (name: string, parentId: string) =>
  request<{ ID: string }>("folders", send("POST", { name, parentId }));
// rename and move in one, the server sets both fields
export const updateDocument = (documentId: string, name: string, parentId: string) =>
  request("documents", send("PUT", { documentId, name, parentId }));

export function documentUrl(id: string, type?: "rmdoc") {
  return `${root}/documents/${id}` + (type ? `?type=${type}` : "");
}

export function upload(parent: string, files: File[]) {
  const form = new FormData();
  form.append("parent", parent);
  for (const f of files) {
    // the server only recognizes lowercase file extensions
    const dot = f.name.lastIndexOf(".");
    const name = dot < 0 ? f.name : f.name.slice(0, dot) + f.name.slice(dot).toLowerCase();
    form.append("file", new File([f], name, { type: f.type }));
  }
  return request("documents/upload", { method: "POST", body: form });
}

// profile

export const changePassword = (userid: string, currentPassword: string, newPassword: string) =>
  request("profile", send("POST", { userid, currentPassword, newPassword }));
export const getTOTP = () => request<TOTPStatus>("profile/totp");
export const enableTOTP = (secret: string, code: string) => request("profile/totp", send("POST", { secret, code }));
export const disableTOTP = (code: string) => request("profile/totp/disable", send("POST", { code }));

export const listPasscodeResets = () => request<PasscodeReset[] | null>("passcode/resets");
export const approvePasscodeReset = (id: string) => request(`passcode/resets/${id}/approve`, { method: "POST" });
export const dismissPasscodeReset = (id: string) => request(`passcode/resets/${id}`, { method: "DELETE" });

// admin

export const listUsers = () => request<User[]>("users");
export const createUser = (userid: string, email: string, newPassword: string) =>
  request("users", send("POST", { userid, email, newPassword }));
export const updateUser = (userid: string, email: string, newPassword: string) =>
  request("users", send("PUT", { userid, email, newPassword }));
export const deleteUser = (userid: string) => request(`users/${userid}`, { method: "DELETE" });

// integrations

export const listIntegrations = () => request<Integration[] | null>("integrations").then((l) => l ?? []);
export const createIntegration = (i: Integration) => request("integrations", send("POST", i));
export const updateIntegration = (i: Integration) => request(`integrations/${i.ID}`, send("PUT", i));
export const deleteIntegration = (id: string) => request(`integrations/${id}`, { method: "DELETE" });

// screen share

export const getScreenshareRoom = () => request("screenshare/room");
export const getScreenshareOffer = () => request<ScreenshareOffer>("screenshare/offer");
export const sendScreenshareAnswer = (roomId: string, targetClientId: string | undefined, payload: SignalPayload) =>
  request(`screenshare/room/${roomId}/answer`, send("POST", { targetClientId, payload }));
