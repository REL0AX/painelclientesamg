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

export type ImportKind =
  | 'clients'
  | 'sales'
  | 'products'
  | 'backup'
  | 'restore'
  | 'bulk-action'
  | 'task'
  | 'route'
  | 'saved-view'
  | 'sync'
  | 'campaign';

export type ImportMergePolicy = 'ignore' | 'merge' | 'replace';

export type ClientStage =
  | 'ativo'
  | 'reativar'
  | 'negociando'
  | 'aguardando'
  | 'sem-rota'
  | 'prioritario';

export type ClientPriority = 'baixa' | 'media' | 'alta' | 'urgente';

export type TaskStatus = 'open' | 'done' | 'canceled';

export type TaskKind =
  | 'retorno'
  | 'whatsapp'
  | 'visita'
  | 'rota'
  | 'pendencia'
  | 'follow-up';

export type SavedViewScope = 'clients' | 'routes' | 'worklists';

export type SyncOperation = 'upsert' | 'delete';

export type HistoryEntityKind = 'client' | 'task' | 'route' | 'saved-view' | 'campaign' | 'system';

export type ClientSignalId =
  | 'sem-telefone'
  | 'sem-rota'
  | 'sem-compra-recente'
  | 'em-risco'
  | 'perto-da-proxima-tabela'
  | 'mudou-de-tabela'
  | 'saida-de-rota-proxima'
  | 'dados-incompletos'
  | 'tarefa-vencida'
  | 'cliente-prioritario'
  | 'aguardando-retorno';

export type WorklistSignal =
  | ClientSignalId
  | 'fora-da-malha'
  | 'rota-sem-cobertura';

export type TimelineEventType =
  | 'sale'
  | 'note'
  | 'contact'
  | 'task'
  | 'history';

export type WhatsAppTemplateCategory =
  | 'reativacao'
  | 'progresso'
  | 'rota'
  | 'cobranca-leve'
  | 'follow-up'
  | 'livre';

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
  stage: ClientStage;
  priority: ClientPriority;
  tags: string[];
  preferredChannel: ContactChannel;
  nextActionId?: string;
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
  category: WhatsAppTemplateCategory;
  enabled: boolean;
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
  maxBackups: number;
  defaultImportMergePolicy: ImportMergePolicy;
}

export interface HistoryEntry {
  id: string;
  type: ImportKind;
  timestamp: number;
  summary: string;
  clientId?: string;
  entityId?: string;
  entityKind?: HistoryEntityKind;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ClientTask {
  id: string;
  clientId: string;
  title: string;
  kind: TaskKind;
  dueAt: string;
  status: TaskStatus;
  notes?: string;
  priority: ClientPriority;
  createdAt: number;
  completedAt?: number;
}

export interface SavedView {
  id: string;
  scope: SavedViewScope;
  label: string;
  filters: Record<string, string | number | boolean | string[] | null>;
  sort: string;
  createdAt: number;
}

export interface SyncLedger {
  lastSuccessfulSyncAt: string | null;
  dirtyClients: Record<string, SyncOperation>;
  dirtyProducts: Record<string, SyncOperation>;
  dirtyRoutes: Record<string, SyncOperation>;
  dirtyTasks: Record<string, SyncOperation>;
  dirtySavedViews: Record<string, SyncOperation>;
  dirtySettings: boolean;
  lastError: string | null;
}

export interface AppSnapshot {
  schemaVersion: number;
  clients: Client[];
  products: Product[];
  routes: RouteDefinition[];
  routeSelections: MonthlyRouteSelections;
  routeDates: MonthlyRouteDates;
  tasks: ClientTask[];
  savedViews: SavedView[];
  history: HistoryEntry[];
  settings: AppSettings;
  meta: {
    migratedFromLegacy: boolean;
    updatedAt: string;
    syncLedger: SyncLedger;
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
  atRiskClients: number;
  overdueTasks: number;
}

export interface WorklistItem {
  id: WorklistSignal;
  title: string;
  description: string;
  signal: WorklistSignal;
  clients: Client[];
}

export interface ClientTimelineEvent {
  id: string;
  timestamp: number;
  type: TimelineEventType;
  title: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success' | 'info';
}
