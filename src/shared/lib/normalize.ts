import { z } from 'zod';
import {
  APP_SCHEMA_VERSION,
  DEFAULT_COMMERCIAL_BRACKETS,
  DEFAULT_IMPORT_MERGE_POLICY,
  DEFAULT_SETTINGS,
  DEFAULT_THRESHOLDS,
  DEFAULT_TIERS,
  DEFAULT_WHATSAPP_TEMPLATES,
  MAX_BACKUPS
} from '@/shared/lib/constants';
import { createId, normalizeDigits } from '@/shared/lib/utils';
import type {
  AppSettings,
  AppSnapshot,
  Client,
  ClientTask,
  ContactEvent,
  HistoryEntry,
  MonthlyCommercialBracket,
  Note,
  Product,
  RouteDefinition,
  SavedView,
  Sale,
  SyncLedger,
  TierDefinition,
  WhatsAppTemplate
} from '@/shared/types/domain';

const noteSchema = z.object({
  id: z.string().optional(),
  timestamp: z.number().catch(Date.now()),
  text: z.string().catch('')
});

const contactSchema = z.object({
  id: z.string().optional(),
  timestamp: z.number().catch(Date.now()),
  type: z.string().catch('outro'),
  summary: z.string().catch(''),
  templateId: z.string().optional(),
  preview: z.string().optional()
});

const saleSchema = z.object({
  id: z.string().optional(),
  pedido: z.string().catch(''),
  descricao: z.string().catch(''),
  tipoVenda: z.string().catch(''),
  portador: z.string().catch(''),
  data: z.string().catch(() => new Date().toISOString()),
  valor: z.number().catch(0),
  importId: z.string().optional(),
  products: z
    .array(
      z.object({
        sku: z.string().catch(''),
        quantity: z.number().catch(1),
        price: z.number().catch(0),
        description: z.string().optional()
      })
    )
    .catch([])
});

const clientSchema = z.object({
  id: z.string().optional(),
  codigo: z.string().catch(''),
  nome: z.string().catch(''),
  cnpj: z.string().catch(''),
  cidade: z.string().catch(''),
  uf: z.string().catch(''),
  telefone1: z.string().catch(''),
  telefone2: z.string().catch(''),
  email: z.string().optional(),
  totalCompras: z.number().catch(0),
  compras: z.array(saleSchema).catch([]),
  notes: z.array(noteSchema).catch([]),
  contacts: z.array(contactSchema).catch([]),
  importId: z.string().optional(),
  manualRouteId: z.string().optional(),
  stage: z
    .enum(['ativo', 'reativar', 'negociando', 'aguardando', 'sem-rota', 'prioritario'])
    .catch('ativo'),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']).catch('media'),
  tags: z.array(z.string()).catch([]),
  preferredChannel: z
    .enum(['whatsapp-opened', 'whatsapp', 'telefone', 'email', 'visita', 'outro'])
    .catch('whatsapp'),
  nextActionId: z.string().optional()
});

const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string().catch(''),
  description: z.string().catch(''),
  price: z.number().catch(0),
  category: z.string().optional(),
  brand: z.string().optional(),
  importId: z.string().optional()
});

const routeSchema = z.object({
  id: z.string().optional(),
  name: z.string().catch('Sem nome'),
  cities: z.array(z.string()).catch([]),
  frequency: z
    .object({
      type: z.enum(['semanal', 'quinzenal', 'mensal', 'personalizado']).catch('mensal'),
      days: z.array(z.number()).catch([])
    })
    .catch({ type: 'mensal', days: [] })
});

const historySchema = z.object({
  id: z.string().optional(),
  type: z
    .enum([
      'clients',
      'sales',
      'products',
      'backup',
      'restore',
      'bulk-action',
      'task',
      'route',
      'saved-view',
      'sync',
      'campaign'
    ])
    .catch('backup'),
  timestamp: z.number().catch(Date.now()),
  summary: z.string().catch(''),
  clientId: z.string().optional(),
  entityId: z.string().optional(),
  entityKind: z
    .enum(['client', 'task', 'route', 'saved-view', 'campaign', 'system'])
    .optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

const bracketSchema = z.object({
  id: z.string().optional(),
  label: z.string().catch('Tabela'),
  min: z.number().catch(0),
  max: z.number().nullable().catch(null),
  color: z.string().catch('bg-stone-200 text-stone-900'),
  order: z.number().catch(0)
});

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().catch('Template'),
  description: z.string().catch(''),
  message: z.string().catch(''),
  category: z
    .enum(['reativacao', 'progresso', 'rota', 'cobranca-leve', 'follow-up', 'livre'])
    .optional(),
  kind: z.enum(['reactivation', 'progress', 'route', 'freeform']).optional(),
  enabled: z.boolean().catch(true)
});

const thresholdSchema = z.object({
  nearNextTable: z.number().catch(DEFAULT_THRESHOLDS.nearNextTable),
  staleDays: z.number().catch(DEFAULT_THRESHOLDS.staleDays),
  atRiskDays: z.number().catch(DEFAULT_THRESHOLDS.atRiskDays),
  routeDepartureSoonDays: z.number().catch(DEFAULT_THRESHOLDS.routeDepartureSoonDays)
});

const settingsSchema = z.object({
  commissionTransitionDate: z.string().catch(DEFAULT_SETTINGS.commissionTransitionDate),
  tiers: z.record(z.string(), z.object({ level: z.number(), name: z.string(), min: z.number() })).catch(DEFAULT_TIERS),
  commercialBrackets: z.array(bracketSchema).catch(DEFAULT_COMMERCIAL_BRACKETS),
  whatsappTemplates: z.array(templateSchema).catch(DEFAULT_WHATSAPP_TEMPLATES),
  thresholds: thresholdSchema.catch(DEFAULT_THRESHOLDS),
  timezone: z.string().catch(DEFAULT_SETTINGS.timezone),
  maxBackups: z.number().catch(MAX_BACKUPS),
  defaultImportMergePolicy: z.enum(['ignore', 'merge', 'replace']).catch(DEFAULT_IMPORT_MERGE_POLICY)
});

const taskSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().catch(''),
  title: z.string().catch('Nova tarefa'),
  kind: z
    .enum(['retorno', 'whatsapp', 'visita', 'rota', 'pendencia', 'follow-up'])
    .catch('retorno'),
  dueAt: z.string().catch(() => new Date().toISOString()),
  status: z.enum(['open', 'done', 'canceled']).catch('open'),
  notes: z.string().optional(),
  priority: z.enum(['baixa', 'media', 'alta', 'urgente']).catch('media'),
  createdAt: z.number().catch(Date.now()),
  completedAt: z.number().optional()
});

const savedViewSchema = z.object({
  id: z.string().optional(),
  scope: z.enum(['clients', 'routes', 'worklists']).catch('clients'),
  label: z.string().catch('Nova vista'),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])).catch({}),
  sort: z.string().catch('recent'),
  createdAt: z.number().catch(Date.now())
});

const syncLedgerSchema = z.object({
  lastSuccessfulSyncAt: z.string().nullable().catch(null),
  dirtyClients: z.record(z.string(), z.enum(['upsert', 'delete'])).catch({}),
  dirtyProducts: z.record(z.string(), z.enum(['upsert', 'delete'])).catch({}),
  dirtyRoutes: z.record(z.string(), z.enum(['upsert', 'delete'])).catch({}),
  dirtyTasks: z.record(z.string(), z.enum(['upsert', 'delete'])).catch({}),
  dirtySavedViews: z.record(z.string(), z.enum(['upsert', 'delete'])).catch({}),
  dirtySettings: z.boolean().catch(false),
  lastError: z.string().nullable().catch(null)
});

const snapshotSchema = z.object({
  schemaVersion: z.number().catch(APP_SCHEMA_VERSION),
  clients: z.array(clientSchema).catch([]),
  products: z.array(productSchema).catch([]),
  routes: z.array(routeSchema).catch([]),
  routeSelections: z.record(z.string(), z.record(z.string(), z.record(z.string(), z.boolean()))).catch({}),
  routeDates: z.record(z.string(), z.object({ deadline: z.string().catch(''), departure: z.string().catch('') })).catch({}),
  tasks: z.array(taskSchema).catch([]),
  savedViews: z.array(savedViewSchema).catch([]),
  history: z.array(historySchema).catch([]),
  settings: settingsSchema.catch(DEFAULT_SETTINGS),
  meta: z
    .object({
      migratedFromLegacy: z.boolean().catch(false),
      updatedAt: z.string().catch(() => new Date().toISOString()),
      syncLedger: syncLedgerSchema.catch({
        lastSuccessfulSyncAt: null,
        dirtyClients: {},
        dirtyProducts: {},
        dirtyRoutes: {},
        dirtyTasks: {},
        dirtySavedViews: {},
        dirtySettings: false,
        lastError: null
      })
    })
    .catch({
      migratedFromLegacy: false,
      updatedAt: new Date().toISOString(),
      syncLedger: {
        lastSuccessfulSyncAt: null,
        dirtyClients: {},
        dirtyProducts: {},
        dirtyRoutes: {},
        dirtyTasks: {},
        dirtySavedViews: {},
        dirtySettings: false,
        lastError: null
      }
    })
});

export const createEmptySyncLedger = (): SyncLedger => ({
  lastSuccessfulSyncAt: null,
  dirtyClients: {},
  dirtyProducts: {},
  dirtyRoutes: {},
  dirtyTasks: {},
  dirtySavedViews: {},
  dirtySettings: false,
  lastError: null
});

const normalizeNote = (raw: z.infer<typeof noteSchema>): Note => ({
  id: raw.id ?? createId('note'),
  timestamp: raw.timestamp,
  text: raw.text
});

const normalizeContact = (raw: z.infer<typeof contactSchema>): ContactEvent => ({
  id: raw.id ?? createId('contact'),
  timestamp: raw.timestamp,
  type: raw.type as ContactEvent['type'],
  summary: raw.summary,
  templateId: raw.templateId,
  preview: raw.preview
});

const normalizeSale = (raw: z.infer<typeof saleSchema>): Sale => ({
  id: raw.id ?? createId('sale'),
  pedido: raw.pedido,
  descricao: raw.descricao,
  tipoVenda: raw.tipoVenda,
  portador: raw.portador,
  data: raw.data,
  valor: raw.valor,
  importId: raw.importId,
  products: raw.products.map((line) => ({
    sku: line.sku,
    quantity: line.quantity,
    price: line.price,
    description: line.description
  }))
});

export const normalizeClient = (raw: unknown): Client => {
  const parsed = clientSchema.parse(raw);
  const compras = parsed.compras.map(normalizeSale);
  const totalCompras = compras.reduce((total, sale) => total + sale.valor, 0);

  return {
    id: parsed.id ?? createId('client'),
    codigo: parsed.codigo,
    nome: parsed.nome,
    cnpj: normalizeDigits(parsed.cnpj),
    cidade: parsed.cidade,
    uf: parsed.uf.toUpperCase(),
    telefone1: normalizeDigits(parsed.telefone1),
    telefone2: normalizeDigits(parsed.telefone2),
    email: parsed.email,
    totalCompras,
    compras,
    notes: parsed.notes.map(normalizeNote),
    contacts: parsed.contacts.map(normalizeContact),
    importId: parsed.importId,
    manualRouteId: parsed.manualRouteId,
    stage: parsed.stage || 'ativo',
    priority: parsed.priority || 'media',
    tags: [...new Set(parsed.tags.map((tag) => tag.trim()).filter(Boolean))],
    preferredChannel: parsed.preferredChannel || 'whatsapp',
    nextActionId: parsed.nextActionId
  };
};

export const normalizeProduct = (raw: unknown): Product => {
  const parsed = productSchema.parse(raw);
  return {
    id: parsed.id ?? createId('product'),
    sku: parsed.sku,
    description: parsed.description,
    price: parsed.price,
    category: parsed.category,
    brand: parsed.brand,
    importId: parsed.importId
  };
};

export const normalizeRoute = (raw: unknown): RouteDefinition => {
  const parsed = routeSchema.parse(raw);
  return {
    id: parsed.id ?? createId('route'),
    name: parsed.name,
    cities: parsed.cities.filter(Boolean),
    frequency: {
      type: parsed.frequency.type,
      days: parsed.frequency.days
    }
  };
};

export const normalizeHistoryEntry = (raw: unknown): HistoryEntry => {
  const parsed = historySchema.parse(raw);
  return {
    id: parsed.id ?? createId('history'),
    type: parsed.type,
    timestamp: parsed.timestamp,
    summary: parsed.summary,
    clientId: parsed.clientId,
    entityId: parsed.entityId,
    entityKind: parsed.entityKind,
    metadata: parsed.metadata
  };
};

export const normalizeTask = (raw: unknown): ClientTask => {
  const parsed = taskSchema.parse(raw);
  return {
    id: parsed.id ?? createId('task'),
    clientId: parsed.clientId,
    title: parsed.title,
    kind: parsed.kind,
    dueAt: parsed.dueAt,
    status: parsed.status,
    notes: parsed.notes,
    priority: parsed.priority,
    createdAt: parsed.createdAt,
    completedAt: parsed.completedAt
  };
};

export const normalizeSavedView = (raw: unknown): SavedView => {
  const parsed = savedViewSchema.parse(raw);
  return {
    id: parsed.id ?? createId('view'),
    scope: parsed.scope,
    label: parsed.label,
    filters: parsed.filters,
    sort: parsed.sort,
    createdAt: parsed.createdAt
  };
};

const normalizeBrackets = (
  value: Array<z.infer<typeof bracketSchema>> | undefined
): MonthlyCommercialBracket[] => {
  const parsed = value?.map((item) => bracketSchema.parse(item)) ?? DEFAULT_COMMERCIAL_BRACKETS;
  return parsed
    .map((item, index) => ({
      id: item.id ?? `table-${index + 1}`,
      label: item.label,
      min: item.min,
      max: item.max,
      color: item.color,
      order: item.order || index + 1
    }))
    .sort((a, b) => a.order - b.order);
};

const legacyTemplateCategoryMap: Record<string, WhatsAppTemplate['category']> = {
  reactivation: 'reativacao',
  progress: 'progresso',
  route: 'rota',
  freeform: 'livre'
};

const normalizeTemplates = (
  value: Array<z.infer<typeof templateSchema>> | undefined
): WhatsAppTemplate[] => {
  const parsed = value?.map((item) => templateSchema.parse(item)) ?? DEFAULT_WHATSAPP_TEMPLATES;
  return parsed.map((item, index) => ({
    id: item.id ?? `template-${index + 1}`,
    name: item.name,
    description: item.description,
    message: item.message,
    category: item.category ?? legacyTemplateCategoryMap[item.kind ?? 'freeform'] ?? 'livre',
    enabled: item.enabled
  }));
};

export const normalizeSettings = (raw: Partial<AppSettings> | undefined): AppSettings => {
  const parsed = settingsSchema.parse(raw ?? {});
  const tiers = Object.entries(parsed.tiers).reduce<Record<string, TierDefinition>>((acc, [key, value]) => {
    acc[key] = {
      level: value.level,
      name: value.name,
      min: value.min
    };
    return acc;
  }, {});

  return {
    commissionTransitionDate: parsed.commissionTransitionDate,
    tiers: {
      ...DEFAULT_TIERS,
      ...tiers
    },
    commercialBrackets: normalizeBrackets(parsed.commercialBrackets),
    whatsappTemplates: normalizeTemplates(parsed.whatsappTemplates),
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...parsed.thresholds
    },
    timezone: parsed.timezone || DEFAULT_SETTINGS.timezone,
    maxBackups: parsed.maxBackups || MAX_BACKUPS,
    defaultImportMergePolicy: parsed.defaultImportMergePolicy || DEFAULT_IMPORT_MERGE_POLICY
  };
};

export const createEmptySnapshot = (): AppSnapshot => ({
  schemaVersion: APP_SCHEMA_VERSION,
  clients: [],
  products: [],
  routes: [],
  routeSelections: {},
  routeDates: {},
  tasks: [],
  savedViews: [],
  history: [],
  settings: normalizeSettings(undefined),
  meta: {
    migratedFromLegacy: false,
    updatedAt: new Date().toISOString(),
    syncLedger: createEmptySyncLedger()
  }
});

export const normalizeSnapshot = (raw: unknown): AppSnapshot => {
  const parsed = snapshotSchema.parse(raw ?? {});
  return {
    schemaVersion: APP_SCHEMA_VERSION,
    clients: parsed.clients.map(normalizeClient),
    products: parsed.products.map(normalizeProduct),
    routes: parsed.routes.map(normalizeRoute),
    routeSelections: parsed.routeSelections,
    routeDates: parsed.routeDates,
    tasks: parsed.tasks.map(normalizeTask),
    savedViews: parsed.savedViews.map(normalizeSavedView),
    history: parsed.history.map(normalizeHistoryEntry),
    settings: normalizeSettings(parsed.settings as unknown as Partial<AppSettings>),
    meta: {
      migratedFromLegacy: parsed.meta.migratedFromLegacy || parsed.schemaVersion < APP_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      syncLedger: syncLedgerSchema.parse(parsed.meta.syncLedger)
    }
  };
};

export const snapshotHasData = (snapshot: AppSnapshot) =>
  snapshot.clients.length > 0 ||
  snapshot.products.length > 0 ||
  snapshot.routes.length > 0 ||
  snapshot.tasks.length > 0 ||
  snapshot.savedViews.length > 0 ||
  snapshot.history.length > 0 ||
  Object.keys(snapshot.routeSelections).length > 0 ||
  Object.keys(snapshot.routeDates).length > 0;
