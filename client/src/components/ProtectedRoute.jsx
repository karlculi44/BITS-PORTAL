import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";
import PageSkeleton from "./ui/PageSkeleton";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <main
        className="min-h-screen bg-gray-950 p-6 sm:p-8"
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

  return children;
};

export default ProtectedRoute;
