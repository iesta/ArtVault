import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ArtVault from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ArtVault />
  </StrictMode>
);
