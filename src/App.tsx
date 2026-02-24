import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/auth/require-auth";
import { RootLayout } from "./layouts/root-layout";
import AuthPage from "./pages/auth";
import DashboardOverview from "./pages/dashboard-overview";
import DevicePage from "./pages/device";
import InventoryPage from "./pages/inventory";
import InventoryDetailPage from "./pages/inventory-detail";
import NotFoundPage from "./pages/not-found";
import WarrantyCheckingPage from "./pages/warranty-checking";

export default function App() {
  return (
    <Routes>
      <Route path="auth" element={<AuthPage />} />
      <Route
        element={
          <RequireAuth>
            <RootLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardOverview />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/:id" element={<InventoryDetailPage />} />
        <Route path="warranty-checking" element={<WarrantyCheckingPage />} />
        <Route path="device" element={<DevicePage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}
