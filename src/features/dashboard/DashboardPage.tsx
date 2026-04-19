import {
  ArrowUpRight,
  BadgeAlert,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronRight,
  CloudOff,
  MessageCircleMore,
  RouteIcon,
  Settings2,
  Upload,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/app/state/AppContext';
import { ClientListItem } from '@/features/clients/ClientListItem';
import { useDashboardInsights } from '@/features/dashboard/useDashboardInsights';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatCard } from '@/shared/ui/StatCard';
import { formatCurrency, formatDateTime } from '@/shared/lib/utils';
import type { WorklistItem } from '@/shared/types/domain';

function FeaturedWorklistCard({ worklist }: { worklist: WorklistItem }) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Worklist</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--ink-900)]">{worklist.title}</h3>
          <p className="mt-2 text-sm text-[var(--ink-600)]">{worklist.description}</p>
        </div>
        <div className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-sm font-semibold text-[var(--ink-900)]">
          {worklist.clients.length}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {worklist.clients.slice(0, 3).map((client) => (
          <ClientListItem key={client.id} client={client} compact />
        ))}
      </div>

      <div className="mt-4">
        <Link
          to={`/clientes?signal=${worklist.signal}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-600)]"
        >
          Abrir lista
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function QueueWorklistCard({ worklist }: { worklist: WorklistItem }) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ink-900)]">{worklist.title}</h3>
          <p className="mt-2 text-sm text-[var(--ink-600)]">{worklist.description}</p>
        </div>
        <div className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-sm font-semibold text-[var(--ink-900)]">
          {worklist.clients.length}
        </div>
      </div>

      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
        {worklist.clients.length > 0
          ? worklist.clients
              .slice(0, 2)
              .map((client) => client.nome || client.codigo)
              .join(' • ')
          : 'Sem clientes nesta fila agora'}
      </p>

      <div className="mt-4">
        <Link
          to={`/clientes?signal=${worklist.signal}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-600)]"
        >
          Ver clientes
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { snapshot, cloud, selectedYear, selectedMonth } = useAppContext();
  const { summary, worklists } = useDashboardInsights();
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const periodLabel = selectedMonth === null ? `Ano inteiro ${selectedYear}` : `${monthLabels[selectedMonth]}/${selectedYear}`;
  const populatedWorklists = [...worklists].filter((worklist) => worklist.clients.length > 0).sort((a, b) => b.clients.length - a.clients.length);
  const featuredWorklists = populatedWorklists.slice(0, 3);
  const queueWorklists = populatedWorklists.slice(3, 9);
  const hasClients = snapshot.clients.length > 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Resumo da operacao</p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--ink-900)]">Painel pronto para uso diario</h2>
          <p className="mt-3 max-w-2xl text-sm text-[var(--ink-600)]">
            Recorte atual em <span className="font-semibold text-[var(--ink-900)]">{periodLabel}</span>. Use o dashboard para abrir as listas mais urgentes e cair direto na acao.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Base ativa</p>
              <p className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{summary.totalClients}</p>
              <p className="mt-2 text-sm text-[var(--ink-600)]">Clientes carregados no painel</p>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Sem rota</p>
              <p className="mt-2 text-2xl font-bold text-[var(--ink-900)]">
                {snapshot.clients.filter((client) => !client.route?.id).length}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-600)]">Clientes ainda fora da operacao</p>
            </div>
            <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Modo atual</p>
              <p className="mt-2 text-2xl font-bold text-[var(--ink-900)]">
                {cloud.permission === 'admin' ? 'Online' : 'Local'}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-600)]">
                {cloud.permission === 'admin' ? 'Base sincronizada com Firebase' : 'Entre no Firebase para sincronizar'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/clientes"
              className="inline-flex items-center rounded-2xl bg-[var(--accent-600)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[var(--accent-500)]"
            >
              Abrir carteira
            </Link>
            <Link
              to="/campanhas"
              className="inline-flex items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent-400)]"
            >
              Campanhas manuais
            </Link>
            <Link
              to="/rotas"
              className="inline-flex items-center rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent-400)]"
            >
              Ajustar rotas
            </Link>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Proximo passo</p>
          {hasClients ? (
            <>
              <h3 className="text-2xl font-bold text-[var(--ink-900)]">Fila preparada para o operador</h3>
              <p className="text-sm text-[var(--ink-600)]">
                {cloud.permission === 'admin'
                  ? 'A nuvem esta conectada. O painel ja pode ser usado como rotina principal.'
                  : 'O painel esta funcional em modo local, mas o sync so volta depois do login em Configuracoes.'}
              </p>
              {cloud.permission !== 'admin' ? (
                <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-700)]">
                  <div className="flex items-start gap-3">
                    <CloudOff className="mt-0.5 h-4 w-4 text-[var(--accent-600)]" />
                    <div>
                      <p className="font-semibold text-[var(--ink-900)]">Sync pausado</p>
                      <p className="mt-1">Entre com seu admin no Firebase quando quiser voltar a sincronizar a base.</p>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3">
                <Link
                  to="/tarefas"
                  className="flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[var(--accent-400)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">Tarefas e retornos</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">Organize follow-ups, visitas e pendencias.</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--ink-500)]" />
                </Link>
                <Link
                  to="/configuracoes"
                  className="flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[var(--accent-400)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">Templates e thresholds</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">Ajuste sinais automaticos, tabela comercial e WhatsApp.</p>
                  </div>
                  <Settings2 className="h-4 w-4 text-[var(--ink-500)]" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-[var(--ink-900)]">Base ainda vazia</h3>
              <p className="text-sm text-[var(--ink-600)]">
                O painel ja esta pronto, mas precisa de uma base importada para mostrar worklists, campanhas e comerciais.
              </p>
              <div className="grid gap-3">
                <Link
                  to="/importacoes"
                  className="flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[var(--accent-400)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">Importar planilhas</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">Traga clientes e vendas para montar a operacao.</p>
                  </div>
                  <Upload className="h-4 w-4 text-[var(--ink-500)]" />
                </Link>
                <Link
                  to="/configuracoes"
                  className="flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[var(--accent-400)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">Conectar a nuvem</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">Entre com seu admin para sincronizar a base online.</p>
                  </div>
                  <Settings2 className="h-4 w-4 text-[var(--ink-500)]" />
                </Link>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Clientes" value={String(summary.totalClients)} hint="Base ativa no painel" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Ativos no mes" value={String(summary.activeClientsInCommercialMonth)} hint="Clientes com compras no mes comercial" icon={<ChartNoAxesCombined className="h-5 w-5" />} />
        <StatCard label="Faturamento" value={formatCurrency(summary.commercialRevenue)} hint="Acumulado do mes comercial" icon={<ArrowUpRight className="h-5 w-5" />} />
        <StatCard label="Ticket medio" value={formatCurrency(summary.avgTicket)} hint="Baseado no volume do mes" icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="Perto da proxima" value={String(summary.clientsNearNextBracket)} hint="Clientes com oportunidade imediata" icon={<BadgeAlert className="h-5 w-5" />} />
        <StatCard label="Em risco" value={String(summary.atRiskClients)} hint="Clientes com compra parada" icon={<MessageCircleMore className="h-5 w-5" />} />
        <StatCard label="Tarefas vencidas" value={String(summary.overdueTasks)} hint="Retornos e follow-ups atrasados" icon={<RouteIcon className="h-5 w-5" />} />
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Prioridades</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">O que atacar primeiro</h2>
          </div>
          <Link
            to="/clientes"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent-400)]"
          >
            Ver carteira completa
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredWorklists.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {featuredWorklists.map((worklist) => (
              <FeaturedWorklistCard key={worklist.id} worklist={worklist} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem worklists acionaveis agora"
            description="Quando a base tiver clientes com sinais, o painel prioriza aqui as listas com maior impacto operacional."
            action={
              <Link
                to="/importacoes"
                className="inline-flex items-center rounded-2xl bg-[var(--accent-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-500)]"
              >
                Ir para importacoes
              </Link>
            }
          />
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Fila operacional</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Outras listas prontas</h2>
          </div>
          {queueWorklists.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {queueWorklists.map((worklist) => (
                <QueueWorklistCard key={worklist.id} worklist={worklist} />
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-sm text-[var(--ink-600)]">Nenhuma fila adicional precisa de destaque no momento.</p>
            </Card>
          )}
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
                <EmptyState
                  title="Sem historico ainda"
                  description="Quando voce importar planilhas, editar clientes ou abrir campanhas, os eventos vao aparecer aqui."
                />
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
