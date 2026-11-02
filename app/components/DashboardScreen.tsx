"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import LoadingOverlay from "./ui/LoadingOverlay";
import {
  onTargetApi,
  type AdminCampaign,
  type AdminClient,
  type AdminStore,
  type AdminUser,
  type OperationDashboard,
} from "../lib/ontarget-api";

type DashboardScreenProps = { onOpenSdr: () => void; canOpenSdr: boolean };
type Period = "today" | "7" | "30" | "90";

function dateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function periodDates(period: Period) {
  const end = new Date();
  const start = new Date(end);
  const days = period === "today" ? 0 : Number(period) - 1;
  start.setDate(start.getDate() - days);
  return { dateFrom: dateKey(start), dateTo: dateKey(end) };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function SelectFilter({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return <label className="filter-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}

export default function DashboardScreen({ onOpenSdr, canOpenSdr }: DashboardScreenProps) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("90");
  const [clientId, setClientId] = useState("all");
  const [storeId, setStoreId] = useState("all");
  const [campaignId, setCampaignId] = useState("all");
  const [sdrId, setSdrId] = useState("all");
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [data, setData] = useState<OperationDashboard | null>(null);
  const [sdrSummary, setSdrSummary] = useState({ worked: 0, contacts: 0, qualified: 0, callbacks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role === "SDR") {
      void onTargetApi.sdrSummary(user.id).then(setSdrSummary).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o resumo."));
      return;
    }
    void Promise.all([onTargetApi.admin.clients(), onTargetApi.admin.stores(), onTargetApi.admin.campaigns(), onTargetApi.admin.users()])
      .then(([clientResponse, storeResponse, campaignResponse, userResponse]) => {
        setClients(clientResponse.data);
        setStores(storeResponse.data);
        setCampaigns(campaignResponse.data);
        setUsers(userResponse.data.filter((item) => item.role === "SDR"));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os filtros."));
  }, [user]);

  const loadDashboard = useCallback(async () => {
    if (user?.role !== "GESTOR") return;
    setLoading(true);
    setError("");
    try {
      setData(await onTargetApi.operationDashboard({ ...periodDates(period), clientId, storeId, campaignId, sdrId }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, clientId, period, sdrId, storeId, user?.role]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const availableStores = stores.filter((store) => clientId === "all" || store.clientId === clientId);
  const availableCampaigns = campaigns.filter((campaign) => (clientId === "all" || campaign.clientId === clientId) && (storeId === "all" || campaign.storeId === storeId));
  const maxActivity = Math.max(1, ...(data?.activity.map((item) => item.value) || [1]));
  const outcomeTotal = data?.outcomes.reduce((total, item) => total + item.value, 0) || 0;
  const donutBackground = useMemo(() => {
    if (!data || !outcomeTotal) return "#eef0f4";
    let offset = 0;
    const segments = data.outcomes.filter((item) => item.value).map((item) => {
      const start = offset;
      offset += (item.value / outcomeTotal) * 100;
      return `${item.color} ${start}% ${offset}%`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [data, outcomeTotal]);

  if (user?.role === "SDR") {
    return <div className="screen dashboard-screen">
      <header className="topbar"><div><div className="eyebrow-row"><span className="eyebrow">MINHA OPERAÇÃO</span><span className="live-badge"><span /> ONLINE</span></div><h1>Olá, {user.name.split(" ")[0]}</h1><p>Seu resumo de tentativas registradas hoje.</p></div></header>
      {error && <div className="admin-message error">{error}</div>}
      <section className="sdr-welcome-hero">
        <div className="sdr-welcome-copy"><span>FILA INTELIGENTE</span><h2>Transforme o próximo contato em oportunidade.</h2><p>A SysOn reserva um lead por vez para você trabalhar com foco e segurança.</p>{canOpenSdr && <button className="dashboard-hero-button" type="button" onClick={onOpenSdr}>Iniciar operação SDR <span>→</span></button>}</div>
        <div className="sdr-welcome-visual" aria-hidden="true"><span className="signal-ring ring-one" /><span className="signal-ring ring-two" /><strong>OT</strong><small>Fila online</small></div>
      </section>
      <section className="kpi-grid sdr-home-kpis">
        {[{ label: "Tentativas", value: sdrSummary.worked, icon: "↗", tone: "red" }, { label: "Contatos", value: sdrSummary.contacts, icon: "✓", tone: "green" }, { label: "Qualificados", value: sdrSummary.qualified, icon: "★", tone: "amber" }, { label: "Retornos", value: sdrSummary.callbacks, icon: "↻", tone: "violet" }].map((item) => <article className={`kpi-card kpi-tone-${item.tone}`} key={item.label}><div className="kpi-heading"><span>{item.label}</span><i>{item.icon}</i></div><strong>{item.value}</strong><span className="kpi-detail neutral">Hoje</span></article>)}
      </section>
    </div>;
  }

  const kpis = data ? [
    { label: "Leads trabalhados", value: formatNumber(data.kpis.worked), detail: "Leads únicos no período" },
    { label: "Tentativas", value: formatNumber(data.kpis.attempts), detail: "Resultados registrados" },
    { label: "Contatos realizados", value: formatNumber(data.kpis.contacts), detail: `Taxa de contato ${data.kpis.contactRate}%` },
    { label: "Qualificados", value: formatNumber(data.kpis.qualified), detail: "Oportunidades confirmadas" },
    { label: "Retornos", value: formatNumber(data.kpis.callbacks), detail: "Agendados no período" },
    { label: "Conversão", value: `${data.kpis.conversion}%`, detail: "Qualificados por contato" },
  ] : [];

  return <div className="screen dashboard-screen">
    <LoadingOverlay show={loading} title="Atualizando dashboard" message="Consolidando os indicadores da operação." />
    <header className="topbar"><div><div className="eyebrow-row"><span className="eyebrow">GESTÃO DA OPERAÇÃO</span><span className="live-badge"><span /> DADOS REAIS</span></div><h1>Visão geral</h1><p>Acompanhe produtividade e resultados registrados pela equipe.</p></div><div className="topbar-actions"><button className="period-button" type="button" onClick={() => void loadDashboard()}>Atualizar dados ↻</button></div></header>

    <section className="filters-panel dashboard-real-filters" aria-label="Filtros do dashboard">
      <SelectFilter label="Período" value={period} onChange={(value) => setPeriod(value as Period)} options={[{ value: "today", label: "Hoje" }, { value: "7", label: "Últimos 7 dias" }, { value: "30", label: "Últimos 30 dias" }, { value: "90", label: "Últimos 90 dias" }]} />
      <SelectFilter label="Cliente" value={clientId} onChange={(value) => { setClientId(value); setStoreId("all"); setCampaignId("all"); }} options={[{ value: "all", label: "Todos" }, ...clients.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }))]} />
      <SelectFilter label="Campanha" value={campaignId} onChange={setCampaignId} options={[{ value: "all", label: "Todas" }, ...availableCampaigns.map((item) => ({ value: item.id, label: item.name }))]} />
      <SelectFilter label="Loja" value={storeId} onChange={(value) => { setStoreId(value); setCampaignId("all"); }} options={[{ value: "all", label: "Todas" }, ...availableStores.filter((item) => item.active).map((item) => ({ value: item.id, label: item.shortName }))]} />
      <SelectFilter label="SDR" value={sdrId} onChange={setSdrId} options={[{ value: "all", label: "Todos" }, ...users.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }))]} />
    </section>

    {error && <div className="admin-message error">{error}</div>}
    {!data ? <div className="dashboard-loading">Preparando indicadores…</div> : <>
      <section className="dashboard-overview-grid">
        <article className="dashboard-highlight-card">
          <div className="dashboard-highlight-heading"><div><span>EFICIÊNCIA COMERCIAL</span><h2>Ritmo da operação</h2></div><span className="dashboard-status-pill"><i /> Operação ativa</span></div>
          <div className="dashboard-highlight-main"><strong>{data.kpis.contactRate}%</strong><span>taxa de contato</span></div>
          <div className="dashboard-progress-row"><span><b>Contato</b><small>{data.kpis.contacts} de {data.kpis.worked} leads</small></span><div><i style={{ width: `${Math.min(100, data.kpis.contactRate)}%` }} /></div></div>
          <div className="dashboard-progress-row"><span><b>Conversão</b><small>{data.kpis.qualified} oportunidades</small></span><div><i style={{ width: `${Math.min(100, data.kpis.conversion)}%` }} /></div></div>
        </article>
        <div className="dashboard-live-grid" aria-label="Operação em tempo real">
          {[{ label: "Leads na fila", value: data.live.pending, icon: "F", tone: "neutral" }, { label: "SDRs ativos", value: data.live.activeSdrs, icon: "A", tone: "success" }, { label: "Reservados agora", value: data.live.reserved, icon: "R", tone: "primary" }, { label: "Retornos", value: data.live.callbacks, icon: "↻", tone: "warning" }].map((item) => <article key={item.label}><span className={`pulse-symbol ${item.tone}`}>{item.icon}</span><div><strong>{item.value}</strong><span>{item.label}</span></div></article>)}
        </div>
      </section>

      <div className="dashboard-section-heading"><div><span>DESEMPENHO</span><h2>Indicadores do período</h2></div><p>Visão consolidada dos resultados selecionados nos filtros.</p></div>
      <section className="kpi-grid dashboard-kpi-grid" aria-label="Indicadores principais">{kpis.map((kpi, index) => <article className={`kpi-card kpi-tone-${["red", "blue", "green", "amber", "violet", "dark"][index]}`} key={kpi.label}><div className="kpi-heading"><span>{kpi.label}</span><i>{["L", "↗", "✓", "★", "↻", "%"][index]}</i></div><strong>{kpi.value}</strong><span className="kpi-detail neutral">{kpi.detail}</span></article>)}</section>

      <div className="dashboard-section-heading compact"><div><span>ANÁLISE</span><h2>Ritmo e resultados</h2></div></div>
      <section className="analytics-grid">
        <article className="panel calls-chart-panel"><div className="panel-heading"><div><h2>Atividade operacional</h2><p>Tentativas registradas ao longo do período</p></div><div className="chart-total"><strong>{data?.kpis.attempts || 0}</strong><span>tentativas</span></div></div><div className="bar-chart"><div className="chart-grid-lines"><span>{maxActivity}</span><span>{Math.round(maxActivity / 2)}</span><span>0</span></div><div className="bars dashboard-bars">{data?.activity.map((item) => <div className="bar-column" key={item.label}><span className="bar-value">{item.value}</span><div className="bar" style={{ height: `${Math.max(3, (item.value / maxActivity) * 100)}%` }} /><small>{item.label}</small></div>)}</div></div></article>
        <article className="panel result-panel"><div className="panel-heading"><div><h2>Resultados das tentativas</h2><p>Distribuição dos registros finalizados</p></div></div><div className="result-content"><div className="donut-chart" style={{ background: donutBackground }}><div className="donut-center"><strong>{outcomeTotal}</strong><span>resultados</span></div></div><div className="legend-list">{data?.outcomes.map((item) => <div key={item.code}><span className="legend-color" style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div></article>
      </section>

      <section className="bottom-grid dashboard-ranking-grid"><article className="panel ranking-panel"><div className="panel-heading"><div><span className="panel-kicker">TIME COMERCIAL</span><h2>Desempenho SDR</h2><p>Resultados individuais no período selecionado</p></div><span className="ranking-medal">★</span></div><div className="table-wrap"><table><thead><tr><th>SDR</th><th>Tentativas</th><th>Contatos</th><th>Qualificados</th><th>Conversão</th></tr></thead><tbody>{data?.ranking.map((person, index) => <tr key={person.id}><td><span className={`rank-number ${index === 0 ? "top" : ""}`}>{index + 1}</span><span className="avatar avatar-soft">{person.initials}</span><strong>{person.name}</strong></td><td>{person.attempts}</td><td>{person.contacts}</td><td>{person.qualified}</td><td><span className="conversion-pill">{person.conversion}%</span></td></tr>)}</tbody></table></div></article></section>
    </>}
  </div>;
}
