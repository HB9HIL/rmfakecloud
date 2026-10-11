import { isRouteErrorResponse, Link, Navigate, Outlet, useRouteError } from "react-router";
import { ToastContainer } from "react-toastify";

import { ApiError } from "../api";
import { useUser } from "../auth";
import Footer from "./Footer";
import Header from "./Header";
import PasscodeResets from "./PasscodeResets";
import { Alert } from "./ui";

// the header stays on top, every page scrolls below it
const mainClass = "app-main min-h-0 flex-1 overflow-auto";

export function Shell() {
  return (
    <div className="flex h-full flex-col">
      <Header />
      <Outlet />
      <ToastContainer autoClose={2000} />
    </div>
  );
}

export function Public() {
  return <main className={mainClass}><Outlet /></main>;
}

// logging out or an expired session (401) clears the user and lands here
export function Protected() {
  const user = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <PasscodeResets />
      <main className={mainClass}><Outlet /></main>
      <Footer />
    </>
  );
}

export function RouteError() {
  const error = useRouteError();
  if (error instanceof ApiError && error.status === 401) return <Navigate to="/login" replace />;
  const message =
    isRouteErrorResponse(error) ? `${error.status} ${error.statusText}`
    : error instanceof Error ? error.message
    : String(error);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Alert>An error occurred: {message}</Alert>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <p className="mb-4 font-serif text-2xl">Page Not Found.</p>
      <Link to="/documents" className="text-muted underline underline-offset-3 hover:text-ink">Back to your documents</Link>
    </div>
  );
}
