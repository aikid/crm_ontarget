"use client";

import { useEffect } from "react";
import type { ApiLead } from "../../lib/ontarget-api";

type LeadDrawerProps = { lead: ApiLead; onClose: () => void };

export default function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return <div className="lead-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <header className="lead-drawer-header"><div><span id="lead-drawer-title">RESUMO DA AUDITORIA</span><p>Visualização somente leitura</p></div><button type="button" onClick={onClose} aria-label="Fechar resumo">×</button></header>
      <div className="lead-drawer-scroll">
        <section className="drawer-section drawer-audit-section">
          <div className="drawer-section-heading"><span className="drawer-section-icon ai">IA</span><div><h3>Resumo da auditoria</h3><p>Conteúdo gerado pela análise da ligação</p></div></div>
          {lead.auditSummary ? <div className="audit-evidence"><span>RESUMO</span><p>{lead.auditSummary}</p></div> : <div className="audit-pending-copy"><span>—</span><div><strong>Resumo ainda não disponível</strong><p>Este lead ainda não possui um resumo de auditoria registrado.</p></div></div>}
        </section>
      </div>
    </aside>
  </div>;
}
