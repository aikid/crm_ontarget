"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Device, type Call } from "@twilio/voice-sdk";
import { leads, type LeadHistoryItem } from "../data/mockData";
import { onTargetApi } from "../lib/ontarget-api";

type ResultType = "scheduled" | "qualified" | "callback" | "no_answer" | "no_interest" | "invalid";
type CallPhase = "idle" | "calling" | "active" | "ended";

type SdrScreenProps = {
  onBack: () => void;
};

const SDR_ID = "user-sdr-ana";
const SDR_VOICE_IDENTITY = "ana_souza";

const resultOptions: { id: ResultType; label: string; shortcut: string; detail: string }[] = [
  { id: "scheduled", label: "Agendado", shortcut: "1", detail: "Visita confirmada" },
  { id: "qualified", label: "Qualificado", shortcut: "2", detail: "Encaminhar oportunidade" },
  { id: "callback", label: "Retornar depois", shortcut: "3", detail: "Programar callback" },
  { id: "no_answer", label: "Não atendeu", shortcut: "4", detail: "Voltar para a fila" },
  { id: "no_interest", label: "Sem interesse", shortcut: "5", detail: "Encerrar contato" },
  { id: "invalid", label: "Número inválido", shortcut: "6", detail: "Sinalizar telefone" },
];

const resultLabels: Record<ResultType, string> = {
  scheduled: "Agendado",
  qualified: "Qualificado",
  callback: "Retorno programado",
  no_answer: "Não atendeu",
  no_interest: "Sem interesse",
  invalid: "Número inválido",
};

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function Field({ label, required, children, full }: { label: string; required?: boolean; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`form-field ${full ? "full" : ""}`}>
      <span>{label}{required && <b> *</b>}</span>
      {children}
    </label>
  );
}

export default function SdrScreen({ onBack }: SdrScreenProps) {
  const [leadIndex, setLeadIndex] = useState(0);
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [selectedResult, setSelectedResult] = useState<ResultType | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempts, setAttempts] = useState<Record<number, number>>(
    Object.fromEntries(leads.map((lead) => [lead.id, lead.attempt])),
  );
  const [histories, setHistories] = useState<Record<number, LeadHistoryItem[]>>(
    Object.fromEntries(leads.map((lead) => [lead.id, lead.history])),
  );
  const [metrics, setMetrics] = useState({ worked: 32, contacts: 8, scheduled: 3, callbacks: 2 });
  const [callbackDate, setCallbackDate] = useState("2026-08-09");
  const [callbackTime, setCallbackTime] = useState("18:00");
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const startingCallRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const lastVoiceErrorRef = useRef<{ code?: number; message: string } | null>(null);

  const lead = leads[leadIndex];
  const attempt = attempts[lead.id] ?? lead.attempt;
  const history = histories[lead.id] ?? lead.history;

  useEffect(() => {
    if (callPhase !== "active") return;
    const timer = window.setInterval(() => setCallSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [callPhase]);

  useEffect(() => {
    return () => {
      activeCallRef.current?.disconnect();
      deviceRef.current?.destroy();
      activeCallRef.current = null;
      deviceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const shortcut = resultOptions.find((option) => option.shortcut === event.key);
      if (shortcut) {
        setSelectedResult(shortcut.id);
        setCallPhase("ended");
      }
      if (event.key === "Enter" && selectedResult && !saving) {
        saveAndAdvance();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  const nextCallback = useMemo(() => {
    const callbackLead = leads.find((item) => item.callback);
    return callbackLead ? `${callbackLead.callback} — ${callbackLead.name}` : "Nenhum retorno pendente";
  }, []);

  async function getVoiceDevice() {
    if (deviceRef.current) return deviceRef.current;

    const { token } = await onTargetApi.voiceToken(SDR_VOICE_IDENTITY);
    const device = new Device(token, {
      closeProtection: "Existe uma ligação em andamento. Deseja mesmo sair?",
      enableImprovedSignalingErrorPrecision: true,
      tokenRefreshMs: 60_000,
    });

    device.on("tokenWillExpire", async () => {
      try {
        const refreshed = await onTargetApi.voiceToken(SDR_VOICE_IDENTITY);
        device.updateToken(refreshed.token);
      } catch {
        setToast("Não foi possível renovar a sessão de telefonia. Finalize a chamada e tente novamente.");
      }
    });
    device.on("error", (error) => {
      console.error("Twilio Device error", error);
      lastVoiceErrorRef.current = { code: error.code, message: error.message };
      setToast(`Telefonia indisponível (${error.code}): ${error.message}`);
    });

    deviceRef.current = device;
    return device;
  }

  async function startCall() {
    if (callPhase !== "idle" || startingCallRef.current) return;
    startingCallRef.current = true;
    cancelRequestedRef.current = false;
    lastVoiceErrorRef.current = null;
    setCallSeconds(0);
    setSelectedResult(null);
    setCallPhase("calling");

    try {
      const device = await getVoiceDevice();
      const callRecord = await onTargetApi.createCall({
        leadId: lead.backendId,
        sdrId: SDR_ID,
        to: lead.phoneE164,
      });
      const call = await device.connect({
        params: { To: callRecord.to, CallId: callRecord.id },
      });
      activeCallRef.current = call;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        activeCallRef.current = null;
        setCallPhase("ended");
      };

      call.on("ringing", () => setCallPhase("calling"));
      call.on("accept", () => {
        setCallSeconds(0);
        setCallPhase("active");
      });
      call.on("disconnect", finish);
      call.on("cancel", finish);
      call.on("error", (error) => {
        console.error("Twilio Call error", error);
        setToast(`Não foi possível completar a ligação: ${error.message}`);
        finish();
      });
      if (cancelRequestedRef.current) call.disconnect();
    } catch (error) {
      console.error("Unable to start Twilio call", error ?? "Device connection aborted");
      activeCallRef.current = null;
      setCallPhase(cancelRequestedRef.current ? "ended" : "idle");
      if (!cancelRequestedRef.current) {
        const voiceError = lastVoiceErrorRef.current;
        setToast(
          voiceError
            ? `Telefonia indisponível${voiceError.code ? ` (${voiceError.code})` : ""}: ${voiceError.message}`
            : error instanceof Error
              ? error.message
              : "Não foi possível iniciar a ligação.",
        );
      }
    } finally {
      startingCallRef.current = false;
    }
  }

  function endCall() {
    cancelRequestedRef.current = true;
    activeCallRef.current?.disconnect();
    activeCallRef.current = null;
    setCallPhase("ended");
  }

  function copyPhone() {
    navigator.clipboard?.writeText(lead.phone);
    setToast("Número copiado para a área de transferência");
    window.setTimeout(() => setToast(""), 1800);
  }

  function resetForNextLead() {
    setLeadIndex((current) => (current + 1) % leads.length);
    setCallPhase("idle");
    setCallSeconds(0);
    setSelectedResult(null);
    setSaving(false);
    cancelRequestedRef.current = false;
    setCallbackDate("2026-08-09");
    setCallbackTime("18:00");
  }

  function saveAndAdvance() {
    if (!selectedResult || saving) return;
    setSaving(true);

    const newHistory: LeadHistoryItem = {
      time: "09/08 — Agora",
      title: selectedResult === "callback" ? "Retorno programado" : `Tentativa ${attempt}`,
      result: resultLabels[selectedResult],
      tone: selectedResult === "scheduled" || selectedResult === "qualified" ? "success" : selectedResult === "callback" ? "warning" : "neutral",
    };
    setHistories((current) => ({ ...current, [lead.id]: [...(current[lead.id] ?? []), newHistory] }));

    if (selectedResult === "no_answer") {
      setAttempts((current) => ({ ...current, [lead.id]: Math.min(3, attempt + 1) }));
    }

    setMetrics((current) => ({
      worked: current.worked + 1,
      contacts: selectedResult === "no_answer" || selectedResult === "invalid" ? current.contacts : current.contacts + 1,
      scheduled: selectedResult === "scheduled" ? current.scheduled + 1 : current.scheduled,
      callbacks: selectedResult === "callback" ? current.callbacks + 1 : current.callbacks,
    }));

    const message = selectedResult === "callback"
      ? `Retorno agendado para ${callbackTime}. O lead voltará automaticamente à fila.`
      : selectedResult === "no_answer"
        ? `Tentativa ${Math.min(3, attempt + 1)} de 3 registrada. Lead devolvido à fila.`
        : "Registro salvo com sucesso. Carregando próximo lead…";
    setToast(message);
    window.setTimeout(() => {
      setToast("");
      resetForNextLead();
    }, 1200);
  }

  function saveLabel() {
    if (saving) return "Salvando registro…";
    if (selectedResult === "scheduled") return "Salvar agendamento e próximo lead";
    if (selectedResult === "qualified") return "Salvar qualificação e próximo lead";
    if (selectedResult === "callback") return "Agendar retorno e próximo lead";
    return "Salvar e próximo lead →";
  }

  return (
    <div className="screen sdr-screen">
      <header className="sdr-topbar">
        <div className="sdr-context">
          <button className="back-button" type="button" onClick={onBack} aria-label="Voltar ao dashboard">←</button>
          <div>
            <span>Campanha</span>
            <strong>Feirão Volkswagen Agosto</strong>
          </div>
          <i />
          <div>
            <span>Cliente</span>
            <strong>Grupo Brasal</strong>
          </div>
        </div>
        <div className="sdr-metrics">
          <div><strong>{metrics.worked}</strong><span>leads hoje</span></div>
          <div><strong>{metrics.contacts}</strong><span>contatos</span></div>
          <div><strong>{metrics.scheduled}</strong><span>agendamentos</span></div>
          <div className="warning"><strong>{metrics.callbacks}</strong><span>retornos</span></div>
        </div>
        <div className="sdr-user">
          <span className="avatar avatar-blue">AS</span>
          <div><strong>Ana Souza</strong><span>SDR • Online</span></div>
          <span className="chevron">⌄</span>
        </div>
      </header>

      <section className="workflow-strip">
        <div className="workflow-main">
          <span className="live-dot" />
          <strong>Fila inteligente ativa</strong>
          <span>•</span>
          <span>Lead {leadIndex + 1} de 286</span>
          <span>•</span>
          <span>Distribuição automática</span>
        </div>
        <div className="next-callback"><span className="clock-glyph">18</span><div><small>PRÓXIMO RETORNO</small><strong>{nextCallback}</strong></div></div>
      </section>

      <div className="sdr-workspace">
        <section className="lead-column">
          {lead.callback && (
            <div className="callback-alert">
              <span className="callback-icon">↻</span>
              <div><strong>Retorno agendado para {lead.callback}</strong><p>Este lead voltou automaticamente para sua fila no horário combinado.</p></div>
              <span className="callback-priority">Prioridade alta</span>
            </div>
          )}

          <article className="lead-card">
            <div className="lead-card-heading">
              <div className="lead-identity">
                <span className="lead-avatar">{lead.initials}</span>
                <div>
                  <span className="section-kicker">LEAD ATUAL</span>
                  <h1>{lead.name}</h1>
                  <div className="lead-tags"><span>Novo lead</span><span>•</span><span>Recebido há 12 min</span></div>
                </div>
              </div>
              <div className="attempt-box">
                <span>TENTATIVAS DE CONTATO</span>
                <strong>Tentativa {attempt} de 3</strong>
                <div className="attempt-dots">
                  {[1, 2, 3].map((item) => <i key={item} className={item <= attempt ? "filled" : ""} />)}
                </div>
              </div>
            </div>

            <div className="lead-details-grid">
              <div><span>Loja de origem</span><strong>{lead.store}</strong></div>
              <div><span>Campanha</span><strong>{lead.campaign}</strong></div>
              <div><span>Origem</span><strong>{lead.source}</strong></div>
              <div><span>Veículo de interesse</span><strong>{lead.vehicle}</strong></div>
              <div><span>Motivo</span><strong>{lead.reason}</strong></div>
              <div><span>Criado em</span><strong>{lead.createdAt}</strong></div>
            </div>

            <div className={`phone-action-panel ${callPhase === "active" ? "in-call" : ""}`}>
              <div className="phone-copy">
                <span>{callPhase === "active" ? "LIGAÇÃO EM ANDAMENTO" : callPhase === "calling" ? "INICIANDO CHAMADA" : "TELEFONE PRINCIPAL"}</span>
                <strong>{callPhase === "active" ? formatTimer(callSeconds) : callPhase === "calling" ? "Chamando…" : lead.phone}</strong>
                {callPhase === "idle" && <button type="button" onClick={copyPhone}>Copiar número</button>}
                {callPhase === "active" && <small>{lead.name} • via Onvox</small>}
              </div>
              <div className="phone-actions">
                {callPhase === "idle" && <button className="call-button" type="button" onClick={startCall}><span className="phone-dot" />Ligar com Onvox</button>}
                {callPhase === "calling" && <button className="end-call-button" type="button" onClick={endCall}><span className="calling-rings" />Cancelar chamada</button>}
                {callPhase === "active" && <button className="end-call-button" type="button" onClick={endCall}>Encerrar ligação</button>}
                {callPhase === "ended" && <span className="call-complete"><i>✓</i> Ligação finalizada • {formatTimer(callSeconds)}</span>}
                <div className="onvox-note" title="A chamada é realizada no navegador através do Twilio Voice SDK.">
                  <span className="onvox-mark">O</span>
                  <div><strong>Onvox Voice ativo</strong><small>Telefonia Twilio integrada</small></div>
                  <span className="info-glyph">i</span>
                </div>
              </div>
            </div>
          </article>

          {callPhase === "ended" && (
            <article className="result-card">
              <div className="result-heading">
                <div><span className="section-kicker">REGISTRO DO CONTATO</span><h2>Qual foi o resultado da ligação?</h2><p>Selecione uma opção para concluir este atendimento.</p></div>
                <span className="required-note">Obrigatório</span>
              </div>
              <div className="result-options">
                {resultOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={selectedResult === option.id ? "selected" : ""}
                    onClick={() => setSelectedResult(option.id)}
                  >
                    <span className="result-radio">{selectedResult === option.id ? "✓" : ""}</span>
                    <div><strong>{option.label}</strong><small>{option.detail}</small></div>
                    <kbd>{option.shortcut}</kbd>
                  </button>
                ))}
              </div>

              {selectedResult && (
                <div className="conditional-form">
                  {selectedResult === "scheduled" && (
                    <>
                      <div className="form-grid">
                        <Field label="Data agendada" required><input type="date" defaultValue="2026-08-11" /></Field>
                        <Field label="Período" required><select defaultValue="Tarde"><option>Manhã</option><option>Tarde</option></select></Field>
                        <Field label="Loja escolhida" required><select defaultValue={lead.store}><option>{lead.store}</option><option>Brasal Volkswagen SIA</option><option>Brasal Asa Norte</option></select></Field>
                        <Field label="Vendedor"><input placeholder="Selecionar vendedor (opcional)" /></Field>
                        <Field label="Veículo de interesse" full><input defaultValue={lead.vehicle} /></Field>
                        <Field label="Observações" full><textarea placeholder="Informações importantes para a loja e o vendedor" /></Field>
                      </div>
                    </>
                  )}
                  {selectedResult === "qualified" && (
                    <div className="form-grid">
                      <Field label="Tipo de qualificação" required><select defaultValue="Interesse confirmado"><option>Conversar com vendedor</option><option>Interesse confirmado</option><option>Solicitar proposta</option><option>Outros</option></select></Field>
                      <Field label="Loja direcionada" required><select defaultValue={lead.store}><option>{lead.store}</option><option>Brasal Volkswagen SIA</option><option>Brasal Asa Norte</option></select></Field>
                      <Field label="Observação" full><textarea placeholder="Registre o contexto para o próximo atendimento" /></Field>
                    </div>
                  )}
                  {selectedResult === "callback" && (
                    <>
                      <div className="form-grid callback-form">
                        <Field label="Data do retorno" required><input type="date" value={callbackDate} onChange={(event) => setCallbackDate(event.target.value)} /></Field>
                        <Field label="Horário" required><input type="time" value={callbackTime} onChange={(event) => setCallbackTime(event.target.value)} /></Field>
                        <Field label="Observação" full><textarea defaultValue="Cliente pediu contato no fim do expediente." /></Field>
                      </div>
                      <div className="automation-note"><span>↻</span><div><strong>Este lead retornará automaticamente para sua fila às {callbackTime}.</strong><small>Caso você não esteja disponível, ele poderá ser redistribuído para outro SDR da equipe.</small></div></div>
                    </>
                  )}
                  {selectedResult === "no_answer" && (
                    <div className="no-answer-note">
                      <div><span>TENTATIVA ATUAL</span><strong>{attempt} de 3</strong></div>
                      <div><strong>Tentar novamente depois</strong><p>Este lead permanecerá disponível para novas tentativas e voltará preferencialmente para sua fila.</p></div>
                      <span className="queue-pill">Voltar para a fila</span>
                    </div>
                  )}
                  {selectedResult === "no_interest" && (
                    <div className="form-grid">
                      <Field label="Motivo"><select defaultValue=""><option value="">Selecionar motivo (opcional)</option><option>Já comprou outro veículo</option><option>Sem intenção de compra</option><option>Condição comercial</option></select></Field>
                      <Field label="Observação" full><textarea placeholder="Contexto opcional sobre o encerramento" /></Field>
                    </div>
                  )}
                  {selectedResult === "invalid" && (
                    <div className="invalid-note"><span>!</span><div><strong>O telefone será sinalizado para auditoria.</strong><p>O lead não retornará à fila até que o cadastro seja revisado.</p></div></div>
                  )}
                  <div className="form-footer">
                    <span><kbd>Enter</kbd> para salvar</span>
                    <button className="primary-button save-button" type="button" disabled={saving} onClick={saveAndAdvance}>{saveLabel()}</button>
                  </div>
                </div>
              )}
            </article>
          )}
        </section>

        <aside className="sdr-side-column">
          <article className="side-card history-card">
            <div className="side-card-heading"><div><span className="side-icon">H</span><div><h3>Histórico</h3><p>Interações deste lead</p></div></div><button type="button">···</button></div>
            <div className={`history-timeline ${history.length === 0 ? "empty" : ""}`}>
              {history.length === 0 ? (
                <div className="empty-history"><span>+</span><strong>Primeiro contato</strong><p>Ainda não há interações registradas para este lead.</p></div>
              ) : history.map((item, index) => (
                <div className={`history-item ${item.tone ?? "neutral"}`} key={`${item.time}-${index}`}>
                  <i />
                  <span>{item.time}</span>
                  <strong>{item.title}</strong>
                  <p>{item.result}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="side-card attempts-card">
            <div className="side-card-heading"><div><span className="side-icon">T</span><div><h3>Política de tentativas</h3><p>Máximo de 3 contatos</p></div></div></div>
            <div className="attempt-policy">
              {[1, 2, 3].map((item) => (
                <div key={item} className={item < attempt ? "done" : item === attempt ? "current" : "future"}>
                  <span>{item < attempt ? "✓" : item}</span>
                  <p><strong>Tentativa {item}</strong><small>{item < attempt ? "Realizada" : item === attempt ? "Em andamento" : "Disponível depois"}</small></p>
                </div>
              ))}
            </div>
            <p className="policy-copy">Sem resposta? O lead volta para a fila e permanece vinculado a você sempre que possível.</p>
          </article>

          <article className="side-card shortcuts-card">
            <div className="side-card-heading"><div><span className="side-icon">⌘</span><div><h3>Atalhos</h3><p>Trabalhe sem tirar as mãos do teclado</p></div></div></div>
            <div className="shortcut-list">
              <div><kbd>Enter</kbd><span>Salvar registro</span></div>
              <div><kbd>1</kbd><span>Agendado</span></div>
              <div><kbd>2</kbd><span>Qualificado</span></div>
              <div><kbd>3</kbd><span>Retorno</span></div>
              <div><kbd>4</kbd><span>Não atendeu</span></div>
            </div>
          </article>
        </aside>
      </div>

      {toast && <div className="toast-message"><span>✓</span>{toast}</div>}
    </div>
  );
}
