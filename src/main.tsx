import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";


if (import.meta.env.VITE_ENVIRONMENT !== "development") {
  document.body.classList.add("disable-selection");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
