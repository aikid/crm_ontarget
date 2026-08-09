"use client";

import { useMemo, useState } from "react";
import {
  campaignCallResults,
  campaignEvolution,
  campaignMetricsByStore,
  getStore,
  storePerformance,
  type Campaign,
  type CampaignMetrics,
} from "../../data/clientPortalData";

type ClientDashboardProps = {
  campaign: Campaign;
  onOpenResults: () => void;
};

type ChartMode = "appointments" | "contacts" | "leads";

const chartLabels: Record<ChartMode, string> = {
  appointments: "Agendamentos",
  contacts: "Contatos",
  leads: "Leads trabalhados",
};

const completedCampaignMetrics: CampaignMetrics = {
  received: 980,
  worked: 980,
  calls: 1368,
  contacts: 424,
  appointments: 119,
  qualified: 68,
  contactRate: "43,3%",
  conversion: "28,1%",
  opportunities: 187,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default function ClientDashboard({ campaign, onOpenResults }: ClientDashboardProps) {
  const [storeId, setStoreId] = useState("all");
  const [chartMode, setChartMode] = useState<ChartMode>("appointments");

  const metrics = campaign.status === "completed"
    ? completedCampaignMetrics
    : campaignMetricsByStore[storeId] ?? campaignMetricsByStore.all;
  const progress = Math.round((metrics.worked / metrics.received) * 100);
  const remaining = Math.max(0, metrics.received - metrics.worked);
  const chartData = campaignEvolution[chartMode];
  const chartMax = Math.max(...chartData);
  const selectedStore = storeId === "all" ? null : getStore(storeId);

  const funnel = useMemo(() => [
    { label: "Leads recebidos", value: metrics.received, ratio: 100 },
    { label: "Leads trabalhados", value: metrics.worked, ratio: (metrics.worked / metrics.received) * 100 },
    { label: "Contatos realizados", value: metrics.contacts, ratio: (metrics.contacts / metrics.received) * 100 },
    { label: "Oportunidades", value: metrics.opportunities, ratio: (metrics.opportunities / metrics.received) * 100 },
    { label: "Agendamentos", value: metrics.appointments, ratio: (metrics.appointments / metrics.received) * 100 },
  ], [metrics]);

  return (
    <div className="client-page client-dashboard-page">
      <div className="client-page-intro">
        <div>
          <span className="client-eyebrow">VISÃO EXECUTIVA</span>
          <h1>Olá, Ricardo.</h1>
          <p>Acompanhe a evolução e os resultados da sua campanha em um só lugar.</p>
        </div>
        <div className="client-page-actions">
          {selectedStore && <span className="selected-store-chip"><i /> Loja selecionada: <strong>{selectedStore.shortName}</strong><button type="button" onClick={() => setStoreId("all")}>×</button></span>}
          <button type="button" className="client-secondary-button" onClick={onOpenResults}>Ver resultados detalhados <span>→</span></button>
        </div>
      </div>

      <section className="campaign-hero">
        <div className="campaign-hero-top">
          <div>
            <span className="campaign-label">CAMPANHA ATUAL</span>
            <div className="campaign-title-line"><h2>{campaign.name}</h2><span className={campaign.status}><i />{campaign.status === "active" ? "Em andamento" : "Concluída"}</span></div>
            <p>{campaign.startDate} <span>→</span> {campaign.endDate}</p>
          </div>
          <div className="campaign-progress-number"><strong>{progress}%</strong><span>da base trabalhada</span></div>
        </div>
        <div className="campaign-progress-copy"><span><strong>{formatNumber(metrics.worked)}</strong> de {formatNumber(metrics.received)} leads trabalhados</span><span>{formatNumber(remaining)} leads restantes</span></div>
        <div className="campaign-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="campaign-hero-footer">
          <div><span>Última atualização</span><strong>Hoje, 18:12</strong></div>
          <div><span>Ritmo da campanha</span><strong className="positive">Dentro do planejado</strong></div>
          <div><span>Dias restantes</span><strong>{campaign.status === "active" ? "6 dias" : "Campanha concluída"}</strong></div>
        </div>
      </section>

      <section className="client-kpi-grid" aria-label="Indicadores da campanha">
        <article className="client-kpi-card featured">
          <div><span className="client-kpi-icon blue">LT</span><span>Leads trabalhados</span></div>
          <strong>{formatNumber(metrics.worked)}</strong>
          <p><span className="positive">↑ 12,4%</span> no período</p>
        </article>
        <article className="client-kpi-card featured">
          <div><span className="client-kpi-icon indigo">CO</span><span>Contatos realizados</span></div>
          <strong>{formatNumber(metrics.contacts)}</strong>
          <p>Taxa de contato <b>{metrics.contactRate}</b></p>
        </article>
        <article className="client-kpi-card featured success-card">
          <div><span className="client-kpi-icon green">AG</span><span>Agendamentos</span></div>
          <strong>{formatNumber(metrics.appointments)}</strong>
          <p><span className="positive">↑ 9,2%</span> nesta semana</p>
        </article>
        <article className="client-kpi-card featured">
          <div><span className="client-kpi-icon violet">QL</span><span>Qualificados</span></div>
          <strong>{formatNumber(metrics.qualified)}</strong>
          <p>Oportunidades encaminhadas</p>
        </article>
        <article className="client-kpi-card conversion-card">
          <div><span>Conversão</span><span className="trend-up">↑ 2,1 p.p.</span></div>
          <strong>{metrics.conversion}</strong>
          <div className="mini-progress"><span style={{ width: metrics.conversion }} /></div>
          <p>Contatos que viraram resultado</p>
        </article>
        <article className="client-kpi-card compact-metrics">
          <div><span>Leads recebidos</span><strong>{formatNumber(metrics.received)}</strong></div>
          <div><span>Ligações realizadas</span><strong>{formatNumber(metrics.calls)}</strong></div>
        </article>
      </section>

      <section className="client-analysis-grid">
        <article className="client-panel funnel-panel">
          <div className="client-panel-heading">
            <div><h2>Funil da campanha</h2><p>Progressão da base até o agendamento</p></div>
            <span className="client-small-tag">Base atualizada</span>
          </div>
          <div className="executive-funnel">
            {funnel.map((item, index) => (
              <div className="funnel-row" key={item.label}>
                <span className="funnel-step">{String(index + 1).padStart(2, "0")}</span>
                <div className="funnel-copy"><strong>{formatNumber(item.value)}</strong><span>{item.label}</span></div>
                <div className="funnel-track"><span style={{ width: `${Math.max(8, item.ratio)}%` }} /></div>
                <small>{Math.round(item.ratio)}%</small>
              </div>
            ))}
          </div>
          <div className="funnel-insight"><span>↗</span><p><strong>Boa progressão entre contato e oportunidade</strong><small>42,4% dos contatos evoluíram para uma oportunidade comercial.</small></p></div>
        </article>

        <article className="client-panel evolution-panel">
          <div className="client-panel-heading chart-heading">
            <div><h2>Evolução da campanha</h2><p>Desempenho diário • 01/08 a 09/08</p></div>
            <label className="chart-mode-select">
              <select value={chartMode} onChange={(event) => setChartMode(event.target.value as ChartMode)} aria-label="Métrica do gráfico">
                {Object.entries(chartLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="client-bar-chart" aria-label={`Gráfico de ${chartLabels[chartMode].toLowerCase()} por dia`}>
            <div className="client-chart-lines"><span /><span /><span /><span /></div>
            <div className="client-chart-bars">
              {chartData.map((value, index) => (
                <div key={index} className="client-chart-column" title={`${String(index + 1).padStart(2, "0")}/08: ${value}`}>
                  <span>{value}</span>
                  <i style={{ height: `${Math.max(12, (value / chartMax) * 100)}%` }} className={index === chartData.length - 2 ? "peak" : ""} />
                  <small>{String(index + 1).padStart(2, "0")}/08</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-summary"><div><span>Total no período</span><strong>{formatNumber(chartData.reduce((sum, value) => sum + value, 0))}</strong></div><div><span>Melhor dia</span><strong>08/08</strong></div><div><span>Tendência</span><strong className="positive">Positiva</strong></div></div>
        </article>
      </section>

      <section className="client-analysis-grid second-row">
        <article className="client-panel client-results-panel">
          <div className="client-panel-heading"><div><h2>Resultados das ligações</h2><p>Distribuição dos desfechos registrados</p></div><span className="client-small-tag">1.214 finalizadas</span></div>
          <div className="client-donut-content">
            <div className="client-donut"><div><strong>1.214</strong><span>resultados</span></div></div>
            <div className="client-donut-legend">
              {campaignCallResults.map((item) => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong><small>{Math.round((item.value / 1214) * 100)}%</small></div>)}
            </div>
          </div>
        </article>

        <article className="client-panel audit-panel">
          <div className="client-panel-heading"><div><h2>Qualidade dos agendamentos</h2><p>Validação dos critérios da campanha</p></div><span className="ai-audit-badge" title="Os agendamentos são analisados para verificar se os critérios da campanha foram atendidos.">IA <i>i</i></span></div>
          <div className="audit-score-row">
            <div className="audit-score-ring"><div><strong>96,4%</strong><span>validação</span></div></div>
            <div className="audit-score-copy"><strong>Alta consistência</strong><p>Os agendamentos auditados atendem aos critérios definidos para a campanha.</p><span>Auditoria assistida por IA</span></div>
          </div>
          <div className="audit-stats">
            <div><strong>142</strong><span>Registrados</span></div>
            <div><strong>137</strong><span>Auditados</span></div>
            <div className="success"><strong>132</strong><span>Confirmados</span></div>
            <div className="danger"><strong>5</strong><span>Divergências</span></div>
          </div>
          <button type="button" className="client-text-button" onClick={onOpenResults}>Consultar agendamentos auditados <span>→</span></button>
        </article>
      </section>

      <section className="client-bottom-grid">
        <article className="client-panel store-performance-panel">
          <div className="client-panel-heading">
            <div><h2>Desempenho por loja</h2><p>Clique em uma loja para filtrar os indicadores</p></div>
            <button type="button" className={`all-stores-button ${storeId === "all" ? "active" : ""}`} onClick={() => setStoreId("all")}>Todas as lojas</button>
          </div>
          <div className="client-table-wrap">
            <table className="client-table store-table">
              <thead><tr><th>Loja</th><th>Leads</th><th>Contatos</th><th>Agendamentos</th><th>Conversão</th><th /></tr></thead>
              <tbody>
                {storePerformance.map((row) => {
                  const store = getStore(row.storeId)!;
                  return (
                    <tr key={row.storeId} onClick={() => setStoreId(row.storeId)} className={storeId === row.storeId ? "selected" : ""}>
                      <td><span className="store-mark">{store.shortName.split(" ").slice(-1)[0].slice(0, 2).toUpperCase()}</span><div><strong>{store.shortName}</strong><small>Volkswagen</small></div></td>
                      <td>{row.leads}</td><td>{row.contacts}</td><td>{row.appointments}</td><td><span className="client-conversion-pill">{row.conversion}</span></td><td>→</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="client-panel executive-summary-card">
          <span className="summary-icon">R</span>
          <div><span className="client-eyebrow">RESUMO EXECUTIVO</span><h2>Resumo da campanha</h2></div>
          <p>Até o momento, <strong>{progress}% da base foi trabalhada</strong>. Foram realizados <strong>{formatNumber(metrics.contacts)} contatos</strong>, resultando em <strong>{formatNumber(metrics.appointments)} agendamentos</strong> e <strong>{formatNumber(metrics.qualified)} leads qualificados</strong>.</p>
          <div className="summary-highlight"><span>↗</span><p><strong>Campanha dentro do planejado</strong><small>A operação mantém ritmo suficiente para concluir a base até 15/08.</small></p></div>
          <button type="button" className="client-primary-button" onClick={onOpenResults}>Explorar resultados <span>→</span></button>
        </article>
      </section>
    </div>
  );
}
