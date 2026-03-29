import { Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useAppContext } from '@/app/state/AppContext';
import { useClientSearchResults } from '@/features/search/useClientSearchResults';
import { clientSignals } from '@/shared/lib/analytics';
import { Badge } from '@/shared/ui/Badge';

export function GlobalClientOmnibox() {
  const { globalSearch, setGlobalSearch, openClient, snapshot, selectedYear, selectedMonth } = useAppContext();
  const searchResults = useClientSearchResults();
  const [focused, setFocused] = useState(false);
  const deferredSearch = useDeferredValue(globalSearch);
  const visibleResults = deferredSearch ? searchResults.slice(0, 6) : [];

  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex items-center gap-3 rounded-[28px] border border-[var(--line)] bg-white/90 px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-[var(--ink-500)]" />
        <input
          value={globalSearch}
          onChange={(event) => setGlobalSearch(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder="Buscar cliente por nome, codigo, CNPJ, telefone, cidade ou rota..."
          className="w-full border-0 bg-transparent text-sm text-[var(--ink-900)] outline-none placeholder:text-[var(--ink-500)]"
        />
      </div>

      {focused && visibleResults.length > 0 ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-30 rounded-[28px] border border-[var(--line)] bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="space-y-2">
            {visibleResults.map((client) => {
              const signals = clientSignals(client, snapshot, selectedYear, selectedMonth);
              return (
                <button
                  key={client.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-[var(--panel-subtle)]"
                  onClick={() => openClient(client.id)}
                >
                  <div>
                    <p className="font-semibold text-[var(--ink-900)]">{client.nome}</p>
                    <p className="text-sm text-[var(--ink-600)]">
                      {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {signals.slice(0, 2).map((signal) => (
                      <Badge key={signal.id} tone={signal.tone}>
                        {signal.label}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
