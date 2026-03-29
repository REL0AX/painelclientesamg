import { useDeferredValue, useState } from 'react';
import { useAppContext } from '@/app/state/AppContext';
import { clientSignals } from '@/shared/lib/analytics';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Input, Select } from '@/shared/ui/Field';
import { ClientListItem } from '@/features/clients/ClientListItem';

export function ClientsPage() {
  const { searchResults, snapshot, selectedYear, selectedMonth } = useAppContext();
  const [routeFilter, setRouteFilter] = useState('all');
  const [signalFilter, setSignalFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const deferredNameFilter = useDeferredValue(nameFilter);

  const filteredClients = searchResults.filter((client) => {
    const matchesName =
      deferredNameFilter.trim().length === 0 ||
      client.nome.toLowerCase().includes(deferredNameFilter.trim().toLowerCase());
    const matchesRoute = routeFilter === 'all' || client.route?.id === routeFilter;
    const signals = clientSignals(client, snapshot, selectedYear, selectedMonth);
    const matchesSignal = signalFilter === 'all' || signals.some((signal) => signal.id === signalFilter);
    return matchesName && matchesRoute && matchesSignal;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:grid-cols-3">
        <div>
          <FieldLabel>Filtro por nome</FieldLabel>
          <Input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="Refinar a busca desta tela" />
        </div>
        <div>
          <FieldLabel>Rota</FieldLabel>
          <Select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}>
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
          <Select value={signalFilter} onChange={(event) => setSignalFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="sem-compra-recente">Sem compra recente</option>
            <option value="em-risco">Em risco</option>
            <option value="perto-da-proxima-tabela">Perto da proxima tabela</option>
            <option value="sem-telefone">Sem telefone</option>
            <option value="sem-rota">Sem rota</option>
            <option value="saida-de-rota-proxima">Saida de rota proxima</option>
          </Select>
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredClients.map((client) => (
            <ClientListItem key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros ou importe mais clientes para alimentar o painel." />
      )}
    </div>
  );
}
