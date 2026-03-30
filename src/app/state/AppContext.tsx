import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';
import { cloudServicesReady, panelCloudConfig } from '@/shared/lib/cloud-config';
import { createHistoryEntry } from '@/shared/lib/history';
import type { ClientImportCandidate } from '@/shared/lib/imports';
import { readLegacySnapshot, readStoredTheme, writeStoredTheme } from '@/shared/lib/legacy';
import { createEmptySnapshot, normalizeSnapshot, snapshotHasData } from '@/shared/lib/normalize';
import { decorateClientsWithRoutes, routeDepartureInfo } from '@/shared/lib/routes';
import {
  buildSyncLedgerFromSnapshots,
  clearSyncLedger,
  countPendingSyncChanges,
  hasPendingSyncChanges
} from '@/shared/lib/sync-ledger';
import { createId, deepClone, formatDateTime, monthKeyFor } from '@/shared/lib/utils';
import type {
  AppSettings,
  AppSnapshot,
  Client,
  ClientPriority,
  ClientStage,
  ClientTask,
  CloudSyncStatus,
  ContactChannel,
  ImportMergePolicy,
  MonthlyRouteSelections,
  RouteDefinition,
  RouteDates,
  Sale,
  SavedView,
  ThemeMode,
  WhatsAppTemplate
} from '@/shared/types/domain';

type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
}

interface AppContextValue {
  ready: boolean;
  snapshot: AppSnapshot;
  theme: ThemeMode;
  selectedYear: number;
  selectedMonth: number | null;
  globalSearch: string;
  selectedClientId: string | null;
  selectedClientIds: string[];
  cloud: CloudSyncStatus;
  toasts: ToastMessage[];
  setTheme: (theme: ThemeMode) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setGlobalSearch: (value: string) => void;
  openClient: (clientId: string | null) => void;
  setSelectedClientIds: (clientIds: string[]) => void;
  toggleClientSelection: (clientId: string, checked: boolean) => void;
  clearClientSelection: () => void;
  createClient: () => void;
  dismissToast: (id: string) => void;
  saveClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addNote: (clientId: string, text: string) => Promise<void>;
  addContact: (clientId: string, type: ContactChannel, summary: string) => Promise<void>;
  saveSale: (clientId: string, sale: Sale) => Promise<void>;
  deleteSale: (clientId: string, saleId: string) => Promise<void>;
  saveTask: (task: ClientTask) => Promise<void>;
  updateTaskStatus: (taskId: string, status: ClientTask['status']) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  saveSavedView: (view: SavedView) => Promise<void>;
  deleteSavedView: (viewId: string) => Promise<void>;
  saveRoute: (route: RouteDefinition) => Promise<void>;
  deleteRoute: (routeId: string) => Promise<void>;
  setRouteDates: (routeId: string, dates: RouteDates) => Promise<void>;
  toggleRouteSelection: (routeId: string, clientId: string, checked: boolean) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  applyStageToClients: (clientIds: string[], stage: ClientStage) => Promise<void>;
  applyPriorityToClients: (clientIds: string[], priority: ClientPriority) => Promise<void>;
  applyTagsToClients: (clientIds: string[], tags: string[]) => Promise<void>;
  assignRouteToClients: (clientIds: string[], routeId: string | null) => Promise<void>;
  createTaskForClients: (
    clientIds: string[],
    taskInput: Pick<ClientTask, 'title' | 'kind' | 'dueAt' | 'notes' | 'priority'>
  ) => Promise<void>;
  applySnapshot: (snapshot: AppSnapshot, reason: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  saveBackup: (reason?: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
  exportBackup: () => void;
  restoreBackup: (snapshot: AppSnapshot, reason: string) => Promise<void>;
  importClients: (
    candidates: ClientImportCandidate[],
    fileName: string,
    policy?: ImportMergePolicy
  ) => Promise<void>;
  importProducts: (products: AppSnapshot['products'], fileName: string) => Promise<void>;
  importSales: (rows: Array<{ clientId: string; sale: Sale }>, fileName: string) => Promise<void>;
  loginCloud: (email: string, password: string) => Promise<void>;
  logoutCloud: () => Promise<void>;
  syncNow: (options?: { forceFull?: boolean }) => Promise<void>;
  openWhatsApp: (clientId: string, template: WhatsAppTemplate) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const loadDbModule = () => import('@/shared/lib/db');
const loadBackupModule = () => import('@/shared/lib/backup');
const loadCloudModule = () => import('@/shared/lib/firebase');
const loadCommercialModule = () => import('@/shared/lib/commercial');
const loadWhatsAppModule = () => import('@/shared/lib/whatsapp');
const loadImportsModule = () => import('@/shared/lib/imports');

const createCloudState = (): CloudSyncStatus => ({
  enabled: panelCloudConfig.enabled,
  ready: cloudServicesReady(),
  permission: panelCloudConfig.enabled ? 'checking' : 'signed-out',
  authUser: null,
  status: panelCloudConfig.enabled ? 'Preparando nuvem...' : 'Modo local ativo',
  error: null,
  lastSyncedAt: null,
  isSyncing: false
});

const prepareSnapshot = (raw: AppSnapshot) => {
  const normalized = normalizeSnapshot(raw);
  return {
    ...normalized,
    clients: decorateClientsWithRoutes(normalized.clients, normalized.routes)
  };
};

const mergeDirtyMaps = (
  current: Record<string, 'upsert' | 'delete'>,
  next: Record<string, 'upsert' | 'delete'>
) => {
  const merged = { ...current };
  Object.entries(next).forEach(([id, operation]) => {
    merged[id] = operation;
  });
  return merged;
};

const mergeLedgers = (current: AppSnapshot['meta']['syncLedger'], next: AppSnapshot['meta']['syncLedger']) => ({
  lastSuccessfulSyncAt: current.lastSuccessfulSyncAt,
  dirtyClients: mergeDirtyMaps(current.dirtyClients, next.dirtyClients),
  dirtyProducts: mergeDirtyMaps(current.dirtyProducts, next.dirtyProducts),
  dirtyRoutes: mergeDirtyMaps(current.dirtyRoutes, next.dirtyRoutes),
  dirtyTasks: mergeDirtyMaps(current.dirtyTasks, next.dirtyTasks),
  dirtySavedViews: mergeDirtyMaps(current.dirtySavedViews, next.dirtySavedViews),
  dirtySettings: current.dirtySettings || next.dirtySettings,
  lastError: next.lastError ?? current.lastError
});

const withClearedLedger = (snapshot: AppSnapshot) => ({
  ...snapshot,
  meta: {
    ...snapshot.meta,
    updatedAt: new Date().toISOString(),
    syncLedger: clearSyncLedger()
  }
});

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(prepareSnapshot(createEmptySnapshot()));
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [selectedYear, setSelectedYearState] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonthState] = useState<number | null>(null);
  const [globalSearch, setGlobalSearchState] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIdsState] = useState<string[]>([]);
  const [cloud, setCloud] = useState<CloudSyncStatus>(createCloudState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const snapshotRef = useRef(snapshot);
  const skipNextCloudSyncRef = useRef(true);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const pushToast = (tone: ToastTone, message: string) => {
    const toast: ToastMessage = {
      id: createId('toast'),
      tone,
      message
    };

    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const loadLocalSnapshot = async () => {
    const { loadSnapshotFromDb } = await loadDbModule();
    return loadSnapshotFromDb();
  };

  const persistSnapshotLocally = async (nextSnapshot: AppSnapshot) => {
    const { saveSnapshotToDb } = await loadDbModule();
    await saveSnapshotToDb(nextSnapshot);
  };

  const replaceSnapshotState = async (
    nextSnapshot: AppSnapshot,
    options?: {
      backupReason?: string;
      successMessage?: string;
      skipAutoCloudSync?: boolean;
    }
  ) => {
    if (options?.backupReason) {
      const { persistBackup } = await loadBackupModule();
      await persistBackup(snapshotRef.current, options.backupReason, snapshotRef.current.settings.maxBackups);
    }

    const prepared = prepareSnapshot(nextSnapshot);
    if (options?.skipAutoCloudSync) {
      skipNextCloudSyncRef.current = true;
    }

    snapshotRef.current = prepared;
    setSnapshot(prepared);
    await persistSnapshotLocally(prepared);

    if (options?.successMessage) {
      pushToast('success', options.successMessage);
    }
  };

  const commitSnapshot = async (
    rawNextSnapshot: AppSnapshot,
    options?: {
      backupReason?: string;
      successMessage?: string;
      skipAutoCloudSync?: boolean;
      preserveLedger?: boolean;
    }
  ) => {
    const previousPrepared = snapshotRef.current;
    const nextPrepared = prepareSnapshot(rawNextSnapshot);
    const rebuiltLedger = buildSyncLedgerFromSnapshots(previousPrepared, nextPrepared);
    const nextLedger = options?.preserveLedger
      ? nextPrepared.meta.syncLedger
      : mergeLedgers(previousPrepared.meta.syncLedger, rebuiltLedger);

    await replaceSnapshotState(
      {
        ...nextPrepared,
        meta: {
          ...nextPrepared.meta,
          updatedAt: new Date().toISOString(),
          syncLedger: nextLedger
        }
      },
      options
    );
  };

  const mutateSnapshot = async (
    mutate: (draft: AppSnapshot) => void,
    options?: {
      backupReason?: string;
      successMessage?: string;
    }
  ) => {
    const draft = deepClone(snapshotRef.current);
    mutate(draft);
    draft.meta.updatedAt = new Date().toISOString();
    await commitSnapshot(draft, options);
  };

  const runCloudSync = async (
    nextSnapshot = snapshotRef.current,
    options?: {
      forceFull?: boolean;
      silentSuccess?: boolean;
    }
  ) => {
    if (cloud.permission !== 'admin' || !cloud.authUser) {
      return;
    }

    if (!options?.forceFull && !hasPendingSyncChanges(nextSnapshot.meta.syncLedger)) {
      return;
    }

    try {
      setCloud((current) => ({
        ...current,
        isSyncing: true,
        status: `Sincronizando ${countPendingSyncChanges(nextSnapshot.meta.syncLedger)} pendencias...`,
        error: null
      }));

      const { saveCloudSnapshot } = await loadCloudModule();
      await saveCloudSnapshot(nextSnapshot, cloud.authUser, {
        forceFull: options?.forceFull
      });

      const syncedSnapshot = withClearedLedger(snapshotRef.current);
      syncedSnapshot.meta.updatedAt = new Date().toISOString();
      await replaceSnapshotState(syncedSnapshot, {
        skipAutoCloudSync: true
      });

      setCloud((current) => ({
        ...current,
        isSyncing: false,
        status: 'Sincronizado com Firebase',
        lastSyncedAt: syncedSnapshot.meta.syncLedger.lastSuccessfulSyncAt,
        error: null
      }));

      if (!options?.silentSuccess) {
        pushToast('success', `Sincronizacao concluida em ${formatDateTime(new Date())}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao sincronizar.';
      setCloud((current) => ({
        ...current,
        isSyncing: false,
        status: 'Erro na sincronizacao',
        error: message
      }));
      pushToast('error', message);
    }
  };

  useEffect(() => {
    const boot = async () => {
      const fromDb = await loadLocalSnapshot();
      const fromLegacy = fromDb ? null : readLegacySnapshot();
      const hydrated = prepareSnapshot(fromDb ?? fromLegacy ?? createEmptySnapshot());

      if (!fromDb && fromLegacy) {
        await persistSnapshotLocally(hydrated);
      }

      startTransition(() => {
        setSnapshot(hydrated);
        setThemeState(readStoredTheme() as ThemeMode);
        setReady(true);
      });
    };

    void boot();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void persistSnapshotLocally(snapshot);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [ready, snapshot]);

  useEffect(() => {
    if (!panelCloudConfig.enabled) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void loadCloudModule()
      .then((cloudModule) => {
        if (cancelled) {
          return;
        }

        unsubscribe = cloudModule.subscribeToCloudAuth(async (user) => {
          if (!user) {
            setCloud((current) => ({
              ...current,
              authUser: null,
              permission: 'signed-out',
              status: 'Entre com seu admin para sincronizar',
              error: null,
              isSyncing: false
            }));
            return;
          }

          setCloud((current) => ({
            ...current,
            authUser: user,
            permission: 'checking',
            status: 'Verificando acesso do admin...',
            error: null
          }));

          try {
            const isAdmin = await cloudModule.checkPanelAdminAccess(user.uid);
            if (!isAdmin) {
              setCloud((current) => ({
                ...current,
                authUser: user,
                permission: 'blocked',
                status: 'Conta autenticada, mas sem permissao de admin',
                error: null
              }));
              return;
            }

            setCloud((current) => ({
              ...current,
              authUser: user,
              permission: 'admin',
              status: 'Carregando dados da nuvem...',
              error: null
            }));

            const remoteSnapshot = await cloudModule.loadCloudSnapshot();
            if (snapshotHasData(remoteSnapshot)) {
              const prepared = withClearedLedger(prepareSnapshot(remoteSnapshot));
              await replaceSnapshotState(prepared, {
                skipAutoCloudSync: true
              });
              setCloud((current) => ({
                ...current,
                permission: 'admin',
                status: 'Sincronizado com Firebase',
                lastSyncedAt: prepared.meta.syncLedger.lastSuccessfulSyncAt,
                error: null
              }));
              pushToast('success', 'Dados da nuvem carregados com sucesso.');
              return;
            }

            if (panelCloudConfig.autoUploadLocalDataOnFirstLogin && snapshotHasData(snapshotRef.current)) {
              await runCloudSync(snapshotRef.current, {
                forceFull: true,
                silentSuccess: true
              });
              setCloud((current) => ({
                ...current,
                permission: 'admin',
                status: 'Primeira sincronizacao concluida',
                error: null
              }));
              return;
            }

            setCloud((current) => ({
              ...current,
              permission: 'admin',
              status: 'Nuvem vazia. O painel local continua pronto para sincronizar.',
              error: null
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Falha na sincronizacao';
            setCloud((current) => ({
              ...current,
              permission: 'blocked',
              status: 'Erro ao validar acesso',
              error: message
            }));
            pushToast('error', message);
          }
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Falha ao inicializar a nuvem.';
        setCloud((current) => ({
          ...current,
          permission: 'blocked',
          status: 'Erro ao preparar a nuvem',
          error: message
        }));
        pushToast('error', message);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!ready || cloud.permission !== 'admin' || !cloud.authUser) {
      return;
    }

    if (skipNextCloudSyncRef.current) {
      skipNextCloudSyncRef.current = false;
      return;
    }

    if (!hasPendingSyncChanges(snapshot.meta.syncLedger)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void runCloudSync(snapshot, {
        silentSuccess: true
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [ready, snapshot, cloud.permission, cloud.authUser?.uid]);

  useEffect(() => {
    if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) {
      return;
    }

    Object.assign(window, {
      __PAINEL_CLIENTES_DEV__: {
        loadSnapshot: async (rawSnapshot: AppSnapshot) => {
          const prepared = withClearedLedger(prepareSnapshot(rawSnapshot));
          await replaceSnapshotState(prepared, {
            skipAutoCloudSync: true
          });
        },
        getSnapshot: () => snapshotRef.current
      }
    });
  }, []);

  const setTheme = (nextTheme: ThemeMode) => setThemeState(nextTheme);
  const setSelectedYear = (year: number) => setSelectedYearState(year);
  const setSelectedMonth = (month: number | null) => setSelectedMonthState(month);
  const setGlobalSearch = (value: string) => setGlobalSearchState(value);
  const openClient = (clientId: string | null) => setSelectedClientId(clientId);
  const setSelectedClientIds = (clientIds: string[]) => setSelectedClientIdsState(clientIds);
  const clearClientSelection = () => setSelectedClientIdsState([]);
  const toggleClientSelection = (clientId: string, checked: boolean) => {
    setSelectedClientIdsState((current) =>
      checked ? [...new Set([...current, clientId])] : current.filter((id) => id !== clientId)
    );
  };

  const createClient = () => {
    const draftId = createId('client');
    const draftClient: Client = {
      id: draftId,
      codigo: `MANUAL-${Date.now()}`,
      nome: '',
      cnpj: '',
      cidade: '',
      uf: '',
      telefone1: '',
      telefone2: '',
      email: '',
      totalCompras: 0,
      compras: [],
      notes: [],
      contacts: [],
      stage: 'ativo',
      priority: 'media',
      tags: [],
      preferredChannel: 'whatsapp'
    };

    void mutateSnapshot(
      (draft) => {
        draft.clients.unshift(draftClient);
        draft.history.unshift(
          createHistoryEntry('clients', 'Cliente em branco criado para edicao.', {
            clientId: draftId,
            entityId: draftId,
            entityKind: 'client'
          })
        );
      },
      {
        backupReason: 'criar cliente',
        successMessage: 'Cliente em branco criado para edicao.'
      }
    ).then(() => {
      setSelectedClientId(draftId);
      setSelectedClientIdsState([draftId]);
    });
  };

  const saveClient = async (client: Client) => {
    await mutateSnapshot(
      (draft) => {
        const index = draft.clients.findIndex((entry) => entry.id === client.id);
        if (index >= 0) {
          draft.clients[index] = client;
        } else {
          draft.clients.unshift(client);
        }

        draft.history.unshift(
          createHistoryEntry('clients', `Cliente ${client.nome || client.codigo} salvo manualmente.`, {
            clientId: client.id,
            entityId: client.id,
            entityKind: 'client'
          })
        );
      },
      {
        backupReason: `salvar cliente ${client.nome || client.codigo}`,
        successMessage: 'Cliente salvo.'
      }
    );
  };

  const deleteClient = async (clientId: string) => {
    await mutateSnapshot(
      (draft) => {
        const client = draft.clients.find((entry) => entry.id === clientId);
        draft.clients = draft.clients.filter((entry) => entry.id !== clientId);
        draft.tasks = draft.tasks.filter((task) => task.clientId !== clientId);
        draft.history.unshift(
          createHistoryEntry('clients', `Cliente ${client?.nome || client?.codigo || clientId} removido.`, {
            clientId,
            entityId: clientId,
            entityKind: 'client'
          })
        );
      },
      {
        backupReason: 'excluir cliente',
        successMessage: 'Cliente removido.'
      }
    );

    setSelectedClientIdsState((current) => current.filter((id) => id !== clientId));
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }
  };

  const addNote = async (clientId: string, text: string) => {
    if (!text.trim()) {
      return;
    }

    await mutateSnapshot((draft) => {
      const client = draft.clients.find((entry) => entry.id === clientId);
      if (!client) return;

      client.notes.unshift({
        id: createId('note'),
        timestamp: Date.now(),
        text: text.trim()
      });
      draft.history.unshift(
        createHistoryEntry('clients', 'Anotacao registrada no cliente.', {
          clientId,
          entityId: clientId,
          entityKind: 'client'
        })
      );
    });
  };

  const addContact = async (clientId: string, type: ContactChannel, summary: string) => {
    if (!summary.trim()) {
      return;
    }

    await mutateSnapshot((draft) => {
      const client = draft.clients.find((entry) => entry.id === clientId);
      if (!client) return;

      client.contacts.unshift({
        id: createId('contact'),
        timestamp: Date.now(),
        type,
        summary: summary.trim()
      });
      draft.history.unshift(
        createHistoryEntry('campaign', `Contato ${type} registrado.`, {
          clientId,
          entityId: clientId,
          entityKind: 'client',
          metadata: {
            channel: type
          }
        })
      );
    });
  };

  const saveSale = async (clientId: string, sale: Sale) => {
    await mutateSnapshot(
      (draft) => {
        const client = draft.clients.find((entry) => entry.id === clientId);
        if (!client) return;

        const saleIndex = client.compras.findIndex((entry) => entry.id === sale.id);
        if (saleIndex >= 0) {
          client.compras[saleIndex] = sale;
        } else {
          client.compras.unshift(sale);
        }

        client.totalCompras = client.compras.reduce((total, entry) => total + entry.valor, 0);
        draft.history.unshift(
          createHistoryEntry('sales', `Venda ${sale.pedido || sale.id} salva para ${client.nome || client.codigo}.`, {
            clientId,
            entityId: sale.id,
            entityKind: 'client'
          })
        );
      },
      {
        backupReason: 'salvar venda',
        successMessage: 'Venda salva.'
      }
    );
  };

  const deleteSale = async (clientId: string, saleId: string) => {
    await mutateSnapshot(
      (draft) => {
        const client = draft.clients.find((entry) => entry.id === clientId);
        if (!client) return;

        client.compras = client.compras.filter((entry) => entry.id !== saleId);
        client.totalCompras = client.compras.reduce((total, entry) => total + entry.valor, 0);
        draft.history.unshift(
          createHistoryEntry('sales', `Venda ${saleId} removida.`, {
            clientId,
            entityId: saleId,
            entityKind: 'client'
          })
        );
      },
      {
        backupReason: 'excluir venda',
        successMessage: 'Venda removida.'
      }
    );
  };

  const saveTask = async (task: ClientTask) => {
    await mutateSnapshot(
      (draft) => {
        const index = draft.tasks.findIndex((entry) => entry.id === task.id);
        if (index >= 0) {
          draft.tasks[index] = task;
        } else {
          draft.tasks.unshift(task);
        }

        const client = draft.clients.find((entry) => entry.id === task.clientId);
        if (client) {
          client.nextActionId = task.status === 'open' ? task.id : client.nextActionId === task.id ? undefined : client.nextActionId;
        }

        draft.history.unshift(
          createHistoryEntry('task', `Tarefa ${task.title} salva.`, {
            clientId: task.clientId,
            entityId: task.id,
            entityKind: 'task',
            metadata: {
              kind: task.kind,
              status: task.status
            }
          })
        );
      },
      {
        backupReason: `salvar tarefa ${task.title}`,
        successMessage: 'Tarefa salva.'
      }
    );
  };

  const updateTaskStatus = async (taskId: string, status: ClientTask['status']) => {
    await mutateSnapshot(
      (draft) => {
        const task = draft.tasks.find((entry) => entry.id === taskId);
        if (!task) return;

        task.status = status;
        task.completedAt = status === 'done' ? Date.now() : undefined;

        const client = draft.clients.find((entry) => entry.id === task.clientId);
        if (client && client.nextActionId === taskId && status !== 'open') {
          client.nextActionId = undefined;
        }

        draft.history.unshift(
          createHistoryEntry('task', `Tarefa ${task.title} atualizada para ${status}.`, {
            clientId: task.clientId,
            entityId: task.id,
            entityKind: 'task',
            metadata: {
              status
            }
          })
        );
      },
      {
        backupReason: 'atualizar tarefa',
        successMessage: 'Status da tarefa atualizado.'
      }
    );
  };

  const deleteTask = async (taskId: string) => {
    await mutateSnapshot(
      (draft) => {
        const task = draft.tasks.find((entry) => entry.id === taskId);
        draft.tasks = draft.tasks.filter((entry) => entry.id !== taskId);

        if (task) {
          const client = draft.clients.find((entry) => entry.id === task.clientId);
          if (client && client.nextActionId === taskId) {
            client.nextActionId = undefined;
          }

          draft.history.unshift(
            createHistoryEntry('task', `Tarefa ${task.title} removida.`, {
              clientId: task.clientId,
              entityId: task.id,
              entityKind: 'task'
            })
          );
        }
      },
      {
        backupReason: 'excluir tarefa',
        successMessage: 'Tarefa removida.'
      }
    );
  };

  const saveSavedView = async (view: SavedView) => {
    await mutateSnapshot((draft) => {
      const index = draft.savedViews.findIndex((entry) => entry.id === view.id);
      if (index >= 0) {
        draft.savedViews[index] = view;
      } else {
        draft.savedViews.unshift(view);
      }

      draft.history.unshift(
        createHistoryEntry('saved-view', `Vista salva: ${view.label}.`, {
          entityId: view.id,
          entityKind: 'saved-view'
        })
      );
    });
  };

  const deleteSavedView = async (viewId: string) => {
    await mutateSnapshot((draft) => {
      draft.savedViews = draft.savedViews.filter((entry) => entry.id !== viewId);
      draft.history.unshift(
        createHistoryEntry('saved-view', `Vista removida: ${viewId}.`, {
          entityId: viewId,
          entityKind: 'saved-view'
        })
      );
    });
  };

  const saveRoute = async (route: RouteDefinition) => {
    await mutateSnapshot(
      (draft) => {
        const index = draft.routes.findIndex((entry) => entry.id === route.id);
        if (index >= 0) {
          draft.routes[index] = route;
        } else {
          draft.routes.unshift(route);
        }
        draft.history.unshift(
          createHistoryEntry('route', `Rota ${route.name} salva.`, {
            entityId: route.id,
            entityKind: 'route'
          })
        );
      },
      {
        backupReason: `salvar rota ${route.name}`,
        successMessage: 'Rota salva.'
      }
    );
  };

  const deleteRoute = async (routeId: string) => {
    await mutateSnapshot(
      (draft) => {
        const route = draft.routes.find((entry) => entry.id === routeId);
        draft.routes = draft.routes.filter((entry) => entry.id !== routeId);
        delete draft.routeDates[routeId];
        Object.keys(draft.routeSelections).forEach((monthKey) => {
          delete draft.routeSelections[monthKey]?.[routeId];
        });
        draft.clients = draft.clients.map((client) =>
          client.manualRouteId === routeId ? { ...client, manualRouteId: undefined } : client
        );
        draft.history.unshift(
          createHistoryEntry('route', `Rota ${route?.name || routeId} removida.`, {
            entityId: routeId,
            entityKind: 'route'
          })
        );
      },
      {
        backupReason: 'excluir rota',
        successMessage: 'Rota removida.'
      }
    );
  };

  const setRouteDates = async (routeId: string, dates: RouteDates) => {
    await mutateSnapshot((draft) => {
      draft.routeDates[routeId] = dates;
      draft.history.unshift(
        createHistoryEntry('route', `Datas da rota ${routeId} atualizadas.`, {
          entityId: routeId,
          entityKind: 'route',
          metadata: {
            deadline: dates.deadline,
            departure: dates.departure
          }
        })
      );
    });
  };

  const toggleRouteSelection = async (routeId: string, clientId: string, checked: boolean) => {
    const { resolveCommercialContext } = await loadCommercialModule();
    const commercialContext = resolveCommercialContext(
      selectedYear,
      selectedMonth,
      snapshotRef.current.settings.timezone
    );
    const monthKey = monthKeyFor(commercialContext.year, commercialContext.month);

    await mutateSnapshot((draft) => {
      const routeSelections = (draft.routeSelections[monthKey] ??= {} as MonthlyRouteSelections[string]);
      const selectedClients = (routeSelections[routeId] ??= {});
      selectedClients[clientId] = checked;
      draft.history.unshift(
        createHistoryEntry('route', checked ? 'Cliente marcado na rota.' : 'Cliente desmarcado da rota.', {
          clientId,
          entityId: routeId,
          entityKind: 'route',
          metadata: {
            checked,
            monthKey
          }
        })
      );
    });
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    await mutateSnapshot(
      (draft) => {
        draft.settings = {
          ...draft.settings,
          ...settings
        };
        draft.history.unshift(createHistoryEntry('sync', 'Configuracoes atualizadas.', { entityKind: 'system' }));
      },
      {
        backupReason: 'atualizar configuracoes',
        successMessage: 'Configuracoes salvas.'
      }
    );
  };

  const applyStageToClients = async (clientIds: string[], stage: ClientStage) => {
    if (clientIds.length === 0) {
      return;
    }

    await mutateSnapshot(
      (draft) => {
        draft.clients = draft.clients.map((client) =>
          clientIds.includes(client.id) ? { ...client, stage } : client
        );
        draft.history.unshift(
          createHistoryEntry('bulk-action', `Estagio ${stage} aplicado a ${clientIds.length} clientes.`, {
            entityKind: 'system',
            metadata: {
              total: clientIds.length,
              stage
            }
          })
        );
      },
      {
        backupReason: 'bulk stage',
        successMessage: `Estagio aplicado a ${clientIds.length} clientes.`
      }
    );
  };

  const applyPriorityToClients = async (clientIds: string[], priority: ClientPriority) => {
    if (clientIds.length === 0) {
      return;
    }

    await mutateSnapshot((draft) => {
      draft.clients = draft.clients.map((client) =>
        clientIds.includes(client.id) ? { ...client, priority } : client
      );
      draft.history.unshift(
        createHistoryEntry('bulk-action', `Prioridade ${priority} aplicada a ${clientIds.length} clientes.`, {
          entityKind: 'system',
          metadata: {
            total: clientIds.length,
            priority
          }
        })
      );
    });
  };

  const applyTagsToClients = async (clientIds: string[], tags: string[]) => {
    if (clientIds.length === 0) {
      return;
    }

    const normalizedTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
    await mutateSnapshot((draft) => {
      draft.clients = draft.clients.map((client) =>
        clientIds.includes(client.id)
          ? {
              ...client,
              tags: [...new Set([...(client.tags ?? []), ...normalizedTags])]
            }
          : client
      );
      draft.history.unshift(
        createHistoryEntry('bulk-action', `Tags aplicadas a ${clientIds.length} clientes.`, {
          entityKind: 'system',
          metadata: {
            total: clientIds.length,
            tags: normalizedTags.join(', ')
          }
        })
      );
    });
  };

  const assignRouteToClients = async (clientIds: string[], routeId: string | null) => {
    if (clientIds.length === 0) {
      return;
    }

    await mutateSnapshot((draft) => {
      draft.clients = draft.clients.map((client) =>
        clientIds.includes(client.id)
          ? {
              ...client,
              manualRouteId: routeId ?? undefined,
              stage: routeId ? client.stage : 'sem-rota'
            }
          : client
      );
      draft.history.unshift(
        createHistoryEntry('bulk-action', `Rota ${routeId ?? 'automatico'} aplicada a ${clientIds.length} clientes.`, {
          entityKind: 'system',
          metadata: {
            total: clientIds.length,
            routeId: routeId ?? 'automatic'
          }
        })
      );
    });
  };

  const createTaskForClients = async (
    clientIds: string[],
    taskInput: Pick<ClientTask, 'title' | 'kind' | 'dueAt' | 'notes' | 'priority'>
  ) => {
    if (clientIds.length === 0) {
      return;
    }

    await mutateSnapshot(
      (draft) => {
        const createdAt = Date.now();
        clientIds.forEach((clientId) => {
          const task: ClientTask = {
            id: createId('task'),
            clientId,
            title: taskInput.title,
            kind: taskInput.kind,
            dueAt: taskInput.dueAt,
            status: 'open',
            notes: taskInput.notes,
            priority: taskInput.priority,
            createdAt
          };
          draft.tasks.unshift(task);
          const client = draft.clients.find((entry) => entry.id === clientId);
          if (client) {
            client.nextActionId = task.id;
            if (client.stage === 'ativo') {
              client.stage = 'aguardando';
            }
          }
        });

        draft.history.unshift(
          createHistoryEntry('task', `Tarefa criada para ${clientIds.length} clientes.`, {
            entityKind: 'system',
            metadata: {
              total: clientIds.length,
              kind: taskInput.kind
            }
          })
        );
      },
      {
        backupReason: 'criar tarefas em lote',
        successMessage: `${clientIds.length} tarefas criadas.`
      }
    );
  };

  const applySnapshot = async (nextSnapshot: AppSnapshot, reason: string) => {
    await commitSnapshot(nextSnapshot, {
      backupReason: reason,
      successMessage: 'Snapshot aplicado com sucesso.',
      preserveLedger: true
    });
  };

  const clearAllData = async () => {
    await commitSnapshot(createEmptySnapshot(), {
      backupReason: 'limpar todos os dados',
      successMessage: 'Painel limpo. O backup anterior foi preservado.'
    });
    setSelectedClientId(null);
    setSelectedClientIdsState([]);
  };

  const saveBackup = async (reason = 'backup manual') => {
    const { persistBackup } = await loadBackupModule();
    await persistBackup(snapshotRef.current, reason, snapshotRef.current.settings.maxBackups);
    pushToast('success', 'Backup salvo em IndexedDB.');
  };

  const deleteBackup = async (id: string) => {
    const { deleteBackupRecord } = await loadDbModule();
    await deleteBackupRecord(id);
    pushToast('info', 'Backup removido.');
  };

  const exportBackup = () => {
    const json = JSON.stringify(snapshotRef.current, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `painel-amg-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (backupSnapshot: AppSnapshot, reason: string) => {
    await commitSnapshot(normalizeSnapshot(backupSnapshot), {
      backupReason: reason,
      successMessage: 'Backup restaurado.',
      preserveLedger: true
    });
  };

  const importClients = async (
    candidates: ClientImportCandidate[],
    fileName: string,
    policy = snapshotRef.current.settings.defaultImportMergePolicy
  ) => {
    const { mergeImportedClients, createImportHistoryEntry } = await loadImportsModule();
    await mutateSnapshot(
      (draft) => {
        const { nextClients, stats } = mergeImportedClients(draft, candidates, policy);
        draft.clients = nextClients;
        draft.history.unshift(
          createImportHistoryEntry(
            'clients',
            `${stats.created} criados, ${stats.merged} mesclados, ${stats.replaced} substituidos, ${stats.ignored} ignorados e ${stats.blocked} bloqueados em ${fileName}.`
          )
        );
      },
      {
        backupReason: `importacao de clientes ${fileName}`,
        successMessage: 'Importacao de clientes aplicada.'
      }
    );
  };

  const importProducts = async (products: AppSnapshot['products'], fileName: string) => {
    const { createImportHistoryEntry } = await loadImportsModule();
    await mutateSnapshot(
      (draft) => {
        const existing = new Map(draft.products.map((product) => [product.sku.toUpperCase(), product]));
        products.forEach((product) => {
          const key = product.sku.toUpperCase();
          const current = existing.get(key);
          if (current) {
            Object.assign(current, product);
          } else {
            draft.products.unshift(product);
          }
        });
        draft.history.unshift(
          createImportHistoryEntry('products', `${products.length} produtos processados de ${fileName}.`)
        );
      },
      {
        backupReason: `importacao de produtos ${fileName}`,
        successMessage: `${products.length} produtos processados.`
      }
    );
  };

  const importSales = async (rows: Array<{ clientId: string; sale: Sale }>, fileName: string) => {
    const { createImportHistoryEntry } = await loadImportsModule();
    await mutateSnapshot(
      (draft) => {
        rows.forEach(({ clientId, sale }) => {
          const client = draft.clients.find((entry) => entry.id === clientId);
          if (!client) {
            return;
          }

          if (!client.compras.some((entry) => entry.id === sale.id)) {
            client.compras.unshift(sale);
            client.totalCompras = client.compras.reduce((total, entry) => total + entry.valor, 0);
          }
        });

        draft.history.unshift(
          createImportHistoryEntry('sales', `${rows.length} vendas importadas de ${fileName}.`)
        );
      },
      {
        backupReason: `importacao de vendas ${fileName}`,
        successMessage: `${rows.length} vendas aplicadas.`
      }
    );
  };

  const loginCloud = async (email: string, password: string) => {
    try {
      const { loginToCloud } = await loadCloudModule();
      await loginToCloud(email, password);
      pushToast('success', 'Login enviado para o Firebase.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no login';
      pushToast('error', message);
      throw error;
    }
  };

  const logoutCloud = async () => {
    try {
      const { logoutFromCloud } = await loadCloudModule();
      await logoutFromCloud();
      pushToast('info', 'Sessao encerrada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao sair';
      pushToast('error', message);
      throw error;
    }
  };

  const syncNow = async (options?: { forceFull?: boolean }) => {
    await runCloudSync(snapshotRef.current, options);
  };

  const openWhatsApp = async (clientId: string, template: WhatsAppTemplate) => {
    const client = snapshotRef.current.clients.find((entry) => entry.id === clientId);
    if (!client) {
      return;
    }

    const [{ commercialProfileForClient }, { buildWhatsAppLink, renderWhatsAppMessage }] =
      await Promise.all([loadCommercialModule(), loadWhatsAppModule()]);

    const profile = commercialProfileForClient(
      client,
      snapshotRef.current.settings.commercialBrackets,
      selectedYear,
      selectedMonth,
      snapshotRef.current.settings.timezone
    );
    const routeDates = routeDepartureInfo(snapshotRef.current.routeDates, client.route?.id);
    const link = buildWhatsAppLink(client, template, profile, routeDates);
    if (!link) {
      pushToast('error', 'Cliente sem telefone valido para abrir o WhatsApp.');
      return;
    }

    const preview = renderWhatsAppMessage(template, client, profile, routeDates);
    await mutateSnapshot((draft) => {
      const targetClient = draft.clients.find((entry) => entry.id === clientId);
      if (!targetClient) {
        return;
      }

      targetClient.contacts.unshift({
        id: createId('contact'),
        timestamp: Date.now(),
        type: 'whatsapp-opened',
        summary: `WhatsApp aberto: ${template.name}`,
        templateId: template.id,
        preview
      });

      draft.history.unshift(
        createHistoryEntry('campaign', `WhatsApp aberto com template ${template.name}.`, {
          clientId,
          entityId: template.id,
          entityKind: 'campaign',
          metadata: {
            template: template.name
          }
        })
      );
    });
    window.open(link.href, '_blank', 'noopener,noreferrer');
  };

  const value: AppContextValue = {
    ready,
    snapshot,
    theme,
    selectedYear,
    selectedMonth,
    globalSearch,
    selectedClientId,
    selectedClientIds,
    cloud,
    toasts,
    setTheme,
    setSelectedYear,
    setSelectedMonth,
    setGlobalSearch,
    openClient,
    setSelectedClientIds,
    toggleClientSelection,
    clearClientSelection,
    createClient,
    dismissToast,
    saveClient,
    deleteClient,
    addNote,
    addContact,
    saveSale,
    deleteSale,
    saveTask,
    updateTaskStatus,
    deleteTask,
    saveSavedView,
    deleteSavedView,
    saveRoute,
    deleteRoute,
    setRouteDates,
    toggleRouteSelection,
    updateSettings,
    applyStageToClients,
    applyPriorityToClients,
    applyTagsToClients,
    assignRouteToClients,
    createTaskForClients,
    applySnapshot,
    clearAllData,
    saveBackup,
    deleteBackup,
    exportBackup,
    restoreBackup,
    importClients,
    importProducts,
    importSales,
    loginCloud,
    logoutCloud,
    syncNow,
    openWhatsApp
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }
  return context;
}
