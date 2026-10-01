const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

type QueryValue = string | number | boolean | null | undefined;

export type SessionUser = {
  id: string;
  clientId: string | null;
  name: string;
  email: string;
  initials: string;
  role: "GESTOR" | "SDR" | "CLIENT";
  active: boolean;
  client: null | { id: string; name: string };
};

export type SessionResponse = { user: SessionUser; csrfToken: string };

let csrfToken: string | null = null;

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
  fileType: "CSV" | "XLSX";
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

export type ApiLead = {
  id: string;
  clientId: string;
  campaignId: string;
  name: string;
  initials: string;
  phone: string;
  phoneE164: string;
  vehicle: string;
  origin: string;
  reason: string | null;
  storeId: string;
  attempts: number;
  lastContact: string;
  status: string;
  statusCode: string;
  history: Array<{ id: string; date: string; time: string; title: string; detail: string; result: string; durationSec: number | null }>;
  appointment: null | { date: string; period: string; seller: string | null; notes: string | null };
  qualification: null | { type: string; date: string; notes: string | null };
  audit: { status: string; confidence?: number | null; evidence?: string | null; auditedAt?: string | null };
  recordingAvailable: boolean;
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
    credentials: "include",
    headers: {
      ...(!formData ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method) ? { "X-CSRF-Token": csrfToken } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Erro ${response.status} ao consultar a API.`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json() as T & { csrfToken?: string };
  if (body && typeof body === "object" && body.csrfToken) csrfToken = body.csrfToken;
  return body;
}

export const onTargetApi = {
  login: (email: string, password: string) => request<SessionResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }),
  logout: async () => {
    await request<void>("/api/auth/logout", { method: "POST" });
    csrfToken = null;
  },
  session: () => request<SessionResponse>("/api/auth/session"),
  campaigns: (clientId: string) => request<{ data: ApiCampaign[] }>(`/api/clients/${clientId}/campaigns`),
  stores: (clientId: string) => request<{ data: Array<{ id: string; clientId: string; name: string; shortName: string }> }>(`/api/clients/${clientId}/stores`),
  campaignDashboard: <T = unknown>(campaignId: string, storeId = "all") => request<T>(`/api/campaigns/${campaignId}/dashboard${queryString({ storeId })}`),
  campaignLeads: (campaignId: string, filters?: Record<string, QueryValue>) => request<{ data: ApiLead[]; pagination: { page: number; pageSize: number; total: number; pages: number } }>(`/api/campaigns/${campaignId}/leads${queryString(filters)}`),
  lead: (leadId: string) => request<ApiLead>(`/api/leads/${leadId}`),
  nextLead: (campaignId: string) => request<ApiLead>(`/api/sdr/queue/next${queryString({ campaignId })}`),
  sdrSummary: (sdrId: string) => request<{ worked: number; contacts: number; scheduled: number; callbacks: number }>(`/api/sdr/${sdrId}/summary`),
  saveOutcome: (leadId: string, payload: Record<string, unknown>) => request<ApiLead>(`/api/leads/${leadId}/outcomes`, { method: "POST", body: JSON.stringify(payload) }),
  voiceToken: (identity: string) => request<{ token: string; identity: string; expiresIn: number }>("/api/telephony/token", { method: "POST", body: JSON.stringify({ identity }) }),
  createCall: (payload: { leadId: string; sdrId: string; to: string }) => request<{ id: string; to: string }>("/api/telephony/calls", { method: "POST", body: JSON.stringify(payload) }),
  exportUrl: (campaignId: string, filters?: Record<string, QueryValue>) => `${API_URL}/api/campaigns/${campaignId}/leads.csv${queryString(filters)}`,
  admin: {
    clients: () => request<{ data: AdminClient[] }>("/api/admin/clients"),
    createClient: (payload: { name: string }) => request<AdminClient>("/api/admin/clients", { method: "POST", body: JSON.stringify(payload) }),
    updateClient: (id: string, payload: { name?: string; active?: boolean }) => request<AdminClient>(`/api/admin/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    stores: () => request<{ data: AdminStore[] }>("/api/admin/stores"),
    createStore: (payload: { clientId: string; name: string; shortName: string }) => request<AdminStore>("/api/admin/stores", { method: "POST", body: JSON.stringify(payload) }),
    updateStore: (id: string, payload: { name?: string; shortName?: string; active?: boolean }) => request<AdminStore>(`/api/admin/stores/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    campaigns: () => request<{ data: AdminCampaign[] }>("/api/admin/campaigns"),
    createCampaign: (payload: Record<string, unknown>) => request<AdminCampaign>("/api/admin/campaigns", { method: "POST", body: JSON.stringify(payload) }),
    updateCampaign: (id: string, payload: Record<string, unknown>) => request<AdminCampaign>(`/api/admin/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    users: () => request<{ data: AdminUser[] }>("/api/admin/users"),
    createUser: (payload: Record<string, unknown>) => request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
    updateUser: (id: string, payload: Record<string, unknown>) => request<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    imports: () => request<{ data: ImportBatch[] }>("/api/admin/imports"),
    importBatch: (id: string) => request<ImportBatch>(`/api/admin/imports/${id}`),
    importLeads: (payload: FormData) => request<ImportBatch>("/api/admin/imports", { method: "POST", body: payload }),
  },
};
