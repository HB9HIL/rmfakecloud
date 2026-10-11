import React from "react";
import { createRoot } from "react-dom/client";
import "./App.scss";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

const domNode = document.getElementById('root');
const root = createRoot(domNode);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>);
