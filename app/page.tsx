"use client";

import { useState } from "react";
import DashboardScreen from "./components/DashboardScreen";
import SdrScreen from "./components/SdrScreen";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./components/auth/LoginScreen";
import { useAuth } from "./components/auth/AuthProvider";
import AdminScreen from "./components/AdminScreen";
import LeadImportScreen from "./components/LeadImportScreen";
import LeadSearchScreen from "./components/LeadSearchScreen";
import LoadingOverlay from "./components/ui/LoadingOverlay";

export type Screen = "dashboard" | "sdr" | "admin" | "imports" | "leads";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const { user, loading, loggingOut, logout } = useAuth();

  if (loading) return <main className="auth-page app-boot-screen"><LoadingOverlay show title="Validando seu acesso" message="Conectando ao ambiente seguro da OnTarget." /></main>;
  if (!user) return <LoginScreen area="internal" />;
  if (!["GESTOR", "SDR"].includes(user.role)) return <LoginScreen area="internal" unauthorizedUser={user} />;

  return (
    <main className="app-shell">
      <Sidebar activeScreen={screen} onNavigate={setScreen} user={user} onLogout={() => void logout()} loggingOut={loggingOut} />
      <section className="app-content">
        {screen === "dashboard" ? (
          <DashboardScreen canOpenSdr={user.role === "SDR"} onOpenSdr={() => setScreen("sdr")} />
        ) : screen === "sdr" ? (
          <SdrScreen onBack={() => setScreen("dashboard")} />
        ) : screen === "admin" ? (
          <AdminScreen />
        ) : screen === "leads" ? (
          <LeadSearchScreen />
        ) : (
          <LeadImportScreen />
        )}
      </section>
    </main>
  );
}
