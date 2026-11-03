"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AUTH_SESSION_INVALID_EVENT, onTargetApi, type SessionUser } from "../../lib/ontarget-api";
import LoadingOverlay from "../ui/LoadingOverlay";
import ProfileModal from "./ProfileModal";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  loggingOut: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  openProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    onTargetApi.session()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const invalidateSession = () => {
      setUser(null);
      setLogoutError("");
    };
    window.addEventListener(AUTH_SESSION_INVALID_EVENT, invalidateSession);
    return () => window.removeEventListener(AUTH_SESSION_INVALID_EVENT, invalidateSession);
  }, []);

  useEffect(() => {
    if (!user) return;
    const verifyIdentity = () => {
      if (document.visibilityState !== "visible") return;
      void onTargetApi.session().then((session) => setUser(session.user)).catch(() => undefined);
    };
    window.addEventListener("focus", verifyIdentity);
    document.addEventListener("visibilitychange", verifyIdentity);
    return () => {
      window.removeEventListener("focus", verifyIdentity);
      document.removeEventListener("visibilitychange", verifyIdentity);
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setLogoutError("");
    const session = await onTargetApi.login(email, password);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    if (logoutPromiseRef.current) return logoutPromiseRef.current;

    const request = (async () => {
      setLogoutError("");
      setLoggingOut(true);
      try {
        await onTargetApi.logout();
        setUser(null);
      } catch {
        setLogoutError("Não foi possível encerrar sua sessão. Verifique sua conexão e tente novamente.");
      } finally {
        setLoggingOut(false);
        logoutPromiseRef.current = null;
      }
    })();

    logoutPromiseRef.current = request;
    return request;
  }, []);

  const updateProfile = useCallback(async (payload: { name?: string; newPassword?: string }) => {
    const result = await onTargetApi.updateProfile(payload);
    setUser(result.user);
  }, []);

  const openProfile = useCallback(() => setProfileOpen(true), []);

  const value = useMemo(
    () => ({ user, loading, loggingOut, login, logout, openProfile }),
    [user, loading, loggingOut, login, logout, openProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {profileOpen && user && <ProfileModal user={user} onClose={() => setProfileOpen(false)} onUpdate={updateProfile} />}
      <LoadingOverlay
        show={loggingOut}
        title="Encerrando sua sessão"
        message="Aguarde enquanto protegemos seus dados e finalizamos o acesso."
      />
      {logoutError && (
        <div className="logout-error-toast" role="alert" aria-live="assertive">
          <span aria-hidden="true">!</span>
          <div>
            <strong>Não foi possível sair</strong>
            <p>{logoutError}</p>
          </div>
          <button type="button" onClick={() => setLogoutError("")} aria-label="Fechar aviso">×</button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return context;
}
