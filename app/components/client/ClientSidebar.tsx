import type { ClientScreen } from "./ClientPortal";
import { useAuth } from "../auth/AuthProvider";

type ClientSidebarProps = {
  activeScreen: ClientScreen;
  onNavigate: (screen: ClientScreen) => void;
  clientName: string;
  onLogout: () => void;
  loggingOut: boolean;
};

const baseItems = [
  { id: "dashboard", label: "Visão geral", icon: "home" },
  { id: "results", label: "Relatórios", icon: "results" },
];

function ClientNavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    results: <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2"/></>,
    sellers: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function ClientSidebar({ activeScreen, onNavigate, clientName, onLogout, loggingOut }: ClientSidebarProps) {
  const { openProfile, user } = useAuth();
  const items = user?.role === "CLIENT" ? [...baseItems, { id: "sellers", label: "Vendedores", icon: "sellers" }] : baseItems;
  return (
    <aside className="client-sidebar">
      <div className="client-brand">
        <span className="brand-mark"><i /></span>
        <div><strong>SysOn</strong><span>{user?.role === "SELLER" ? "Portal do Vendedor" : "Portal do Cliente"}</span></div>
      </div>

      <div className="client-account-card">
        <span>CONTA ATIVA</span>
        <strong>{clientName}</strong>
        <small>{user?.role === "SELLER" ? "Acesso vendedor" : "Acesso executivo"}</small>
      </div>

      <span className="client-nav-label">ACOMPANHAMENTO</span>
      <nav className="client-nav" aria-label="Navegação do Portal do Cliente">
        {items.map((item) => {
          const active = item.id === activeScreen;
          return (
            <button
              type="button"
              key={item.id}
              className={active ? "active" : ""}
              onClick={() => onNavigate(item.id as ClientScreen)}
              aria-current={active ? "page" : undefined}
            >
              <span><ClientNavIcon name={item.icon} /></span>{item.label}
            </button>
          );
        })}
      </nav>

      <div className="client-sidebar-spacer" />
      <div className="client-sidebar-footer">
        <button type="button" onClick={openProfile}>
          <span aria-hidden="true">○</span>
          Minha conta
        </button>
        <button type="button" onClick={onLogout} disabled={loggingOut} aria-busy={loggingOut}>
          <span>{loggingOut ? <i className="logout-button-spinner" aria-hidden="true" /> : "→"}</span>
          {loggingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </aside>
  );
}
