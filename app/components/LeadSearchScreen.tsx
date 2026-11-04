"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  onTargetApi,
  type AdminCampaign,
  type AdminClient,
  type AdminStore,
  type AdminUser,
  type ApiLead,
} from "../lib/ontarget-api";
import LoadingOverlay from "./ui/LoadingOverlay";

const statusOptions = [
  ["all", "Todos os status"],
  ["PENDING", "Pendente"],
  ["CALLBACK", "Retornar"],
  ["CONTACTED", "Contato realizado"],
  ["QUALIFIED", "Qualificado"],
  ["DIRECTED", "Direcionado"],
  ["SCHEDULED", "Agendado"],
  ["NOT_QUALIFIED", "Sem interesse"],
  ["REFUSED", "Recusou"],
  ["ALREADY_BOUGHT", "Já comprou"],
  ["LIMBO", "Limbo"],
  ["FUTURE_INTEREST", "Interesse futuro"],
  ["EXHAUSTED", "Tentativas esgotadas"],
  ["INVALID_NUMBER", "Número não existe"],
];

const sellerOptions: NonNullable<ApiLead["sellerOption"]>[] = ["Venda direta", "0km", "Usado", "Consórcio"];

function LeadAuditEditor({ lead, onSaved }: { lead: ApiLead; onSaved: (lead: ApiLead) => void }) {
  const [auditNotes, setAuditNotes] = useState(lead.auditNotes || "");
  const [sellerOption, setSellerOption] = useState<ApiLead["sellerOption"]>(lead.sellerOption);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await onTargetApi.updateLeadAuditFields(lead.id, {
        auditNotes: auditNotes.trim() || null,
        sellerOption,
      });
      onSaved(updated);
      setMessage("Dados de auditoria atualizados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a auditoria.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="drawer-section lead-audit-editor">
    <div className="drawer-section-heading"><span className="drawer-section-icon">AU</span><div><h3>Complemento da auditoria</h3><p>Campos editáveis pelo gestor</p></div></div>
    <div className="lead-audit-form">
      <label><span>Obs. auditoria</span><textarea value={auditNotes} onChange={(event) => setAuditNotes(event.target.value)} maxLength={10_000} placeholder="Registre observações sobre a auditoria" /></label>
      <label><span>Opção vendedor</span><select value={sellerOption || ""} onChange={(event) => setSellerOption((event.target.value || null) as ApiLead["sellerOption"])}><option value="">Não informada</option>{sellerOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
    </div>
    {error && <div className="admin-message error" role="alert">{error}</div>}
    {message && <div className="admin-message success" role="status">{message}</div>}
    <button className="lead-audit-save" type="button" onClick={() => void save()} disabled={saving}>{saving ? "Salvando..." : "Salvar auditoria"}</button>
  </section>;
}

function ManagerRecording({ recording }: { recording: ApiLead["recordings"][number] }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  async function loadRecording() {
    setLoading(true);
    setError("");
    try {
      const blob = await onTargetApi.callRecording(recording.callId);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a gravação.");
    } finally {
      setLoading(false);
    }
  }

  const recordedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(recording.recordedAt));
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short", timeZone: "America/Sao_Paulo",
  }).format(new Date(recording.expiresAt));

  return <div className="manager-recording-item">
    <div><strong>Ligação de {recordedAt}</strong><small>Disponível até {expiresAt}</small></div>
    {!audioUrl && <button type="button" onClick={() => void loadRecording()} disabled={loading}>{loading ? "Carregando..." : "Ouvir gravação"}</button>}
    {audioUrl && <div className="manager-recording-controls"><audio controls preload="metadata" src={audioUrl}>Seu navegador não suporta áudio.</audio><a href={audioUrl} download={`gravacao-${recording.callId}.wav`}>Baixar gravação</a></div>}
    {error && <p className="manager-recording-error">{error}</p>}
  </div>;
}

export default function LeadSearchScreen() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ApiLead | null>(null);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("all");
  const [storeId, setStoreId] = useState("all");
  const [campaignId, setCampaignId] = useState("all");
  const [status, setStatus] = useState("all");
  const [sdrId, setSdrId] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([onTargetApi.admin.clients(), onTargetApi.admin.stores(), onTargetApi.admin.campaigns(), onTargetApi.admin.users()])
      .then(([clientResponse, storeResponse, campaignResponse, userResponse]) => {
        setClients(clientResponse.data);
        setStores(storeResponse.data);
        setCampaigns(campaignResponse.data);
        setUsers(userResponse.data.filter((item) => item.role === "SDR"));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os filtros."));
  }, []);

  const availableStores = useMemo(() => stores.filter((item) => clientId === "all" || item.clientId === clientId), [clientId, stores]);
  const availableCampaigns = useMemo(() => campaigns.filter((item) => (clientId === "all" || item.clientId === clientId) && (storeId === "all" || item.storeId === storeId)), [campaigns, clientId, storeId]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await onTargetApi.operationLeads({ search, clientId, storeId, campaignId, status, sdrId, page, pageSize: 20 });
      setLeads(response.data);
      setPagination(response.pagination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar os leads.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, clientId, page, sdrId, search, status, storeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLeads(), 250);
    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  function changeClient(value: string) {
    setClientId(value);
    setStoreId("all");
    setCampaignId("all");
    setPage(1);
  }

  function changeStore(value: string) {
    setStoreId(value);
    setCampaignId("all");
    setPage(1);
  }

  function clientName(id: string) {
    return clients.find((item) => item.id === id)?.name || id;
  }

  function updateSavedLead(updated: ApiLead) {
    setSelectedLead(updated);
    setLeads((current) => current.map((lead) => lead.id === updated.id ? updated : lead));
  }

  return <div className="screen lead-search-screen">
    <LoadingOverlay show={loading} title="Atualizando consulta" message="Aplicando os filtros e buscando os leads." />
    <header className="admin-header"><div><span>OPERAÇÃO</span><h1>Consulta de leads</h1><p>Pesquise cadastros e consulte todo o histórico operacional.</p></div><div className="lead-total"><strong>{pagination.total}</strong><span>leads encontrados</span></div></header>

    <section className="lead-search-filters">
      <label className="lead-search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nome, telefone, veículo ou origem" aria-label="Buscar leads" /></label>
      <label><span>Cliente</span><select value={clientId} onChange={(event) => changeClient(event.target.value)}><option value="all">Todos</option>{clients.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label><span>Loja</span><select value={storeId} onChange={(event) => changeStore(event.target.value)}><option value="all">Todas</option>{availableStores.map((item) => <option value={item.id} key={item.id}>{item.shortName}</option>)}</select></label>
      <label><span>Campanha</span><select value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setPage(1); }}><option value="all">Todas</option>{availableCampaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label><span>Status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{statusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>SDR</span><select value={sdrId} onChange={(event) => { setSdrId(event.target.value); setPage(1); }}><option value="all">Todos</option>{users.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    </section>

    {error && <div className="admin-message error">{error}</div>}
    <section className="admin-table-card lead-results-card">
      <div className="admin-table-wrap"><table><thead><tr><th>Lead</th><th>Cliente / loja</th><th>Campanha</th><th>Status</th><th>Auditoria</th><th>Tentativas</th><th>Último contato</th><th /></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><div className="table-identity"><span className="table-row-avatar red">{lead.initials}</span><div><strong>{lead.name}</strong><small>{lead.phone} • {lead.action || lead.vehicle || "Sem ação informada"}</small></div></div></td><td><strong>{clientName(lead.clientId)}</strong><small>{lead.store.shortName}</small></td><td><strong>{lead.campaign.name}</strong><small>{lead.origin || "Origem não informada"}</small></td><td><span className={`lead-status-pill status-${lead.statusCode.toLowerCase()}`}><i />{lead.status}</span></td><td><span className={`audit-status-pill ${lead.audit.status === "Não auditado" ? "pending" : "audited"}`}><i />{lead.audit.status}</span></td><td><span className="attempt-indicator"><b>{lead.attempts} de 3</b><span>{[1, 2, 3].map((attempt) => <i className={attempt <= lead.attempts ? "filled" : ""} key={attempt} />)}</span></span></td><td>{lead.lastContact}</td><td><button className="lead-detail-button" type="button" onClick={() => setSelectedLead(lead)}>Ver histórico <span>→</span></button></td></tr>)}</tbody></table></div>
      {!loading && leads.length === 0 && <div className="admin-empty">Nenhum lead encontrado com os filtros informados.</div>}
      <footer className="lead-pagination"><span>Página {pagination.page} de {Math.max(1, pagination.pages)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Anterior</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Próxima →</button></div></footer>
    </section>

    {selectedLead && <div className="lead-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLead(null); }}><aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-history-title"><header className="lead-drawer-header"><div><span>HISTÓRICO OPERACIONAL</span><p>Cliente → Loja → Campanha → Lead → Tentativa → Resultado</p></div><button type="button" onClick={() => setSelectedLead(null)} aria-label="Fechar">×</button></header><div className="lead-drawer-scroll">
      <div className="drawer-lead-identity"><span className="drawer-avatar">{selectedLead.initials}</span><div><h2 id="lead-history-title">{selectedLead.name}</h2><p>{selectedLead.phone} • {selectedLead.action || selectedLead.vehicle || "Sem ação informada"}</p><span className="drawer-status"><i />{selectedLead.status}</span></div></div>
      <section className="drawer-section"><div className="drawer-section-heading"><span className="drawer-section-icon">ID</span><div><h3>Dados do lead</h3><p>Origem e relacionamento comercial</p></div></div><div className="drawer-info-grid"><div><span>Cliente</span><strong>{clientName(selectedLead.clientId)}</strong></div><div><span>Loja</span><strong>{selectedLead.store.name}</strong></div><div><span>Campanha</span><strong>{selectedLead.campaign.name}</strong></div><div><span>Origem</span><strong>{selectedLead.origin || "Não informada"}</strong></div><div><span>Ação</span><strong>{selectedLead.action || "Não informada"}</strong></div><div><span>Dia da ação</span><strong>{selectedLead.actionDate || "Não informado"}</strong></div><div><span>Tentativas</span><strong>{selectedLead.attempts} de 3</strong></div></div></section>
      <LeadAuditEditor key={selectedLead.id} lead={selectedLead} onSaved={updateSavedLead} />
      <section className="drawer-section"><div className="drawer-section-heading"><span className="drawer-section-icon">H</span><div><h3>Tentativas e resultados</h3><p>Histórico persistido no backend</p></div></div>{selectedLead.history.length ? <div className="drawer-timeline">{selectedLead.history.map((item, index) => <div key={item.id} className={index === selectedLead.history.length - 1 ? "latest" : ""}><i>{index + 1}</i><span>{item.date}<small>{item.time}</small></span><p><strong>{item.result}</strong><small>{item.detail}</small></p><span className="timeline-result">{item.title}</span></div>)}</div> : <div className="lead-history-empty">Nenhuma tentativa registrada.</div>}</section>
      <section className="drawer-section"><div className="drawer-section-heading"><span className="drawer-section-icon">AU</span><div><h3>Gravações das ligações</h3><p>Acesso exclusivo do gestor • retenção de 60 dias</p></div></div>{selectedLead.recordings.length ? <div className="manager-recording-list">{selectedLead.recordings.map((recording) => <ManagerRecording key={recording.callId} recording={recording} />)}</div> : <div className="recording-unavailable"><span>—</span><p><strong>Nenhuma gravação disponível</strong><small>As gravações expiradas são removidas automaticamente.</small></p></div>}</section>
      {selectedLead.callback && <section className="drawer-section lead-callback-detail"><div className="drawer-section-heading"><span className="drawer-section-icon">↻</span><div><h3>Retorno solicitado</h3><p>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(selectedLead.callback.scheduledAt))}</p></div></div><p>{selectedLead.callback.notes || "Sem observações."}</p></section>}
    </div></aside></div>}
  </div>;
}
