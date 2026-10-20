import type { ClientScreen } from "./ClientPortal";
import Link from "next/link";

type ClientSidebarProps = {
  activeScreen: ClientScreen;
  onNavigate: (screen: ClientScreen) => void;
  clientName: string;
  onLogout: () => void;
  loggingOut: boolean;
};

const items = [
  { id: "dashboard", label: "Visão geral", icon: "home", enabled: true },
  { id: "campaigns", label: "Campanhas", icon: "campaign", enabled: false },
  { id: "results", label: "Resultados", icon: "results", enabled: true },
  { id: "leads", label: "Leads", icon: "leads", enabled: false },
  { id: "reports", label: "Relatórios", icon: "reports", enabled: false },
];

function ClientNavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    campaign: <><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M7 14v5a2 2 0 0 0 2 2h2v-6"/></>,
    results: <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2"/></>,
    leads: <><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.3a4 4 0 0 1 0 7.4M22 21v-2a4 4 0 0 0-3-3.8"/></>,
    reports: <><path d="M5 3h11l3 3v15H5V3Z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function ClientSidebar({ activeScreen, onNavigate, clientName, onLogout, loggingOut }: ClientSidebarProps) {
  return (
    <aside className="client-sidebar">
      <div className="client-brand">
        <span className="brand-mark"><i /></span>
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
              <span><ClientNavIcon name={item.icon} /></span>{item.label}{!item.enabled && <i>•</i>}
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
        <button type="button" onClick={onLogout} disabled={loggingOut} aria-busy={loggingOut}>
          <span>{loggingOut ? <i className="logout-button-spinner" aria-hidden="true" /> : "→"}</span>
          {loggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
