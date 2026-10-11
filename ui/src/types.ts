// shapes of the /ui/api responses (internal/ui/viewmodel, internal/model, internal/messages)

// JWT claims of the web session (internal/ui/claims.go)
export interface Claims {
  UserID: string;
  BrowserID: string;
  Email: string;
  scopes?: string;
  Roles?: string[];
}

export interface Folder {
  id: string;
  name: string;
  lastModified: string;
  isFolder: true;
  children: Entry[];
  // set on the client for the two top-level entries
  icon?: "device" | "trash";
}

export interface Doc {
  id: string;
  name: string;
  // notebook, pdf, epub
  type: string;
  lastModified: string;
  size: number;
  isFolder?: undefined;
}

export type Entry = Folder | Doc;

export interface DocumentTree {
  Entries: Entry[];
  Trash: Entry[];
}

export interface User {
  userid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  CreatedAt: string;
  integrations?: string[];
}

export interface Integration {
  ID: string;
  Provider: string;
  Name: string;
  Username?: string;
  Password?: string;
  Address?: string;
  ActiveTransfers?: boolean;
  Insecure?: boolean;
  Accesstoken?: string;
  Path?: string;
  Endpoint?: string;
}

export type TOTPStatus =
  | { enabled: true }
  | { enabled: false; secret: string; uri: string };

export interface PasscodeReset {
  DeviceID: string;
  DeviceName: string;
  RequestID: string;
  Created: string;
  Expires: string;
  Approved: boolean;
}

// screen share signaling (internal/screenshare, the tablet wraps webrtc messages in "webtrc")
export interface SignalPayload {
  type: string;
  payload?: SignalPayload;
  description?: string;
  sdp?: string;
  candidate?: string;
  mid?: string;
}

export interface ScreenshareOffer {
  roomId: string;
  messages: { type: string; clientId?: string; payload?: SignalPayload }[] | null;
  iceServers: { url?: string; urls?: string | string[]; username?: string; credential?: string }[] | null;
}
