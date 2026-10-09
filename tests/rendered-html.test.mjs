import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza a aplicação protegida sem expor conteúdo antes da sessão", async () => {
  for (const path of ["/", "/cliente"]) {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

    const html = await response.text();
    assert.match(html, /<title>OnTarget \| Operação e Portal do Cliente<\/title>/i);
    assert.match(html, /class="auth-page(?:\s|\")/);
    assert.match(html, /Validando seu acesso/);
    assert.doesNotMatch(html, /ricardo@brasaldemo|OnTarget@123|passwordHash/i);
  }
});

test("mantém sessão, credenciais e CSRF centralizados no cliente da API", async () => {
  const [layout, provider, login, styles, api, sdr, dashboard, leadSearch, admin, leadImport, loadingOverlay, threeCxAudio] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/auth/AuthProvider.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/auth/LoginScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/ontarget-api.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SdrScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/DashboardScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/LeadSearchScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AdminScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/LeadImportScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ui/LoadingOverlay.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/three-cx-audio.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<AuthProvider>\{children\}<\/AuthProvider>/);
  assert.match(provider, /onTargetApi\.session\(\)/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /Bem-vindo de volta/);
  assert.match(login, /aria-label=\{showPassword \? "Ocultar senha" : "Mostrar senha"\}/);
  assert.match(login, /auth-aside/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /\.auth-submit:disabled/);
  assert.match(api, /credentials:\s*"include"/);
  assert.match(api, /"X-CSRF-Token"/);
  assert.match(api, /\/api\/auth\/login/);
  assert.match(api, /\/api\/auth\/logout/);
  assert.match(api, /\/api\/sdr\/queue\/claim/);
  assert.match(api, /\/api\/sdr\/queue\/renew/);
  assert.match(api, /\/api\/sdr\/callbacks\/today/);
  assert.doesNotMatch(api, /\/api\/sdr\/queue\/next/);
  assert.match(sdr, /Retornos de hoje/);
  assert.match(sdr, /Reserva exclusiva por 15 minutos/);
  assert.match(sdr, /ThreeCxAudioBridge/);
  assert.doesNotMatch(sdr, /@twilio|new Device/);
  assert.doesNotMatch(sdr, /id: "scheduled"|id: "Agendado"/);
  assert.match(api, /\/api\/operations\/dashboard/);
  assert.match(api, /\/api\/operations\/leads/);
  assert.match(dashboard, /DADOS REAIS/);
  assert.doesNotMatch(dashboard, /from "\.\.\/data\/mockData"/);
  assert.match(leadSearch, /Consulta de leads/);
  assert.match(leadSearch, /HISTÓRICO OPERACIONAL/);
  assert.match(leadSearch, /attempt-indicator/);
  assert.doesNotMatch(api, /x-user-id|x-user-email/i);
  assert.match(admin, /Clientes/);
  assert.match(admin, /Lojas/);
  assert.match(admin, /Campanhas/);
  assert.match(admin, /Usuários/);
  assert.match(admin, /table-identity/);
  assert.doesNotMatch(admin, /deleteClient|deleteStore|deleteCampaign/i);
  assert.match(leadImport, /modelo-importacao-leads\.csv/);
  assert.match(leadImport, /\.csv,\.xlsx/);
  assert.match(leadImport, /Linhas rejeitadas|Rejeitadas/);
  assert.match(loadingOverlay, /role="status"/);
  assert.match(loadingOverlay, /aria-busy="true"/);
  assert.match(styles, /\.loading-overlay/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(dashboard, /dashboard-overview-grid/);
  assert.match(dashboard, /sdr-welcome-hero/);
  assert.match(threeCxAudio, /AudioWorkletNode/);
  assert.match(threeCxAudio, /8000/);
  assert.match(threeCxAudio, /WebSocket/);
});
