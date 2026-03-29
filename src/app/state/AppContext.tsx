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
import { createImportHistoryEntry } from '@/shared/lib/imports';
import { readLegacySnapshot, readStoredTheme, writeStoredTheme } from '@/shared/lib/legacy';
import { createEmptySnapshot, normalizeSnapshot, snapshotHasData } from '@/shared/lib/normalize';
import { decorateClientsWithRoutes, routeDepartureInfo } from '@/shared/lib/routes';
import { createId, deepClone, formatDateTime, monthKeyFor } from '@/shared/lib/utils';
import type {
  AppSettings,
  AppSnapshot,
  Client,
  CloudSyncStatus,
  ContactChannel,
  MonthlyRouteSelections,
  RouteDefinition,
  RouteDates,
  Sale,
  ThemeMode,
  WhatsAppTemplate
} from '@/shared/types/domain';

type ToastTone = 'success' | 'error' | 'info';

interface ToastMessage {
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
  cloud: CloudSyncStatus;
  toasts: ToastMessage[];
  setTheme: (theme: ThemeMode) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setGlobalSearch: (value: string) => void;
  openClient: (clientId: string | null) => void;
  createClient: () => void;
  dismissToast: (id: string) => void;
  saveClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addNote: (clientId: string, text: string) => Promise<void>;
  addContact: (clientId: string, type: ContactChannel, summary: string) => Promise<void>;
  saveSale: (clientId: string, sale: Sale) => Promise<void>;
  deleteSale: (clientId: string, saleId: string) => Promise<void>;
  saveRoute: (route: RouteDefinition) => Promise<void>;
  deleteRoute: (routeId: string) => Promise<void>;
  setRouteDates: (routeId: string, dates: RouteDates) => Promise<void>;
  toggleRouteSelection: (routeId: string, clientId: string, checked: boolean) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  applySnapshot: (snapshot: AppSnapshot, reason: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  saveBackup: (reason?: string) => Promise<void>;
  deleteBackup: (id: string) => Promise<void>;
  exportBackup: () => void;
  restoreBackup: (snapshot: AppSnapshot, reason: string) => Promise<void>;
  importClients: (clients: Client[], fileName: string) => Promise<void>;
  importProducts: (products: AppSnapshot['products'], fileName: string) => Promise<void>;
  importSales: (rows: Array<{ clientId: string; sale: Sale }>, fileName: string) => Promise<void>;
  loginCloud: (email: string, password: string) => Promise<void>;
  logoutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
  openWhatsApp: (clientId: string, template: WhatsAppTemplate) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const loadDbModule = () => import('@/shared/lib/db');
const loadBackupModule = () => import('@/shared/lib/backup');
const loadCloudModule = () => import('@/shared/lib/firebase');
const loadCommercialModule = () => import('@/shared/lib/commercial');
const loadWhatsAppModule = () => import('@/shared/lib/whatsapp');

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

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(prepareSnapshot(createEmptySnapshot()));
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [selectedYear, setSelectedYearState] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonthState] = useState<number | null>(null);
  const [globalSearch, setGlobalSearchState] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [cloud, setCloud] = useState<CloudSyncStatus>(createCloudState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const snapshotRef = useRef(snapshot);
  const skipNextCloudSyncRef = useRef(true);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const loadLocalSnapshot = async () => {
    const { loadSnapshotFromDb } = await loadDbModule();
    return loadSnapshotFromDb();
  };

  const persistSnapshotLocally = async (nextSnapshot: AppSnapshot) => {
    const { saveSnapshotToDb } = await loadDbModule();
    await saveSnapshotToDb(nextSnapshot);
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
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      void persistSnapshotLocally(snapshot);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [ready, snapshot]);

  useEffect(() => {
    if (!panelCloudConfig.enabled) return;

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
              const prepared = prepareSnapshot(remoteSnapshot);
              skipNextCloudSyncRef.current = true;
              setSnapshot(prepared);
              await persistSnapshotLocally(prepared);
              setCloud((current) => ({
                ...current,
                permission: 'admin',
                status: 'Sincronizado com Firebase',
                lastSyncedAt: new Date().toISOString(),
                error: null
              }));
              pushToast('success', 'Dados da nuvem carregados com sucesso.');
            } else if (panelCloudConfig.autoUploadLocalDataOnFirstLogin && snapshotHasData(snapshotRef.current)) {
              await cloudModule.saveCloudSnapshot(snapshotRef.current, user);
              setCloud((current) => ({
                ...current,
                permission: 'admin',
                status: 'Primeira sincronizacao concluida',
                lastSyncedAt: new Date().toISOString(),
                error: null
              }));
            } else {
              setCloud((current) => ({
                ...current,
                permission: 'admin',
                status: 'Nuvem vazia. O painel local continua pronto para sincronizar.',
                error: null
              }));
            }
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
    if (!ready || cloud.permission !== 'admin' || !cloud.authUser) return;
    if (skipNextCloudSyncRef.current) {
      skipNextCloudSyncRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      void runCloudSync(snapshot);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [ready, snapshot, cloud.permission, cloud.authUser?.uid]);

  useEffect(() => {
    if (!(import.meta.env.DEV || import.meta.env.MODE === 'test')) return;
    Object.assign(window, {
      __PAINEL_CLIENTES_DEV__: {
        loadSnapshot: async (rawSnapshot: AppSnapshot) => {
          const prepared = prepareSnapshot(rawSnapshot);
          setSnapshot(prepared);
          await persistSnapshotLocally(prepared);
        },
        getSnapshot: () => snapshotRef.current
      }
    });
  }, []);

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

  const commitSnapshot = async (
    nextSnapshot: AppSnapshot,
    options?: {
      backupReason?: string;
      successMessage?: string;
    }
  ) => {
    if (options?.backupReason) {
      const { persistBackup } = await loadBackupModule();
      await persistBackup(snapshotRef.current, options.backupReason);
    }
    const prepared = prepareSnapshot(nextSnapshot);
    snapshotRef.current = prepared;
    setSnapshot(prepared);
    await persistSnapshotLocally(prepared);
    if (options?.successMessage) {
      pushToast('success', options.successMessage);
    }
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

  const runCloudSync = async (nextSnapshot = snapshotRef.current) => {
    if (cloud.permission !== 'admin' || !cloud.authUser) return;
    try {
      setCloud((current) => ({
        ...current,
        isSyncing: true,
        status: 'Sincronizando...',
        error: null
      }));
      const { saveCloudSnapshot } = await loadCloudModule();
      await saveCloudSnapshot(nextSnapshot, cloud.authUser);
      setCloud((current) => ({
        ...current,
        isSyncing: false,
        status: 'Sincronizado com Firebase',
        lastSyncedAt: new Date().toISOString(),
        error: null
      }));
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

  const setTheme = (nextTheme: ThemeMode) => setThemeState(nextTheme);
  const setSelectedYear = (year: number) => setSelectedYearState(year);
  const setSelectedMonth = (month: number | null) => setSelectedMonthState(month);
  const setGlobalSearch = (value: string) => setGlobalSearchState(value);

  const openClient = (clientId: string | null) => setSelectedClientId(clientId);

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
      totalCompras: 0,
      compras: [],
      notes: [],
      contacts: []
    };

    void mutateSnapshot(
      (draft) => {
        draft.clients.unshift(draftClient);
      },
      {
        backupReason: 'criar cliente',
        successMessage: 'Cliente em branco criado para edicao.'
      }
    ).then(() => setSelectedClientId(draftId));
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
          createImportHistoryEntry('backup', `Cliente ${client.nome || client.codigo} salvo manualmente.`)
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
        draft.clients = draft.clients.filter((client) => client.id !== clientId);
      },
      {
        backupReason: 'excluir cliente',
        successMessage: 'Cliente removido.'
      }
    );
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
    }
  };

  const addNote = async (clientId: string, text: string) => {
    if (!text.trim()) return;
    await mutateSnapshot((draft) => {
      const client = draft.clients.find((entry) => entry.id === clientId);
      if (!client) return;
      client.notes.unshift({
        id: createId('note'),
        timestamp: Date.now(),
        text: text.trim()
      });
    });
  };

  const addContact = async (clientId: string, type: ContactChannel, summary: string) => {
    if (!summary.trim()) return;
    await mutateSnapshot((draft) => {
      const client = draft.clients.find((entry) => entry.id === clientId);
      if (!client) return;
      client.contacts.unshift({
        id: createId('contact'),
        timestamp: Date.now(),
        type,
        summary: summary.trim()
      });
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
      },
      {
        backupReason: 'excluir venda',
        successMessage: 'Venda removida.'
      }
    );
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
        draft.routes = draft.routes.filter((route) => route.id !== routeId);
        delete draft.routeDates[routeId];
        Object.keys(draft.routeSelections).forEach((monthKey) => {
          delete draft.routeSelections[monthKey]?.[routeId];
        });
        draft.clients = draft.clients.map((client) =>
          client.manualRouteId === routeId ? { ...client, manualRouteId: undefined } : client
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
    });
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    await mutateSnapshot(
      (draft) => {
        draft.settings = {
          ...draft.settings,
          ...settings
        };
      },
      {
        backupReason: 'atualizar configuracoes',
        successMessage: 'Configuracoes salvas.'
      }
    );
  };

  const applySnapshot = async (nextSnapshot: AppSnapshot, reason: string) => {
    await commitSnapshot(nextSnapshot, {
      backupReason: reason,
      successMessage: 'Snapshot aplicado com sucesso.'
    });
  };

  const clearAllData = async () => {
    await commitSnapshot(prepareSnapshot(createEmptySnapshot()), {
      backupReason: 'limpar todos os dados',
      successMessage: 'Painel limpo. O backup anterior foi preservado.'
    });
  };

  const saveBackup = async (reason = 'backup manual') => {
    const { persistBackup } = await loadBackupModule();
    await persistBackup(snapshotRef.current, reason);
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
    await commitSnapshot(prepareSnapshot(backupSnapshot), {
      backupReason: reason,
      successMessage: 'Backup restaurado.'
    });
  };

  const importClients = async (clients: Client[], fileName: string) => {
    await mutateSnapshot(
      (draft) => {
        draft.clients = [...clients, ...draft.clients];
        draft.history.unshift(
          createImportHistoryEntry('clients', `${clients.length} clientes importados de ${fileName}.`)
        );
      },
      {
        backupReason: `importacao de clientes ${fileName}`,
        successMessage: `${clients.length} clientes adicionados.`
      }
    );
  };

  const importProducts = async (products: AppSnapshot['products'], fileName: string) => {
    await mutateSnapshot(
      (draft) => {
        draft.products = [...products, ...draft.products];
        draft.history.unshift(
          createImportHistoryEntry('products', `${products.length} produtos importados de ${fileName}.`)
        );
      },
      {
        backupReason: `importacao de produtos ${fileName}`,
        successMessage: `${products.length} produtos adicionados.`
      }
    );
  };

  const importSales = async (rows: Array<{ clientId: string; sale: Sale }>, fileName: string) => {
    await mutateSnapshot(
      (draft) => {
        rows.forEach(({ clientId, sale }) => {
          const client = draft.clients.find((entry) => entry.id === clientId);
          if (!client) return;
          client.compras.unshift(sale);
          client.totalCompras = client.compras.reduce((total, entry) => total + entry.valor, 0);
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

  const syncNow = async () => {
    await runCloudSync();
    pushToast('success', `Ultimo sync em ${formatDateTime(new Date())}.`);
  };

  const openWhatsApp = async (clientId: string, template: WhatsAppTemplate) => {
    const client = snapshotRef.current.clients.find((entry) => entry.id === clientId);
    if (!client) return;

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
      if (!targetClient) return;
      targetClient.contacts.unshift({
        id: createId('contact'),
        timestamp: Date.now(),
        type: 'whatsapp-opened',
        summary: `WhatsApp aberto: ${template.name}`,
        templateId: template.id,
        preview
      });
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
    cloud,
    toasts,
    setTheme,
    setSelectedYear,
    setSelectedMonth,
    setGlobalSearch,
    openClient,
    createClient,
    dismissToast,
    saveClient,
    deleteClient,
    addNote,
    addContact,
    saveSale,
    deleteSale,
    saveRoute,
    deleteRoute,
    setRouteDates,
    toggleRouteSelection,
    updateSettings,
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
