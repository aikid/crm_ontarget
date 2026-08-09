"use client";

import { useMemo, useState } from "react";
import { clientLeads, clientStores, getStore, type Campaign, type PortalLead } from "../../data/clientPortalData";
import LeadDrawer from "./LeadDrawer";

type ResultsTab = "appointments" | "qualified" | "all";

type ClientResultsProps = {
  campaign: Campaign;
};

const sellers = ["Carlos Mendes", "Ricardo Santos", "Fernanda Lima", "Marcos Vieira"];
const vehicles = ["T-Cross Comfortline", "Nivus Highline", "Polo Highline", "Taos Comfortline", "Virtus Highline"];

function StatusBadge({ value }: { value: string }) {
  const tone = value === "Confirmado" || value === "Agendado" || value === "Qualificado"
    ? "success"
    : value === "Revisão" || value === "Retorno"
      ? "warning"
      : value === "Não atendeu"
        ? "neutral"
        : "muted";
  return <span className={`client-status-badge ${tone}`}><i />{value}</span>;
}

export default function ClientResults({ campaign }: ClientResultsProps) {
  const [tab, setTab] = useState<ResultsTab>("appointments");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const [storeId, setStoreId] = useState("all");
  const [seller, setSeller] = useState("all");
  const [vehicle, setVehicle] = useState("all");
  const [audit, setAudit] = useState("all");
  const [selectedLead, setSelectedLead] = useState<PortalLead | null>(null);
  const [toast, setToast] = useState("");

  const campaignLeads = useMemo(
    () => clientLeads.filter((lead) => lead.campaignId === campaign.id || campaign.id !== "FEIRAO-VW-AGO"),
    [campaign.id],
  );

  const filteredLeads = useMemo(() => {
    return campaignLeads.filter((lead) => {
      if (tab === "appointments" && lead.status !== "Agendado") return false;
      if (tab === "qualified" && lead.status !== "Qualificado") return false;
      if (search && !`${lead.name} ${lead.phone}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))) return false;
      if (storeId !== "all" && lead.storeId !== storeId) return false;
      if (seller !== "all" && lead.appointment?.seller !== seller) return false;
      if (vehicle !== "all" && lead.vehicle !== vehicle) return false;
      if (audit !== "all" && lead.audit.status !== audit) return false;
      if (period === "future" && lead.appointment && !["11/08/2026", "12/08/2026"].includes(lead.appointment.date)) return false;
      return true;
    });
  }, [audit, campaignLeads, period, search, seller, storeId, tab, vehicle]);

  function clearFilters() {
    setSearch("");
    setPeriod("all");
    setStoreId("all");
    setSeller("all");
    setVehicle("all");
    setAudit("all");
  }

  function simulateExport() {
    setToast(`${filteredLeads.length} registros preparados para exportação.`);
    window.setTimeout(() => setToast(""), 2200);
  }

  return (
    <div className="client-page client-results-page">
      <div className="client-page-intro results-intro">
        <div>
          <span className="client-eyebrow">RESULTADOS DA CAMPANHA</span>
          <h1>Agendamentos e leads</h1>
          <p>Consulte os resultados gerados pela operação da campanha {campaign.name}.</p>
        </div>
        <button type="button" className="client-primary-button export-button" onClick={simulateExport}><span>↓</span> Exportar resultados</button>
      </div>

      <section className="results-summary-strip">
        <div><span className="client-kpi-icon green">AG</span><p><strong>142</strong><span>Agendamentos</span></p><small className="positive">+9 esta semana</small></div>
        <div><span className="client-kpi-icon violet">QL</span><p><strong>83</strong><span>Qualificados</span></p><small>Oportunidades</small></div>
        <div><span className="client-kpi-icon blue">AU</span><p><strong>96,4%</strong><span>Validação</span></p><small className="positive">Alta qualidade</small></div>
        <div><span className="client-kpi-icon indigo">AT</span><p><strong>531</strong><span>Contatos</span></p><small>43,7% da base</small></div>
      </section>

      <section className="client-panel results-workbench">
        <div className="results-tabs" role="tablist" aria-label="Categorias de resultados">
          <button type="button" role="tab" aria-selected={tab === "appointments"} className={tab === "appointments" ? "active" : ""} onClick={() => setTab("appointments")}>Agendamentos <span>142</span></button>
          <button type="button" role="tab" aria-selected={tab === "qualified"} className={tab === "qualified" ? "active" : ""} onClick={() => setTab("qualified")}>Qualificados <span>83</span></button>
          <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>Todos os leads <span>1.214</span></button>
        </div>

        <div className="results-toolbar">
          <label className="results-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou telefone" aria-label="Buscar por nome ou telefone" /></label>
          <div className="result-filter-row">
            <label><span>Período</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo o período</option><option value="future">Próximos dias</option></select></label>
            <label><span>Loja</span><select value={storeId} onChange={(event) => setStoreId(event.target.value)}><option value="all">Todas as lojas</option>{clientStores.map((store) => <option value={store.id} key={store.id}>{store.shortName}</option>)}</select></label>
            <label><span>Vendedor</span><select value={seller} onChange={(event) => setSeller(event.target.value)}><option value="all">Todos</option>{sellers.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label><span>Veículo</span><select value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="all">Todos</option>{vehicles.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label><span>Auditoria</span><select value={audit} onChange={(event) => setAudit(event.target.value)}><option value="all">Todos</option><option>Confirmado</option><option>Revisão</option><option>Não auditado</option></select></label>
            <button type="button" className="clear-filters-button" onClick={clearFilters}>Limpar</button>
          </div>
        </div>

        <div className="results-table-meta"><span><strong>{filteredLeads.length}</strong> registros exibidos no mockup</span><span>Última atualização: hoje, 18:12</span></div>
        <div className="client-table-wrap results-table-wrap">
          {filteredLeads.length === 0 ? (
            <div className="results-empty"><span>⌕</span><strong>Nenhum resultado encontrado</strong><p>Ajuste os filtros ou limpe a busca para visualizar os registros.</p><button type="button" onClick={clearFilters}>Limpar filtros</button></div>
          ) : (
            <table className="client-table results-table">
              {tab === "appointments" && (
                <>
                  <thead><tr><th>Lead</th><th>Veículo</th><th>Data agendada</th><th>Período</th><th>Loja</th><th>Vendedor</th><th>Auditoria</th><th>Status</th><th /></tr></thead>
                  <tbody>{filteredLeads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                    <td><span className="lead-list-avatar">{lead.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><strong>{lead.name}</strong><small>{lead.phone}</small></div></td>
                    <td>{lead.vehicle}</td><td><strong>{lead.appointment?.date}</strong></td><td>{lead.appointment?.period}</td><td>{getStore(lead.storeId)?.shortName}</td><td>{lead.appointment?.seller ?? <span className="empty-value">Não definido</span>}</td><td><StatusBadge value={lead.audit.status} /></td><td><StatusBadge value={lead.status} /></td><td>›</td>
                  </tr>)}</tbody>
                </>
              )}
              {tab === "qualified" && (
                <>
                  <thead><tr><th>Lead</th><th>Veículo</th><th>Tipo</th><th>Loja direcionada</th><th>Data</th><th>Auditoria</th><th /></tr></thead>
                  <tbody>{filteredLeads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                    <td><span className="lead-list-avatar">{lead.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><strong>{lead.name}</strong><small>{lead.phone}</small></div></td>
                    <td>{lead.vehicle}</td><td><strong>{lead.qualification?.type}</strong></td><td>{getStore(lead.storeId)?.shortName}</td><td>{lead.qualification?.date}</td><td><StatusBadge value={lead.audit.status} /></td><td>›</td>
                  </tr>)}</tbody>
                </>
              )}
              {tab === "all" && (
                <>
                  <thead><tr><th>Lead</th><th>Telefone</th><th>Veículo</th><th>Loja</th><th>Tentativas</th><th>Último contato</th><th>Status</th><th /></tr></thead>
                  <tbody>{filteredLeads.map((lead) => <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                    <td><span className="lead-list-avatar">{lead.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><strong>{lead.name}</strong><small>{lead.origin}</small></div></td>
                    <td>{lead.phone}</td><td>{lead.vehicle}</td><td>{getStore(lead.storeId)?.shortName}</td><td><span className="attempt-count">{lead.attempts}</span></td><td>{lead.lastContact}</td><td><StatusBadge value={lead.status} /></td><td>›</td>
                  </tr>)}</tbody>
                </>
              )}
            </table>
          )}
        </div>
        <div className="results-footer"><span>Dados fictícios para demonstração comercial</span><div><button type="button" disabled>‹</button><button type="button" className="active">1</button><button type="button">2</button><button type="button">3</button><button type="button">›</button></div></div>
      </section>

      {selectedLead && <LeadDrawer lead={selectedLead} campaign={campaign} onClose={() => setSelectedLead(null)} />}
      {toast && <div className="toast-message client-toast"><span>✓</span>{toast}</div>}
    </div>
  );
}
