import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import "./landing/landing.css";

// Motion that hides content is only armed when the script runs (reference: motion.md).
document.documentElement.classList.add("js");

const node = document.getElementById("root");
if (!node) throw new Error("Missing #root");

createRoot(node).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
