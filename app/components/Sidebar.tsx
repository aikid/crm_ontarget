import type { Screen } from "../page";
import type { SessionUser } from "../lib/ontarget-api";
import { useAuth } from "./auth/AuthProvider";

type SidebarProps = {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  user: SessionUser;
  onLogout: () => void;
  loggingOut: boolean;
};

const navItems = [
  { id: "dashboard", label: "Visão geral", icon: "home", enabled: true },
  { id: "sdr", label: "Operação SDR", icon: "headset", enabled: true, sdrOnly: true },
  { id: "admin", label: "Cadastros", icon: "grid", enabled: true, managerOnly: true },
  { id: "imports", label: "Importar leads", icon: "upload", enabled: true, managerOnly: true },
  { id: "leads", label: "Leads", icon: "users", enabled: true, managerOnly: true },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 20c0 1-1 2-3 2"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v5h16v-5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Sidebar({ activeScreen, onNavigate, user, onLogout, loggingOut }: SidebarProps) {
  const { openProfile } = useAuth();
  const visibleItems = user.role === "SDR"
    ? navItems.filter((item) => item.id === "sdr")
    : navItems.filter((item) => !item.sdrOnly);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><i /></span>
        <div>
          <strong>SysOn</strong>
          <span>Operação comercial</span>
        </div>
        <small>V1</small>
      </div>

      <div className="sidebar-label">NAVEGAÇÃO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {visibleItems.map((item) => {
          const active = item.id === activeScreen;
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? "active" : ""}`}
              onClick={() => onNavigate(item.id as Screen)}
              aria-current={active ? "page" : undefined}
              type="button"
            >
              <span className="nav-short"><NavIcon name={item.icon} /></span>
              <span className="nav-copy">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="avatar avatar-dark">{user.initials}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role === "GESTOR" ? "Gestor" : "SDR"}</span>
          </div>
          <button type="button" aria-label="Abrir meu perfil" title="Minha conta" onClick={openProfile}>
            <NavIcon name="user" />
          </button>
          <button
            type="button"
            aria-label={loggingOut ? "Encerrando sessão" : "Sair"}
            title={loggingOut ? "Encerrando sessão..." : "Sair"}
            onClick={onLogout}
            disabled={loggingOut}
          >
            {loggingOut ? <span className="logout-button-spinner" aria-hidden="true" /> : <NavIcon name="logout" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
