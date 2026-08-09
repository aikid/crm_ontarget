import type { Screen } from "../page";
import Link from "next/link";

type SidebarProps = {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", short: "DB", enabled: true },
  { id: "sdr", label: "Operação SDR", short: "SD", enabled: true },
  { id: "campaigns", label: "Campanhas", short: "CA", enabled: false },
  { id: "leads", label: "Leads", short: "LE", enabled: false },
  { id: "audit", label: "Auditoria", short: "AU", enabled: false },
  { id: "reports", label: "Relatórios", short: "RE", enabled: false },
  { id: "settings", label: "Configurações", short: "CO", enabled: false },
];

export default function Sidebar({ activeScreen, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          O
        </span>
        <div>
          <strong>OnTarget</strong>
          <span>Operação Comercial</span>
        </div>
      </div>

      <div className="sidebar-label">ESPAÇO DE TRABALHO</div>
      <nav className="main-nav" aria-label="Navegação principal">
        {navItems.map((item) => {
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
              <span className="nav-short" aria-hidden="true">
                {item.short}
              </span>
              <span>{item.label}</span>
              {!item.enabled && <span className="nav-lock">•</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
      <div className="queue-card">
        <div className="queue-status-row">
          <span className="live-dot" />
          <span>Operação ativa</span>
        </div>
        <strong>286 leads na fila</strong>
        <span>12 SDRs online agora</span>
      </div>

      <Link className="internal-environment-link" href="/cliente">
        <span>CL</span>
        <div><strong>Portal Cliente</strong><small>Alternar ambiente</small></div>
        <i>→</i>
      </Link>

      <div className="sidebar-user">
        <span className="avatar avatar-dark">CM</span>
        <div>
          <strong>Carlos Mendes</strong>
          <span>Gestor</span>
        </div>
        <button type="button" aria-label="Opções do usuário">
          ···
        </button>
      </div>
    </aside>
  );
}
