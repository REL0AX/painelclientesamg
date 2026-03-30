import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { CheckCircle2, MessageCircle, RouteIcon, Save, SquareCheckBig, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/app/state/AppContext';
import { clientSignals } from '@/shared/lib/analytics';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { deriveClientTimeline } from '@/shared/lib/history';
import { routeDepartureInfo } from '@/shared/lib/routes';
import { createId, formatCurrency, formatDate, formatDateTime } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { FieldLabel, Input, Select, Textarea } from '@/shared/ui/Field';
import type { ClientTask } from '@/shared/types/domain';

const emptyTaskForm = {
  title: '',
  kind: 'retorno' as ClientTask['kind'],
  dueAt: new Date().toISOString().slice(0, 10),
  notes: '',
  priority: 'media' as ClientTask['priority']
};

export function ClientDrawer() {
  const {
    snapshot,
    selectedClientId,
    openClient,
    saveClient,
    deleteClient,
    addNote,
    addContact,
    saveSale,
    deleteSale,
    saveTask,
    updateTaskStatus,
    deleteTask,
    selectedYear,
    selectedMonth,
    openWhatsApp
  } = useAppContext();
  const client = snapshot.clients.find((entry) => entry.id === selectedClientId) ?? null;
  const [activeTab, setActiveTab] = useState('resumo');
  const [contactSummary, setContactSummary] = useState('');
  const [contactType, setContactType] = useState<'telefone' | 'whatsapp' | 'email' | 'visita' | 'outro'>('whatsapp');
  const [noteText, setNoteText] = useState('');
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [saleForm, setSaleForm] = useState({
    id: '',
    pedido: '',
    descricao: '',
    tipoVenda: '',
    portador: '',
    data: new Date().toISOString().slice(0, 10),
    valor: ''
  });
  const [editForm, setEditForm] = useState({
    nome: '',
    codigo: '',
    cnpj: '',
    cidade: '',
    uf: '',
    telefone1: '',
    telefone2: '',
    email: '',
    manualRouteId: 'automatic',
    stage: 'ativo',
    priority: 'media',
    preferredChannel: 'whatsapp',
    tags: ''
  });

  useEffect(() => {
    if (!client) return;
    setEditForm({
      nome: client.nome,
      codigo: client.codigo,
      cnpj: client.cnpj,
      cidade: client.cidade,
      uf: client.uf,
      telefone1: client.telefone1,
      telefone2: client.telefone2,
      email: client.email ?? '',
      manualRouteId: client.manualRouteId ?? 'automatic',
      stage: client.stage,
      priority: client.priority,
      preferredChannel: client.preferredChannel,
      tags: client.tags.join(', ')
    });
    setActiveTab(client.nome ? 'resumo' : 'edicao');
    setContactSummary('');
    setNoteText('');
    setTaskForm(emptyTaskForm);
    setSaleForm({
      id: '',
      pedido: '',
      descricao: '',
      tipoVenda: '',
      portador: '',
      data: new Date().toISOString().slice(0, 10),
      valor: ''
    });
  }, [client?.id]);

  const clientTasks = useMemo(
    () =>
      snapshot.tasks
        .filter((task) => task.clientId === client?.id)
        .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [client?.id, snapshot.tasks]
  );

  if (!client) {
    return null;
  }

  const profile = commercialProfileForClient(
    client,
    snapshot.settings.commercialBrackets,
    selectedYear,
    selectedMonth,
    snapshot.settings.timezone
  );
  const signals = clientSignals(client, snapshot, selectedYear, selectedMonth);
  const routeDates = routeDepartureInfo(snapshot.routeDates, client.route?.id);
  const progressTemplate =
    snapshot.settings.whatsappTemplates.find((template) => template.id === 'progress') ??
    snapshot.settings.whatsappTemplates[0];
  const timeline = deriveClientTimeline(snapshot, client);

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      return;
    }

    await saveTask({
      id: createId('task'),
      clientId: client.id,
      title: taskForm.title.trim(),
      kind: taskForm.kind,
      dueAt: new Date(taskForm.dueAt).toISOString(),
      status: 'open',
      notes: taskForm.notes.trim(),
      priority: taskForm.priority,
      createdAt: Date.now()
    });
    setTaskForm(emptyTaskForm);
  };

  return (
    <Dialog.Root open={Boolean(selectedClientId)} onOpenChange={(nextOpen) => !nextOpen && openClient(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-50 h-screen w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#fffaf4]/96 p-5 shadow-2xl outline-none backdrop-blur xl:max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-3xl font-bold text-[var(--ink-900)]">{client.nome || 'Novo cliente'}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-[var(--ink-600)]">
                {client.codigo} • {client.cidade || 'Sem cidade'} / {client.uf || '--'} • {client.route?.name ?? 'Sem rota'}
              </Dialog.Description>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="info">{profile.currentBracket.label}</Badge>
                <Badge tone={client.priority === 'urgente' ? 'danger' : client.priority === 'alta' ? 'warning' : 'neutral'}>
                  {client.priority}
                </Badge>
                <Badge tone="info">{client.stage}</Badge>
                {signals.map((signal) => (
                  <Badge key={signal.id} tone={signal.tone}>
                    {signal.label}
                  </Badge>
                ))}
                {(client.tags ?? []).map((tag) => (
                  <Badge key={tag} tone="neutral">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-[var(--line)] bg-white p-2 text-[var(--ink-700)]"
              onClick={() => openClient(null)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => progressTemplate && void openWhatsApp(client.id, progressTemplate)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => setActiveTab('edicao')}>
              <Save className="mr-2 h-4 w-4" />
              Editar cadastro
            </Button>
            <Button variant="secondary" onClick={() => setActiveTab('tarefas')}>
              <SquareCheckBig className="mr-2 h-4 w-4" />
              Tarefas
            </Button>
          </div>

          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <Tabs.List className="hide-scrollbar flex gap-2 overflow-x-auto rounded-[24px] border border-[var(--line)] bg-white p-2">
              {[
                ['resumo', 'Resumo'],
                ['comercial', 'Comercial'],
                ['rota', 'Rota'],
                ['timeline', 'Timeline'],
                ['tarefas', 'Tarefas'],
                ['notas', 'Notas'],
                ['vendas', 'Vendas'],
                ['edicao', 'Edicao']
              ].map(([value, label]) => (
                <Tabs.Trigger
                  key={value}
                  value={value}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold text-[var(--ink-600)] data-[state=active]:bg-[var(--ink-900)] data-[state=active]:text-white"
                >
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            <Tabs.Content value="resumo" className="mt-6 space-y-5">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Cadastro</p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--ink-700)]">
                    <p>CNPJ: <span className="font-semibold text-[var(--ink-900)]">{client.cnpj || 'Nao informado'}</span></p>
                    <p>Cidade: <span className="font-semibold text-[var(--ink-900)]">{client.cidade || 'Nao informada'}</span></p>
                    <p>Telefone 1: <span className="font-semibold text-[var(--ink-900)]">{client.telefone1 || 'Nao informado'}</span></p>
                    <p>Telefone 2: <span className="font-semibold text-[var(--ink-900)]">{client.telefone2 || 'Nao informado'}</span></p>
                    <p>Canal preferido: <span className="font-semibold text-[var(--ink-900)]">{client.preferredChannel}</span></p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Relacionamento</p>
                  <div className="mt-4 space-y-3 text-sm text-[var(--ink-700)]">
                    <p>Total historico: <span className="font-semibold text-[var(--ink-900)]">{formatCurrency(client.totalCompras)}</span></p>
                    <p>Compras: <span className="font-semibold text-[var(--ink-900)]">{client.compras.length}</span></p>
                    <p>Ultimo contato: <span className="font-semibold text-[var(--ink-900)]">{client.contacts[0] ? formatDateTime(client.contacts[0].timestamp) : 'Sem historico'}</span></p>
                    <p>Tarefas em aberto: <span className="font-semibold text-[var(--ink-900)]">{clientTasks.filter((task) => task.status === 'open').length}</span></p>
                  </div>
                </div>
              </section>
            </Tabs.Content>

            <Tabs.Content value="comercial" className="mt-6 space-y-5">
              <section className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Mes comercial</p>
                  <p className="mt-3 text-2xl font-bold text-[var(--ink-900)]">{profile.contextLabel}</p>
                  {profile.usedFallbackMonth ? (
                    <p className="mt-2 text-sm text-[var(--ink-600)]">Modo ano inteiro: usando o mes atual para comunicacao comercial.</p>
                  ) : null}
                </div>
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Acumulado</p>
                  <p className="mt-3 text-2xl font-bold text-[var(--ink-900)]">{formatCurrency(profile.revenue)}</p>
                  <p className="mt-2 text-sm text-[var(--ink-600)]">No mes anterior: {formatCurrency(profile.previousRevenue)}</p>
                </div>
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Faixa</p>
                  <p className="mt-3 text-2xl font-bold text-[var(--ink-900)]">{profile.currentBracket.label}</p>
                  <p className="mt-2 text-sm text-[var(--ink-600)]">Movimento: {profile.bracketMovement}</p>
                </div>
                <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Proxima faixa</p>
                  <p className="mt-3 text-2xl font-bold text-[var(--ink-900)]">{profile.nextBracket?.label ?? 'Faixa maxima'}</p>
                  <p className="mt-2 text-sm text-[var(--ink-600)]">
                    {profile.nextBracket ? `Faltam ${formatCurrency(profile.missingToNext)}` : 'Nao ha proxima tabela.'}
                  </p>
                </div>
              </section>
            </Tabs.Content>

            <Tabs.Content value="rota" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <div className="flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-[var(--accent-600)]" />
                  <p className="text-lg font-semibold text-[var(--ink-900)]">{client.route?.name ?? 'Sem rota'}</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Frequencia</p>
                    <p className="mt-2 text-sm text-[var(--ink-700)]">{client.route?.frequencyLabel ?? 'Nao definida'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Prazo do pedido</p>
                    <p className="mt-2 text-sm text-[var(--ink-700)]">{routeDates?.deadline ? formatDate(routeDates.deadline) : 'Nao informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">Saida da rota</p>
                    <p className="mt-2 text-sm text-[var(--ink-700)]">{routeDates?.departure ? formatDate(routeDates.departure) : 'Nao informada'}</p>
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="timeline" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <h3 className="text-lg font-semibold text-[var(--ink-900)]">Registrar contato</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                  <Select value={contactType} onChange={(event) => setContactType(event.target.value as typeof contactType)}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telefone">Telefone</option>
                    <option value="email">Email</option>
                    <option value="visita">Visita</option>
                    <option value="outro">Outro</option>
                  </Select>
                  <Input value={contactSummary} onChange={(event) => setContactSummary(event.target.value)} placeholder="Resumo do contato" />
                  <Button
                    onClick={() => {
                      void addContact(client.id, contactType, contactSummary);
                      setContactSummary('');
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {timeline.length > 0 ? (
                  timeline.map((event) => (
                    <div key={event.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge tone={event.tone}>{event.type}</Badge>
                        <p className="text-xs text-[var(--ink-500)]">{formatDateTime(event.timestamp)}</p>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[var(--ink-900)]">{event.title}</p>
                      <p className="mt-2 text-sm text-[var(--ink-700)]">{event.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--ink-600)]">
                    Nenhum evento no timeline ainda.
                  </div>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="tarefas" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <h3 className="text-lg font-semibold text-[var(--ink-900)]">Nova tarefa</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Titulo da tarefa" />
                  <Select value={taskForm.kind} onChange={(event) => setTaskForm((current) => ({ ...current, kind: event.target.value as ClientTask['kind'] }))}>
                    <option value="retorno">Retorno</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="visita">Visita</option>
                    <option value="rota">Rota</option>
                    <option value="pendencia">Pendencia</option>
                    <option value="follow-up">Follow-up</option>
                  </Select>
                  <Input type="date" value={taskForm.dueAt} onChange={(event) => setTaskForm((current) => ({ ...current, dueAt: event.target.value }))} />
                  <Select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as ClientTask['priority'] }))}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </Select>
                </div>
                <div className="mt-3">
                  <Textarea rows={4} value={taskForm.notes} onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Contexto da tarefa" />
                </div>
                <div className="mt-3">
                  <Button onClick={() => void handleSaveTask()}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar tarefa
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {clientTasks.length > 0 ? (
                  clientTasks.map((task) => (
                    <div key={task.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ink-900)]">{task.title}</p>
                          <p className="mt-1 text-sm text-[var(--ink-600)]">
                            {task.kind} • vence {formatDate(task.dueAt)} • {task.priority}
                          </p>
                        </div>
                        <Badge tone={task.status === 'done' ? 'success' : task.status === 'canceled' ? 'warning' : 'info'}>
                          {task.status}
                        </Badge>
                      </div>
                      {task.notes ? <p className="mt-3 rounded-2xl bg-[var(--panel-subtle)] p-3 text-sm text-[var(--ink-700)]">{task.notes}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.status === 'open' ? (
                          <Button variant="secondary" onClick={() => void updateTaskStatus(task.id, 'done')}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Concluir
                          </Button>
                        ) : null}
                        {task.status === 'open' ? (
                          <Button variant="ghost" onClick={() => void updateTaskStatus(task.id, 'canceled')}>
                            Cancelar
                          </Button>
                        ) : null}
                        <Button variant="ghost" onClick={() => void deleteTask(task.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--ink-600)]">
                    Nenhuma tarefa registrada para este cliente.
                  </div>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="notas" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <FieldLabel>Nova anotacao</FieldLabel>
                <Textarea rows={4} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Sinalize detalhes importantes do cliente, combinados, objeções ou pendencias." />
                <div className="mt-3">
                  <Button
                    onClick={() => {
                      void addNote(client.id, noteText);
                      setNoteText('');
                    }}
                  >
                    Salvar anotacao
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {client.notes.length > 0 ? (
                  client.notes.map((note) => (
                    <div key={note.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">{formatDateTime(note.timestamp)}</p>
                      <p className="mt-3 text-sm text-[var(--ink-700)]">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--ink-600)]">
                    Nenhuma anotacao registrada.
                  </div>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="vendas" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <h3 className="text-lg font-semibold text-[var(--ink-900)]">Nova venda</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Input placeholder="Pedido" value={saleForm.pedido} onChange={(event) => setSaleForm((current) => ({ ...current, pedido: event.target.value }))} />
                  <Input placeholder="Documento / NF" value={saleForm.descricao} onChange={(event) => setSaleForm((current) => ({ ...current, descricao: event.target.value }))} />
                  <Input placeholder="Tipo de venda" value={saleForm.tipoVenda} onChange={(event) => setSaleForm((current) => ({ ...current, tipoVenda: event.target.value }))} />
                  <Input placeholder="Portador" value={saleForm.portador} onChange={(event) => setSaleForm((current) => ({ ...current, portador: event.target.value }))} />
                  <Input type="date" value={saleForm.data} onChange={(event) => setSaleForm((current) => ({ ...current, data: event.target.value }))} />
                  <Input placeholder="Valor" value={saleForm.valor} onChange={(event) => setSaleForm((current) => ({ ...current, valor: event.target.value }))} />
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      const numericValue = Number(saleForm.valor.replace(/\./g, '').replace(',', '.'));
                      if (!Number.isFinite(numericValue) || numericValue <= 0) return;
                      void saveSale(client.id, {
                        id: saleForm.id || createId('sale'),
                        pedido: saleForm.pedido,
                        descricao: saleForm.descricao,
                        tipoVenda: saleForm.tipoVenda,
                        portador: saleForm.portador,
                        data: new Date(saleForm.data).toISOString(),
                        valor: numericValue,
                        products: []
                      });
                      setSaleForm((current) => ({ ...current, id: '', pedido: '', descricao: '', tipoVenda: '', portador: '', valor: '' }));
                    }}
                  >
                    Salvar venda
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {client.compras.length > 0 ? (
                  client.compras.map((sale) => (
                    <div key={sale.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ink-900)]">{sale.pedido || 'Sem pedido'} • {formatCurrency(sale.valor)}</p>
                          <p className="mt-1 text-sm text-[var(--ink-600)]">{sale.descricao || 'Sem documento'} • {formatDate(sale.data)}</p>
                        </div>
                        <Button variant="ghost" onClick={() => void deleteSale(client.id, sale.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm text-[var(--ink-600)]">
                    Nenhuma venda registrada.
                  </div>
                )}
              </div>
            </Tabs.Content>

            <Tabs.Content value="edicao" className="mt-6 space-y-5">
              <div className="rounded-[28px] border border-[var(--line)] bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Nome</FieldLabel>
                    <Input value={editForm.nome} onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Codigo</FieldLabel>
                    <Input value={editForm.codigo} onChange={(event) => setEditForm((current) => ({ ...current, codigo: event.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>CNPJ</FieldLabel>
                    <Input value={editForm.cnpj} onChange={(event) => setEditForm((current) => ({ ...current, cnpj: event.target.value.replace(/\D/g, '') }))} />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <Input value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>UF</FieldLabel>
                    <Input value={editForm.uf} onChange={(event) => setEditForm((current) => ({ ...current, uf: event.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <FieldLabel>Cidade</FieldLabel>
                    <Input value={editForm.cidade} onChange={(event) => setEditForm((current) => ({ ...current, cidade: event.target.value }))} />
                  </div>
                  <div>
                    <FieldLabel>Rota manual</FieldLabel>
                    <Select value={editForm.manualRouteId} onChange={(event) => setEditForm((current) => ({ ...current, manualRouteId: event.target.value }))}>
                      <option value="automatic">Automatica</option>
                      {snapshot.routes.map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Canal preferido</FieldLabel>
                    <Select value={editForm.preferredChannel} onChange={(event) => setEditForm((current) => ({ ...current, preferredChannel: event.target.value }))}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telefone">Telefone</option>
                      <option value="email">Email</option>
                      <option value="visita">Visita</option>
                      <option value="outro">Outro</option>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Telefone 1</FieldLabel>
                    <Input value={editForm.telefone1} onChange={(event) => setEditForm((current) => ({ ...current, telefone1: event.target.value.replace(/\D/g, '') }))} />
                  </div>
                  <div>
                    <FieldLabel>Telefone 2</FieldLabel>
                    <Input value={editForm.telefone2} onChange={(event) => setEditForm((current) => ({ ...current, telefone2: event.target.value.replace(/\D/g, '') }))} />
                  </div>
                  <div>
                    <FieldLabel>Estagio</FieldLabel>
                    <Select value={editForm.stage} onChange={(event) => setEditForm((current) => ({ ...current, stage: event.target.value }))}>
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
                    <Select value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))}>
                      <option value="baixa">Baixa</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <FieldLabel>Tags</FieldLabel>
                  <Input value={editForm.tags} onChange={(event) => setEditForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Separadas por virgula" />
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      void saveClient({
                        ...client,
                        nome: editForm.nome,
                        codigo: editForm.codigo,
                        cnpj: editForm.cnpj,
                        cidade: editForm.cidade,
                        uf: editForm.uf,
                        telefone1: editForm.telefone1,
                        telefone2: editForm.telefone2,
                        email: editForm.email,
                        manualRouteId: editForm.manualRouteId === 'automatic' ? undefined : editForm.manualRouteId,
                        stage: editForm.stage as typeof client.stage,
                        priority: editForm.priority as typeof client.priority,
                        preferredChannel: editForm.preferredChannel as typeof client.preferredChannel,
                        tags: editForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                      })
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar cliente
                  </Button>
                  <Button variant="danger" onClick={() => void deleteClient(client.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir cliente
                  </Button>
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
