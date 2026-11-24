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
import SystemAdminScreen from "./components/SystemAdminScreen";
import SellerManagement from "./components/SellerManagement";

export type Screen = "dashboard" | "sdr" | "admin" | "imports" | "leads" | "sellers" | "system";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [navigationOpen, setNavigationOpen] = useState(true);
  const { user, loading, loggingOut, logout } = useAuth();

  if (loading) return <main className="auth-page app-boot-screen"><LoadingOverlay show title="Validando seu acesso" message="Conectando ao ambiente seguro da SysOn." /></main>;
  if (!user) return <LoginScreen area="internal" />;
  if (!["ADMIN", "GESTOR", "SDR"].includes(user.role)) return <LoginScreen area="internal" unauthorizedUser={user} />;
  const activeScreen: Screen = user.role === "ADMIN"
    ? "system"
    : user.role === "SDR"
      ? "sdr"
      : screen === "system" ? "dashboard" : screen;

  return (
    <main className={`app-shell screen-${activeScreen} ${navigationOpen ? "navigation-open" : ""}`}>
      <Sidebar activeScreen={activeScreen} onNavigate={setScreen} user={user} onLogout={() => void logout()} loggingOut={loggingOut} collapsible expanded={navigationOpen} onToggle={() => setNavigationOpen((current) => !current)} />
      <section className="app-content">
        {activeScreen === "system" ? (
          <SystemAdminScreen />
        ) : activeScreen === "dashboard" ? (
          <DashboardScreen canOpenSdr={user.role === "SDR"} onOpenSdr={() => setScreen("sdr")} />
        ) : activeScreen === "sdr" ? (
          <SdrScreen />
        ) : activeScreen === "admin" ? (
          <AdminScreen />
        ) : activeScreen === "leads" ? (
          <LeadSearchScreen />
        ) : activeScreen === "sellers" ? (
          <SellerManagement />
        ) : (
          <LeadImportScreen />
        )}
      </section>
    </main>
  );
}
