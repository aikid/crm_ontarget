"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { onTargetApi, type SystemSipAccount, type SystemSipAccountsResponse } from "../lib/ontarget-api";
import LoadingOverlay from "./ui/LoadingOverlay";

type FormState = { extension: string; password: string; email: string };
const emptyForm: FormState = { extension: "", password: "", email: "" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function SystemAdminScreen() {
  const [catalog, setCatalog] = useState<SystemSipAccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<SystemSipAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const fetchCatalog = useCallback(() => onTargetApi.system.sipAccounts(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setCatalog(await fetchCatalog()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "N\u00e3o foi poss\u00edvel carregar os ramais."); }
    finally { setLoading(false); }
  }, [fetchCatalog]);

  useEffect(() => {
    let cancelled = false;
    void fetchCatalog()
      .then((response) => { if (!cancelled) setCatalog(response); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "N\u00e3o foi poss\u00edvel carregar os ramais."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchCatalog]);

  const selectableSdrs = useMemo(() => {
    const occupied = new Set(catalog?.data.filter((row) => row.id !== editing?.id).map((row) => row.userId).filter(Boolean));
    return catalog?.sdrs.filter((sdr) => !occupied.has(sdr.id)) || [];
  }, [catalog, editing]);

  function openCreate() {
    setEditing(null); setForm(emptyForm); setError(""); setNotice(""); setFormOpen(true);
  }

  function openEdit(account: SystemSipAccount) {
    setEditing(account);
    setForm({ extension: account.extension, password: "", email: account.email || "" });
    setError(""); setNotice(""); setFormOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) {
        await onTargetApi.system.updateSipAccount(editing.id, {
          extension: form.extension, email: form.email || null,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await onTargetApi.system.createSipAccount({ extension: form.extension, password: form.password, email: form.email || null });
      }
      setFormOpen(false);
      setNotice(editing ? "Ramal atualizado com seguran\u00e7a." : "Novo ramal cadastrado com seguran\u00e7a.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "N\u00e3o foi poss\u00edvel salvar o ramal."); }
    finally { setSaving(false); }
  }

  async function remove(account: SystemSipAccount) {
    if (!window.confirm(`Excluir o ramal ${account.extension}? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.`)) return;
    setDeletingId(account.id); setError(""); setNotice("");
    try { await onTargetApi.system.deleteSipAccount(account.id); setNotice(`Ramal ${account.extension} exclu\u00eddo.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "N\u00e3o foi poss\u00edvel excluir o ramal."); }
    finally { setDeletingId(""); }
  }

  const configuration = catalog?.configuration;

  return (
    <section className="admin-screen system-admin-screen">
      <LoadingOverlay show={loading} title="Carregando configura\u00e7\u00f5es" message="Consultando o pool seguro de ramais SIP." />
      <header className="admin-header">
        <div><span>ADMINISTRA\u00c7\u00c3O DO SISTEMA</span><h1>Telefonia e ramais</h1><p>Cadastre credenciais SIP e vincule ramais aos SDRs sem expor as senhas armazenadas.</p></div>
        <button type="button" onClick={openCreate}>+ Novo ramal</button>
      </header>

      {configuration && <div className="system-status-grid" aria-label="Resumo dos ramais">
        <article><span>Total de ramais</span><strong>{configuration.total}</strong><small>cadastrados no pool</small></article>
        <article><span>Vinculados</span><strong>{configuration.assigned}</strong><small>em uso por SDRs</small></article>
        <article><span>Dispon\u00edveis</span><strong>{configuration.available}</strong><small>prontos para vincular</small></article>
        <article className={configuration.databaseAccountsEnabled ? "healthy" : "warning"}><span>Modo banco</span><strong>{configuration.databaseAccountsEnabled ? "Ativo" : "Inativo"}</strong><small>{configuration.encryptionConfigured ? "criptografia configurada" : "chave de criptografia ausente"}</small></article>
      </div>}

      {configuration && !configuration.databaseAccountsEnabled && <div className="system-warning" role="status"><strong>Pool em modo de prepara\u00e7\u00e3o.</strong><span>Os dados podem ser cadastrados agora, mas o Asterisk ainda usa o JSON enquanto <code>ASTERISK_DATABASE_ACCOUNTS_ENABLED=false</code>.</span></div>}
      {configuration && !configuration.encryptionConfigured && <div className="admin-message error" role="alert">Configure <code>ASTERISK_SIP_DATABASE_ENCRYPTION_KEY</code> antes de cadastrar ou trocar senhas.</div>}
      {error && <div className="admin-message error" role="alert">{error}</div>}
      {notice && <div className="admin-message success" role="status">{notice}</div>}

      <div className="admin-table-card system-accounts-card">
        <div className="system-card-heading"><div><strong>Pool de ramais</strong><span>Senhas salvas nunca s\u00e3o exibidas.</span></div><button type="button" onClick={() => void load()} disabled={loading}>Atualizar</button></div>
        {catalog?.data.length ? <div className="admin-table-wrap"><table>
          <thead><tr><th>Ramal</th><th>SDR vinculado</th><th>Situa\u00e7\u00e3o</th><th>Atualizado em</th><th aria-label="A\u00e7\u00f5es" /></tr></thead>
          <tbody>{catalog.data.map((account) => <tr key={account.id}>
            <td><strong>{account.extension}</strong><small>Senha protegida</small></td>
            <td>{account.user ? <><strong>{account.user.name}</strong><small>{account.email}</small></> : <><strong>Sem v\u00ednculo</strong><small>Dispon\u00edvel para o pr\u00f3ximo SDR</small></>}</td>
            <td><span className={`admin-status ${account.isAssigned ? "active" : "inactive"}`}><i />{account.isAssigned ? "Vinculado" : "Dispon\u00edvel"}</span></td>
            <td>{formatDate(account.updatedAt)}</td>
            <td><div className="admin-actions"><button type="button" onClick={() => openEdit(account)}>Editar</button><button type="button" className="danger" onClick={() => void remove(account)} disabled={account.isAssigned || deletingId === account.id} title={account.isAssigned ? "Desvincule o SDR antes de excluir" : "Excluir ramal"}>{deletingId === account.id ? "Excluindo..." : "Excluir"}</button></div></td>
          </tr>)}</tbody>
        </table></div> : !loading && <div className="admin-empty">Nenhum ramal cadastrado. Use “Novo ramal” para montar o pool.</div>}
      </div>

      {formOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFormOpen(false)}>
        <section className="admin-modal system-account-modal" role="dialog" aria-modal="true" aria-labelledby="system-account-title">
          <header><div><span>{editing ? "EDITAR CREDENCIAL" : "NOVA CREDENCIAL"}</span><h2 id="system-account-title">Ramal SIP</h2></div><button type="button" aria-label="Fechar" onClick={() => setFormOpen(false)}>\u00d7</button></header>
          <form onSubmit={(event) => void save(event)}>
            <label className="admin-field">Ramal<input inputMode="numeric" pattern="[0-9]{2,8}" maxLength={8} required value={form.extension} onChange={(event) => setForm((current) => ({ ...current, extension: event.target.value.replace(/\D/g, "") }))} placeholder="Ex.: 205" /></label>
            <label className="admin-field">{editing ? "Nova senha SIP (opcional)" : "Senha SIP"}<input type="password" required={!editing} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editing ? "Deixe em branco para manter a atual" : "Informe a senha criada no Asterisk"} /><small>{editing ? "A senha atual ser\u00e1 preservada se o campo ficar vazio." : "Ela ser\u00e1 criptografada e n\u00e3o poder\u00e1 ser consultada depois."}</small></label>
            <label className="admin-field">Vincular a um SDR<select value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}><option value="">Sem v\u00ednculo — deixar dispon\u00edvel</option>{selectableSdrs.map((sdr) => <option key={sdr.id} value={sdr.email}>{sdr.name} — {sdr.email}</option>)}</select><small>Ao desvincular, o ramal volta para o pool dispon\u00edvel.</small></label>
            <footer><button type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={saving || !configuration?.encryptionConfigured}>{saving ? "Salvando..." : "Salvar ramal"}</button></footer>
          </form>
        </section>
      </div>}
    </section>
  );
}
