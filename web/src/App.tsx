import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import RoomsPage from "./pages/RoomsPage";
import TenantsPage from "./pages/TenantsPage";
import ContractsPage from "./pages/ContractsPage";
import InvoicesPage from "./pages/InvoicesPage";
import BoardingHousesPage from "./pages/BoardingHousesPage";
import MeterReadingsPage from "./pages/MeterReadingsPage";
import MaintenanceRequestsPage from "./pages/MaintenanceRequestsPage";
import ExpensesPage from "./pages/ExpensesPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          element={
            // A pathless layout route: the guard runs once and every child
            // page renders inside Layout's <Outlet />.
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/boarding-houses" element={<BoardingHousesPage />} />
          <Route path="/meter-readings" element={<MeterReadingsPage />} />
          <Route path="/maintenance-requests" element={<MaintenanceRequestsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
