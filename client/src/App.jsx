import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Categories from "./pages/Categories";
import Users from "./pages/Users";
import Placeholder from "./pages/Placeholder";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeProvider";
import NetworkBackground from "./components/NetworkBackground";
import ScrollProgress from "./components/ScrollProgress";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <>
          <NetworkBackground />
          <ScrollProgress />
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
              <Route
                path="/services"
                element={
                  <ProtectedRoute section="services">
                    <Services />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/policies"
                element={
                  <ProtectedRoute section="policies">
                    <Placeholder name="Policies" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute section="categories">
                    <Categories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Users />
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
    </ThemeProvider>
  );
}

export default App;
