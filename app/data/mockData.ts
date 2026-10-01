export type LeadHistoryItem = {
  time: string;
  title: string;
  result: string;
  tone?: "neutral" | "warning" | "success";
};

export type Lead = {
  id: number;
  backendId: string;
  initials: string;
  name: string;
  phone: string;
  phoneE164: string;
  store: string;
  campaign: string;
  source: string;
  vehicle: string;
  reason: string;
  createdAt: string;
  attempt: number;
  callback?: string;
  history: LeadHistoryItem[];
};

export const leads: Lead[] = [
  {
    id: 1,
    backendId: "lead-001",
    initials: "JP",
    name: "João Pereira",
    phone: "(11) 99245-1801",
    phoneE164: "+5511992451801",
    store: "Brasal Volkswagen SIA",
    campaign: "Feirão Volkswagen Agosto",
    source: "Lead Site Volkswagen",
    vehicle: "T-Cross Comfortline",
    reason: "Campanha Feirão Agosto",
    createdAt: "09/08/2026 10:24",
    attempt: 1,
    history: [
      {
        time: "09/08 — 11:42",
        title: "Tentativa 1",
        result: "Não atendeu",
      },
    ],
  },
  {
    id: 2,
    backendId: "lead-002",
    initials: "FC",
    name: "Fernanda Costa",
    phone: "(61) 98888-5512",
    phoneE164: "+5561988885512",
    store: "Brasal Asa Norte",
    campaign: "Feirão Volkswagen Agosto",
    source: "Meta Ads",
    vehicle: "Nivus Highline",
    reason: "Solicitação de proposta",
    createdAt: "09/08/2026 09:17",
    attempt: 2,
    callback: "18:00",
    history: [
      {
        time: "09/08 — 11:42",
        title: "Tentativa 1",
        result: "Não atendeu",
      },
      {
        time: "09/08 — 15:15",
        title: "Tentativa 2",
        result: "Solicitou retorno",
        tone: "warning",
      },
      {
        time: "09/08 — 18:00",
        title: "Retorno programado",
        result: "Prioridade na fila",
        tone: "warning",
      },
    ],
  },
  {
    id: 3,
    backendId: "lead-009",
    initials: "RM",
    name: "Rafael Martins",
    phone: "(61) 97777-3049",
    phoneE164: "+5561977773049",
    store: "Saga Volkswagen",
    campaign: "Campanha T-Cross 2026",
    source: "Google Search",
    vehicle: "T-Cross Highline",
    reason: "Avaliação do seminovo",
    createdAt: "09/08/2026 11:06",
    attempt: 1,
    history: [],
  },
];

export const ranking = [
  { name: "Ana Souza", initials: "AS", calls: 67, contacts: 31, appointments: 11, conversion: "35,5%" },
  { name: "Lucas Silva", initials: "LS", calls: 61, contacts: 27, appointments: 8, conversion: "29,6%" },
  { name: "Mariana Alves", initials: "MA", calls: 58, contacts: 25, appointments: 7, conversion: "28,0%" },
  { name: "Pedro Lima", initials: "PL", calls: 54, contacts: 19, appointments: 5, conversion: "26,3%" },
];

export const hourlyCalls = [
  { hour: "08h", value: 18 },
  { hour: "09h", value: 43 },
  { hour: "10h", value: 61 },
  { hour: "11h", value: 54 },
  { hour: "12h", value: 31 },
  { hour: "13h", value: 37 },
  { hour: "14h", value: 69 },
  { hour: "15h", value: 82 },
  { hour: "16h", value: 73 },
  { hour: "17h", value: 91 },
  { hour: "18h", value: 54 },
];

export const callResults = [
  { label: "Agendado", value: 74, color: "#257e5f" },
  { label: "Qualificado", value: 39, color: "#4158d5" },
  { label: "Não atendeu", value: 96, color: "#a9afbb" },
  { label: "Retorno", value: 23, color: "#dd8b31" },
  { label: "Sem interesse", value: 31, color: "#6f7786" },
  { label: "Número inválido", value: 11, color: "#d96060" },
];
