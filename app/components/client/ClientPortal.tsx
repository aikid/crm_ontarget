"use client";

import { useCallback, useEffect, useState } from "react";
import { onTargetApi, type ApiCampaign } from "../../lib/ontarget-api";
import { useAuth } from "../auth/AuthProvider";
import LoadingOverlay from "../ui/LoadingOverlay";
import ClientDashboard from "./ClientDashboard";
import ClientResults from "./ClientResults";
import ClientSidebar from "./ClientSidebar";
import SellerManagement from "../SellerManagement";

export type ClientScreen = "dashboard" | "results" | "sellers";

export default function ClientPortal() {
  const { user, loggingOut, logout } = useAuth();
  const [screen, setScreen] = useState<ClientScreen>("dashboard");
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [campaignDataLoading, setCampaignDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.clientId) return;
    let active = true;
    onTargetApi.campaigns(user.clientId)
      .then(({ data }) => {
        if (!active) return;
        setCampaigns(data);
        setCampaignId((current) => data.some((campaign) => campaign.id === current) ? current : data[0]?.id || "");
      })
      .catch((cause: Error) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user?.clientId]);

  const currentCampaign = campaigns.find((campaign) => campaign.id === campaignId) || null;
  const clientName = user?.client?.name || "Cliente";
  const handleCampaignReady = useCallback(() => setCampaignDataLoading(false), []);

  function handleCampaignChange(nextCampaignId: string) {
    if (nextCampaignId === campaignId) return;
    setCampaignDataLoading(true);
    setCampaignId(nextCampaignId);
  }

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
                <select value={campaignId} onChange={(event) => handleCampaignChange(event.target.value)} aria-label="Selecionar campanha" disabled={!campaigns.length || campaignDataLoading}>
                  {campaigns.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}
                </select>
                <i>⌄</i>
              </label>
            </div>
            {currentCampaign && <div className="client-campaign-status">
              <span className={currentCampaign.status === "active" ? "active" : "completed"}><i />{currentCampaign.status === "active" ? "Em andamento" : currentCampaign.status === "completed" ? "Concluída" : "Inativa"}</span>
              <small>{currentCampaign.startDate} até {currentCampaign.endDate}</small>
            </div>}
          </div>
          <div className="client-header-actions"><div className="client-profile-wrap"><div className="client-profile-button">
            <span className="avatar avatar-blue">{user?.initials}</span><div><strong>{user?.name}</strong><span>{clientName}</span></div>
          </div></div></div>
        </header>

        <LoadingOverlay
          show={loading || Boolean(currentCampaign && campaignDataLoading)}
          title={loading ? "Carregando campanhas" : "Atualizando campanha"}
          message={loading ? "Buscando os dados deste cliente." : "Carregando os indicadores e resultados da campanha selecionada."}
        />

        {loading ? null : error ? (
          <div className="client-page"><div className="results-empty"><strong>Não foi possível carregar as campanhas</strong><p>{error}</p></div></div>
        ) : !currentCampaign ? (
          <div className="client-page"><div className="results-empty"><strong>Nenhuma campanha disponível</strong><p>Não há campanhas vinculadas a este cliente.</p></div></div>
        ) : screen === "sellers" ? (
          <div className="client-page"><SellerManagement embedded /></div>
        ) : screen === "dashboard" ? (
          <ClientDashboard key={currentCampaign.id} campaign={currentCampaign} userName={user?.name || "Cliente"} onOpenResults={() => setScreen("results")} onReady={handleCampaignReady} />
        ) : (
          <ClientResults key={currentCampaign.id} campaign={currentCampaign} onReady={handleCampaignReady} />
        )}
      </section>
    </main>
  );
}
