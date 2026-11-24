"use client";

import { FormEvent, useState } from "react";
import type { SessionUser } from "../../lib/ontarget-api";

type ProfilePayload = { name?: string; newPassword?: string };

type Props = {
  user: SessionUser;
  onClose: () => void;
  onUpdate: (payload: ProfilePayload) => Promise<void>;
  forced?: boolean;
};

const roleLabels: Record<SessionUser["role"], string> = {
  ADMIN: "Admin do sistema",
  GESTOR: "Gestor",
  SDR: "SDR",
  CLIENT: "Portal do Cliente",
  SELLER: "Vendedor",
};

export default function ProfileModal({ user, onClose, onUpdate, forced = false }: Props) {
  const [name, setName] = useState(user.name);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmation) {
      setError("A confirmação não corresponde à nova senha.");
      return;
    }
    if (forced && !newPassword) {
      setError("Defina uma nova senha para concluir o primeiro acesso.");
      return;
    }
    if (!name.trim() || (name.trim() === user.name && !newPassword)) {
      setError("Altere o nome ou informe uma nova senha.");
      return;
    }

    setSaving(true);
    try {
      await onUpdate({
        ...(name.trim() !== user.name ? { name: name.trim() } : {}),
        ...(newPassword ? { newPassword } : {}),
      });
      setNewPassword("");
      setConfirmation("");
      setNotice("Seus dados foram atualizados com sucesso.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar seu perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => !forced && event.target === event.currentTarget && onClose()}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header>
          <div><span>{forced ? "PRIMEIRO ACESSO" : "MINHA CONTA"}</span><h2 id="profile-title">{forced ? "Defina sua nova senha" : "Perfil e segurança"}</h2></div>
          {!forced && <button type="button" onClick={onClose} aria-label="Fechar">×</button>}
        </header>

        <form onSubmit={submit}>
          <div className="profile-identity">
            <span>{user.initials}</span>
            <div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></div>
          </div>

          <label htmlFor="profile-name">Nome</label>
          <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />

          <label htmlFor="profile-email">E-mail de acesso</label>
          <input id="profile-email" value={user.email} readOnly aria-readonly="true" />
          <small className="profile-field-help">Para alterar o e-mail, solicite ao gestor. No perfil SDR ele também identifica o ramal de telefonia.</small>

          <div className="profile-section-heading"><strong>Alterar senha</strong><span>{forced ? "Obrigatório" : "Opcional"}</span></div>
          <div className="profile-password-grid">
            <div><label htmlFor="profile-new-password">Nova senha</label><input id="profile-new-password" type={showPasswords ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} /></div>
            <div><label htmlFor="profile-password-confirmation">Confirmar senha</label><input id="profile-password-confirmation" type={showPasswords ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} /></div>
          </div>
          <label className="profile-show-password"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /> Mostrar senhas</label>

          {error && <div className="profile-message error" role="alert">{error}</div>}
          {notice && <div className="profile-message success" role="status">{notice}</div>}

          <footer>{!forced && <button type="button" onClick={onClose}>Cancelar</button>}<button className="primary" type="submit" disabled={saving}>{saving ? "Salvando..." : forced ? "Definir senha e continuar" : "Salvar alterações"}</button></footer>
        </form>
      </section>
    </div>
  );
}
