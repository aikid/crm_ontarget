"use client";

import { useState } from "react";
import DashboardScreen from "./components/DashboardScreen";
import SdrScreen from "./components/SdrScreen";
import Sidebar from "./components/Sidebar";

export type Screen = "dashboard" | "sdr";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("dashboard");

  return (
    <main className="app-shell">
      <Sidebar activeScreen={screen} onNavigate={setScreen} />
      <section className="app-content">
        {screen === "dashboard" ? (
          <DashboardScreen onOpenSdr={() => setScreen("sdr")} />
        ) : (
          <SdrScreen onBack={() => setScreen("dashboard")} />
        )}
      </section>
    </main>
  );
}
