import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Placeholder name="Users" />} />
            <Route path="/services" element={<Placeholder name="Services" />} />
            <Route path="/policies" element={<Placeholder name="Policies" />} />
            <Route
              path="/categories"
              element={<Placeholder name="Categories" />}
            />
            <Route
              path="/activity-logs"
              element={<Placeholder name="Activity Logs" />}
            />
          </Route>
        </Routes>
      </>
    </BrowserRouter>
  );
}

export default App;
