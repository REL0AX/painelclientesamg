import * as Dialog from '@radix-ui/react-dialog';
import { Command, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/app/state/AppContext';
import { searchClients } from '@/shared/lib/analytics';
import { Badge } from '@/shared/ui/Badge';

interface CommandEntry {
  id: string;
  label: string;
  description: string;
  action: () => void;
  tone?: 'neutral' | 'info' | 'success';
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { snapshot, openClient, createClient } = useAppContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commandEntries = useMemo<CommandEntry[]>(
    () => [
      {
        id: 'dashboard',
        label: 'Ir para dashboard',
        description: 'Resumo comercial, worklists e sinais do painel.',
        action: () => navigate('/')
      },
      {
        id: 'clientes',
        label: 'Ir para clientes',
        description: 'Base completa com filtros, bulk actions e views salvas.',
        action: () => navigate('/clientes')
      },
      {
        id: 'rotas',
        label: 'Ir para rotas',
        description: 'Agenda, cobertura e selecao mensal da operacao.',
        action: () => navigate('/rotas')
      },
      {
        id: 'tarefas',
        label: 'Ir para tarefas',
        description: 'Pendencias, retornos e follow-ups do dia.',
        action: () => navigate('/tarefas'),
        tone: 'info'
      },
      {
        id: 'campanhas',
        label: 'Ir para campanhas',
        description: 'Fila manual de WhatsApp com templates e worklists.',
        action: () => navigate('/campanhas'),
        tone: 'success'
      },
      {
        id: 'diagnostico',
        label: 'Ir para diagnostico',
        description: 'Saude local, pendencias e estado do sync.',
        action: () => navigate('/diagnostico')
      },
      {
        id: 'novo-cliente',
        label: 'Criar novo cliente',
        description: 'Abre um cadastro em branco no drawer 360.',
        action: () => createClient()
      }
    ],
    [createClient, navigate]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommands = normalizedQuery
    ? commandEntries.filter(
        (entry) =>
          entry.label.toLowerCase().includes(normalizedQuery) ||
          entry.description.toLowerCase().includes(normalizedQuery)
      )
    : commandEntries.slice(0, 6);

  const visibleClients = normalizedQuery ? searchClients(snapshot.clients, query).slice(0, 8) : [];

  const activate = (action: () => void) => {
    action();
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/80 px-3 py-2 text-sm font-semibold text-[var(--ink-700)] shadow-sm transition hover:border-[var(--accent-400)]"
        onClick={() => setOpen(true)}
      >
        <Command className="h-4 w-4" />
        Comandos
        <span className="rounded-xl bg-[var(--panel-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--ink-500)]">
          Ctrl K
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-[12vh] z-[60] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 rounded-[32px] border border-[var(--line)] bg-[#fffaf4]/96 p-4 shadow-2xl outline-none backdrop-blur">
            <div className="flex items-center gap-3 rounded-[24px] border border-[var(--line)] bg-white px-4 py-3">
              <Search className="h-4 w-4 text-[var(--ink-500)]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Abrir tela, buscar cliente, criar novo cadastro..."
                className="w-full border-0 bg-transparent text-sm text-[var(--ink-900)] outline-none placeholder:text-[var(--ink-500)]"
              />
              <button
                type="button"
                className="rounded-full border border-[var(--line)] bg-[var(--panel-subtle)] p-1 text-[var(--ink-600)]"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Comandos</p>
                {visibleCommands.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full rounded-[24px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent-400)] hover:bg-[var(--panel-subtle)]"
                    onClick={() => activate(entry.action)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--ink-900)]">{entry.label}</p>
                        <p className="mt-1 text-sm text-[var(--ink-600)]">{entry.description}</p>
                      </div>
                      {entry.tone ? <Badge tone={entry.tone}>{entry.tone}</Badge> : null}
                    </div>
                  </button>
                ))}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Clientes</p>
                {visibleClients.length > 0 ? (
                  visibleClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      className="w-full rounded-[24px] border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent-400)] hover:bg-[var(--panel-subtle)]"
                      onClick={() =>
                        activate(() => {
                          openClient(client.id);
                        })
                      }
                    >
                      <p className="font-semibold text-[var(--ink-900)]">{client.nome || 'Cliente sem nome'}</p>
                      <p className="mt-1 text-sm text-[var(--ink-600)]">
                        {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/60 p-4 text-sm text-[var(--ink-600)]">
                    Digite para localizar cliente, rota ou comando rapido.
                  </div>
                )}
              </section>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

