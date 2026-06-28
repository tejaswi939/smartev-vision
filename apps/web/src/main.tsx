import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import "./index.css";

// After a redeploy, content-hashed chunk names change. A browser holding a stale index.html will
// fail to import an old chunk (now 404). Vite fires `vite:preloadError`; reload once to pick up the
// current build. The session flag prevents a reload loop if the failure is not deploy-related.
window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem("sev:chunk-reload")) return;
  sessionStorage.setItem("sev:chunk-reload", "1");
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
