import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";


if (import.meta.env.VITE_ENVIRONMENT !== "development") {
  document.body.classList.add("disable-selection");
  document.addEventListener("contextmenu", (event) => event.preventDefault());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
