import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import PageSkeleton from "./ui/PageSkeleton";
import { hasSectionAccess } from "./navItems";

const ProtectedRoute = ({ children, allowedRoles, section }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <main
        className="min-h-screen bg-slate-100 p-6 sm:p-8"
        role="status"
        aria-label="Loading page"
      >
        <PageSkeleton variant="dashboard" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (section && !hasSectionAccess(user, section)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
