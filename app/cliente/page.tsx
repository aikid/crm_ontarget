"use client";

import ClientPortal from "../components/client/ClientPortal";
import LoginScreen from "../components/auth/LoginScreen";
import { useAuth } from "../components/auth/AuthProvider";

export default function ClientPortalPage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-page"><div className="auth-loading">Validando acesso...</div></main>;
  if (!user) return <LoginScreen area="client" />;
  if (user.role !== "CLIENT") return <LoginScreen area="client" unauthorizedUser={user} />;
  return <ClientPortal />;
}
