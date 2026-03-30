import { useDeferredValue, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Layers3, Save, Tags, Trash2 } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { ClientListItem } from '@/features/clients/ClientListItem';
import { useClientSearchResults } from '@/features/search/useClientSearchResults';
import { clientSelectionForSignal, clientSignals } from '@/shared/lib/analytics';
import { downloadCsv } from '@/shared/lib/export';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Input, Select } from '@/shared/ui/Field';
import type { SavedView } from '@/shared/types/domain';

const paramValue = (value: string | null) => value ?? 'all';

export function ClientsPage() {
  const {
    snapshot,
    selectedYear,
    selectedMonth,
    selectedClientIds,
    toggleClientSelection,
    clearClientSelection,
    setSelectedClientIds,
    saveSavedView,
    deleteSavedView,
    applyStageToClients,
    applyPriorityToClients,
    applyTagsToClients,
    assignRouteToClients,
    createTaskForClients
  } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchResults = useClientSearchResults();
  const [viewLabel, setViewLabel] = useState('');
  const [bulkStage, setBulkStage] = useState('ativo');
  const [bulkPriority, setBulkPriority] = useState('media');
  const [bulkRouteId, setBulkRouteId] = useState('automatic');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkTaskTitle, setBulkTaskTitle] = useState('');

  const filters = {
    route: paramValue(searchParams.get('route')),
    signal: paramValue(searchParams.get('signal')),
    stage: paramValue(searchParams.get('stage')),
    priority: paramValue(searchParams.get('priority')),
    name: searchParams.get('q') ?? ''
  };

  const deferredNameFilter = useDeferredValue(filters.name);
  const specialSignalSelection = useMemo(() => {
    if (filters.signal === 'fora-da-malha' || filters.signal === 'rota-sem-cobertura') {
      return new Set(
        clientSelectionForSignal(snapshot, filters.signal, selectedYear, selectedMonth).map((client) => client.id)
      );
    }
    return null;
  }, [filters.signal, selectedMonth, selectedYear, snapshot]);

  const updateParams = (next: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key === 'name' ? 'q' : key);
      } else {
        params.set(key === 'name' ? 'q' : key, value);
      }
    });
    setSearchParams(params, {
      replace: true
    });
  };

  const filteredClients = useMemo(() => {
    return searchResults.filter((client) => {
      const matchesName =
        deferredNameFilter.trim().length === 0 ||
        client.nome.toLowerCase().includes(deferredNameFilter.trim().toLowerCase()) ||
        client.codigo.toLowerCase().includes(deferredNameFilter.trim().toLowerCase());
      const matchesRoute = filters.route === 'all' || client.route?.id === filters.route;
      const matchesStage = filters.stage === 'all' || client.stage === filters.stage;
      const matchesPriority = filters.priority === 'all' || client.priority === filters.priority;
      const signals = clientSignals(client, snapshot, selectedYear, selectedMonth);
      const matchesSignal =
        filters.signal === 'all' ||
        (specialSignalSelection
          ? specialSignalSelection.has(client.id)
          : signals.some((signal) => signal.id === filters.signal));
      return matchesName && matchesRoute && matchesSignal && matchesStage && matchesPriority;
    });
  }, [
    deferredNameFilter,
    filters.priority,
    filters.route,
    filters.signal,
    filters.stage,
    searchResults,
    selectedMonth,
    selectedYear,
    specialSignalSelection,
    snapshot
  ]);

  const savedClientViews = snapshot.savedViews.filter((view) => view.scope === 'clients');
  const selectedSet = new Set(selectedClientIds);

  const applySavedView = (view: SavedView) => {
    updateParams({
      route: String(view.filters.route ?? 'all'),
      signal: String(view.filters.signal ?? 'all'),
      stage: String(view.filters.stage ?? 'all'),
      priority: String(view.filters.priority ?? 'all'),
      name: String(view.filters.name ?? '')
    });
  };

  const saveCurrentView = async () => {
    if (!viewLabel.trim()) {
      return;
    }

    await saveSavedView({
      id: `view-${Date.now()}`,
      scope: 'clients',
      label: viewLabel.trim(),
      filters,
      sort: 'manual',
      createdAt: Date.now()
    });
    setViewLabel('');
  };

  const handleExport = () => {
    downloadCsv(
      filteredClients.map((client) => ({
        codigo: client.codigo,
        nome: client.nome,
        cidade: client.cidade,
        uf: client.uf,
        rota: client.route?.name || '',
        estagio: client.stage,
        prioridade: client.priority,
        tags: client.tags.join(', '),
        telefone1: client.telefone1,
        telefone2: client.telefone2
      })),
      `clientes-filtrados-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleBulkTask = async () => {
    if (!bulkTaskTitle.trim() || selectedClientIds.length === 0) {
      return;
    }

    await createTaskForClients(selectedClientIds, {
      title: bulkTaskTitle.trim(),
      kind: 'retorno',
      dueAt: new Date().toISOString(),
      notes: 'Criada pela tela de clientes.',
      priority: 'media'
    });
    setBulkTaskTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-5">
        <div>
          <FieldLabel>Filtro por nome</FieldLabel>
          <Input
            value={filters.name}
            onChange={(event) => updateParams({ name: event.target.value })}
            placeholder="Nome ou codigo"
          />
        </div>
        <div>
          <FieldLabel>Rota</FieldLabel>
          <Select value={filters.route} onChange={(event) => updateParams({ route: event.target.value })}>
            <option value="all">Todas</option>
            {snapshot.routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Sinal</FieldLabel>
          <Select value={filters.signal} onChange={(event) => updateParams({ signal: event.target.value })}>
            <option value="all">Todos</option>
            <option value="sem-compra-recente">Sem compra recente</option>
            <option value="em-risco">Em risco</option>
            <option value="perto-da-proxima-tabela">Perto da proxima tabela</option>
            <option value="sem-telefone">Sem telefone</option>
            <option value="sem-rota">Sem rota</option>
            <option value="saida-de-rota-proxima">Saida de rota proxima</option>
            <option value="tarefa-vencida">Tarefa vencida</option>
            <option value="cliente-prioritario">Cliente prioritario</option>
            <option value="aguardando-retorno">Aguardando retorno</option>
            <option value="fora-da-malha">Fora da malha</option>
            <option value="rota-sem-cobertura">Rota sem cobertura</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Estagio</FieldLabel>
          <Select value={filters.stage} onChange={(event) => updateParams({ stage: event.target.value })}>
            <option value="all">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="reativar">Reativar</option>
            <option value="negociando">Negociando</option>
            <option value="aguardando">Aguardando</option>
            <option value="sem-rota">Sem rota</option>
            <option value="prioritario">Prioritario</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Prioridade</FieldLabel>
          <Select value={filters.priority} onChange={(event) => updateParams({ priority: event.target.value })}>
            <option value="all">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Views salvas</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Listas prontas de acao</h2>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input value={viewLabel} onChange={(event) => setViewLabel(event.target.value)} placeholder="Nome da vista atual" />
            <Button onClick={() => void saveCurrentView()}>
              <Save className="mr-2 h-4 w-4" />
              Salvar vista
            </Button>
          </div>

          <div className="space-y-3">
            {savedClientViews.length > 0 ? (
              savedClientViews.map((view) => (
                <div key={view.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--line)] bg-white p-4">
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">{view.label}</p>
                    <p className="mt-1 text-sm text-[var(--ink-600)]">
                      rota {String(view.filters.route ?? 'all')} • sinal {String(view.filters.signal ?? 'all')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => applySavedView(view)}>
                      <Layers3 className="mr-2 h-4 w-4" />
                      Aplicar
                    </Button>
                    <Button variant="ghost" onClick={() => void deleteSavedView(view.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/60 p-4 text-sm text-[var(--ink-600)]">
                Salve combinacoes de filtros para usar como worklists persistentes.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Bulk actions</p>
              <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{selectedClientIds.length} selecionados</h2>
              <p className="mt-2 text-sm text-[var(--ink-600)]">Mude estagio, prioridade, rota, tags e tarefas em lote.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setSelectedClientIds(filteredClients.map((client) => client.id))}>
                Selecionar visiveis
              </Button>
              <Button variant="ghost" onClick={clearClientSelection}>
                Limpar selecao
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] bg-[var(--panel-subtle)] px-4 py-3 text-sm text-[var(--ink-700)]">
            {filteredClients.length} clientes no filtro atual. Os filtros desta tela ficam refletidos na URL para navegar entre worklists e atalhos sem perder contexto.
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <FieldLabel>Estagio</FieldLabel>
              <Select value={bulkStage} onChange={(event) => setBulkStage(event.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="reativar">Reativar</option>
                <option value="negociando">Negociando</option>
                <option value="aguardando">Aguardando</option>
                <option value="sem-rota">Sem rota</option>
                <option value="prioritario">Prioritario</option>
              </Select>
              <Button className="mt-2 w-full" variant="secondary" onClick={() => void applyStageToClients(selectedClientIds, bulkStage as Parameters<typeof applyStageToClients>[1])} disabled={selectedClientIds.length === 0}>
                Aplicar estagio
              </Button>
            </div>
            <div>
              <FieldLabel>Prioridade</FieldLabel>
              <Select value={bulkPriority} onChange={(event) => setBulkPriority(event.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
              <Button className="mt-2 w-full" variant="secondary" onClick={() => void applyPriorityToClients(selectedClientIds, bulkPriority as Parameters<typeof applyPriorityToClients>[1])} disabled={selectedClientIds.length === 0}>
                Aplicar prioridade
              </Button>
            </div>
            <div>
              <FieldLabel>Rota manual</FieldLabel>
              <Select value={bulkRouteId} onChange={(event) => setBulkRouteId(event.target.value)}>
                <option value="automatic">Automatica</option>
                {snapshot.routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </Select>
              <Button className="mt-2 w-full" variant="secondary" onClick={() => void assignRouteToClients(selectedClientIds, bulkRouteId === 'automatic' ? null : bulkRouteId)} disabled={selectedClientIds.length === 0}>
                Aplicar rota
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input value={bulkTags} onChange={(event) => setBulkTags(event.target.value)} placeholder="Tags separadas por virgula" />
            <Button variant="secondary" onClick={() => void applyTagsToClients(selectedClientIds, bulkTags.split(',').map((tag) => tag.trim()))} disabled={selectedClientIds.length === 0}>
              <Tags className="mr-2 h-4 w-4" />
              Aplicar tags
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Input value={bulkTaskTitle} onChange={(event) => setBulkTaskTitle(event.target.value)} placeholder="Criar tarefa em lote para os selecionados" />
            <Button onClick={() => void handleBulkTask()} disabled={selectedClientIds.length === 0}>
              Criar tarefa
            </Button>
          </div>
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredClients.map((client) => (
            <ClientListItem
              key={client.id}
              client={client}
              selected={selectedSet.has(client.id)}
              onSelectChange={(checked) => toggleClientSelection(client.id, checked)}
              onCreateTask={() =>
                void createTaskForClients([client.id], {
                  title: `Retorno para ${client.nome || client.codigo}`,
                  kind: 'retorno',
                  dueAt: new Date().toISOString(),
                  notes: 'Criada rapidamente pela listagem de clientes.',
                  priority: client.priority
                })
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros, aplique uma vista salva ou importe mais clientes." />
      )}
    </div>
  );
}
