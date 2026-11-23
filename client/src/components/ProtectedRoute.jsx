import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../services/authService";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
