"use client";

import ClientPortal from "../components/client/ClientPortal";
import LoginScreen from "../components/auth/LoginScreen";
import { useAuth } from "../components/auth/AuthProvider";
import LoadingOverlay from "../components/ui/LoadingOverlay";

export default function ClientPortalPage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-page app-boot-screen"><LoadingOverlay show title="Validando seu acesso" message="Conectando ao Portal do Cliente." /></main>;
  if (!user) return <LoginScreen area="client" />;
  if (user.role !== "CLIENT") return <LoginScreen area="client" unauthorizedUser={user} />;
  return <ClientPortal />;
}
