"use client";

import { useEffect, useState } from "react";
import { getStore, type Campaign, type PortalLead } from "../../data/clientPortalData";

type LeadDrawerProps = {
  lead: PortalLead;
  campaign: Campaign;
  onClose: () => void;
};

function formatAudioTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function LeadDrawer({ lead, campaign, onClose }: LeadDrawerProps) {
  const [playing, setPlaying] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const duration = 98;
  const store = getStore(lead.storeId)!;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setAudioSeconds((seconds) => {
        if (seconds >= duration) {
          setPlaying(false);
          return 0;
        }
        return seconds + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className="lead-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
        <header className="lead-drawer-header">
          <div><span>DETALHE DO LEAD</span><p>Visualização somente leitura</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar detalhes">×</button>
        </header>

        <div className="lead-drawer-scroll">
          <section className="drawer-lead-identity">
            <span className="drawer-avatar">{lead.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span>
            <div><h2 id="lead-drawer-title">{lead.name}</h2><p>{lead.phone}</p><span className={`drawer-status ${lead.status.toLowerCase().replace(" ", "-")}`}><i />{lead.status}</span></div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-heading"><span className="drawer-section-icon">D</span><div><h3>Dados do lead</h3><p>Informações da campanha</p></div></div>
            <div className="drawer-info-grid">
              <div><span>Veículo de interesse</span><strong>{lead.vehicle}</strong></div>
              <div><span>Campanha</span><strong>{campaign.name}</strong></div>
              <div><span>Origem</span><strong>{lead.origin}</strong></div>
              <div><span>Loja de origem</span><strong>{store.shortName}</strong></div>
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-heading"><span className="drawer-section-icon">H</span><div><h3>Histórico de contatos</h3><p>{lead.attempts} {lead.attempts === 1 ? "tentativa registrada" : "tentativas registradas"}</p></div></div>
            <div className="drawer-timeline">
              {lead.history.map((item, index) => (
                <div key={`${item.time}-${index}`} className={index === lead.history.length - 1 ? "latest" : ""}>
                  <i>{index === lead.history.length - 1 ? "✓" : index + 1}</i>
                  <div className="timeline-date"><strong>{item.date}</strong><span>{item.time}</span></div>
                  <div className="timeline-copy"><strong>{item.title}</strong><span>{item.detail}</span></div>
                  <span className={`timeline-result ${item.result.toLowerCase().replace(" ", "-")}`}>{item.result}</span>
                </div>
              ))}
            </div>
          </section>

          {lead.appointment && (
            <section className="drawer-section drawer-appointment-section">
              <div className="drawer-section-heading"><span className="drawer-section-icon success">A</span><div><h3>Agendamento</h3><p>Visita registrada pela operação</p></div><span className="confirmed-seal">✓ Confirmado</span></div>
              <div className="drawer-info-grid appointment-grid">
                <div><span>Data</span><strong>{lead.appointment.date}</strong></div>
                <div><span>Período</span><strong>{lead.appointment.period}</strong></div>
                <div><span>Loja</span><strong>{store.shortName}</strong></div>
                <div><span>Vendedor</span><strong>{lead.appointment.seller ?? "A definir"}</strong></div>
                <div className="full"><span>Veículo</span><strong>{lead.vehicle}</strong></div>
              </div>
            </section>
          )}

          {lead.qualification && (
            <section className="drawer-section drawer-appointment-section">
              <div className="drawer-section-heading"><span className="drawer-section-icon success">Q</span><div><h3>Qualificação</h3><p>Oportunidade encaminhada</p></div><span className="confirmed-seal">✓ Confirmado</span></div>
              <div className="drawer-info-grid"><div><span>Tipo</span><strong>{lead.qualification.type}</strong></div><div><span>Data</span><strong>{lead.qualification.date}</strong></div><div><span>Loja direcionada</span><strong>{store.shortName}</strong></div><div><span>Veículo</span><strong>{lead.vehicle}</strong></div></div>
            </section>
          )}

          <section className={`drawer-section drawer-audit-section ${lead.audit.status === "Revisão" ? "review" : lead.audit.status === "Não auditado" ? "pending" : ""}`}>
            <div className="drawer-section-heading"><span className="drawer-section-icon ai">IA</span><div><h3>Auditoria</h3><p>Validação assistida por IA</p></div></div>
            {lead.audit.status === "Não auditado" ? (
              <div className="audit-pending-copy"><span>—</span><div><strong>Auditoria não aplicável</strong><p>Este contato não gerou agendamento ou qualificação para validação.</p></div></div>
            ) : (
              <>
                <div className="drawer-audit-result">
                  <div><span className="audit-check">✓</span><p><strong>{lead.audit.status === "Confirmado" ? "Confirmado pela IA" : "Em revisão"}</strong><small>{lead.audit.status === "Confirmado" ? "Critérios da campanha atendidos" : "Validação humana recomendada"}</small></p></div>
                  <div className="confidence-score"><span>Confiança</span><strong>{lead.audit.confidence}%</strong></div>
                </div>
                <div className="audit-confidence-track"><span style={{ width: `${lead.audit.confidence}%` }} /></div>
                <div className="audit-evidence"><span>EVIDÊNCIA DA LIGAÇÃO</span><p>“{lead.audit.evidence}”</p></div>
                <div className="audit-date">Data da auditoria: <strong>{lead.audit.auditedAt}</strong></div>
              </>
            )}
          </section>

          <section className="drawer-section recording-section">
            <div className="drawer-section-heading"><span className="drawer-section-icon">AU</span><div><h3>Gravação da ligação</h3><p>Registro do contato final</p></div></div>
            {lead.recordingAvailable ? (
              <div className="mock-audio-player">
                <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pausar ligação" : "Ouvir ligação"}>{playing ? "Ⅱ" : "▶"}</button>
                <div><div className="audio-track"><span style={{ width: `${(audioSeconds / duration) * 100}%` }} /></div><span>{formatAudioTime(audioSeconds)}</span><span>{formatAudioTime(duration)}</span></div>
              </div>
            ) : <div className="recording-unavailable"><span>—</span><p><strong>Gravação indisponível</strong><small>Este contato não possui áudio liberado para consulta.</small></p></div>}
            <p className="recording-notice">Disponibilidade da gravação sujeita às permissões da campanha.</p>
          </section>
        </div>
      </aside>
    </div>
  );
}
