"use client";

import { useEffect, useMemo, useState } from "react";
import { onTargetApi, type ApiCampaign, type ApiLead, type CampaignDashboardResponse } from "../../lib/ontarget-api";
import LeadDrawer from "./LeadDrawer";

type ResultsTab = "appointments" | "qualified";
type ClientResultsProps = { campaign: ApiCampaign; onReady?: () => void };

function StatusBadge({ value }: { value: string }) {
  const tone = ["Confirmado", "Agendado", "Qualificado", "Direcionado"].includes(value) ? "success" : ["Revisão", "Retornar"].includes(value) ? "warning" : "neutral";
  return <span className={`client-status-badge ${tone}`}><i />{value}</span>;
}

export default function ClientResults({ campaign, onReady }: ClientResultsProps) {
  const [tab, setTab] = useState<ResultsTab>("appointments");
  const [search, setSearch] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [seller, setSeller] = useState("all");
  const [vehicle, setVehicle] = useState("all");
  const [audit, setAudit] = useState("all");
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, pages: 0 });
  const [dashboard, setDashboard] = useState<CampaignDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ApiLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    onTargetApi.campaignDashboard<CampaignDashboardResponse>(campaign.id)
      .then((value) => active && setDashboard(value))
      .catch(() => active && setDashboard(null))
      .finally(() => active && setDashboardLoading(false));
    return () => { active = false; };
  }, [campaign.id]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      onTargetApi.campaignLeads(campaign.id, { page, pageSize: 20, category: tab, search, storeId, seller, vehicle, audit })
        .then((response) => { if (active) { setLeads(response.data); setPagination(response.pagination); setError(""); } })
        .catch((cause: Error) => active && setError(cause.message))
        .finally(() => active && setLoading(false));
    }, search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [audit, campaign.id, page, search, seller, storeId, tab, vehicle]);

  useEffect(() => {
    if (!loading && !dashboardLoading) onReady?.();
  }, [dashboardLoading, loading, onReady]);

  const sellers = useMemo(() => [...new Set(leads.map((lead) => lead.appointment?.seller).filter(Boolean) as string[])].sort(), [leads]);
  const vehicles = useMemo(() => [...new Set(leads.map((lead) => lead.vehicle).filter(Boolean) as string[])].sort(), [leads]);
  const metrics = dashboard?.metrics;

  function clearFilters() { setSearch(""); setStoreId("all"); setSeller("all"); setVehicle("all"); setAudit("all"); setPage(1); }

  return <div className="client-page client-results-page">
    <div className="client-page-intro results-intro"><div><span className="client-eyebrow">RELATÓRIOS DA CAMPANHA</span><h1>Agendamentos e leads auditados</h1><p>Dados auditados da campanha {campaign.name}.</p></div></div>
    <section className="results-summary-strip">
      <div><span className="client-kpi-icon green">AG</span><p><strong>{metrics?.appointments || 0}</strong><span>Agendamentos</span></p><small>Campanha atual</small></div>
      <div><span className="client-kpi-icon violet">QL</span><p><strong>{metrics?.qualified || 0}</strong><span>Qualificados</span></p><small>Oportunidades</small></div>
      <div><span className="client-kpi-icon blue">AU</span><p><strong>{(dashboard?.audit.validationRate || 0).toFixed(1)}%</strong><span>Validação</span></p><small>Auditorias confirmadas</small></div>
      <div><span className="client-kpi-icon indigo">AT</span><p><strong>{metrics?.contacts || 0}</strong><span>Contatos</span></p><small>{metrics?.contactRate || "0,0%"} da base trabalhada</small></div>
    </section>

    <section className="client-panel results-workbench">
      <div className="results-tabs" role="tablist"><button type="button" className={tab === "appointments" ? "active" : ""} onClick={() => { setTab("appointments"); setPage(1); }}>Agendamentos <span>{dashboard?.audit.appointments || 0}</span></button><button type="button" className={tab === "qualified" ? "active" : ""} onClick={() => { setTab("qualified"); setPage(1); }}>Qualificados <span>{dashboard?.audit.qualified || 0}</span></button></div>
      <div className="results-toolbar"><label className="results-search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nome ou telefone" /></label><div className="result-filter-row">
        <label><span>Loja</span><select value={storeId} onChange={(event) => { setStoreId(event.target.value); setPage(1); }}><option value="all">Todas as lojas</option>{dashboard?.storePerformance.map(({ store }) => <option value={store.id} key={store.id}>{store.shortName}</option>)}</select></label>
        <label><span>Vendedor</span><select value={seller} onChange={(event) => { setSeller(event.target.value); setPage(1); }}><option value="all">Todos</option>{sellers.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Veículo</span><select value={vehicle} onChange={(event) => { setVehicle(event.target.value); setPage(1); }}><option value="all">Todos</option>{vehicles.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Auditoria</span><select value={audit} onChange={(event) => { setAudit(event.target.value); setPage(1); }}><option value="all">Todas as auditorias</option><option value="confirmed">Confirmado</option><option value="review">Revisão</option></select></label>
        <button type="button" className="clear-filters-button" onClick={clearFilters}>Limpar</button>
      </div></div>
      <div className="results-table-meta"><span><strong>{pagination.total}</strong> registros auditados desta campanha</span><span>{loading ? "Atualizando..." : "Dados atualizados"}</span></div>
      <div className="client-table-wrap results-table-wrap">
        {error ? <div className="results-empty"><strong>Não foi possível carregar os leads</strong><p>{error}</p></div> : !loading && !leads.length ? <div className="results-empty"><span>⌕</span><strong>Nenhum resultado encontrado</strong><p>Ajuste ou limpe os filtros.</p><button type="button" onClick={clearFilters}>Limpar filtros</button></div> :
          <table className="client-table results-table"><thead><tr><th>Lead</th><th>Veículo</th>{tab === "appointments" && <><th>Data agendada</th><th>Período</th><th>Vendedor</th></>}{tab === "qualified" && <><th>Tipo</th><th>Data</th></>}<th>Loja</th><th>Auditoria</th><th>Status</th><th /></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
            <td><span className="lead-list-avatar">{lead.initials}</span><div><strong>{lead.name}</strong><small>{lead.phone}</small></div></td><td>{lead.vehicle || "—"}</td>
            {tab === "appointments" && <><td><strong>{lead.appointment?.date || "—"}</strong></td><td>{lead.appointment?.period || "—"}</td><td>{lead.appointment?.seller || <span className="empty-value">Não definido</span>}</td></>}
            {tab === "qualified" && <><td>{lead.qualification?.type || "Direcionado"}</td><td>{lead.qualification?.date || lead.lastContact}</td></>}
            <td>{lead.store.shortName}</td><td><StatusBadge value={lead.audit.status} /></td><td><StatusBadge value={lead.status} /></td><td>›</td>
          </tr>)}</tbody></table>}
      </div>
      <div className="results-footer"><span>Página {pagination.page} de {Math.max(1, pagination.pages)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>{Array.from({ length: Math.min(5, pagination.pages) }, (_, index) => index + 1).map((value) => <button type="button" key={value} className={page === value ? "active" : ""} onClick={() => setPage(value)}>{value}</button>)}<button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>›</button></div></div>
    </section>
    {selectedLead && <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </div>;
}
