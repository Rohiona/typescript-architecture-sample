import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRentalDesk } from "../../composition/browser/rental-desk-factory.js";
import { RentalDeskApp } from "./app.js";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("アプリの表示領域が見つかりません。");
const dependencies = createRentalDesk();

createRoot(container).render(
  <StrictMode>
    <RentalDeskApp {...dependencies} />
  </StrictMode>,
);
