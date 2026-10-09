"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  onTargetApi,
  type AdminCampaign,
  type AdminClient,
  type AdminStore,
  type AdminUser,
} from "../lib/ontarget-api";
import LoadingOverlay from "./ui/LoadingOverlay";

type Tab = "clients" | "stores" | "campaigns" | "users";
type FormValues = Record<string, string>;
type Editing = AdminClient | AdminStore | AdminCampaign | AdminUser | null;

const tabLabels: Record<Tab, string> = {
  clients: "Clientes",
  stores: "Lojas",
  campaigns: "Campanhas",
  users: "Usuários",
};

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value)) : "—";
}

function roleLabel(role: AdminUser["role"]) {
  return { GESTOR: "Gestor", SDR: "SDR", CLIENT: "Portal do Cliente" }[role];
}

function campaignStatus(status: AdminCampaign["status"]) {
  return { ACTIVE: "Ativa", INACTIVE: "Inativa", COMPLETED: "Concluída" }[status];
}

export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>("clients");
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);

  const fetchCatalogs = useCallback(() => Promise.all([
        onTargetApi.admin.clients(),
        onTargetApi.admin.stores(),
        onTargetApi.admin.campaigns(),
        onTargetApi.admin.users(),
      ]), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [clientRows, storeRows, campaignRows, userRows] = await fetchCatalogs();
      setClients(clientRows.data);
      setStores(storeRows.data);
      setCampaigns(campaignRows.data);
      setUsers(userRows.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os cadastros.");
    } finally {
      setLoading(false);
    }
  }, [fetchCatalogs]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalogs()
      .then(([clientRows, storeRows, campaignRows, userRows]) => {
        if (cancelled) return;
        setClients(clientRows.data);
        setStores(storeRows.data);
        setCampaigns(campaignRows.data);
        setUsers(userRows.data);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os cadastros.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchCatalogs]);

  const activeClients = useMemo(() => clients.filter((client) => client.active), [clients]);
  const availableStores = useMemo(
    () => stores.filter((store) => store.active && store.clientId === form.clientId),
    [stores, form.clientId],
  );

  function setField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    const clientId = activeClients[0]?.id || "";
    setEditing(null);
    setFormOpen(true);
    setNotice("");
    setError("");
    if (tab === "clients") setForm({ name: "" });
    if (tab === "stores") setForm({ clientId, name: "", shortName: "" });
    if (tab === "campaigns") {
      const store = stores.find((row) => row.active && row.clientId === clientId);
      setForm({ clientId, storeId: store?.id || "", name: "", status: "ACTIVE", startDate: "", endDate: "" });
    }
    if (tab === "users") setForm({ clientId: "", name: "", email: "", initials: "", role: "SDR", password: "" });
  }

  function openEdit(record: Editing) {
    if (!record) return;
    setEditing(record);
    setFormOpen(true);
    setNotice("");
    setError("");
    if (tab === "clients") setForm({ name: (record as AdminClient).name });
    if (tab === "stores") {
      const store = record as AdminStore;
      setForm({ clientId: store.clientId, name: store.name, shortName: store.shortName });
    }
    if (tab === "campaigns") {
      const campaign = record as AdminCampaign;
      setForm({ clientId: campaign.clientId, storeId: campaign.storeId, name: campaign.name, status: campaign.status, startDate: dateInput(campaign.startDate), endDate: dateInput(campaign.endDate) });
    }
    if (tab === "users") {
      const user = record as AdminUser;
      setForm({ clientId: user.clientId || "", name: user.name, email: user.email, initials: user.initials, role: user.role, password: "" });
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (tab === "clients") {
        if (editing) await onTargetApi.admin.updateClient(editing.id, { name: form.name });
        else await onTargetApi.admin.createClient({ name: form.name });
      }
      if (tab === "stores") {
        if (editing) await onTargetApi.admin.updateStore(editing.id, { name: form.name, shortName: form.shortName });
        else await onTargetApi.admin.createStore({ clientId: form.clientId, name: form.name, shortName: form.shortName });
      }
      if (tab === "campaigns") {
        const payload = { name: form.name, status: form.status, startDate: form.startDate, endDate: form.endDate };
        if (editing) await onTargetApi.admin.updateCampaign(editing.id, payload);
        else await onTargetApi.admin.createCampaign({ ...payload, clientId: form.clientId, storeId: form.storeId });
      }
      if (tab === "users") {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          initials: form.initials || undefined,
          role: form.role,
          clientId: form.role === "CLIENT" ? form.clientId : null,
          ...(form.password ? { password: form.password } : {}),
        };
        if (editing) await onTargetApi.admin.updateUser(editing.id, payload);
        else await onTargetApi.admin.createUser(payload);
      }
      setFormOpen(false);
      setNotice(`${tabLabels[tab].slice(0, -1)} salvo com sucesso.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kind: "client" | "store" | "user", record: AdminClient | AdminStore | AdminUser) {
    setError("");
    setNotice("");
    try {
      if (kind === "client") await onTargetApi.admin.updateClient(record.id, { active: !record.active });
      if (kind === "store") await onTargetApi.admin.updateStore(record.id, { active: !record.active });
      if (kind === "user") await onTargetApi.admin.updateUser(record.id, { active: !record.active });
      setNotice(`Cadastro ${record.active ? "desativado" : "ativado"} com sucesso.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o status.");
    }
  }

  async function setCampaignStatus(record: AdminCampaign, status: AdminCampaign["status"]) {
    setError("");
    try {
      await onTargetApi.admin.updateCampaign(record.id, { status });
      setNotice(`Campanha marcada como ${campaignStatus(status).toLowerCase()}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a campanha.");
    }
  }

  return (
    <div className="admin-screen">
      <LoadingOverlay show={loading} title="Carregando cadastros" message="Sincronizando clientes, lojas, campanhas e usuários." />
      <header className="admin-header">
        <div><span>GESTÃO DA PLATAFORMA</span><h1>Cadastros</h1><p>Clientes, lojas, campanhas e acessos da operação.</p></div>
        <button type="button" onClick={openCreate}>+ Novo cadastro</button>
      </header>

      <nav className="admin-tabs" aria-label="Tipos de cadastro">
        {(Object.keys(tabLabels) as Tab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => { setTab(item); setFormOpen(false); setError(""); setNotice(""); }}>
            {tabLabels[item]} <span>{item === "clients" ? clients.length : item === "stores" ? stores.length : item === "campaigns" ? campaigns.length : users.length}</span>
          </button>
        ))}
      </nav>

      {error && <div className="admin-message error" role="alert">{error}</div>}
      {notice && <div className="admin-message success" role="status">{notice}</div>}

      <section className="admin-table-card">
        {loading ? <div className="admin-empty">Preparando cadastros...</div> : (
          <div className="admin-table-wrap">
            {tab === "clients" && <ClientTable rows={clients} onEdit={openEdit} onToggle={(row) => void toggleActive("client", row)} />}
            {tab === "stores" && <StoreTable rows={stores} onEdit={openEdit} onToggle={(row) => void toggleActive("store", row)} />}
            {tab === "campaigns" && <CampaignTable rows={campaigns} onEdit={openEdit} onStatus={(row, status) => void setCampaignStatus(row, status)} />}
            {tab === "users" && <UserTable rows={users} onEdit={openEdit} onToggle={(row) => void toggleActive("user", row)} />}
          </div>
        )}
      </section>

      {formOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setFormOpen(false)}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-form-title">
            <header><div><span>{editing ? "EDITAR" : "NOVO CADASTRO"}</span><h2 id="admin-form-title">{tabLabels[tab].slice(0, -1)}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Fechar">×</button></header>
            <form onSubmit={save}>
              {tab === "clients" && <TextField label="Nome do cliente" value={form.name} onChange={(value) => setField("name", value)} />}
              {tab === "stores" && <>
                <SelectField label="Cliente" value={form.clientId} disabled={Boolean(editing)} onChange={(value) => setField("clientId", value)} options={activeClients.map((row) => [row.id, row.name])} />
                <TextField label="Nome da loja" value={form.name} onChange={(value) => setField("name", value)} />
                <TextField label="Nome curto" value={form.shortName} onChange={(value) => setField("shortName", value)} maxLength={60} />
              </>}
              {tab === "campaigns" && <>
                <SelectField label="Cliente" value={form.clientId} disabled={Boolean(editing)} onChange={(value) => { const firstStore = stores.find((row) => row.active && row.clientId === value); setForm((current) => ({ ...current, clientId: value, storeId: firstStore?.id || "" })); }} options={activeClients.map((row) => [row.id, row.name])} />
                <SelectField label="Loja" value={form.storeId} disabled={Boolean(editing)} onChange={(value) => setField("storeId", value)} options={availableStores.map((row) => [row.id, row.name])} />
                <TextField label="Nome da campanha" value={form.name} onChange={(value) => setField("name", value)} />
                <SelectField label="Status" value={form.status} onChange={(value) => setField("status", value)} options={[["ACTIVE", "Ativa"], ["INACTIVE", "Inativa"], ["COMPLETED", "Concluída"]]} />
                <div className="admin-form-grid"><TextField label="Início" type="date" value={form.startDate} onChange={(value) => setField("startDate", value)} /><TextField label="Término" type="date" value={form.endDate} onChange={(value) => setField("endDate", value)} /></div>
              </>}
              {tab === "users" && <>
                <TextField label="Nome" value={form.name} onChange={(value) => setField("name", value)} />
                <div className="admin-form-grid"><TextField label="E-mail" type="email" value={form.email} onChange={(value) => setField("email", value)} /><TextField label="Iniciais" value={form.initials} required={false} onChange={(value) => setField("initials", value.toUpperCase())} maxLength={4} /></div>
                <SelectField label="Perfil" value={form.role} onChange={(value) => setField("role", value)} options={[["GESTOR", "Gestor"], ["SDR", "SDR"], ["CLIENT", "Portal do Cliente"]]} />
                {form.role === "CLIENT" && <SelectField label="Cliente" value={form.clientId} onChange={(value) => setField("clientId", value)} options={activeClients.map((row) => [row.id, row.name])} />}
                <TextField label={editing ? "Nova senha (opcional)" : "Senha inicial"} type="password" value={form.password} required={!editing} onChange={(value) => setField("password", value)} minLength={8} />
              </>}
              <footer><button type="button" onClick={() => setFormOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Status({ active, label }: { active: boolean; label?: string }) { return <span className={`admin-status ${active ? "active" : "inactive"}`}><i />{label || (active ? "Ativo" : "Inativo")}</span>; }
function Actions({ onEdit, onToggle, active }: { onEdit: () => void; onToggle: () => void; active: boolean }) { return <div className="admin-actions"><button type="button" onClick={onEdit}>Editar</button><button className={active ? "danger-action" : "success-action"} type="button" onClick={onToggle}>{active ? "Desativar" : "Ativar"}</button></div>; }
function initials(value: string) { return value.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function TableIdentity({ name, detail, tone = "red" }: { name: string; detail: string; tone?: "red" | "dark" | "green" | "violet" }) { return <div className="table-identity"><span className={`table-row-avatar ${tone}`}>{initials(name)}</span><div><strong>{name}</strong><small>{detail}</small></div></div>; }
function ClientTable({ rows, onEdit, onToggle }: { rows: AdminClient[]; onEdit: (row: AdminClient) => void; onToggle: (row: AdminClient) => void }) { return <table><thead><tr><th>Cliente</th><th>Estrutura</th><th>Leads</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><TableIdentity name={row.name} detail={row.id} /></td><td>{row._count.stores} lojas · {row._count.campaigns} campanhas</td><td><span className="table-number">{row._count.leads}</span></td><td><Status active={row.active} /></td><td><Actions active={row.active} onEdit={() => onEdit(row)} onToggle={() => onToggle(row)} /></td></tr>)}</tbody></table>; }
function StoreTable({ rows, onEdit, onToggle }: { rows: AdminStore[]; onEdit: (row: AdminStore) => void; onToggle: (row: AdminStore) => void }) { return <table><thead><tr><th>Loja</th><th>Cliente</th><th>Campanhas</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><TableIdentity name={row.name} detail={row.shortName} tone="dark" /></td><td>{row.client.name}</td><td><span className="table-number">{row._count.campaigns}</span></td><td><Status active={row.active} /></td><td><Actions active={row.active} onEdit={() => onEdit(row)} onToggle={() => onToggle(row)} /></td></tr>)}</tbody></table>; }
function CampaignTable({ rows, onEdit, onStatus }: { rows: AdminCampaign[]; onEdit: (row: AdminCampaign) => void; onStatus: (row: AdminCampaign, status: AdminCampaign["status"]) => void }) { return <table><thead><tr><th>Campanha</th><th>Cliente / loja</th><th>Período</th><th>Leads</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><TableIdentity name={row.name} detail={row.id} tone="violet" /></td><td>{row.client.name}<small>{row.store.shortName}</small></td><td>{formatDate(row.startDate)} — {formatDate(row.endDate)}</td><td><span className="table-number">{row._count.leads}</span></td><td><Status active={row.status === "ACTIVE"} label={campaignStatus(row.status)} /></td><td><div className="admin-actions"><button type="button" onClick={() => onEdit(row)}>Editar</button><button className={row.status === "ACTIVE" ? "danger-action" : "success-action"} type="button" onClick={() => onStatus(row, row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{row.status === "ACTIVE" ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table>; }
function UserTable({ rows, onEdit, onToggle }: { rows: AdminUser[]; onEdit: (row: AdminUser) => void; onToggle: (row: AdminUser) => void }) { return <table><thead><tr><th>Usuário</th><th>Perfil</th><th>Cliente</th><th>Último acesso</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><TableIdentity name={row.name} detail={row.email} tone="green" /></td><td>{roleLabel(row.role)}</td><td>{row.client?.name || "OnTarget"}</td><td>{row.lastLoginAt ? formatDate(row.lastLoginAt) : "Nunca"}</td><td><Status active={row.active} /></td><td><Actions active={row.active} onEdit={() => onEdit(row)} onToggle={() => onToggle(row)} /></td></tr>)}</tbody></table>; }

function TextField({ label, value = "", onChange, type = "text", required = true, ...input }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean; minLength?: number; maxLength?: number }) { return <label className="admin-field"><span>{label}</span><input {...input} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} /></label>; }
function SelectField({ label, value = "", onChange, options, disabled = false }: { label: string; value?: string; onChange: (value: string) => void; options: string[][]; disabled?: boolean }) { return <label className="admin-field"><span>{label}</span><select value={value} required disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="" disabled>Selecione</option>{options.map(([id, option]) => <option key={id} value={id}>{option}</option>)}</select></label>; }
