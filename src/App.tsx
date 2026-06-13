import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RequireAuth } from "./components/auth/require-auth";
import { RootLayout } from "./layouts/root-layout";
import AnalyticPage from "./pages/analytic";
import AuthPage from "./pages/auth";
import DevicePage from "./pages/device";
import InventoryPage from "./pages/inventory";
import InventoryDetailPage from "./pages/inventory-detail";
import NotFoundPage from "./pages/not-found";
import WarrantyCheckingPage from "./pages/warranty-checking";

const APP_NAME = "Quản lý kho";

const PAGE_TITLES: Record<string, string> = {
  "/auth": "Đăng nhập",
  "/analytic": "Phân tích",
  "/analytics": "Phân tích",
  "/inventory": "Kho hàng",
  "/warranty-checking": "Kiểm tra bảo hành",
  "/device": "Thiết bị",
  "/404": "Không tìm thấy trang",
};

function DocumentTitle() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    let page = PAGE_TITLES[pathname];
    if (!page && pathname.startsWith("/inventory/")) page = "Chi tiết kho hàng";
    document.title = page ? `${page} · ${APP_NAME}` : APP_NAME;
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
      <Route path="auth" element={<AuthPage />} />
      <Route
        element={
          <RequireAuth>
            <RootLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/analytic" replace />} />
        <Route path="analytic" element={<AnalyticPage />} />
        <Route path="analytics" element={<AnalyticPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/:id" element={<InventoryDetailPage />} />
        <Route path="warranty-checking" element={<WarrantyCheckingPage />} />
        <Route path="device" element={<DevicePage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
      </Routes>
    </>
  );
}
