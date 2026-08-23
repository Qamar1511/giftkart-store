import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../services/authService";

// Like ProtectedRoute, but also requires session.user.role === "admin".
// Non-admins (including logged-out visitors) are bounced to the homepage
// so the /admin section stays invisible to regular customers.
const AdminRoute = ({ children }) => {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (session.user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
