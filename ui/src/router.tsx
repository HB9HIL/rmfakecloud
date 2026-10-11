import { createBrowserRouter, redirect } from "react-router";

import * as api from "./api";
import { requireAdmin, requireUser } from "./auth";
import { NotFound, Protected, Public, RouteError, Shell } from "./components/Layout";
import Admin from "./pages/Admin";
import Connect from "./pages/Connect";
import Documents from "./pages/Documents";
import Help from "./pages/Help";
import Integrations from "./pages/Integrations";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ScreenShare from "./pages/ScreenShare";

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      {
        element: <Protected />,
        loader: requireUser,
        children: [
          {
            errorElement: <RouteError />,
            children: [
              { index: true, loader: () => redirect("/documents") },
              { path: "help", element: <Help /> },
              {
                path: "documents/:itemId?",
                element: <Documents />,
                loader: api.listDocuments,
                // switching folders doesn't reload the tree, only revalidate() and mutations do
                shouldRevalidate: ({ currentParams, nextParams, defaultShouldRevalidate }) =>
                  currentParams.itemId === nextParams.itemId && defaultShouldRevalidate,
              },
              { path: "connect", element: <Connect />, loader: api.getCode },
              { path: "pair/app?", element: <Connect />, loader: api.getCode },
              { path: "integrations", element: <Integrations />, loader: api.listIntegrations },
              { path: "profile", element: <Profile />, loader: api.getTOTP },
              { path: "screenshare", element: <ScreenShare /> },
              {
                path: "admin",
                element: <Admin />,
                loader: () => {
                  requireAdmin();
                  return api.listUsers();
                },
              },
            ],
          },
        ],
      },
      {
        element: <Public />,
        children: [
          { path: "login", element: <Login /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
]);
