import { Routes, Route, Navigate } from "react-router-dom";
import KitchenDashboard from "./pages/KitchenDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KitchenDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
