"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { onTargetApi, type SessionUser } from "../../lib/ontarget-api";

type Props = {
  area: "internal" | "client";
  unauthorizedUser?: SessionUser | null;
};

function Brand() {
  return (
    <div className="auth-brand" aria-label="SysOn">
      <span className="auth-brand-target" aria-hidden="true"><i /></span>
      <strong>SYSON</strong>
    </div>
  );
}

function AuthAside({ area }: Pick<Props, "area">) {
  return (
    <aside className="auth-aside" aria-label="Apresentação SysOn">
      <div className="auth-aside-glow auth-aside-glow-top" />
      <div className="auth-aside-glow auth-aside-glow-bottom" />
      <Brand />

      <div className="auth-aside-copy">
        <span className="auth-kicker">PLATAFORMA DE OPERAÇÃO COMERCIAL</span>
        <h1>
          Leads em movimento.<br />
          <em>Resultados em foco.</em>
        </h1>
        <p>
          Centralize a operação, acompanhe cada oportunidade e transforme dados em decisões comerciais.
        </p>
      </div>

      <div className="auth-orbit" aria-hidden="true">
        <span className="auth-orbit-ring auth-orbit-ring-one" />
        <span className="auth-orbit-ring auth-orbit-ring-two" />
        <span className="auth-orbit-core"><i /></span>
        <span className="auth-orbit-dot auth-orbit-dot-one" />
        <span className="auth-orbit-dot auth-orbit-dot-two" />
        <span className="auth-orbit-dot auth-orbit-dot-three" />
      </div>

      <footer>
        <span>{area === "client" ? "Portal de resultados" : "Operação SDR"}</span>
        <small>© 2026 SysOn</small>
      </footer>
    </aside>
  );
}

export default function LoginScreen({ area, unauthorizedUser }: Props) {
  const { login, logout, loggingOut } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = new URLSearchParams(window.location.search).get("resetToken");
      if (token) {
        setResetToken(token);
        setMode("reset");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const authenticatedUser = await login(email, password);
      const destination = authenticatedUser.role === "CLIENT" ? "/cliente" : authenticatedUser.role === "SELLER" ? "/vendedor" : "/";
      if (window.location.pathname !== destination) window.location.replace(destination);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const result = await onTargetApi.forgotPassword(email);
      setSuccess(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível solicitar a recuperação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password !== passwordConfirmation) {
      setError("As senhas informadas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await onTargetApi.resetPassword(resetToken, password);
      setSuccess(result.message);
      setPassword("");
      setPasswordConfirmation("");
      window.history.replaceState({}, "", window.location.pathname);
      setMode("login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a senha.");
    } finally {
      setSubmitting(false);
    }
  }

  function returnToLogin() {
    setMode("login");
    setError("");
    setSuccess("");
    setPassword("");
    setPasswordConfirmation("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  const alternateArea = area === "client" ? "/" : "/cliente";
  const alternateLabel = area === "client" ? "Acessar operação interna" : "Acessar Portal do Cliente";

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <AuthAside area={area} />

        <div className="auth-panel">
          <div className="auth-mobile-brand"><Brand /></div>

          {unauthorizedUser ? (
            <section className="auth-card auth-access-card" aria-labelledby="access-title">
              <span className="auth-panel-kicker">ACESSO IDENTIFICADO</span>
              <h2 id="access-title">Esta conta pertence a outra área</h2>
              <p>
                Você entrou como <strong>{unauthorizedUser.name}</strong>. Acesse o ambiente correspondente ao seu perfil.
              </p>
              <Link className="auth-primary-link" href={unauthorizedUser.role === "CLIENT" ? "/cliente" : unauthorizedUser.role === "SELLER" ? "/vendedor" : "/"}>
                Ir para o ambiente correto <span aria-hidden="true">→</span>
              </Link>
              <button className="auth-secondary-button" type="button" onClick={() => void logout()} disabled={loggingOut}>
                {loggingOut ? "Encerrando sessão..." : "Entrar com outra conta"}
              </button>
            </section>
          ) : mode === "forgot" ? (
            <section className="auth-card" aria-labelledby="forgot-title">
              <header className="auth-heading">
                <span className="auth-panel-kicker">RECUPERAR ACESSO</span>
                <h2 id="forgot-title">Esqueci minha senha</h2>
                <p>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
              </header>
              <form onSubmit={requestPasswordReset}>
                <label htmlFor="forgot-email">E-mail</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">@</span>
                  <input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nome@empresa.com.br" required />
                </div>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}
                <button className="auth-submit" type="submit" disabled={submitting || Boolean(success)}>
                  <span>{submitting ? "Enviando..." : success ? "Instruções enviadas" : "Enviar link de recuperação"}</span>
                  {!submitting && !success && <span aria-hidden="true">→</span>}
                </button>
                <button className="auth-text-button auth-back-button" type="button" onClick={returnToLogin}>Voltar para o login</button>
              </form>
            </section>
          ) : mode === "reset" ? (
            <section className="auth-card" aria-labelledby="reset-title">
              <header className="auth-heading">
                <span className="auth-panel-kicker">NOVA SENHA</span>
                <h2 id="reset-title">Defina sua senha</h2>
                <p>Crie uma senha com pelo menos 8 caracteres.</p>
              </header>
              <form onSubmit={changePassword}>
                <label htmlFor="reset-password">Nova senha</label>
                <div className="auth-input-wrap"><span className="auth-input-icon auth-lock-icon" aria-hidden="true" /><input id="reset-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Ocultar" : "Mostrar"}</button></div>
                <label htmlFor="reset-password-confirmation">Confirmar nova senha</label>
                <div className="auth-input-wrap"><span className="auth-input-icon auth-lock-icon" aria-hidden="true" /><input id="reset-password-confirmation" type={showPassword ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></div>
                {error && <div className="auth-error" role="alert">{error}</div>}
                <button className="auth-submit" type="submit" disabled={submitting}><span>{submitting ? "Salvando..." : "Salvar nova senha"}</span>{!submitting && <span aria-hidden="true">→</span>}</button>
                <button className="auth-text-button auth-back-button" type="button" onClick={returnToLogin}>Voltar para o login</button>
              </form>
            </section>
          ) : (
            <section className="auth-card" aria-labelledby="login-title">
              <header className="auth-heading">
                <span className="auth-panel-kicker">
                  {area === "client" ? "PORTAL DO CLIENTE" : "ÁREA RESTRITA"}
                </span>
                <h2 id="login-title">Bem-vindo de volta</h2>
                <p>Entre com suas credenciais para acessar a plataforma.</p>
              </header>

              <form onSubmit={submit}>
                <label htmlFor="auth-email">E-mail</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">@</span>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="nome@empresa.com.br"
                    required
                  />
                </div>

                <label htmlFor="auth-password">Senha</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon auth-lock-icon" aria-hidden="true" />
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    minLength={8}
                    required
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>

                <button className="auth-text-button auth-forgot-button" type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}>
                  Esqueci minha senha
                </button>

                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

                <button className="auth-submit" type="submit" disabled={submitting}>
                  <span>{submitting ? "Entrando..." : "Entrar na plataforma"}</span>
                  {!submitting && <span aria-hidden="true">→</span>}
                </button>
              </form>

              <div className="auth-divider"><span>ou</span></div>
              <Link className="auth-area-link" href={alternateArea}>{alternateLabel}</Link>
              <p className="auth-support">Problemas para acessar? <a href="mailto:suporte@ontargetmarketing.com.br">Fale com o suporte</a></p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
