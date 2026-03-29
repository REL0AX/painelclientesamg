export type ThemeMode = 'light' | 'dark';

export type ContactChannel =
  | 'whatsapp-opened'
  | 'whatsapp'
  | 'telefone'
  | 'email'
  | 'visita'
  | 'outro';

export type CloudPermission = 'signed-out' | 'checking' | 'blocked' | 'admin';

export type RouteFrequencyType = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';

export type ImportKind = 'clients' | 'sales' | 'products' | 'backup' | 'restore';

export type ClientSignalId =
  | 'sem-telefone'
  | 'sem-rota'
  | 'sem-compra-recente'
  | 'em-risco'
  | 'perto-da-proxima-tabela'
  | 'mudou-de-tabela'
  | 'saida-de-rota-proxima'
  | 'dados-incompletos';

export interface Note {
  id: string;
  timestamp: number;
  text: string;
}

export interface ContactEvent {
  id: string;
  timestamp: number;
  type: ContactChannel;
  summary: string;
  templateId?: string;
  preview?: string;
}

export interface SaleProductLine {
  sku: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface Sale {
  id: string;
  pedido: string;
  descricao: string;
  tipoVenda: string;
  portador: string;
  data: string;
  valor: number;
  importId?: string;
  products: SaleProductLine[];
}

export interface ClientRouteInfo {
  id: string | null;
  name: string;
  frequencyLabel?: string;
  manual: boolean;
}

export interface Client {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  telefone1: string;
  telefone2: string;
  email?: string;
  totalCompras: number;
  compras: Sale[];
  notes: Note[];
  contacts: ContactEvent[];
  importId?: string;
  manualRouteId?: string;
  route?: ClientRouteInfo;
}

export interface Product {
  id: string;
  sku: string;
  description: string;
  price: number;
  category?: string;
  brand?: string;
  importId?: string;
}

export interface RouteFrequency {
  type: RouteFrequencyType;
  days: number[];
}

export interface RouteDefinition {
  id: string;
  name: string;
  cities: string[];
  frequency: RouteFrequency;
}

export interface RouteDates {
  deadline: string;
  departure: string;
}

export type MonthlyRouteSelections = Record<string, Record<string, Record<string, boolean>>>;

export type MonthlyRouteDates = Record<string, RouteDates>;

export type SalesGoals = Record<string, number>;

export interface TierDefinition {
  level: number;
  name: string;
  min: number;
}

export interface MonthlyCommercialBracket {
  id: string;
  label: string;
  min: number;
  max: number | null;
  color: string;
  order: number;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  description: string;
  message: string;
  kind: 'reactivation' | 'progress' | 'route' | 'freeform';
}

export interface ThresholdSettings {
  nearNextTable: number;
  staleDays: number;
  atRiskDays: number;
  routeDepartureSoonDays: number;
}

export interface AppSettings {
  commissionTransitionDate: string;
  tiers: Record<string, TierDefinition>;
  commercialBrackets: MonthlyCommercialBracket[];
  whatsappTemplates: WhatsAppTemplate[];
  thresholds: ThresholdSettings;
  timezone: string;
}

export interface ImportHistoryEntry {
  id: string;
  type: ImportKind;
  timestamp: number;
  summary: string;
}

export interface AppSnapshot {
  schemaVersion: number;
  clients: Client[];
  products: Product[];
  history: ImportHistoryEntry[];
  routes: RouteDefinition[];
  routeSelections: MonthlyRouteSelections;
  routeDates: MonthlyRouteDates;
  salesGoals: SalesGoals;
  settings: AppSettings;
  meta: {
    migratedFromLegacy: boolean;
    updatedAt: string;
  };
}

export interface BackupRecord {
  id: string;
  createdAt: number;
  reason: string;
  snapshot: AppSnapshot;
}

export interface CloudUser {
  uid: string;
  email: string | null;
}

export interface CloudSyncStatus {
  enabled: boolean;
  ready: boolean;
  permission: CloudPermission;
  authUser: CloudUser | null;
  status: string;
  error: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
}

export interface ClientSignal {
  id: ClientSignalId;
  label: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success' | 'info';
}

export interface ClientCommercialProfile {
  revenue: number;
  previousRevenue: number;
  currentBracket: MonthlyCommercialBracket;
  previousBracket: MonthlyCommercialBracket;
  nextBracket: MonthlyCommercialBracket | null;
  missingToNext: number;
  bracketMovement: 'subiu' | 'desceu' | 'manteve';
  contextYear: number;
  contextMonth: number;
  contextLabel: string;
  usedFallbackMonth: boolean;
}

export interface DashboardSummary {
  totalClients: number;
  activeClientsInCommercialMonth: number;
  commercialRevenue: number;
  avgTicket: number;
  clientsNearNextBracket: number;
  staleClients: number;
}

export interface WorklistItem {
  id: string;
  title: string;
  description: string;
  signal: ClientSignalId;
  clients: Client[];
}
