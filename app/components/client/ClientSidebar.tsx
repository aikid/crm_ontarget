import type { ClientScreen } from "./ClientPortal";
import Link from "next/link";

type ClientSidebarProps = {
  activeScreen: ClientScreen;
  onNavigate: (screen: ClientScreen) => void;
  clientName: string;
  onLogout: () => void;
};

const items = [
  { id: "dashboard", label: "Dashboard", short: "DB", enabled: true },
  { id: "campaigns", label: "Campanhas", short: "CA", enabled: false },
  { id: "results", label: "Resultados", short: "RE", enabled: true },
  { id: "leads", label: "Leads", short: "LE", enabled: false },
  { id: "reports", label: "Relatórios", short: "RL", enabled: false },
];

export default function ClientSidebar({ activeScreen, onNavigate, clientName, onLogout }: ClientSidebarProps) {
  return (
    <aside className="client-sidebar">
      <div className="client-brand">
        <span className="brand-mark">O</span>
        <div><strong>OnTarget</strong><span>Portal do Cliente</span></div>
      </div>

      <div className="client-account-card">
        <span>CONTA ATIVA</span>
        <strong>{clientName}</strong>
        <small>Acesso executivo</small>
      </div>

      <span className="client-nav-label">ACOMPANHAMENTO</span>
      <nav className="client-nav" aria-label="Navegação do Portal do Cliente">
        {items.map((item) => {
          const active = item.id === activeScreen;
          return (
            <button
              type="button"
              key={item.id}
              className={`${active ? "active" : ""} ${!item.enabled ? "disabled" : ""}`}
              onClick={() => item.enabled && onNavigate(item.id as ClientScreen)}
              aria-current={active ? "page" : undefined}
              aria-disabled={!item.enabled}
              title={!item.enabled ? "Disponível na próxima versão" : undefined}
            >
              <span>{item.short}</span>{item.label}{!item.enabled && <i>•</i>}
            </button>
          );
        })}
      </nav>

      <div className="client-sidebar-spacer" />
      <div className="client-trust-card">
        <span className="trust-mark">✓</span>
        <div><strong>Dados atualizados</strong><small>Hoje, 18:12</small></div>
      </div>
      <div className="client-sidebar-footer">
        <button type="button"><span>?</span> Ajuda</button>
        <Link href="/"><span>↔</span> Visão OnTarget</Link>
        <button type="button" onClick={onLogout}><span>→</span> Sair</button>
      </div>
    </aside>
  );
}
