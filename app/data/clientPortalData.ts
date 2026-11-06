export type Client = {
  id: string;
  name: string;
};

export type Store = {
  id: string;
  clientId: string;
  name: string;
  shortName: string;
};

export type Campaign = {
  id: string;
  clientId: string;
  name: string;
  status: "active" | "completed";
  startDate: string;
  endDate: string;
  receivedLeads: number;
  workedLeads: number;
};

export type CallAttempt = {
  date: string;
  time: string;
  title: string;
  detail: string;
  result: string;
};

export type Audit = {
  status: string;
  confidence?: "ALTA" | "MÉDIA" | "BAIXA" | number;
  evidence?: string;
  auditedAt?: string;
};

export type Appointment = {
  date: string;
  period: "Manhã" | "Tarde";
  seller?: string;
};

export type Qualification = {
  type: string;
  date: string;
};

export type PortalLead = {
  id: string;
  clientId: string;
  campaignId: string;
  name: string;
  phone: string;
  vehicle: string;
  origin: string;
  storeId: string;
  attempts: number;
  lastContact: string;
  status: "Agendado" | "Qualificado" | "Retorno" | "Não atendeu" | "Sem interesse";
  history: CallAttempt[];
  appointment?: Appointment;
  qualification?: Qualification;
  auditSummary?: string;
  audit: Audit;
  recordingAvailable: boolean;
};

export type CampaignMetrics = {
  received: number;
  worked: number;
  calls: number;
  contacts: number;
  appointments: number;
  qualified: number;
  contactRate: string;
  conversion: string;
  opportunities: number;
};

export const portalSession = {
  user: {
    name: "Ricardo Almeida",
    initials: "RA",
    role: "Gestor de Marketing",
    clientId: "BRASAL",
  },
};

export const clients: Client[] = [
  { id: "BRASAL", name: "Grupo Brasal" },
  { id: "SAGA", name: "Grupo Saga" },
  { id: "REVEMAR", name: "Revemar" },
];

export const campaigns: Campaign[] = [
  {
    id: "FEIRAO-VW-AGO",
    clientId: "BRASAL",
    name: "Feirão Volkswagen Agosto",
    status: "active",
    startDate: "01/08/2026",
    endDate: "15/08/2026",
    receivedLeads: 1500,
    workedLeads: 1214,
  },
  {
    id: "TCROSS-2026",
    clientId: "BRASAL",
    name: "Campanha T-Cross 2026",
    status: "completed",
    startDate: "01/07/2026",
    endDate: "20/07/2026",
    receivedLeads: 980,
    workedLeads: 980,
  },
  {
    id: "SAGA-SEMINOVOS",
    clientId: "SAGA",
    name: "Semana do Seminovo",
    status: "active",
    startDate: "03/08/2026",
    endDate: "17/08/2026",
    receivedLeads: 840,
    workedLeads: 622,
  },
];

export const stores: Store[] = [
  { id: "BRASAL-SIA", clientId: "BRASAL", name: "Brasal Volkswagen SIA", shortName: "Brasal SIA" },
  { id: "BRASAL-ASA-NORTE", clientId: "BRASAL", name: "Brasal Asa Norte", shortName: "Brasal Asa Norte" },
  { id: "BRASAL-TAGUATINGA", clientId: "BRASAL", name: "Brasal Taguatinga", shortName: "Brasal Taguatinga" },
  { id: "SAGA-VW", clientId: "SAGA", name: "Saga Volkswagen", shortName: "Saga Volkswagen" },
];

export const campaignMetricsByStore: Record<string, CampaignMetrics> = {
  all: {
    received: 1500,
    worked: 1214,
    calls: 1842,
    contacts: 531,
    appointments: 142,
    qualified: 83,
    contactRate: "43,7%",
    conversion: "27,8%",
    opportunities: 225,
  },
  "BRASAL-SIA": {
    received: 510,
    worked: 420,
    calls: 638,
    contacts: 181,
    appointments: 51,
    qualified: 31,
    contactRate: "43,1%",
    conversion: "28,2%",
    opportunities: 82,
  },
  "BRASAL-ASA-NORTE": {
    received: 470,
    worked: 380,
    calls: 582,
    contacts: 169,
    appointments: 47,
    qualified: 27,
    contactRate: "44,5%",
    conversion: "27,8%",
    opportunities: 74,
  },
  "BRASAL-TAGUATINGA": {
    received: 520,
    worked: 414,
    calls: 622,
    contacts: 181,
    appointments: 44,
    qualified: 25,
    contactRate: "43,7%",
    conversion: "24,3%",
    opportunities: 69,
  },
};

export const storePerformance = [
  { storeId: "BRASAL-SIA", leads: 420, contacts: 181, appointments: 51, conversion: "28,2%" },
  { storeId: "BRASAL-ASA-NORTE", leads: 380, contacts: 169, appointments: 47, conversion: "27,8%" },
  { storeId: "BRASAL-TAGUATINGA", leads: 414, contacts: 181, appointments: 44, conversion: "24,3%" },
];

export const campaignEvolution = {
  appointments: [8, 12, 11, 17, 14, 21, 18, 24, 17],
  contacts: [41, 48, 52, 57, 61, 65, 69, 72, 66],
  leads: [96, 112, 127, 139, 145, 151, 162, 170, 112],
};

export const campaignCallResults = [
  { label: "Agendado", value: 142, color: "#257e5f" },
  { label: "Qualificado", value: 83, color: "#4158d5" },
  { label: "Não atendeu", value: 502, color: "#a9afbb" },
  { label: "Retorno", value: 126, color: "#dd8b31" },
  { label: "Sem interesse", value: 313, color: "#6f7786" },
  { label: "Número inválido", value: 48, color: "#d96060" },
];

const sharedHistory: CallAttempt[] = [
  { date: "09/08/2026", time: "10:14", title: "Tentativa 1", detail: "Ligação realizada", result: "Não atendeu" },
  { date: "09/08/2026", time: "15:32", title: "Tentativa 2", detail: "Cliente pediu retorno às 18h", result: "Retorno" },
  { date: "09/08/2026", time: "18:04", title: "Tentativa 3", detail: "Cliente atendido", result: "Agendado" },
];

export const portalLeads: PortalLead[] = [
  {
    id: "lead-001",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "João Pereira",
    phone: "(61) 99999-8877",
    vehicle: "T-Cross Comfortline",
    origin: "Meta Ads",
    storeId: "BRASAL-SIA",
    attempts: 3,
    lastContact: "09/08 18:04",
    status: "Agendado",
    history: sharedHistory,
    appointment: { date: "11/08/2026", period: "Tarde", seller: "Carlos Mendes" },
    audit: {
      status: "Confirmado",
      confidence: 96,
      evidence: "Cliente confirmou interesse no veículo e concordou com visita à Brasal SIA no período da tarde.",
      auditedAt: "09/08/2026 18:09",
    },
    recordingAvailable: true,
  },
  {
    id: "lead-002",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Fernanda Costa",
    phone: "(61) 98888-5512",
    vehicle: "Nivus Highline",
    origin: "Lead Site Volkswagen",
    storeId: "BRASAL-ASA-NORTE",
    attempts: 2,
    lastContact: "09/08 16:20",
    status: "Agendado",
    history: [
      { date: "09/08/2026", time: "11:22", title: "Tentativa 1", detail: "Cliente indisponível", result: "Retorno" },
      { date: "09/08/2026", time: "16:20", title: "Tentativa 2", detail: "Visita combinada para o período da manhã", result: "Agendado" },
    ],
    appointment: { date: "11/08/2026", period: "Manhã", seller: "Ricardo Santos" },
    audit: { status: "Confirmado", confidence: 94, evidence: "Data, loja e período foram confirmados durante a ligação.", auditedAt: "09/08/2026 16:26" },
    recordingAvailable: true,
  },
  {
    id: "lead-003",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Marcos Oliveira",
    phone: "(61) 96666-4821",
    vehicle: "Polo Highline",
    origin: "Google Search",
    storeId: "BRASAL-TAGUATINGA",
    attempts: 1,
    lastContact: "09/08 15:48",
    status: "Agendado",
    history: [{ date: "09/08/2026", time: "15:48", title: "Tentativa 1", detail: "Cliente confirmou interesse", result: "Agendado" }],
    appointment: { date: "12/08/2026", period: "Tarde" },
    audit: { status: "Revisão", confidence: 78, evidence: "A loja foi confirmada; o vendedor ainda não foi definido.", auditedAt: "09/08/2026 15:55" },
    recordingAvailable: true,
  },
  {
    id: "lead-004",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Juliana Alves",
    phone: "(61) 95555-7744",
    vehicle: "Taos Comfortline",
    origin: "Meta Ads",
    storeId: "BRASAL-SIA",
    attempts: 2,
    lastContact: "09/08 17:06",
    status: "Agendado",
    history: [
      { date: "09/08/2026", time: "14:18", title: "Tentativa 1", detail: "Sem resposta", result: "Não atendeu" },
      { date: "09/08/2026", time: "17:06", title: "Tentativa 2", detail: "Visita confirmada", result: "Agendado" },
    ],
    appointment: { date: "12/08/2026", period: "Manhã", seller: "Carlos Mendes" },
    audit: { status: "Confirmado", confidence: 97, evidence: "Cliente concordou com data, período e loja para a visita.", auditedAt: "09/08/2026 17:11" },
    recordingAvailable: false,
  },
  {
    id: "lead-005",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Pedro Martins",
    phone: "(61) 94444-3322",
    vehicle: "T-Cross Comfortline",
    origin: "Meta Ads",
    storeId: "BRASAL-SIA",
    attempts: 1,
    lastContact: "09/08 14:37",
    status: "Qualificado",
    history: [{ date: "09/08/2026", time: "14:37", title: "Tentativa 1", detail: "Cliente pediu condições comerciais", result: "Qualificado" }],
    qualification: { type: "Solicitou proposta", date: "09/08/2026 14:37" },
    audit: { status: "Confirmado", confidence: 95, evidence: "Solicitação explícita de proposta registrada na chamada.", auditedAt: "09/08/2026 14:43" },
    recordingAvailable: true,
  },
  {
    id: "lead-006",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Amanda Rocha",
    phone: "(61) 93333-2288",
    vehicle: "Nivus Highline",
    origin: "Landing Page",
    storeId: "BRASAL-ASA-NORTE",
    attempts: 2,
    lastContact: "09/08 15:12",
    status: "Qualificado",
    history: [
      { date: "09/08/2026", time: "12:03", title: "Tentativa 1", detail: "Não atendeu", result: "Não atendeu" },
      { date: "09/08/2026", time: "15:12", title: "Tentativa 2", detail: "Interesse no veículo confirmado", result: "Qualificado" },
    ],
    qualification: { type: "Interesse confirmado", date: "09/08/2026 15:12" },
    audit: { status: "Confirmado", confidence: 93, evidence: "Interesse e veículo foram confirmados pelo cliente.", auditedAt: "09/08/2026 15:18" },
    recordingAvailable: true,
  },
  {
    id: "lead-007",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "André Souza",
    phone: "(61) 97777-1212",
    vehicle: "Taos Comfortline",
    origin: "Lead Site Volkswagen",
    storeId: "BRASAL-SIA",
    attempts: 3,
    lastContact: "09/08 14:31",
    status: "Não atendeu",
    history: [
      { date: "08/08/2026", time: "11:04", title: "Tentativa 1", detail: "Sem resposta", result: "Não atendeu" },
      { date: "08/08/2026", time: "16:44", title: "Tentativa 2", detail: "Sem resposta", result: "Não atendeu" },
      { date: "09/08/2026", time: "14:31", title: "Tentativa 3", detail: "Sem resposta", result: "Não atendeu" },
    ],
    audit: { status: "Não auditado" },
    recordingAvailable: false,
  },
  {
    id: "lead-008",
    clientId: "BRASAL",
    campaignId: "FEIRAO-VW-AGO",
    name: "Carolina Nunes",
    phone: "(61) 92222-9090",
    vehicle: "Virtus Highline",
    origin: "Meta Ads",
    storeId: "BRASAL-TAGUATINGA",
    attempts: 2,
    lastContact: "09/08 13:54",
    status: "Retorno",
    history: [
      { date: "09/08/2026", time: "10:02", title: "Tentativa 1", detail: "Não atendeu", result: "Não atendeu" },
      { date: "09/08/2026", time: "13:54", title: "Tentativa 2", detail: "Cliente pediu retorno às 19h", result: "Retorno" },
    ],
    audit: { status: "Não auditado" },
    recordingAvailable: false,
  },
];

export const clientStores = stores.filter((store) => store.clientId === portalSession.user.clientId);
export const clientCampaigns = campaigns.filter((campaign) => campaign.clientId === portalSession.user.clientId);
export const clientLeads = portalLeads.filter((lead) => lead.clientId === portalSession.user.clientId);

export function getStore(storeId: string) {
  return clientStores.find((store) => store.id === storeId);
}
