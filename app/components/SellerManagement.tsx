"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { onTargetApi, type AdminClient, type SellerUser } from "../lib/ontarget-api";
import { useAuth } from "./auth/AuthProvider";
import LoadingOverlay from "./ui/LoadingOverlay";

const sellerOptions = ["Todos", "Venda direta", "0km", "Usado", "Consórcio"];

export default function SellerManagement({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const fixedClientId = user?.role === "CLIENT" ? user.clientId || "" : "";
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [sellers, setSellers] = useState<SellerUser[]>([]);
  const [clientId, setClientId] = useState(fixedClientId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SellerUser | null>(null);
  const [form, setForm] = useState({ sellerOption: "Todos", name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sellerResponse, clientResponse] = await Promise.all([
        onTargetApi.sellers.list(fixedClientId || undefined),
        user.role === "GESTOR" ? onTargetApi.admin.clients() : Promise.resolve({ data: [] as AdminClient[] }),
      ]);
      setSellers(sellerResponse.data);
      setClients(clientResponse.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os vendedores.");
    } finally {
      setLoading(false);
    }
  }, [fixedClientId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleSellers = useMemo(() => clientId ? sellers.filter((seller) => seller.clientId === clientId) : sellers, [clientId, sellers]);

  function create() {
    const selectedClient = fixedClientId || clientId || clients.find((client) => client.active)?.id || "";
    setClientId(selectedClient);
    setEditing(null);
    setForm({ sellerOption: "Todos", name: "", email: "" });
    setError("");
    setNotice("");
    setOpen(true);
  }

  function edit(seller: SellerUser) {
    setClientId(seller.clientId || "");
    setEditing(seller);
    setForm({ sellerOption: seller.sellerOption || "Todos", name: seller.name, email: seller.email });
    setError("");
    setNotice("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await onTargetApi.sellers.update(editing.id, form);
        setNotice("Vendedor atualizado com sucesso.");
      } else {
        await onTargetApi.sellers.create({ ...form, ...(fixedClientId ? {} : { clientId }) });
        setNotice("Vendedor cadastrado. A senha provisória foi enviada por e-mail.");
      }
      setOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o vendedor.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(seller: SellerUser) {
    setError("");
    try {
      await onTargetApi.sellers.update(seller.id, { active: !seller.active });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar o acesso.");
    }
  }

  return <div className={embedded ? "seller-management embedded" : "admin-screen seller-management"}>
    <LoadingOverlay show={loading} title="Carregando vendedores" message="Sincronizando os acessos deste cliente." />
    <header className="admin-header"><div><span>GESTÃO DE USUÁRIOS</span><h1>Vendedores</h1><p>Cadastre vendedores e limite cada acesso ao cliente e à loja correspondentes.</p></div><button type="button" onClick={create}>+ Novo vendedor</button></header>
    {user?.role === "GESTOR" && <label className="admin-field seller-client-filter"><span>Cliente</span><select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Todos os clientes</option>{clients.filter((client) => client.active).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
    {error && <div className="admin-message error" role="alert">{error}</div>}
    {notice && <div className="admin-message success" role="status">{notice}</div>}
    <section className="admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>Nome</th><th>Cliente</th><th>Opção vendedor</th><th>Status</th><th /></tr></thead><tbody>{visibleSellers.map((seller) => <tr key={seller.id}><td><strong>{seller.name}</strong><small>{seller.email}</small></td><td>{seller.client?.name || "—"}</td><td>{seller.sellerOption || "Todos"}</td><td><span className={`admin-status ${seller.active ? "active" : "inactive"}`}><i />{seller.active ? "Ativo" : "Inativo"}</span></td><td><div className="admin-actions"><button type="button" onClick={() => edit(seller)}>Editar</button><button type="button" className={seller.active ? "danger-action" : "success-action"} onClick={() => void toggle(seller)}>{seller.active ? "Desativar" : "Ativar"}</button></div></td></tr>)}</tbody></table>{!loading && !visibleSellers.length && <div className="admin-empty">Nenhum vendedor cadastrado para este cliente.</div>}</div></section>

    {open && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="admin-modal" role="dialog" aria-modal="true"><header><div><span>{editing ? "EDITAR" : "NOVO CADASTRO"}</span><h2>Vendedor</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar">×</button></header><form onSubmit={submit} autoComplete="off">
      {!fixedClientId && <label className="admin-field"><span>Cliente</span><select value={clientId} required disabled={Boolean(editing)} onChange={(event) => setClientId(event.target.value)}><option value="" disabled>Selecione</option>{clients.filter((client) => client.active).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
      <label className="admin-field"><span>Opção vendedor</span><select value={form.sellerOption} required onChange={(event) => setForm((current) => ({ ...current, sellerOption: event.target.value }))}>{sellerOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label className="admin-field"><span>Nome</span><input value={form.name} minLength={2} required onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
      <label className="admin-field"><span>E-mail</span><input type="email" value={form.email} required autoComplete="off" data-1p-ignore="true" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
      {!editing && <p className="seller-password-note">Uma senha provisória será enviada a este e-mail e deverá ser alterada no primeiro acesso.</p>}
      <footer><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar vendedor"}</button></footer>
    </form></section></div>}
  </div>;
}
