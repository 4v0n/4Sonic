import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { HashRouter } from "react-router-dom";


if (import.meta.env.VITE_ENVIRONMENT !== "development") {
  document.body.classList.add("disable-selection");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
