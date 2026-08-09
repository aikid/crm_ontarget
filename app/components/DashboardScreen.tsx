import { callResults, hourlyCalls, ranking } from "../data/mockData";

type DashboardScreenProps = {
  onOpenSdr: () => void;
};

const kpis = [
  { label: "Leads trabalhados", value: "428", detail: "+12,4% vs. ontem", tone: "positive" },
  { label: "Ligações realizadas", value: "612", detail: "1,4 por lead", tone: "neutral" },
  { label: "Contatos realizados", value: "231", detail: "Taxa de contato 37,7%", tone: "positive" },
  { label: "Agendados", value: "74", detail: "+9 hoje", tone: "positive" },
  { label: "Leads qualificados", value: "39", detail: "16,9% dos contatos", tone: "neutral" },
  { label: "Conversão", value: "26,8%", detail: "+2,1 p.p. no período", tone: "positive" },
];

const liveAgents = [
  { initials: "AS", name: "Ana Souza", state: "calling", title: "Ligando para João Pereira", detail: "Volkswagen T-Cross", meta: "00:01:42" },
  { initials: "LS", name: "Lucas Silva", state: "available", title: "Disponível", detail: "Próximo lead em fila", meta: "Aguardando" },
  { initials: "MA", name: "Mariana Alves", state: "callback", title: "Retorno agendado", detail: "18:00 — Fernanda Costa", meta: "em 26 min" },
];

function SelectFilter({ label, value, options }: { label: string; value: string; options: string[] }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select defaultValue={value} aria-label={label}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function DashboardScreen({ onOpenSdr }: DashboardScreenProps) {
  return (
    <div className="screen dashboard-screen">
      <header className="topbar">
        <div>
          <div className="eyebrow-row">
            <span className="eyebrow">GESTÃO DA OPERAÇÃO</span>
            <span className="live-badge"><span /> AO VIVO</span>
          </div>
          <h1>Visão geral</h1>
          <p>Acompanhe produtividade, conversão e ritmo da equipe em tempo real.</p>
        </div>
        <div className="topbar-actions">
          <button className="period-button" type="button">
            <span className="calendar-glyph">09</span>
            Hoje, 09 de agosto
            <span className="chevron">⌄</span>
          </button>
          <button className="icon-button" type="button" aria-label="Notificações">
            <span className="notification-glyph">•</span>
          </button>
        </div>
      </header>

      <section className="filters-panel" aria-label="Filtros do dashboard">
        <SelectFilter label="Período" value="Hoje" options={["Hoje", "Últimos 7 dias", "Este mês"]} />
        <SelectFilter label="Cliente" value="Grupo Brasal" options={["Grupo Brasal", "Grupo Saga", "Revemar"]} />
        <SelectFilter label="Campanha" value="Feirão Volkswagen Agosto" options={["Feirão Volkswagen Agosto", "Campanha T-Cross 2026", "Semana do Seminovo"]} />
        <SelectFilter label="Loja" value="Todas" options={["Todas", "Brasal Volkswagen SIA", "Brasal Asa Norte", "Saga Volkswagen", "Revemar Volkswagen"]} />
        <SelectFilter label="SDR" value="Todos" options={["Todos", "Ana Souza", "Lucas Silva", "Mariana Alves", "Pedro Lima"]} />
        <button className="filter-action" type="button" aria-label="Mais opções de filtro">•••</button>
      </section>

      <section className="kpi-grid" aria-label="Indicadores principais">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <div className="kpi-heading">
              <span>{kpi.label}</span>
              <button type="button" aria-label={`Mais detalhes de ${kpi.label}`}>···</button>
            </div>
            <strong>{kpi.value}</strong>
            <span className={`kpi-detail ${kpi.tone}`}>{kpi.detail}</span>
          </article>
        ))}
      </section>

      <section className="pulse-strip" aria-label="Indicadores da operação agora">
        <div>
          <span className="pulse-symbol neutral">R</span>
          <p><strong>286</strong><span>Leads restantes</span></p>
        </div>
        <div>
          <span className="pulse-symbol success">A</span>
          <p><strong>12</strong><span>SDRs ativos</span></p>
        </div>
        <div>
          <span className="pulse-symbol primary">L</span>
          <p><strong>4</strong><span>Em ligação agora</span></p>
        </div>
        <div>
          <span className="pulse-symbol warning">18</span>
          <p><strong>23</strong><span>Retornos para hoje</span></p>
        </div>
      </section>

      <section className="analytics-grid">
        <article className="panel calls-chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Ligações por hora</h2>
              <p>Volume realizado ao longo do dia</p>
            </div>
            <div className="chart-total"><strong>612</strong><span>ligações hoje</span></div>
          </div>
          <div className="bar-chart" aria-label="Gráfico de ligações por hora">
            <div className="chart-grid-lines"><span>90</span><span>60</span><span>30</span><span>0</span></div>
            <div className="bars">
              {hourlyCalls.map((item) => (
                <div className="bar-column" key={item.hour} title={`${item.hour}: ${item.value} ligações`}>
                  <span className="bar-value">{item.value}</span>
                  <div className={`bar ${item.hour === "17h" ? "highlight" : ""}`} style={{ height: `${item.value}%` }} />
                  <small>{item.hour}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel result-panel">
          <div className="panel-heading">
            <div>
              <h2>Resultado das ligações</h2>
              <p>Distribuição dos contatos finalizados</p>
            </div>
            <button className="panel-more" type="button">···</button>
          </div>
          <div className="result-content">
            <div className="donut-chart" role="img" aria-label="Resultados das ligações">
              <div className="donut-center"><strong>274</strong><span>finalizadas</span></div>
            </div>
            <div className="legend-list">
              {callResults.map((item) => (
                <div key={item.label}>
                  <span className="legend-color" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel ranking-panel">
          <div className="panel-heading">
            <div>
              <h2>Ranking SDR</h2>
              <p>Desempenho individual da equipe hoje</p>
            </div>
            <button className="text-action" type="button">Ver relatório <span>→</span></button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>SDR</th><th>Ligações</th><th>Contatos</th><th>Agendados</th><th>Conversão</th></tr>
              </thead>
              <tbody>
                {ranking.map((person, index) => (
                  <tr key={person.name}>
                    <td>
                      <span className={`rank-number ${index === 0 ? "top" : ""}`}>{index + 1}</span>
                      <span className="avatar avatar-soft">{person.initials}</span>
                      <strong>{person.name}</strong>
                    </td>
                    <td>{person.calls}</td>
                    <td>{person.contacts}</td>
                    <td>{person.appointments}</td>
                    <td><span className="conversion-pill">{person.conversion}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel operation-panel">
          <div className="panel-heading">
            <div>
              <h2>Operação agora</h2>
              <p>Atividade da equipe em tempo real</p>
            </div>
            <span className="live-count"><span /> 12 online</span>
          </div>
          <div className="agent-list">
            {liveAgents.map((agent) => (
              <div className="agent-row" key={agent.name}>
                <span className="avatar avatar-soft">{agent.initials}</span>
                <div className="agent-copy">
                  <strong>{agent.name}</strong>
                  <span className={`agent-state ${agent.state}`}><i />{agent.title}</span>
                  <small>{agent.detail}</small>
                </div>
                <span className={`agent-meta ${agent.state}`}>{agent.meta}</span>
              </div>
            ))}
          </div>
          <button className="primary-button operation-cta" type="button" onClick={onOpenSdr}>
            Ver operação SDR <span>→</span>
          </button>
        </article>
      </section>
    </div>
  );
}
