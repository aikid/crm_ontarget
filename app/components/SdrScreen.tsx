"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import LoadingOverlay from "./ui/LoadingOverlay";
import { AsteriskSipClient } from "../lib/asterisk-sip";
import { RingbackTone } from "../lib/ringback-tone";
import {
  onTargetApi,
  type ApiLead,
  type SdrCallback,
  type SdrCampaign,
  type SdrQueueSummary,
} from "../lib/ontarget-api";

type ResultType = "NO_ANSWER" | "INVALID_NUMBER" | "REFUSED" | "CONTACTED" | "QUALIFIED" | "NOT_QUALIFIED" | "CALLBACK";
type CallPhase = "idle" | "calling" | "active" | "ended";

type SdrScreenProps = { onBack: () => void };

const resultOptions: Array<{ id: ResultType; label: string; shortcut: string; detail: string }> = [
  { id: "NO_ANSWER", label: "Não atendeu", shortcut: "1", detail: "Registrar nova tentativa" },
  { id: "INVALID_NUMBER", label: "Número inválido", shortcut: "2", detail: "Retirar da fila" },
  { id: "REFUSED", label: "Recusou", shortcut: "3", detail: "Não deseja prosseguir" },
  { id: "CONTACTED", label: "Contato realizado", shortcut: "4", detail: "Atendimento concluído" },
  { id: "QUALIFIED", label: "Qualificado", shortcut: "5", detail: "Oportunidade confirmada" },
  { id: "NOT_QUALIFIED", label: "Não qualificado", shortcut: "6", detail: "Fora do perfil esperado" },
  { id: "CALLBACK", label: "Retorno solicitado", shortcut: "7", detail: "Agendar retorno simples" },
];

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function localDateTimeInput(date = new Date(Date.now() + 60 * 60_000)) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function reservationLabel(value: string | undefined, tick: number) {
  void tick;
  if (!value) return "00:00";
  const seconds = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1_000));
  return formatTimer(seconds);
}

function callbackTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function plural(value: number, singular: string, pluralForm: string) {
  return value === 1 ? singular : pluralForm;
}

export default function SdrScreen({ onBack }: SdrScreenProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [campaigns, setCampaigns] = useState<SdrCampaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [lead, setLead] = useState<ApiLead | null>(null);
  const [callbacks, setCallbacks] = useState<SdrCallback[]>([]);
  const [queueSummary, setQueueSummary] = useState<SdrQueueSummary | null>(null);
  const [metrics, setMetrics] = useState({ worked: 0, contacts: 0, qualified: 0, callbacks: 0 });
  const [loading, setLoading] = useState(true);
  const [queueEmpty, setQueueEmpty] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedResult, setSelectedResult] = useState<ResultType | null>(null);
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState(localDateTimeInput);
  const [saving, setSaving] = useState(false);
  const [clock, setClock] = useState(0);
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [callId, setCallId] = useState<string | null>(null);
  const sipClientRef = useRef<AsteriskSipClient | null>(null);
  const ringbackToneRef = useRef<RingbackTone | null>(null);
  const callIdRef = useRef<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const claimingLeadRef = useRef(false);

  const campaign = useMemo(() => campaigns.find((item) => item.id === campaignId) || null, [campaignId, campaigns]);
  const attemptNumber = lead ? Math.min(3, lead.attempts + 1) : 1;
  const nextCallback = callbacks[0] || null;
  const reservationRemaining = useMemo(
    () => reservationLabel(lead?.reservation?.reservedUntil, clock),
    [clock, lead?.reservation?.reservedUntil],
  );

  const refreshSideData = useCallback(async (selectedCampaignId: string) => {
    if (!userId) return;
    const [summary, callbackResponse] = await Promise.all([
      onTargetApi.sdrSummary(userId),
      onTargetApi.callbacksToday(selectedCampaignId),
    ]);
    setMetrics(summary);
    setCallbacks(callbackResponse.data);
  }, [userId]);

  const refreshQueueSummary = useCallback(async (selectedCampaignId: string) => {
    setQueueSummary(await onTargetApi.queueSummary(selectedCampaignId));
  }, []);

  const claimNext = useCallback(async (selectedCampaignId: string) => {
    if (claimingLeadRef.current) return;
    claimingLeadRef.current = true;
    setLoading(true);
    setError("");
    setQueueEmpty(false);
    try {
      const claimed = await onTargetApi.claimNextLead(selectedCampaignId);
      setLead(claimed);
      setSelectedResult(null);
      setNotes("");
      setCallbackAt(localDateTimeInput());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível consultar a fila.";
      if (message.includes("Não há leads")) {
        setLead(null);
        setQueueEmpty(true);
      } else {
        setError(message);
      }
    } finally {
      await refreshQueueSummary(selectedCampaignId).catch(() => setQueueSummary(null));
      setLoading(false);
      claimingLeadRef.current = false;
    }
  }, [refreshQueueSummary]);

  useEffect(() => {
    if (!userId || userRole !== "SDR") {
      return;
    }
    let active = true;
    void onTargetApi.sdrCampaigns()
      .then(({ data }) => {
        if (!active) return;
        setCampaigns(data);
        setCampaignId(data[0]?.id || "");
        if (!data.length) setLoading(false);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar as campanhas.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [userId, userRole]);

  useEffect(() => {
    if (!campaignId || !userId || userRole !== "SDR") return;
    const timer = window.setTimeout(() => {
      void Promise.all([refreshSideData(campaignId), claimNext(campaignId)]).catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a operação.");
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [campaignId, claimNext, refreshSideData, userId, userRole]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const reservedLeadId = lead?.id;
  useEffect(() => {
    if (!reservedLeadId) return;
    const timer = window.setInterval(() => {
      void onTargetApi.renewLead(reservedLeadId)
        .then(setLead)
        .catch((cause) => {
          setLead(null);
          setError(cause instanceof Error ? cause.message : "A reserva do lead expirou.");
        });
    }, 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [reservedLeadId]);

  useEffect(() => {
    if (callPhase !== "active") return;
    const timer = window.setInterval(() => setCallSeconds((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [callPhase]);

  useEffect(() => () => {
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    ringbackToneRef.current?.stop();
    void sipClientRef.current?.dispose();
    if (callIdRef.current) void onTargetApi.endAsteriskCall(callIdRef.current).catch(() => undefined);
  }, []);

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const option = resultOptions.find((item) => item.shortcut === event.key);
      if (option) setSelectedResult(option.id);
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);

  async function changeCampaign(nextCampaignId: string) {
    if (["calling", "active"].includes(callPhase)) await endCall();
    if (lead) {
      try { await onTargetApi.releaseLead(lead.id); } catch { /* a reserva pode já ter expirado */ }
    }
    setLead(null);
    setCampaignId(nextCampaignId);
  }

  async function leaveOperation() {
    if (["calling", "active"].includes(callPhase)) await endCall();
    if (lead) {
      try { await onTargetApi.releaseLead(lead.id); } catch { /* saída continua mesmo se a reserva expirou */ }
    }
    onBack();
  }

  async function startCall() {
    if (!lead || callPhase !== "idle") return;
    setToast("");
    setCallPhase("calling");
    setCallSeconds(0);
    const ringbackTone = new RingbackTone();
    ringbackToneRef.current = ringbackTone;
    ringbackTone.start();
    const sipClient = sipClientRef.current || new AsteriskSipClient();
    sipClientRef.current = sipClient;
    // Cria a saída de áudio durante o gesto do usuário, antes das chamadas de rede.
    sipClient.prepareAudioOutput();
    let createdCallId: string | null = null;
    try {
      await sipClient.prepareMicrophone();
      const sipSession = await onTargetApi.asteriskSipSession();
      await sipClient.connect(sipSession);
      const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const record = await onTargetApi.createAsteriskCall({ leadId: lead.id }, idempotencyKey);
      createdCallId = record.id;
      setCallId(record.id);
      callIdRef.current = record.id;
      await sipClient.startCall(sipSession, {
        onEstablishing: () => setCallPhase("calling"),
        onEstablished: () => {
          ringbackToneRef.current?.stop();
          ringbackToneRef.current = null;
        },
        onTerminated: () => {
          if (callIdRef.current) finishCall();
        },
        onError: (message) => setToast(message),
      });
      if (sipSession.shared) setToast("Ramal compartilhado de POC ativo; use apenas um SDR por vez.");
      await monitorCall(record.id);
    } catch (cause) {
      ringbackTone.stop();
      ringbackToneRef.current = null;
      await sipClient.endCall().catch(() => undefined);
      if (createdCallId) await onTargetApi.endAsteriskCall(createdCallId).catch(() => undefined);
      setCallId(null);
      callIdRef.current = null;
      setCallPhase("idle");
      setToast(cause instanceof Error ? cause.message : "Não foi possível iniciar a ligação.");
    }
  }

  function finishCall() {
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
    ringbackToneRef.current?.stop();
    ringbackToneRef.current = null;
    void sipClientRef.current?.endCall();
    callIdRef.current = null;
    setCallPhase("ended");
  }

  async function monitorCall(activeCallId: string): Promise<void> {
    const status = await onTargetApi.asteriskCall(activeCallId);
    if (["ended", "failed", "canceled", "busy", "no_answer", "rejected"].includes(status.status)) {
      if (!["ended", "canceled"].includes(status.status)) {
        const labels: Record<string, string> = {
          busy: "O número está ocupado.",
          no_answer: "A ligação não foi atendida.",
          rejected: "A ligação foi recusada.",
          failed: status.disconnectReason || "A ligação não pôde ser completada.",
        };
        setToast(labels[status.status] || "Ligação encerrada.");
      }
      return finishCall();
    }
    if (status.status === "connected") {
      ringbackToneRef.current?.stop();
      ringbackToneRef.current = null;
      setCallPhase("active");
    } else {
      setCallPhase("calling");
    }
    statusTimerRef.current = window.setTimeout(() => {
      void monitorCall(activeCallId).catch((cause) => {
        setToast(cause instanceof Error ? cause.message : "Falha ao acompanhar a ligação.");
        finishCall();
      });
    }, 750);
  }

  async function endCall() {
    const activeCallId = callIdRef.current;
    finishCall();
    if (!activeCallId) return;
    try { await onTargetApi.endAsteriskCall(activeCallId); }
    catch (cause) { setToast(cause instanceof Error ? cause.message : "A ligação foi fechada localmente, mas o Asterisk não confirmou o encerramento."); }
  }

  async function saveOutcome() {
    if (!lead || !selectedResult || saving) return;
    setSaving(true);
    setError("");
    try {
      await onTargetApi.saveOutcome(lead.id, {
        outcome: selectedResult,
        notes: notes || undefined,
        ...(selectedResult === "CALLBACK" ? { callback: { scheduledAt: new Date(callbackAt).toISOString() } } : {}),
        ...(callId ? { callId, durationSec: callSeconds } : {}),
      });
      setToast(selectedResult === "CALLBACK" ? "Retorno salvo fora da fila automática." : "Resultado salvo com sucesso.");
      setLead(null);
      setCallPhase("idle");
      setCallSeconds(0);
      setCallId(null);
      callIdRef.current = null;
      await refreshSideData(campaignId);
      await claimNext(campaignId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o resultado.");
    } finally {
      setSaving(false);
    }
  }

  async function openCallback(item: SdrCallback) {
    setError("");
    try {
      const claimed = await onTargetApi.claimCallback(item.lead.id);
      setLead(claimed);
      setQueueEmpty(false);
      setSelectedResult(null);
      setNotes("");
      await refreshQueueSummary(campaignId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o retorno.");
    }
  }

  if (!user || user.role !== "SDR") {
    return (
      <div className="screen sdr-screen sdr-access-state">
        <div className="sdr-empty-state"><strong>Operação exclusiva para SDRs</strong><p>Entre com um perfil SDR para reservar e trabalhar leads.</p><button type="button" onClick={onBack}>Voltar ao dashboard</button></div>
      </div>
    );
  }

  return (
    <div className="screen sdr-screen">
      <LoadingOverlay show={loading} title="Reservando o próximo lead" message="A fila está selecionando uma oportunidade exclusiva para você." />
      <header className="sdr-topbar">
        <div className="sdr-context">
          <button className="back-button" type="button" onClick={() => void leaveOperation()} aria-label="Voltar ao dashboard">←</button>
          <div>
            <span>Campanha ativa</span>
            <select className="sdr-campaign-select" value={campaignId} onChange={(event) => void changeCampaign(event.target.value)} disabled={loading}>
              {campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </div>
          <i />
          <div><span>Cliente</span><strong>{campaign?.client.name || "—"}</strong></div>
        </div>
        <div className="sdr-metrics">
          <div><strong>{metrics.worked}</strong><span>tentativas hoje</span></div>
          <div><strong>{metrics.contacts}</strong><span>contatos</span></div>
          <div><strong>{metrics.qualified}</strong><span>qualificados</span></div>
          <div className="warning"><strong>{metrics.callbacks}</strong><span>retornos</span></div>
        </div>
        <div className="sdr-user"><span className="avatar avatar-blue">{user.initials}</span><div><strong>{user.name}</strong><span>SDR • Online</span></div></div>
      </header>

      <section className="workflow-strip">
        <div className="workflow-main"><span className="live-dot" /><strong>Fila FIFO ativa</strong>{queueSummary && <><span>•</span><span><strong>{queueSummary.available}</strong> {plural(queueSummary.available, "disponível", "disponíveis")} de {queueSummary.remaining} {plural(queueSummary.remaining, "restante", "restantes")}</span>{queueSummary.reserved > 0 && <><span>•</span><span>{queueSummary.reserved} em atendimento</span></>}</>}<span>•</span><span>Reserva exclusiva por 15 minutos</span>{lead?.reservation && <><span>•</span><span>Expira em {reservationRemaining}</span></>}</div>
        <div className="next-callback"><span className="clock-glyph">↻</span><div><small>PRÓXIMO RETORNO</small><strong>{nextCallback ? `${callbackTime(nextCallback.scheduledAt)} — ${nextCallback.lead.name}` : "Nenhum retorno hoje"}</strong></div></div>
      </section>

      {error && <div className="sdr-operation-error" role="alert">{error}<button type="button" onClick={() => setError("")}>×</button></div>}

      <div className="sdr-workspace">
        <section className="lead-column">
          {loading ? (
            <div className="sdr-empty-state"><strong>Buscando o próximo lead…</strong><p>A fila está reservando uma oportunidade para você.</p></div>
          ) : !lead ? (
            <div className="sdr-empty-state">
              <strong>{queueEmpty ? "Fila concluída por enquanto" : "Nenhum lead em atendimento"}</strong>
              <p>{callbacks.some((item) => item.due) ? "Há retornos disponíveis na coluna lateral." : queueSummary?.remaining ? `${queueSummary.remaining} ${plural(queueSummary.remaining, "lead restante", "leads restantes")}, mas nenhum está livre neste momento.` : "Não há leads livres nesta campanha neste momento."}</p>
              <button type="button" onClick={() => void claimNext(campaignId)}>Atualizar fila</button>
            </div>
          ) : (
            <>
              {lead.callback && <div className="callback-alert"><span className="callback-icon">↻</span><div><strong>Retorno solicitado</strong><p>{lead.callback.notes || "Contato retomado no horário combinado."}</p></div><span className="callback-priority">Retorno</span></div>}

              <article className="lead-card">
                <div className="lead-card-heading">
                  <div className="lead-identity"><span className="lead-avatar">{lead.initials}</span><div><span className="section-kicker">LEAD RESERVADO</span><h1>{lead.name}</h1><div className="lead-tags"><span>{lead.status}</span><span>•</span><span>{lead.createdAt}</span></div></div></div>
                  <div className="attempt-box"><span>TENTATIVAS DE CONTATO</span><strong>Tentativa {attemptNumber} de 3</strong><div className="attempt-dots">{[1, 2, 3].map((item) => <i key={item} className={item <= attemptNumber ? "filled" : ""} />)}</div></div>
                </div>
                <div className="lead-details-grid">
                  <div><span>Loja de origem</span><strong>{lead.store.shortName}</strong></div>
                  <div><span>Campanha</span><strong>{lead.campaign.name}</strong></div>
                  <div><span>Origem</span><strong>{lead.origin}</strong></div>
                  <div><span>Veículo de interesse</span><strong>{lead.vehicle}</strong></div>
                  <div><span>Motivo</span><strong>{lead.reason || "Não informado"}</strong></div>
                  <div><span>Último contato</span><strong>{lead.lastContact}</strong></div>
                </div>
                <div className={`phone-action-panel ${callPhase === "active" ? "in-call" : ""}`}>
                  <div className="phone-copy"><span>{callPhase === "active" ? "LIGAÇÃO EM ANDAMENTO" : "TELEFONE PRINCIPAL"}</span><strong>{callPhase === "active" ? formatTimer(callSeconds) : lead.phone}</strong><button type="button" onClick={() => { void navigator.clipboard?.writeText(lead.phoneE164); setToast("Número copiado."); }}>Copiar número</button></div>
                  <div className="phone-actions">
                    {callPhase === "idle" && <button className="call-button" type="button" onClick={() => void startCall()}><span className="phone-dot" />Ligar com Onvox</button>}
                    {["calling", "active"].includes(callPhase) && <button className="end-call-button" type="button" onClick={() => void endCall()}>{callPhase === "calling" ? "Cancelar chamada" : "Encerrar ligação"}</button>}
                    {callPhase === "ended" && <span className="call-complete"><i>✓</i> Ligação finalizada • {formatTimer(callSeconds)}</span>}
                    <div className="onvox-note"><span className="onvox-mark">O</span><div><strong>Asterisk + OverTele</strong><small>Áudio WebRTC seguro</small></div></div>
                  </div>
                </div>
              </article>

              <article className="result-card">
                <div className="result-heading"><div><span className="section-kicker">REGISTRO DA TENTATIVA</span><h2>Qual foi o resultado do contato?</h2><p>O registro libera o lead e carrega o próximo item da fila.</p></div><span className="required-note">Obrigatório</span></div>
                <div className="result-options">{resultOptions.map((option) => <button type="button" key={option.id} className={selectedResult === option.id ? "selected" : ""} onClick={() => setSelectedResult(option.id)}><span className="result-radio">{selectedResult === option.id ? "✓" : ""}</span><div><strong>{option.label}</strong><small>{option.detail}</small></div><kbd>{option.shortcut}</kbd></button>)}</div>
                {selectedResult && <div className="conditional-form">
                  {selectedResult === "CALLBACK" && <div className="form-grid callback-form"><label className="form-field"><span>Data e horário do retorno <b>*</b></span><input type="datetime-local" value={callbackAt} min={localDateTimeInput(new Date())} onChange={(event) => setCallbackAt(event.target.value)} /></label></div>}
                  {selectedResult === "NO_ANSWER" && <div className="no-answer-note"><div><span>TENTATIVA ATUAL</span><strong>{attemptNumber} de 3</strong></div><div><strong>{attemptNumber === 3 ? "Última tentativa" : "Lead voltará à fila"}</strong><p>{attemptNumber === 3 ? "Ao salvar, o limite será atingido e o lead será encerrado." : "O lead permanece elegível para uma nova tentativa."}</p></div></div>}
                  {selectedResult === "INVALID_NUMBER" && <div className="invalid-note"><span>!</span><div><strong>O telefone será marcado como inválido.</strong><p>O lead não retornará à fila operacional.</p></div></div>}
                  <div className="form-grid"><label className="form-field full"><span>Observações</span><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Registre apenas informações úteis para o histórico do lead." /></label></div>
                  <div className="form-footer"><span>Resultado independente da telefonia</span><button className="primary-button save-button" type="button" disabled={saving || (selectedResult === "CALLBACK" && !callbackAt)} onClick={() => void saveOutcome()}>{saving ? "Salvando…" : "Salvar e próximo lead →"}</button></div>
                </div>}
              </article>
            </>
          )}
        </section>

        <aside className="sdr-side-column">
          <article className="side-card history-card">
            <div className="side-card-heading"><div><span className="side-icon">H</span><div><h3>Histórico</h3><p>Tentativas deste lead</p></div></div></div>
            <div className={`history-timeline ${!lead?.history.length ? "empty" : ""}`}>{!lead?.history.length ? <div className="empty-history"><span>+</span><strong>Sem tentativas anteriores</strong><p>O primeiro resultado aparecerá aqui.</p></div> : lead.history.map((item) => <div className="history-item neutral" key={item.id}><i /><span>{item.date} • {item.time}</span><strong>{item.title}</strong><p>{item.result} • {item.sdr?.name || "SDR não identificado"}</p><small>{item.detail}</small></div>)}</div>
          </article>

          <article className="side-card attempts-card">
            <div className="side-card-heading"><div><span className="side-icon">T</span><div><h3>Política de tentativas</h3><p>Máximo de 3 registros</p></div></div></div>
            <div className="attempt-policy">{[1, 2, 3].map((item) => <div key={item} className={lead && item <= lead.attempts ? "done" : lead && item === attemptNumber ? "current" : "future"}><span>{lead && item <= lead.attempts ? "✓" : item}</span><p><strong>Tentativa {item}</strong><small>{lead && item <= lead.attempts ? "Realizada" : lead && item === attemptNumber ? "Em atendimento" : "Disponível depois"}</small></p></div>)}</div>
          </article>

          <article className="side-card callbacks-card">
            <div className="side-card-heading"><div><span className="side-icon">↻</span><div><h3>Retornos de hoje</h3><p>Fora da fila automática</p></div></div><span className="callback-count">{callbacks.length}</span></div>
            <div className="sdr-callback-list">{callbacks.length === 0 ? <p>Nenhum retorno para hoje.</p> : callbacks.map((item) => <button type="button" key={item.id} disabled={!item.due || Boolean(lead)} onClick={() => void openCallback(item)}><span>{callbackTime(item.scheduledAt)}</span><div><strong>{item.lead.name}</strong><small>{item.due ? "Disponível agora" : "Aguardando horário"}</small></div></button>)}</div>
          </article>
        </aside>
      </div>

      {toast && <div className="toast-message"><span>✓</span>{toast}<button type="button" onClick={() => setToast("")}>×</button></div>}
    </div>
  );
}
