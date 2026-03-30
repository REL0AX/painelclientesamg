import { ArrowUpRight, BadgeAlert, CalendarClock, ChartNoAxesCombined, MessageCircleMore, RouteIcon, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/app/state/AppContext';
import { useDashboardInsights } from '@/features/dashboard/useDashboardInsights';
import { ClientListItem } from '@/features/clients/ClientListItem';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatCard } from '@/shared/ui/StatCard';
import { formatCurrency, formatDateTime } from '@/shared/lib/utils';

export function DashboardPage() {
  const { snapshot } = useAppContext();
  const { summary, worklists } = useDashboardInsights();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Clientes" value={String(summary.totalClients)} hint="Base ativa no painel" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Ativos no mes" value={String(summary.activeClientsInCommercialMonth)} hint="Clientes com compras no mes comercial" icon={<ChartNoAxesCombined className="h-5 w-5" />} />
        <StatCard label="Faturamento" value={formatCurrency(summary.commercialRevenue)} hint="Acumulado do mes comercial" icon={<ArrowUpRight className="h-5 w-5" />} />
        <StatCard label="Ticket medio" value={formatCurrency(summary.avgTicket)} hint="Baseado no volume do mes" icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Perto da proxima" value={String(summary.clientsNearNextBracket)} hint="Clientes com oportunidade imediata" icon={<BadgeAlert className="h-5 w-5" />} />
        <StatCard label="Em risco" value={String(summary.atRiskClients)} hint="Clientes com compra parada" icon={<MessageCircleMore className="h-5 w-5" />} />
        <StatCard label="Tarefas vencidas" value={String(summary.overdueTasks)} hint="Retornos e follow-ups atrasados" icon={<RouteIcon className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Worklists</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Acoes prontas para atacar agora</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/campanhas" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)] shadow-sm transition hover:border-[var(--accent-400)]">
                Campanhas
              </Link>
              <Link to="/tarefas" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)] shadow-sm transition hover:border-[var(--accent-400)]">
                Tarefas
              </Link>
            </div>
          </div>

          {worklists.map((worklist) => (
            <Card key={worklist.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--ink-900)]">{worklist.title}</h3>
                  <p className="mt-2 text-sm text-[var(--ink-600)]">{worklist.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-sm font-semibold text-[var(--ink-900)]">
                    {worklist.clients.length}
                  </div>
                  <Link
                    to={`/clientes?signal=${worklist.signal}`}
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-600)]"
                  >
                    abrir filtro
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {worklist.clients.length > 0 ? (
                  worklist.clients.slice(0, 4).map((client) => (
                    <ClientListItem key={client.id} client={client} compact />
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-600)]">
                    Nenhum cliente nesta worklist agora.
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Historico</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--ink-900)]">Ultimos eventos do painel</h3>
            <div className="mt-4 space-y-3">
              {snapshot.history.length > 0 ? (
                snapshot.history.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-[22px] bg-[var(--panel-subtle)] p-4">
                    <p className="text-sm font-semibold text-[var(--ink-900)]">{item.summary}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
                      {item.type} • {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem historico ainda" description="Quando voce importar planilhas, editar clientes ou abrir campanhas, os eventos vao aparecer aqui." />
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

