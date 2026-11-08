import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { initializeSessionSharing } from "./features/auth/session-sharing";

initializeSessionSharing().then(() => createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
));
