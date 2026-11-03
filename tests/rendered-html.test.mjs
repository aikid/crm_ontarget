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
    assert.match(html, /<title>SysOn \| Operação e Portal do Cliente<\/title>/i);
    assert.match(html, /class="auth-page(?:\s|\")/);
    assert.match(html, /Validando seu acesso/);
    assert.doesNotMatch(html, /ricardo@brasaldemo|OnTarget@123|passwordHash/i);
  }
});

test("mantém sessão, credenciais e CSRF centralizados no cliente da API", async () => {
  const [layout, page, sidebar, clientSidebar, clientPortal, clientLeadDrawer, provider, login, styles, api, sdr, dashboard, leadSearch, admin, leadImport, loadingOverlay, asteriskSip, ringbackTone] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/client/ClientSidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/client/ClientPortal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/client/LeadDrawer.tsx", import.meta.url), "utf8"),
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
    readFile(new URL("../app/lib/asterisk-sip.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/ringback-tone.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<AuthProvider>\{children\}<\/AuthProvider>/);
  assert.match(layout, /SysOn \| Operação e Portal do Cliente/);
  assert.match(page, /user\.role === "SDR" \? "sdr" : screen/);
  assert.match(sidebar, /item\.id === "sdr"/);
  assert.doesNotMatch(sidebar, /Sistema operacional|Portal do Cliente|queue-card|internal-environment-link/);
  assert.doesNotMatch(sidebar, /Auditoria|Relatórios|Configurações|Em breve/);
  assert.doesNotMatch(clientSidebar, /Campanhas|Leads|Relatórios|Dados atualizados|Ajuda|Visão SysOn/);
  assert.doesNotMatch(clientPortal, /Central de ajuda|ALTERNAR AMBIENTE|Operação SysOn|environmentOpen/);
  assert.match(provider, /onTargetApi\.session\(\)/);
  assert.match(provider, /loggingOut/);
  assert.match(provider, /Encerrando sua sessão/);
  assert.match(provider, /logoutPromiseRef/);
  assert.match(provider, /logout-error-toast/);
  assert.match(provider, /AUTH_SESSION_INVALID_EVENT/);
  assert.match(provider, /visibilitychange/);
  assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /Bem-vindo de volta/);
  assert.match(login, /aria-label=\{showPassword \? "Ocultar senha" : "Mostrar senha"\}/);
  assert.match(login, /auth-aside/);
  assert.match(login, /SYSON/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(styles, /\.auth-submit:disabled/);
  assert.match(api, /credentials:\s*"include"/);
  assert.match(api, /cache:\s*init\?\.cache \?\? "no-store"/);
  assert.match(api, /X-OnTarget-Session-User/);
  assert.match(api, /sessionUserId/);
  assert.match(api, /"X-CSRF-Token"/);
  assert.match(api, /\/api\/auth\/login/);
  assert.match(api, /\/api\/auth\/logout/);
  assert.match(api, /\/api\/sdr\/queue\/claim/);
  assert.match(api, /\/api\/sdr\/queue\/renew/);
  assert.match(api, /\/api\/sdr\/queue\/summary/);
  assert.match(api, /\/api\/sdr\/callbacks\/today/);
  assert.doesNotMatch(api, /\/api\/sdr\/queue\/next/);
  assert.match(sdr, /Retornos de hoje/);
  assert.match(sdr, /Reserva exclusiva por 15 minutos/);
  assert.match(sdr, /queueSummary\.available/);
  assert.match(sdr, /item\.sdr\?\.name/);
  assert.match(sdr, /AsteriskSipClient/);
  assert.match(sdr, /RingbackTone/);
  assert.match(sdr, /ringbackTone\.start\(\)/);
  assert.match(sdr, /ringbackToneRef\.current\?\.stop\(\)/);
  assert.doesNotMatch(sdr, /@twilio|new Device/);
  assert.doesNotMatch(sdr, /ThreeCxAudioBridge|3CX \+ OverTele/);
  assert.doesNotMatch(sdr, /id: "scheduled"|id: "Agendado"/);
  assert.match(api, /\/api\/operations\/dashboard/);
  assert.match(api, /\/api\/operations\/leads/);
  assert.match(dashboard, /DADOS REAIS/);
  assert.doesNotMatch(dashboard, /from "\.\.\/data\/mockData"/);
  assert.match(leadSearch, /Consulta de leads/);
  assert.match(leadSearch, /HISTÓRICO OPERACIONAL/);
  assert.match(leadSearch, /attempt-indicator/);
  assert.match(leadSearch, /Gravações das ligações/);
  assert.match(leadSearch, /Ouvir gravação/);
  assert.match(leadSearch, /Baixar gravação/);
  assert.match(leadSearch, /<audio controls/);
  assert.match(api, /\/api\/telephony\/asterisk\/calls\/\$\{callId\}\/recording/);
  assert.doesNotMatch(clientLeadDrawer, /Gravação da ligação|Ouvir ligação|mock-audio-player/);
  assert.doesNotMatch(api, /x-user-id|x-user-email/i);
  assert.match(admin, /Clientes/);
  assert.match(admin, /Vendedores/);
  assert.match(admin, /Ações/);
  assert.match(admin, /Usuários/);
  assert.match(admin, /table-identity/);
  assert.match(admin, /formEntityLabel\(tab\)/);
  assert.match(admin, /label="Vendedor"/);
  assert.match(admin, /label="Opção vendedor"/);
  assert.match(admin, /Venda direta.*0km.*Usado.*Consórcio/s);
  assert.doesNotMatch(admin, /label="Nome da loja"|label="Nome curto"/);
  assert.match(admin, /stores: "Vendedores"/);
  assert.match(admin, /<th>Vendedor<\/th>/);
  assert.match(admin, /Cliente \/ vendedor/);
  assert.match(admin, /vendedores ·.*ações/);
  assert.match(admin, /label="Nome da ação"/);
  assert.match(admin, /<th>Ação<\/th>/);
  assert.match(admin, /label="E-mail" type="email"/);
  assert.match(admin, /Enviar acesso/);
  assert.match(admin, /sendClientAccess/);
  assert.match(admin, /Senha temporária/);
  assert.match(api, /\/api\/admin\/clients\/\$\{id\}\/access/);
  assert.doesNotMatch(admin, /deleteClient|deleteStore|deleteCampaign/i);
  assert.match(leadImport, /modelo-importacao-leads\.csv/);
  assert.match(leadImport, /\.csv,\.xlsx/);
  assert.match(leadImport, /Google Sheets/);
  assert.match(leadImport, /<span>Vendedor<\/span>/);
  assert.match(leadImport, /<span>Ação<\/span>/);
  assert.match(leadImport, /A ação define o vendedor e o cliente responsáveis/);
  assert.doesNotMatch(leadImport, /<span>Loja<\/span>|<span>Campanha ativa<\/span>|<th>Campanha<\/th>/);
  assert.match(leadImport, /googleSheetsImportConfig/);
  assert.match(leadImport, /importGoogleSheets/);
  assert.match(api, /\/api\/admin\/imports\/google-sheets\/config/);
  assert.match(api, /\/api\/admin\/imports\/google-sheets/);
  assert.match(leadImport, /Linhas rejeitadas|Rejeitadas/);
  assert.match(loadingOverlay, /role="status"/);
  assert.match(loadingOverlay, /aria-busy="true"/);
  assert.match(styles, /\.loading-overlay/);
  assert.match(styles, /\.logout-error-toast/);
  assert.match(styles, /\.logout-button-spinner/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(dashboard, /dashboard-overview-grid/);
  assert.match(dashboard, /sdr-welcome-hero/);
  assert.match(api, /\/api\/telephony\/asterisk\/session/);
  assert.match(api, /Idempotency-Key/);
  assert.match(asteriskSip, /from "sip\.js"/);
  assert.match(asteriskSip, /RegistererState\.Registered/);
  assert.match(asteriskSip, /SessionState\.Established/);
  assert.match(asteriskSip, /getUserMedia/);
  assert.match(asteriskSip, /addEventListener\("track"/);
  assert.match(asteriskSip, /prepareAudioOutput/);
  assert.match(sdr, /Preparando ligação/);
  assert.match(sdr, /asteriskSipSession/);
  assert.match(sdr, /releaseLead\(reservedLeadId\)/);
  assert.match(sdr, /callPhase !== "idle" && <article className="result-card">/);
  assert.match(sdr, /<span>Ação<\/span>/);
  assert.match(sdr, /<span>Vendedor<\/span>/);
  assert.match(sdr, /<span>Veículo de interesse<\/span>/);
  assert.match(sdr, /vehicle: vehicleInterest\.trim\(\) \|\| undefined/);
  assert.doesNotMatch(sdr, /Campanha ativa|Loja de origem|lead\.action \|\| lead\.vehicle/);
  assert.match(sdr, /Preparando ligação…" : "Ligar"/);
  assert.doesNotMatch(sdr, /Ligar com Onvox|Asterisk \+ OverTele/);
  assert.match(sdr, /id: "DIRECTED", label: "Direcionado"/);
  assert.match(sdr, /id: "NOT_QUALIFIED", label: "Sem interesse"/);
  assert.doesNotMatch(sdr, /label: "Recusou"|label: "Contato realizado"|label: "Qualificado"|label: "Não qualificado"/);
  assert.match(ringbackTone, /RING_CYCLE_MS = 5_000/);
  assert.match(ringbackTone, /425/);
  assert.match(ringbackTone, /context\.close/);
});
