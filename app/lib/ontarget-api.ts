const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://crm-ontarget-back.onrender.com").replace(/\/$/, "");
export const AUTH_SESSION_INVALID_EVENT = "ontarget:session-invalid";

type QueryValue = string | number | boolean | null | undefined;

export type SessionUser = {
  id: string;
  clientId: string | null;
  name: string;
  email: string;
  initials: string;
  role: "ADMIN" | "GESTOR" | "SDR" | "CLIENT";
  active: boolean;
  client: null | { id: string; name: string };
};

export type SessionResponse = { user: SessionUser; csrfToken: string };

let csrfToken: string | null = null;
let sessionUserId: string | null = null;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiCampaign = {
  id: string;
  clientId: string;
  storeId: string;
  name: string;
  status: "active" | "inactive" | "completed";
  startDate: string;
  endDate: string;
  receivedLeads: number;
  workedLeads: number;
};

export type AdminClient = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { stores: number; campaigns: number; users: number; leads: number };
};

export type AdminStore = {
  id: string;
  clientId: string;
  name: string;
  shortName: string;
  active: boolean;
  client: { id: string; name: string; active: boolean };
  _count: { campaigns: number; leads: number };
};

export type AdminCampaign = {
  id: string;
  clientId: string;
  storeId: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
  startDate: string;
  endDate: string;
  client: { id: string; name: string; active: boolean };
  store: { id: string; name: string; shortName: string; active: boolean };
  _count: { leads: number };
};

export type AdminUser = SessionUser & { lastLoginAt: string | null };
export type AdminUserSaveResponse = AdminUser & {
  telephony?: {
    enabled: boolean;
    status: "ASSIGNED" | "PENDING" | "DISABLED";
    extension?: string;
    message?: string;
  };
};

export type SystemSdr = { id: string; name: string; email: string };
export type SystemSipAccount = {
  id: string;
  userId: string | null;
  email: string | null;
  extension: string;
  isAssigned: boolean;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: null | { id: string; name: string; email: string; active: boolean };
};
export type SystemSipAccountsResponse = {
  data: SystemSipAccount[];
  sdrs: SystemSdr[];
  configuration: {
    databaseAccountsEnabled: boolean;
    encryptionConfigured: boolean;
    total: number;
    assigned: number;
    available: number;
  };
};

export type ImportErrorRow = {
  id: string;
  rowNumber: number;
  code: string;
  message: string;
  rawData: null | Record<string, string>;
};

export type ImportBatch = {
  id: string;
  fileName: string;
  fileType: "CSV" | "XLSX" | "GOOGLE_SHEETS";
  status: "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  createdAt: string;
  client: { id: string; name: string };
  store: { id: string; name: string; shortName: string };
  campaign: { id: string; name: string };
  uploadedBy: { id: string; name: string };
  errors?: ImportErrorRow[];
};

export type GoogleSheetsImportConfig = {
  configured: boolean;
  serviceAccountEmail: string | null;
  error?: string;
};

export type ApiLead = {
  id: string;
  clientId: string;
  campaignId: string;
  name: string;
  initials: string;
  phone: string;
  phoneE164: string;
  action: string | null;
  actionDate: string | null;
  vehicle: string | null;
  origin: string;
  reason: string | null;
  auditSummary: string | null;
  auditNotes: string | null;
  sellerOption: "Venda direta" | "0km" | "Usado" | "Consórcio" | null;
  storeId: string;
  store: { id: string; name: string; shortName: string };
  campaign: { id: string; name: string };
  attempts: number;
  lastContact: string;
  status: string;
  statusCode: string;
  history: Array<{
    id: string;
    date: string;
    time: string;
    title: string;
    detail: string;
    result: string;
    durationSec: number | null;
    sdr: null | { id: string; name: string; initials: string };
  }>;
  callback: null | { scheduledAt: string; notes: string | null };
  appointment: null | { date: string; period: string; seller: string | null; notes: string | null };
  qualification: null | { type: string; date: string; notes: string | null };
  audit: { status: string; confidence?: "ALTA" | "MÉDIA" | "BAIXA" | string | null; evidence?: string | null; auditedAt?: string | null };
  recordingAvailable: boolean;
  recordings: Array<{
    callId: string;
    status: string;
    recordedAt: string;
    durationSec: number | null;
    expiresAt: string;
  }>;
  reservation: null | {
    sdr: { id: string; name: string; initials: string };
    reservedAt: string;
    reservedUntil: string;
  };
};

export type SdrCampaign = ApiCampaign & {
  client: { id: string; name: string };
  store: { id: string; name: string; shortName: string };
};

export type SdrCallback = {
  id: string;
  scheduledAt: string;
  notes: string | null;
  due: boolean;
  lead: ApiLead;
};

export type SdrQueueSummary = {
  total: number;
  remaining: number;
  available: number;
  reserved: number;
};

export type AsteriskSipSession = {
  webSocketUrl: string;
  sipDomain: string;
  extension: string;
  password: string;
  targetExtension: string;
  shared: boolean;
};

export type AsteriskCall = {
  id: string;
  leadId: string;
  status: "ready" | "dialing" | "ringing" | "connected" | "reconciling" | "ended" | "failed" | "canceled" | "busy" | "no_answer" | "rejected";
  technicalStatus: string;
  destinationMasked: string;
  sipExtension: string;
  requestedAt: string;
  dialingAt: string | null;
  ringingAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  disconnectReason: string | null;
  q850Cause: number | null;
  reused?: boolean;
  nextStep?: string;
};

export type OperationDashboard = {
  period: { from: string; to: string };
  kpis: {
    worked: number;
    attempts: number;
    contacts: number;
    qualified: number;
    callbacks: number;
    contactRate: number;
    conversion: number;
  };
  live: { pending: number; activeSdrs: number; reserved: number; callbacks: number };
  activity: Array<{ label: string; value: number }>;
  outcomes: Array<{ code: string; label: string; color: string; value: number }>;
  ranking: Array<{
    id: string;
    name: string;
    initials: string;
    attempts: number;
    contacts: number;
    qualified: number;
    conversion: number;
  }>;
};

function queryString(query?: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const formData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: init?.cache ?? "no-store",
    credentials: "include",
    headers: {
      ...(!formData ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method) ? { "X-CSRF-Token": csrfToken } : {}),
      ...(sessionUserId ? { "X-OnTarget-Session-User": sessionUserId } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    const error = new ApiError(body?.error?.message || `Erro ${response.status} ao consultar a API.`, response.status);
    if (response.status === 401 && path !== "/api/auth/login") {
      csrfToken = null;
      sessionUserId = null;
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_SESSION_INVALID_EVENT));
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json() as T & { csrfToken?: string };
  if (body && typeof body === "object" && body.csrfToken) csrfToken = body.csrfToken;
  if (body && typeof body === "object" && "user" in body) {
    const sessionUser = (body as { user?: { id?: string } }).user;
    if (sessionUser?.id) sessionUserId = sessionUser.id;
  }
  return body;
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: sessionUserId ? { "X-OnTarget-Session-User": sessionUserId } : undefined,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (response.status === 401) {
      csrfToken = null;
      sessionUserId = null;
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_SESSION_INVALID_EVENT));
    }
    throw new ApiError(body?.error?.message || `Erro ${response.status} ao obter a gravação.`, response.status);
  }
  return response.blob();
}

export const onTargetApi = {
  login: (email: string, password: string) => request<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }),
  forgotPassword: (email: string) => request<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  }),
  resetPassword: (token: string, password: string) => request<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  }),
  logout: async () => {
    try {
      await request<void>("/api/auth/logout", { method: "POST" });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    } finally {
      csrfToken = null;
      sessionUserId = null;
    }
  },
  session: () => request<SessionResponse>("/api/auth/session"),
  updateProfile: (payload: { name?: string; newPassword?: string }) => request<{ user: SessionUser }>("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  campaigns: (clientId: string) => request<{ data: ApiCampaign[] }>(`/api/clients/${clientId}/campaigns`),
  stores: (clientId: string) => request<{ data: Array<{ id: string; clientId: string; name: string; shortName: string }> }>(`/api/clients/${clientId}/stores`),
  campaignDashboard: <T = unknown>(campaignId: string, storeId = "all") => request<T>(`/api/campaigns/${campaignId}/dashboard${queryString({ storeId })}`),
  campaignLeads: (campaignId: string, filters?: Record<string, QueryValue>) => request<{ data: ApiLead[]; pagination: { page: number; pageSize: number; total: number; pages: number } }>(`/api/campaigns/${campaignId}/leads${queryString(filters)}`),
  operationDashboard: (filters?: Record<string, QueryValue>) => request<OperationDashboard>(`/api/operations/dashboard${queryString(filters)}`),
  operationLeads: (filters?: Record<string, QueryValue>) => request<{ data: ApiLead[]; pagination: { page: number; pageSize: number; total: number; pages: number } }>(`/api/operations/leads${queryString(filters)}`),
  updateLeadAuditFields: (leadId: string, payload: { auditNotes?: string | null; sellerOption?: ApiLead["sellerOption"] }) => request<ApiLead>(`/api/operations/leads/${leadId}/audit-fields`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }),
  callRecording: (callId: string) => requestBlob(`/api/telephony/asterisk/calls/${callId}/recording`),
  lead: (leadId: string) => request<ApiLead>(`/api/leads/${leadId}`),
  sdrCampaigns: () => request<{ data: SdrCampaign[] }>("/api/sdr/campaigns"),
  claimNextLead: (campaignId: string) => request<ApiLead>("/api/sdr/queue/claim", { method: "POST", body: JSON.stringify({ campaignId }) }),
  switchCampaignLead: (campaignId: string) => request<{ lead: ApiLead | null }>("/api/sdr/queue/switch", { method: "POST", body: JSON.stringify({ campaignId }) }),
  renewLead: (leadId: string) => request<ApiLead>("/api/sdr/queue/renew", { method: "POST", body: JSON.stringify({ leadId }) }),
  releaseLead: (leadId: string) => request<void>("/api/sdr/queue/release", { method: "POST", body: JSON.stringify({ leadId }) }),
  queueSummary: (campaignId: string) => request<SdrQueueSummary>(`/api/sdr/queue/summary${queryString({ campaignId })}`),
  callbacksToday: (campaignId?: string) => request<{ data: SdrCallback[] }>(`/api/sdr/callbacks/today${queryString({ campaignId })}`),
  claimCallback: (leadId: string) => request<ApiLead>(`/api/sdr/callbacks/${leadId}/claim`, { method: "POST" }),
  sdrSummary: (sdrId: string) => request<{ worked: number; contacts: number; qualified: number; callbacks: number }>(`/api/sdr/${sdrId}/summary`),
  saveOutcome: (leadId: string, payload: Record<string, unknown>) => request<ApiLead>(`/api/leads/${leadId}/outcomes`, { method: "POST", body: JSON.stringify(payload) }),
  asteriskSipSession: () => request<AsteriskSipSession>("/api/telephony/asterisk/session"),
  createAsteriskCall: (payload: { leadId: string }, idempotencyKey: string) => request<AsteriskCall>("/api/telephony/asterisk/calls", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  }),
  asteriskCall: (callId: string) => request<AsteriskCall>(`/api/telephony/asterisk/calls/${callId}`),
  endAsteriskCall: (callId: string) => request<AsteriskCall>(`/api/telephony/asterisk/calls/${callId}/hangup`, { method: "POST" }),
  createCall: (payload: { leadId: string }) => request<{ id: string; to: string; status: "dialing" | "connected"; pbxCallId: string }>("/api/telephony/calls", { method: "POST", body: JSON.stringify(payload) }),
  callStatus: (callId: string) => request<{ status: "dialing" | "connected" | "ended"; participantId: number | null; durationSec?: number }>(`/api/telephony/calls/${callId}/status`),
  endCall: (callId: string) => request<void>(`/api/telephony/calls/${callId}/hangup`, { method: "POST" }),
  exportUrl: (campaignId: string, filters?: Record<string, QueryValue>) => `${API_URL}/api/campaigns/${campaignId}/leads.csv${queryString(filters)}`,
  admin: {
    clients: () => request<{ data: AdminClient[] }>("/api/admin/clients"),
    createClient: (payload: { name: string; email: string }) => request<AdminClient>("/api/admin/clients", { method: "POST", body: JSON.stringify(payload) }),
    updateClient: (id: string, payload: { name?: string; email?: string; active?: boolean }) => request<AdminClient>(`/api/admin/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deleteClient: (id: string) => request<void>(`/api/admin/clients/${id}`, { method: "DELETE" }),
    sendClientAccess: (id: string) => request<{ email: string; emailSent: true; expiresInMinutes: number; userId: string }>(`/api/admin/clients/${id}/access`, { method: "POST" }),
    stores: () => request<{ data: AdminStore[] }>("/api/admin/stores"),
    createStore: (payload: { clientId: string; name: string; shortName: string }) => request<AdminStore>("/api/admin/stores", { method: "POST", body: JSON.stringify(payload) }),
    updateStore: (id: string, payload: { name?: string; shortName?: string; active?: boolean }) => request<AdminStore>(`/api/admin/stores/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deleteStore: (id: string) => request<void>(`/api/admin/stores/${id}`, { method: "DELETE" }),
    campaigns: () => request<{ data: AdminCampaign[] }>("/api/admin/campaigns"),
    createCampaign: (payload: Record<string, unknown>) => request<AdminCampaign>("/api/admin/campaigns", { method: "POST", body: JSON.stringify(payload) }),
    updateCampaign: (id: string, payload: Record<string, unknown>) => request<AdminCampaign>(`/api/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deleteCampaign: (id: string) => request<void>(`/api/admin/campaigns/${id}`, { method: "DELETE" }),
    users: () => request<{ data: AdminUser[] }>("/api/admin/users"),
    createUser: (payload: Record<string, unknown>) => request<AdminUserSaveResponse>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
    updateUser: (id: string, payload: Record<string, unknown>) => request<AdminUserSaveResponse>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    imports: () => request<{ data: ImportBatch[] }>("/api/admin/imports"),
    importBatch: (id: string) => request<ImportBatch>(`/api/admin/imports/${id}`),
    importLeads: (payload: FormData) => request<ImportBatch>("/api/admin/imports", { method: "POST", body: payload }),
    googleSheetsImportConfig: () => request<GoogleSheetsImportConfig>("/api/admin/imports/google-sheets/config"),
    importGoogleSheets: (payload: { clientId: string; campaignId: string; spreadsheetUrl: string; sheetName?: string }) => request<ImportBatch>("/api/admin/imports/google-sheets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  },
  system: {
    sipAccounts: () => request<SystemSipAccountsResponse>("/api/system/sip-accounts"),
    createSipAccount: (payload: { extension: string; password: string; email?: string | null }) => request<SystemSipAccount>("/api/system/sip-accounts", { method: "POST", body: JSON.stringify(payload) }),
    updateSipAccount: (id: string, payload: { extension?: string; password?: string; email?: string | null }) => request<SystemSipAccount>(`/api/system/sip-accounts/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    deleteSipAccount: (id: string) => request<void>(`/api/system/sip-accounts/${id}`, { method: "DELETE" }),
  },
};
