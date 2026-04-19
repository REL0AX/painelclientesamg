import { lazy, Suspense } from 'react';
import {
  BellRing,
  Cloud,
  LayoutGrid,
  ListTodo,
  MessageCircleMore,
  MoonStar,
  Package2,
  Plus,
  RouteIcon,
  Settings2,
  ShieldCheck,
  SunMedium,
  Upload
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { CommandPalette } from '@/app/layout/CommandPalette';
import { useAppContext } from '@/app/state/AppContext';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { cn, formatDateTime } from '@/shared/lib/utils';

const GlobalClientOmnibox = lazy(() =>
  import('@/features/search/GlobalClientOmnibox').then((module) => ({ default: module.GlobalClientOmnibox }))
);

const ClientDrawer = lazy(() =>
  import('@/features/client360/ClientDrawer').then((module) => ({ default: module.ClientDrawer }))
);

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/clientes', label: 'Clientes', icon: BellRing },
  { to: '/rotas', label: 'Rotas', icon: RouteIcon },
  { to: '/produtos', label: 'Produtos', icon: Package2 },
  { to: '/tarefas', label: 'Tarefas', icon: ListTodo },
  { to: '/campanhas', label: 'Campanhas', icon: MessageCircleMore },
  { to: '/importacoes', label: 'Importacoes', icon: Upload },
  { to: '/diagnostico', label: 'Diagnostico', icon: ShieldCheck },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings2 }
];

const preloaders: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/features/dashboard/DashboardPage'),
  '/clientes': () => import('@/features/clients/ClientsPage'),
  '/rotas': () => import('@/features/routes/RoutesPage'),
  '/produtos': () => import('@/features/products/ProductsPage'),
  '/tarefas': () => import('@/features/tasks/TasksPage'),
  '/campanhas': () => import('@/features/campaigns/CampaignsPage'),
  '/importacoes': () => import('@/features/imports/ImportsPage'),
  '/diagnostico': () => import('@/features/diagnostics/DiagnosticsPage'),
  '/configuracoes': () => import('@/features/settings/SettingsPage')
};

export function AppShell() {
  const {
    cloud,
    selectedYear,
    selectedMonth,
    setSelectedYear,
    setSelectedMonth,
    theme,
    setTheme,
    createClient,
    selectedClientId,
    snapshot,
    toasts,
    dismissToast
  } = useAppContext();

  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const currentScopeLabel = selectedMonth === null ? `Ano inteiro ${selectedYear}` : `${monthLabels[selectedMonth]}/${selectedYear}`;
  const savedClientViews = snapshot.savedViews.filter((view) => view.scope === 'clients').length;

  return (
    <div className="page-shell">
      <div className="glass-grid pointer-events-none fixed inset-0 opacity-70" />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[270px_1fr] lg:px-6">
        <aside className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-[28px] bg-[var(--bg-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-500)]">AMG</p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Painel Clientes</h1>
            <p className="mt-2 text-sm text-[var(--ink-600)]">
              CRM operacional local-first com rotas, campanhas manuais, tarefas e sinais do cliente em uma visao unica.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onMouseEnter={() => void preloaders[item.to]?.()}
                onFocus={() => void preloaders[item.to]?.()}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[var(--ink-900)] text-white shadow-lg shadow-slate-900/15'
                      : 'text-[var(--ink-700)] hover:bg-[var(--panel-subtle)]'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--panel-subtle)] p-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-[var(--accent-600)]" />
              <p className="text-sm font-semibold text-[var(--ink-900)]">Nuvem</p>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-600)]">{cloud.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                tone={
                  cloud.error
                    ? 'danger'
                    : cloud.permission === 'admin'
                      ? 'success'
                      : cloud.permission === 'blocked'
                        ? 'warning'
                        : 'neutral'
                }
              >
                {cloud.permission}
              </Badge>
              {cloud.lastSyncedAt ? <Badge tone="info">Sync {formatDateTime(cloud.lastSyncedAt)}</Badge> : null}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--panel-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--ink-900)]">Operacao</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="info">{snapshot.tasks.filter((task) => task.status === 'open').length} tarefas abertas</Badge>
              <Badge tone="warning">{snapshot.clients.filter((client) => !client.route?.id).length} sem rota</Badge>
              <Badge tone="success">
                {snapshot.settings.whatsappTemplates.filter((template) => template.enabled).length} templates ativos
              </Badge>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--panel-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--ink-900)]">Recorte atual</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--ink-700)]">
              <div className="flex items-center justify-between gap-3">
                <span>Periodo</span>
                <span className="font-semibold text-[var(--ink-900)]">{currentScopeLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Clientes na base</span>
                <span className="font-semibold text-[var(--ink-900)]">{snapshot.clients.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Views salvas</span>
                <span className="font-semibold text-[var(--ink-900)]">{savedClientViews}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6 py-1">
          <header className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                <Suspense
                  fallback={
                    <div className="flex w-full max-w-2xl items-center gap-3 rounded-[28px] border border-[var(--line)] bg-white/90 px-4 py-3 shadow-sm">
                      <span className="h-4 w-4 rounded-full bg-[var(--panel-subtle)]" />
                      <span className="text-sm text-[var(--ink-500)]">Carregando busca global...</span>
                    </div>
                  }
                >
                  <GlobalClientOmnibox />
                </Suspense>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth ?? 'all'}
                    onChange={(event) =>
                      setSelectedMonth(event.target.value === 'all' ? null : Number(event.target.value))
                    }
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none"
                  >
                    <option value="all">Ano inteiro</option>
                    {monthLabels.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <CommandPalette />
                <Button variant="secondary" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                  {theme === 'light' ? <MoonStar className="mr-2 h-4 w-4" /> : <SunMedium className="mr-2 h-4 w-4" />}
                  {theme === 'light' ? 'Escuro' : 'Claro'}
                </Button>
                <Button onClick={createClient}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo cliente
                </Button>
              </div>
            </div>
          </header>

          <Outlet />
        </main>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur',
              toast.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
              toast.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
              toast.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{toast.message}</p>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70"
                onClick={() => dismissToast(toast.id)}
              >
                fechar
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedClientId ? (
        <Suspense fallback={null}>
          <ClientDrawer />
        </Suspense>
      ) : null}
    </div>
  );
}

