import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Placeholder from "./pages/Placeholder";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/unauthorized"
            element={<Placeholder name="Unauthorized" />}
          />
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/services" element={<Services />} />
            <Route path="/policies" element={<Placeholder name="Policies" />} />
            <Route
              path="/categories"
              element={<Placeholder name="Categories" />}
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Placeholder name="Users" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Placeholder name="Activity Logs" />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </>
    </BrowserRouter>
  );
}

export default App;
