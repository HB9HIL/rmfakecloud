import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import "./index.css";
import { checkSession } from "./api";
import { getUser } from "./auth";
import { router } from "./router";

// a stored user whose session is gone (401) is logged out by the api client
if (getUser()) checkSession().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
