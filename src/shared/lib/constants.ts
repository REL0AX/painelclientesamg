import type {
  AppSettings,
  ClientPriority,
  ClientStage,
  ImportMergePolicy,
  MonthlyCommercialBracket,
  ThresholdSettings,
  TierDefinition,
  WhatsAppTemplate
} from '@/shared/types/domain';

export const APP_SCHEMA_VERSION = 3;
export const APP_DB_NAME = 'painel-clientes-amg-db';
export const APP_SNAPSHOT_KEY = 'app-snapshot';
export const MAX_BACKUPS = 20;
export const PANEL_ID = 'painel-clientes-amg';

export const STORAGE_KEYS = {
  clients: 'amg-clients-data',
  products: 'amg-products-data',
  history: 'amg-import-history',
  routes: 'amg-routes-def',
  routeSelections: 'amg-monthly-route-client-selections',
  routeDates: 'amg-monthly-route-dates',
  salesGoals: 'amg-sales-goals',
  settings: 'amg-settings',
  theme: 'amg-theme'
} as const;

export const CLIENT_STAGES: Array<{ value: ClientStage; label: string }> = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'reativar', label: 'Reativar' },
  { value: 'negociando', label: 'Negociando' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'sem-rota', label: 'Sem rota' },
  { value: 'prioritario', label: 'Prioritario' }
];

export const CLIENT_PRIORITIES: Array<{ value: ClientPriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' }
];

export const DEFAULT_IMPORT_MERGE_POLICY: ImportMergePolicy = 'merge';

export const DEFAULT_TIERS: Record<string, TierDefinition> = {
  MESTRE: { level: 6, name: 'Mestre', min: 200000 },
  DIAMANTE: { level: 5, name: 'Diamante', min: 100000 },
  PLATINA: { level: 4, name: 'Platina', min: 50000 },
  OURO: { level: 3, name: 'Ouro', min: 10000 },
  PRATA: { level: 2, name: 'Prata', min: 5000 },
  BRONZE: { level: 1, name: 'Bronze', min: 300 },
  INATIVO: { level: 0, name: 'Inativo', min: 0 }
};

export const DEFAULT_COMMERCIAL_BRACKETS: MonthlyCommercialBracket[] = [
  { id: 'table-1', label: 'Tabela 1', min: 0, max: 999.99, color: 'bg-stone-200 text-stone-800', order: 1 },
  { id: 'table-2', label: 'Tabela 2', min: 1000, max: 1999.99, color: 'bg-sky-100 text-sky-900', order: 2 },
  { id: 'table-3', label: 'Tabela 3', min: 2000, max: 3499.99, color: 'bg-amber-100 text-amber-900', order: 3 },
  { id: 'table-4', label: 'Tabela 4', min: 3500, max: 4999.99, color: 'bg-orange-100 text-orange-900', order: 4 },
  { id: 'table-5', label: 'Tabela 5', min: 5000, max: null, color: 'bg-emerald-100 text-emerald-900', order: 5 }
];

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'reactivation',
    category: 'reativacao',
    enabled: true,
    name: 'Reativacao',
    description: 'Mensagem para clientes sem compra recente.',
    message:
      'Oi {{nome}}, tudo bem? Notei que voce nao compra com a AMG desde {{ultima_compra}}. Posso te ajudar a repor algum item ou montar um pedido rapido para sua rota?'
  },
  {
    id: 'progress',
    category: 'progresso',
    enabled: true,
    name: 'Progresso de Tabela',
    description: 'Mensagem comercial com acumulado mensal e distancia para a proxima tabela.',
    message:
      'Oi {{nome}}! Ate agora voce acumulou {{faturamento_mes}} em compras neste mes e esta na {{tabela_atual}} para o proximo mes. Ainda faltam {{falta_para_proxima}} para chegar na {{proxima_tabela}}.'
  },
  {
    id: 'route',
    category: 'rota',
    enabled: true,
    name: 'Rota e Agenda',
    description: 'Mensagem com rota, prazo de pedido e saida da rota.',
    message:
      'Oi {{nome}}! Sua rota atual e {{rota}}. O prazo para pedido vai ate {{prazo_pedido}} e a saida da rota esta prevista para {{saida_rota}}.'
  },
  {
    id: 'soft-charge',
    category: 'cobranca-leve',
    enabled: true,
    name: 'Cobranca leve',
    description: 'Mensagem de lembrete suave e acompanhamento comercial.',
    message:
      'Oi {{nome}}! Passando para reforcar seu acompanhamento comercial com a AMG. Hoje voce esta na {{tabela_atual}} e falta {{falta_para_proxima}} para a proxima faixa.'
  },
  {
    id: 'follow-up',
    category: 'follow-up',
    enabled: true,
    name: 'Follow-up',
    description: 'Mensagem de retorno apos visita, proposta ou contato anterior.',
    message:
      'Oi {{nome}}! Estou retomando nosso ultimo contato para te ajudar no proximo pedido. Se fizer sentido, posso montar uma sugestao com base no seu acumulado atual de {{faturamento_mes}}.'
  },
  {
    id: 'freeform',
    category: 'livre',
    enabled: true,
    name: 'Mensagem Livre',
    description: 'Template livre com variaveis do painel.',
    message:
      'Oi {{nome}}! Resumo rapido do seu painel: {{faturamento_mes}} no mes, {{tabela_atual}} para o proximo mes e falta {{falta_para_proxima}} para a proxima tabela.'
  }
];

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  nearNextTable: 300,
  staleDays: 45,
  atRiskDays: 75,
  routeDepartureSoonDays: 7
};

export const DEFAULT_SETTINGS: AppSettings = {
  commissionTransitionDate: '2025-08-01',
  tiers: DEFAULT_TIERS,
  commercialBrackets: DEFAULT_COMMERCIAL_BRACKETS,
  whatsappTemplates: DEFAULT_WHATSAPP_TEMPLATES,
  thresholds: DEFAULT_THRESHOLDS,
  timezone: 'America/Sao_Paulo',
  maxBackups: MAX_BACKUPS,
  defaultImportMergePolicy: DEFAULT_IMPORT_MERGE_POLICY
};

export const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
] as const;
