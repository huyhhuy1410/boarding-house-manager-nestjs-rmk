import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Client-side redirect only. The real authorization is the AuthGuard on the
  // API: a token present here but expired or forged still gets 401 on the
  // first request, and api/client.ts handles that by clearing it and
  // redirecting. This guard just avoids rendering a page that cannot load.
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
