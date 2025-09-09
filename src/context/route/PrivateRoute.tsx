// src/components/route/PrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { JSX } from "react";


interface PrivateRouteProps {
  children: JSX.Element;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default PrivateRoute;
