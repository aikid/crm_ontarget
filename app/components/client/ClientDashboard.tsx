"use client";

import { useEffect, useMemo, useState } from "react";
import { onTargetApi, type ApiCampaign, type CampaignDashboardResponse } from "../../lib/ontarget-api";

type ClientDashboardProps = { campaign: ApiCampaign; userName: string; onOpenResults: () => void; onReady?: () => void };
type ChartMode = "appointments" | "contacts" | "leads";
const chartLabels: Record<ChartMode, string> = { appointments: "Agendamentos", contacts: "Contatos", leads: "Leads trabalhados" };
const emptyMetrics: CampaignDashboardResponse["metrics"] = { received: 0, worked: 0, calls: 0, contacts: 0, appointments: 0, qualified: 0, opportunities: 0, contactRate: "0,0%", conversion: "0,0%", audited: 0, confirmed: 0, divergences: 0 };

function formatNumber(value: number) { return new Intl.NumberFormat("pt-BR").format(value); }
function ratio(value: number, total: number) { return total ? (value / total) * 100 : 0; }
function shortDate(value: string) { const [, month, day] = value.split("-"); return day ? `${day}/${month}` : value; }

export default function ClientDashboard({ campaign, userName, onOpenResults, onReady }: ClientDashboardProps) {
  const [storeId, setStoreId] = useState("all");
  const [chartMode, setChartMode] = useState<ChartMode>("appointments");
  const [data, setData] = useState<CampaignDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    onTargetApi.campaignDashboard<CampaignDashboardResponse>(campaign.id, storeId)
      .then((response) => { if (active) { setData(response); setError(""); } })
      .catch((cause: Error) => active && setError(cause.message))
      .finally(() => {
        if (!active) return;
        setLoading(false);
        onReady?.();
      });
    return () => { active = false; };
  }, [campaign.id, onReady, storeId]);

  const metrics = data?.metrics || emptyMetrics;
  const progress = Math.round(ratio(metrics.worked, metrics.received));
  const remaining = Math.max(0, metrics.received - metrics.worked);
  const chartData = data?.evolution[chartMode] || [];
  const chartMax = Math.max(1, ...chartData);
  const selectedStore = data?.storePerformance.find((row) => row.store.id === storeId)?.store;
  const totalResults = data?.callResults.reduce((sum, item) => sum + item.value, 0) || 0;
  const bestIndex = chartData.length ? chartData.indexOf(Math.max(...chartData)) : -1;
  const funnel = useMemo(() => [
    { label: "Leads recebidos", value: metrics.received },
    { label: "Leads trabalhados", value: metrics.worked },
    { label: "Contatos realizados", value: metrics.contacts },
    { label: "Oportunidades", value: metrics.opportunities },
    { label: "Agendamentos", value: metrics.appointments },
  ], [metrics]);

  return <div className="client-page client-dashboard-page">
    <div className="client-page-intro"><div><span className="client-eyebrow">VISÃO EXECUTIVA</span><h1>Olá, {userName.split(" ")[0]}.</h1><p>Acompanhe a evolução e os resultados desta campanha.</p></div>
      <div className="client-page-actions">{selectedStore && <span className="selected-store-chip"><i /> Loja selecionada: <strong>{selectedStore.shortName}</strong><button type="button" onClick={() => setStoreId("all")}>×</button></span>}<button type="button" className="client-secondary-button" onClick={onOpenResults}>Ver resultados detalhados <span>→</span></button></div>
    </div>
    {error && <div className="results-empty"><strong>Não foi possível carregar os indicadores</strong><p>{error}</p></div>}
    <section className="campaign-hero" aria-busy={loading}>
      <div className="campaign-hero-top"><div><span className="campaign-label">CAMPANHA ATUAL</span><div className="campaign-title-line"><h2>{campaign.name}</h2><span className={campaign.status}><i />{campaign.status === "active" ? "Em andamento" : campaign.status === "completed" ? "Concluída" : "Inativa"}</span></div><p>{campaign.startDate} <span>→</span> {campaign.endDate}</p></div><div className="campaign-progress-number"><strong>{progress}%</strong><span>da base trabalhada</span></div></div>
      <div className="campaign-progress-copy"><span><strong>{formatNumber(metrics.worked)}</strong> de {formatNumber(metrics.received)} leads trabalhados</span><span>{formatNumber(remaining)} leads restantes</span></div><div className="campaign-progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div className="campaign-hero-footer"><div><span>Atualização</span><strong>Dados em tempo real</strong></div><div><span>Taxa de contato</span><strong className="positive">{metrics.contactRate}</strong></div><div><span>Situação</span><strong>{campaign.status === "active" ? "Campanha ativa" : campaign.status === "completed" ? "Campanha concluída" : "Campanha inativa"}</strong></div></div>
    </section>

    <section className="client-kpi-grid" aria-label="Indicadores da campanha">
      <article className="client-kpi-card featured"><div><span className="client-kpi-icon blue">LT</span><span>Leads trabalhados</span></div><strong>{formatNumber(metrics.worked)}</strong><p>Base desta campanha</p></article>
      <article className="client-kpi-card featured"><div><span className="client-kpi-icon indigo">CO</span><span>Contatos realizados</span></div><strong>{formatNumber(metrics.contacts)}</strong><p>Taxa de contato <b>{metrics.contactRate}</b></p></article>
      <article className="client-kpi-card featured success-card"><div><span className="client-kpi-icon green">AG</span><span>Agendamentos</span></div><strong>{formatNumber(metrics.appointments)}</strong><p>Registrados na campanha</p></article>
      <article className="client-kpi-card featured"><div><span className="client-kpi-icon violet">QL</span><span>Qualificados</span></div><strong>{formatNumber(metrics.qualified)}</strong><p>Oportunidades encaminhadas</p></article>
      <article className="client-kpi-card conversion-card"><div><span>Conversão</span></div><strong>{metrics.conversion}</strong><div className="mini-progress"><span style={{ width: metrics.conversion }} /></div><p>Contatos que viraram agendamento</p></article>
      <article className="client-kpi-card compact-metrics"><div><span>Leads recebidos</span><strong>{formatNumber(metrics.received)}</strong></div><div><span>Ligações realizadas</span><strong>{formatNumber(metrics.calls)}</strong></div></article>
    </section>

    <section className="client-analysis-grid"><article className="client-panel funnel-panel"><div className="client-panel-heading"><div><h2>Funil da campanha</h2><p>Progressão desta base até o agendamento</p></div><span className="client-small-tag">Dados reais</span></div><div className="executive-funnel">{funnel.map((item, index) => <div className="funnel-row" key={item.label}><span className="funnel-step">{String(index + 1).padStart(2, "0")}</span><div className="funnel-copy"><strong>{formatNumber(item.value)}</strong><span>{item.label}</span></div><div className="funnel-track"><span style={{ width: `${Math.max(item.value ? 8 : 0, ratio(item.value, metrics.received))}%` }} /></div><small>{Math.round(ratio(item.value, metrics.received))}%</small></div>)}</div></article>
      <article className="client-panel evolution-panel"><div className="client-panel-heading chart-heading"><div><h2>Evolução da campanha</h2><p>Desempenho diário</p></div><label className="chart-mode-select"><select value={chartMode} onChange={(event) => setChartMode(event.target.value as ChartMode)}>{Object.entries(chartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        {chartData.length ? <><div className="client-bar-chart"><div className="client-chart-lines"><span /><span /><span /><span /></div><div className="client-chart-bars">{chartData.map((value, index) => <div key={`${data?.evolution.dates[index]}-${index}`} className="client-chart-column" title={`${data?.evolution.dates[index]}: ${value}`}><span>{value}</span><i style={{ height: `${Math.max(value ? 12 : 0, (value / chartMax) * 100)}%` }} className={index === bestIndex ? "peak" : ""} /><small>{shortDate(data?.evolution.dates[index] || "")}</small></div>)}</div></div><div className="chart-summary"><div><span>Total no período</span><strong>{formatNumber(chartData.reduce((sum, value) => sum + value, 0))}</strong></div><div><span>Melhor dia</span><strong>{bestIndex >= 0 ? shortDate(data?.evolution.dates[bestIndex] || "") : "—"}</strong></div><div><span>Fonte</span><strong className="positive">Operação real</strong></div></div></> : <div className="results-empty"><strong>Sem evolução registrada</strong><p>A campanha ainda não possui atividade para este indicador.</p></div>}
      </article></section>

    <section className="client-analysis-grid second-row"><article className="client-panel client-results-panel"><div className="client-panel-heading"><div><h2>Resultados das ligações</h2><p>Distribuição dos desfechos registrados</p></div><span className="client-small-tag">{formatNumber(totalResults)} finalizados</span></div><div className="client-donut-content"><div className="client-donut"><div><strong>{formatNumber(totalResults)}</strong><span>resultados</span></div></div><div className="client-donut-legend">{data?.callResults.map((item) => <div key={item.code}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong><small>{Math.round(ratio(item.value, totalResults))}%</small></div>)}</div></div></article>
      <article className="client-panel audit-panel"><div className="client-panel-heading"><div><h2>Qualidade dos agendamentos</h2><p>Validação das auditorias desta campanha</p></div><span className="ai-audit-badge">IA</span></div><div className="audit-score-row"><div className="audit-score-ring"><div><strong>{(data?.audit.validationRate || 0).toFixed(1)}%</strong><span>validação</span></div></div><div className="audit-score-copy"><strong>Resumo da auditoria</strong><p>Indicadores calculados apenas com os leads desta campanha.</p></div></div><div className="audit-stats"><div><strong>{data?.audit.registered || 0}</strong><span>Registrados</span></div><div><strong>{data?.audit.audited || 0}</strong><span>Auditados</span></div><div className="success"><strong>{data?.audit.confirmed || 0}</strong><span>Confirmados</span></div><div className="danger"><strong>{data?.audit.divergences || 0}</strong><span>Divergências</span></div></div><button type="button" className="client-text-button" onClick={onOpenResults}>Consultar resultados <span>→</span></button></article></section>

    <section className="client-bottom-grid"><article className="client-panel store-performance-panel"><div className="client-panel-heading"><div><h2>Desempenho por loja</h2><p>Clique em uma loja para filtrar esta campanha</p></div><button type="button" className={`all-stores-button ${storeId === "all" ? "active" : ""}`} onClick={() => setStoreId("all")}>Todas as lojas</button></div><div className="client-table-wrap"><table className="client-table store-table"><thead><tr><th>Loja</th><th>Leads</th><th>Contatos</th><th>Agendamentos</th><th>Conversão</th><th /></tr></thead><tbody>{data?.storePerformance.map((row) => <tr key={row.store.id} onClick={() => setStoreId(row.store.id)} className={storeId === row.store.id ? "selected" : ""}><td><span className="store-mark">{row.store.shortName.slice(0, 2).toUpperCase()}</span><div><strong>{row.store.shortName}</strong><small>{row.store.name}</small></div></td><td>{row.leads}</td><td>{row.contacts}</td><td>{row.appointments}</td><td><span className="client-conversion-pill">{row.conversion}</span></td><td>→</td></tr>)}</tbody></table></div></article>
      <article className="client-panel executive-summary-card"><span className="summary-icon">R</span><div><span className="client-eyebrow">RESUMO EXECUTIVO</span><h2>Resumo da campanha</h2></div><p>Até o momento, <strong>{progress}% da base foi trabalhada</strong>. Foram realizados <strong>{formatNumber(metrics.contacts)} contatos</strong>, com <strong>{formatNumber(metrics.appointments)} agendamentos</strong> e <strong>{formatNumber(metrics.qualified)} leads qualificados</strong>.</p><button type="button" className="client-primary-button" onClick={onOpenResults}>Explorar resultados <span>→</span></button></article></section>
  </div>;
}
