import type { Screen } from "../page";
import Link from "next/link";
import type { SessionUser } from "../lib/ontarget-api";

type SidebarProps = {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  user: SessionUser;
  onLogout: () => void;
};

const navItems = [
  { id: "dashboard", label: "Visão geral", icon: "home", enabled: true },
  { id: "sdr", label: "Operação SDR", icon: "headset", enabled: true, sdrOnly: true },
  { id: "admin", label: "Cadastros", icon: "grid", enabled: true, managerOnly: true },
  { id: "imports", label: "Importar leads", icon: "upload", enabled: true, managerOnly: true },
  { id: "leads", label: "Leads", icon: "users", enabled: true, managerOnly: true },
  { id: "audit", label: "Auditoria", icon: "check", enabled: false },
  { id: "reports", label: "Relatórios", icon: "chart", enabled: false },
  { id: "settings", label: "Configurações", icon: "settings", enabled: false },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 20c0 1-1 2-3 2"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v5h16v-5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    check: <><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="10"/></>,
    chart: <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.09 14H3v-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.09V3h4v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9c.16.61.72 1.03 1.35 1.03H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Sidebar({ activeScreen, onNavigate, user, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /></span>
        <div>
          <strong>OnTarget</strong>
          <span>Operação comercial</span>
        </div>
        <small>V1</small>
      </div>

      <div className="sidebar-label">NAVEGAÇÃO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.filter((item) => (!item.managerOnly || user.role === "GESTOR") && (!item.sdrOnly || user.role === "SDR")).map((item) => {
          const active = item.id === activeScreen;
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? "active" : ""} ${!item.enabled ? "disabled" : ""}`}
              onClick={() => item.enabled && onNavigate(item.id as Screen)}
              aria-current={active ? "page" : undefined}
              aria-disabled={!item.enabled}
              title={!item.enabled ? "Disponível na próxima versão" : undefined}
              type="button"
            >
              <span className="nav-short"><NavIcon name={item.icon} /></span>
              <span className="nav-copy">{item.label}</span>
              {!item.enabled && <span className="nav-coming-soon">Em breve</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <div className="queue-card">
          <span className="system-status-icon" aria-hidden="true"><i /></span>
          <div><strong>Sistema operacional</strong><span>Sincronizado com a API</span></div>
          <small>Online</small>
        </div>

        <Link className="internal-environment-link" href="/cliente">
          <span className="environment-icon"><NavIcon name="external" /></span>
          <div><strong>Portal do Cliente</strong><small>Alternar ambiente</small></div>
          <i>→</i>
        </Link>

        <div className="sidebar-user">
          <span className="avatar avatar-dark">{user.initials}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role === "GESTOR" ? "Gestor" : "SDR"}</span>
          </div>
          <button type="button" aria-label="Sair" title="Sair" onClick={onLogout}>
            <NavIcon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  );
}
