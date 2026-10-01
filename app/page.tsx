"use client";

import { useState } from "react";
import DashboardScreen from "./components/DashboardScreen";
import SdrScreen from "./components/SdrScreen";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./components/auth/LoginScreen";
import { useAuth } from "./components/auth/AuthProvider";
import AdminScreen from "./components/AdminScreen";
import LeadImportScreen from "./components/LeadImportScreen";

export type Screen = "dashboard" | "sdr" | "admin" | "imports";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const { user, loading, logout } = useAuth();

  if (loading) return <main className="auth-page"><div className="auth-loading">Validando acesso...</div></main>;
  if (!user) return <LoginScreen area="internal" />;
  if (!["GESTOR", "SDR"].includes(user.role)) return <LoginScreen area="internal" unauthorizedUser={user} />;

  return (
    <main className="app-shell">
      <Sidebar activeScreen={screen} onNavigate={setScreen} user={user} onLogout={() => void logout()} />
      <section className="app-content">
        {screen === "dashboard" ? (
          <DashboardScreen onOpenSdr={() => setScreen("sdr")} />
        ) : screen === "sdr" ? (
          <SdrScreen onBack={() => setScreen("dashboard")} />
        ) : screen === "admin" ? (
          <AdminScreen />
        ) : (
          <LeadImportScreen />
        )}
      </section>
    </main>
  );
}
