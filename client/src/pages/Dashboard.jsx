import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error("Unable to log out. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <h1 className="text-2xl font-semibold text-slate-800">
        {user ? `Welcome, ${user.first_name}` : "Dashboard"}
      </h1>
      {user && (
        <button type="button" onClick={handleLogout} className="rounded-md bg-blue-700 px-4 py-2 text-white hover:bg-blue-800">
          Logout
        </button>
      )}
    </main>
  );
}

export default Dashboard;
