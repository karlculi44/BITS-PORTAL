import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import PublicLandingPage from "./pages/PublicLandingPage";
import AboutPage from "./pages/AboutPage";
import PublicPoliciesPage from "./pages/PublicPoliciesPage";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Policies from "./pages/Policies";
import Categories from "./pages/Categories";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import Placeholder from "./pages/Placeholder";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeProvider";
import NetworkBackground from "./components/NetworkBackground";
import ScrollProgress from "./components/ScrollProgress";
import PageTransition from "./components/PageTransition";
import ScrollToTop from "./components/ScrollToTop";

const publicRoutes = [
  { path: "/", element: <PublicLandingPage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "/policy-library", element: <PublicPoliciesPage /> },
  { path: "/login", element: <Login /> },
  { path: "/unauthorized", element: <Placeholder name="Unauthorized" /> },
];

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <NetworkBackground />
        <ScrollProgress />
        <Toaster position="top-right" />
        <PageTransition publicRoutes={publicRoutes}>
          <Routes>
            <Route element={<PublicLayout />}>
              {publicRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
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
                    <Policies />
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
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </PageTransition>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
