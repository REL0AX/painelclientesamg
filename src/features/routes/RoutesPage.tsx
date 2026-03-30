import { useEffect, useMemo, useState } from 'react';
import { Download, ScanSearch } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { worklistsForSnapshot } from '@/shared/lib/analytics';
import { resolveCommercialContext } from '@/shared/lib/commercial';
import { downloadCsv } from '@/shared/lib/export';
import { clientIsSelectedInRouteMonth } from '@/shared/lib/routes';
import { monthKeyFor } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Input, Select, Textarea } from '@/shared/ui/Field';
import type { RouteDefinition } from '@/shared/types/domain';

const emptyRouteForm = {
  id: '',
  name: '',
  type: 'mensal',
  days: '',
  cities: ''
};

export function RoutesPage() {
  const {
    snapshot,
    selectedYear,
    selectedMonth,
    saveRoute,
    deleteRoute,
    setRouteDates,
    toggleRouteSelection,
    openClient,
    assignRouteToClients
  } = useAppContext();
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(snapshot.routes[0]?.id ?? null);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);

  useEffect(() => {
    if (!selectedRouteId && snapshot.routes[0]) {
      setSelectedRouteId(snapshot.routes[0].id);
    }
  }, [selectedRouteId, snapshot.routes]);

  const selectedRoute = snapshot.routes.find((route) => route.id === selectedRouteId) ?? null;
  const commercialContext = resolveCommercialContext(selectedYear, selectedMonth, snapshot.settings.timezone);
  const monthKey = monthKeyFor(commercialContext.year, commercialContext.month);
  const routeClients = snapshot.clients.filter((client) => client.route?.id === selectedRoute?.id);
  const routeDates = selectedRoute ? snapshot.routeDates[selectedRoute.id] : null;
  const coverageWorklists = useMemo(
    () => worklistsForSnapshot(snapshot, selectedYear, selectedMonth),
    [selectedMonth, selectedYear, snapshot]
  );
  const outsideCoverage = coverageWorklists.find((item) => item.id === 'fora-da-malha')?.clients ?? [];
  const routesWithoutCoverage = coverageWorklists.find((item) => item.id === 'rota-sem-cobertura')?.clients ?? [];

  useEffect(() => {
    if (!selectedRoute) {
      setRouteForm(emptyRouteForm);
      return;
    }

    setRouteForm({
      id: selectedRoute.id,
      name: selectedRoute.name,
      type: selectedRoute.frequency.type,
      days: selectedRoute.frequency.days.join(','),
      cities: selectedRoute.cities.join(', ')
    });
  }, [selectedRoute?.id]);

  const saveCurrentRoute = async () => {
    const route: RouteDefinition = {
      id: routeForm.id || `route-${Date.now()}`,
      name: routeForm.name,
      cities: routeForm.cities
        .split(',')
        .map((city) => city.trim())
        .filter(Boolean),
      frequency: {
        type: routeForm.type as RouteDefinition['frequency']['type'],
        days: routeForm.days
          .split(',')
          .map((day) => Number(day.trim()))
          .filter((day) => Number.isFinite(day))
      }
    };
    await saveRoute(route);
    setSelectedRouteId(route.id);
  };

  const exportRouteAgenda = () => {
    if (!selectedRoute) {
      return;
    }

    downloadCsv(
      routeClients.map((client) => ({
        cliente: client.nome,
        codigo: client.codigo,
        cidade: client.cidade,
        uf: client.uf,
        rota: selectedRoute.name,
        prazo: routeDates?.deadline || '',
        saida: routeDates?.departure || '',
        selecionado_no_mes: clientIsSelectedInRouteMonth(snapshot.routeSelections, monthKey, selectedRoute.id, client.id) ? 'sim' : 'nao'
      })),
      `rota-${selectedRoute.name.toLowerCase().replace(/\s+/g, '-')}-${commercialContext.label}.csv`
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_1.25fr]">
      <Card className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Rotas</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Operacao conectada ao cliente</h2>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedRouteId(null);
              setRouteForm(emptyRouteForm);
            }}
          >
            Nova rota
          </Button>
        </div>

        <div className="space-y-3">
          {snapshot.routes.length > 0 ? (
            snapshot.routes.map((route) => (
              <button
                key={route.id}
                type="button"
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  route.id === selectedRouteId
                    ? 'border-[var(--accent-400)] bg-orange-50'
                    : 'border-[var(--line)] bg-white hover:bg-[var(--panel-subtle)]'
                }`}
                onClick={() => setSelectedRouteId(route.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">{route.name}</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">
                      {route.cities.length} cidades • {route.frequency.type}
                    </p>
                  </div>
                  <div className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-700)]">
                    {snapshot.clients.filter((client) => client.route?.id === route.id).length} clientes
                  </div>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="Sem rotas" description="Crie a primeira rota para organizar agenda, prazo e selecao mensal de clientes." />
          )}
        </div>

        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-subtle)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Nome</FieldLabel>
              <Input value={routeForm.name} onChange={(event) => setRouteForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <FieldLabel>Frequencia</FieldLabel>
              <Select value={routeForm.type} onChange={(event) => setRouteForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
                <option value="personalizado">Personalizado</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Dias (personalizado)</FieldLabel>
              <Input value={routeForm.days} onChange={(event) => setRouteForm((current) => ({ ...current, days: event.target.value }))} placeholder="1, 3, 5" />
            </div>
            <div>
              <FieldLabel>Contexto comercial</FieldLabel>
              <Input value={commercialContext.label} readOnly />
            </div>
          </div>
          <div className="mt-4">
            <FieldLabel>Cidades</FieldLabel>
            <Textarea value={routeForm.cities} onChange={(event) => setRouteForm((current) => ({ ...current, cities: event.target.value }))} rows={4} placeholder="Separe por virgula: Sao Paulo, Campinas, Sorocaba" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => void saveCurrentRoute()}>Salvar rota</Button>
            {selectedRoute ? (
              <Button variant="danger" onClick={() => void deleteRoute(selectedRoute.id)}>
                Excluir rota
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Agenda da rota</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{selectedRoute?.name ?? 'Selecione uma rota'}</h2>
              <p className="mt-2 text-sm text-[var(--ink-600)]">
                Prazo, saida e clientes sinalizados para {commercialContext.label}.
              </p>
            </div>
            {selectedRoute ? (
              <Button variant="secondary" onClick={exportRouteAgenda}>
                <Download className="mr-2 h-4 w-4" />
                Exportar agenda
              </Button>
            ) : null}
          </div>

          {selectedRoute ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>Prazo do pedido</FieldLabel>
                  <Input
                    type="date"
                    value={routeDates?.deadline ?? ''}
                    onChange={(event) =>
                      void setRouteDates(selectedRoute.id, {
                        deadline: event.target.value,
                        departure: routeDates?.departure ?? ''
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Saida da rota</FieldLabel>
                  <Input
                    type="date"
                    value={routeDates?.departure ?? ''}
                    onChange={(event) =>
                      void setRouteDates(selectedRoute.id, {
                        deadline: routeDates?.deadline ?? '',
                        departure: event.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    void Promise.all(routeClients.map((client) => toggleRouteSelection(selectedRoute.id, client.id, true)))
                  }
                >
                  Marcar todos
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void Promise.all(routeClients.map((client) => toggleRouteSelection(selectedRoute.id, client.id, false)))
                  }
                >
                  Limpar todos
                </Button>
              </div>

              <div className="space-y-3">
                {routeClients.length > 0 ? (
                  routeClients.map((client) => {
                    const checked = clientIsSelectedInRouteMonth(snapshot.routeSelections, monthKey, selectedRoute.id, client.id);
                    return (
                      <div key={client.id} className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
                        <div>
                          <p className="font-semibold text-[var(--ink-900)]">{client.nome}</p>
                          <p className="text-sm text-[var(--ink-600)]">
                            {client.cidade || 'Sem cidade'} / {client.uf || '--'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" onClick={() => openClient(client.id)}>
                            <ScanSearch className="mr-2 h-4 w-4" />
                            360
                          </Button>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => void toggleRouteSelection(selectedRoute.id, client.id, event.target.checked)}
                            className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent-600)]"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState title="Sem clientes na rota" description="Associe cidades ou defina rota manual nos clientes para preencher esta lista." />
                )}
              </div>
            </>
          ) : (
            <EmptyState title="Nenhuma rota selecionada" description="Escolha uma rota ao lado para editar agenda e marcar clientes do mes." />
          )}
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Cobertura</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Malha operacional</h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
              <p className="font-semibold text-[var(--ink-900)]">Clientes fora da malha</p>
              <div className="mt-3 space-y-2">
                {outsideCoverage.slice(0, 6).map((client) => (
                  <div key={client.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--panel-subtle)] px-3 py-3">
                    <div>
                      <p className="font-semibold text-[var(--ink-900)]">{client.nome}</p>
                      <p className="text-sm text-[var(--ink-600)]">{client.cidade || 'Sem cidade'}</p>
                    </div>
                    {selectedRoute ? (
                      <Button variant="ghost" onClick={() => void assignRouteToClients([client.id], selectedRoute.id)}>
                        Vincular
                      </Button>
                    ) : null}
                  </div>
                ))}
                {outsideCoverage.length === 0 ? <p className="text-sm text-[var(--ink-600)]">Nenhum cliente fora da malha.</p> : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
              <p className="font-semibold text-[var(--ink-900)]">Rotas sem cobertura</p>
              <div className="mt-3 space-y-2">
                {routesWithoutCoverage.slice(0, 6).map((client) => (
                  <div key={client.id} className="rounded-2xl bg-[var(--panel-subtle)] px-3 py-3">
                    <p className="font-semibold text-[var(--ink-900)]">{client.nome}</p>
                    <p className="text-sm text-[var(--ink-600)]">{client.cidade || 'Sem cidade'}</p>
                  </div>
                ))}
                {routesWithoutCoverage.length === 0 ? <p className="text-sm text-[var(--ink-600)]">Todas as rotas tem clientes vinculados.</p> : null}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
