import React from "react";
import { createRoot } from "react-dom/client";
import HotelExplorer from "../app/HotelExplorer";

export function mountHotelApp(context: { getToken: () => Promise<string | null>; user: { id: string; username: string; displayName: string; isAdmin: boolean } }) {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  createRoot(root).render(<React.StrictMode><HotelExplorer /></React.StrictMode>);
}
