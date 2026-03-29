import { BellRing, Cloud, LayoutGrid, MoonStar, RouteIcon, Settings2, SunMedium, Upload, Package2, Plus } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '@/app/state/AppContext';
import { ClientDrawer } from '@/features/client360/ClientDrawer';
import { GlobalClientOmnibox } from '@/features/search/GlobalClientOmnibox';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { cn, formatDateTime } from '@/shared/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
  { to: '/clientes', label: 'Clientes', icon: BellRing },
  { to: '/rotas', label: 'Rotas', icon: RouteIcon },
  { to: '/produtos', label: 'Produtos', icon: Package2 },
  { to: '/importacoes', label: 'Importacoes', icon: Upload },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings2 }
];

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
    toasts,
    dismissToast
  } = useAppContext();

  const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index);

  return (
    <div className="page-shell">
      <div className="glass-grid fixed inset-0 pointer-events-none opacity-70" />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[270px_1fr] lg:px-6">
        <aside className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-[28px] bg-[var(--bg-strong)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-500)]">AMG</p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Painel Clientes</h1>
            <p className="mt-2 text-sm text-[var(--ink-600)]">
              Comercial, relacionamento, rotas e sinais do cliente em uma visao unica.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
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
        </aside>

        <main className="space-y-6 py-1">
          <header className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                <GlobalClientOmnibox />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none"
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
                    className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none"
                  >
                    <option value="all">Ano inteiro</option>
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(
                      (label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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

      <ClientDrawer />
    </div>
  );
}
