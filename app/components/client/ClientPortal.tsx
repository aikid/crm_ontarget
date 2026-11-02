"use client";

import { useState } from "react";
import Link from "next/link";
import { clientCampaigns } from "../../data/clientPortalData";
import { useAuth } from "../auth/AuthProvider";
import ClientDashboard from "./ClientDashboard";
import ClientResults from "./ClientResults";
import ClientSidebar from "./ClientSidebar";

export type ClientScreen = "dashboard" | "results";

export default function ClientPortal() {
  const { user, loggingOut, logout } = useAuth();
  const [screen, setScreen] = useState<ClientScreen>("dashboard");
  const [campaignId, setCampaignId] = useState(clientCampaigns[0].id);
  const [environmentOpen, setEnvironmentOpen] = useState(false);

  const currentCampaign = clientCampaigns.find((campaign) => campaign.id === campaignId) ?? clientCampaigns[0];
  const clientName = user?.client?.name || "Cliente";

  return (
    <main className="client-app-shell">
      <ClientSidebar activeScreen={screen} onNavigate={setScreen} clientName={clientName} onLogout={() => void logout()} loggingOut={loggingOut} />
      <section className="client-main">
        <header className="client-header">
          <div className="client-header-context">
            <span className="client-mobile-brand">SysOn</span>
            <div>
              <span>Campanha selecionada</span>
              <label className="client-campaign-select">
                <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Selecionar campanha">
                  {clientCampaigns.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}
                </select>
                <i>⌄</i>
              </label>
            </div>
            <div className="client-campaign-status">
              <span className={currentCampaign.status === "active" ? "active" : "completed"}><i />{currentCampaign.status === "active" ? "Em andamento" : "Concluída"}</span>
              <small>{currentCampaign.startDate} até {currentCampaign.endDate}</small>
            </div>
          </div>

          <div className="client-header-actions">
            <button className="client-help-button" type="button" aria-label="Central de ajuda">?</button>
            <div className="client-profile-wrap">
              <button className="client-profile-button" type="button" onClick={() => setEnvironmentOpen((open) => !open)} aria-expanded={environmentOpen}>
                <span className="avatar avatar-blue">{user?.initials}</span>
                <div><strong>{user?.name}</strong><span>{clientName}</span></div>
                <i>⌄</i>
              </button>
              {environmentOpen && (
                <div className="environment-menu">
                  <span>ALTERNAR AMBIENTE</span>
                  <Link href="/" className="environment-option">
                    <i>OT</i>
                    <div><strong>Operação SysOn</strong><small>Gestão interna e SDR</small></div>
                    <b>→</b>
                  </Link>
                  <button type="button" className="environment-option current">
                    <i>CL</i>
                    <div><strong>Portal Cliente</strong><small>{clientName}</small></div>
                    <b>✓</b>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {screen === "dashboard" ? (
          <ClientDashboard campaign={currentCampaign} onOpenResults={() => setScreen("results")} />
        ) : (
          <ClientResults campaign={currentCampaign} />
        )}
      </section>
    </main>
  );
}
