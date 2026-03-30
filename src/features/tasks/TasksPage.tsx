import { useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash2, Clock3, Plus, ScanSearch, Trash2 } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { downloadCsv } from '@/shared/lib/export';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Input, Select, Textarea } from '@/shared/ui/Field';
import { formatDate, formatDateTime } from '@/shared/lib/utils';
import type { ClientTask } from '@/shared/types/domain';

const emptyTaskForm = {
  clientId: '',
  title: '',
  kind: 'retorno' as ClientTask['kind'],
  dueAt: new Date().toISOString().slice(0, 10),
  priority: 'media' as ClientTask['priority'],
  notes: ''
};

export function TasksPage() {
  const { snapshot, saveTask, updateTaskStatus, deleteTask, openClient } = useAppContext();
  const [statusFilter, setStatusFilter] = useState<'all' | ClientTask['status']>('open');
  const [clientFilter, setClientFilter] = useState('');
  const [taskForm, setTaskForm] = useState(emptyTaskForm);

  const filteredTasks = useMemo(() => {
    return snapshot.tasks
      .filter((task) => statusFilter === 'all' || task.status === statusFilter)
      .filter((task) => {
        const client = snapshot.clients.find((entry) => entry.id === task.clientId);
        if (!clientFilter.trim()) {
          return true;
        }

        const normalized = clientFilter.trim().toLowerCase();
        return (
          client?.nome.toLowerCase().includes(normalized) ||
          client?.codigo.toLowerCase().includes(normalized) ||
          false
        );
      })
      .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  }, [clientFilter, snapshot.clients, snapshot.tasks, statusFilter]);

  const handleCreateTask = async () => {
    if (!taskForm.clientId || !taskForm.title.trim()) {
      return;
    }

    await saveTask({
      id: `task-${Date.now()}`,
      clientId: taskForm.clientId,
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
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Tarefas</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Pendencias e retornos do operador</h2>
          <p className="mt-2 text-sm text-[var(--ink-600)]">
            Todas as acoes abertas do painel ficam centralizadas aqui, sem custo extra e com prioridade local-first.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="open">Abertas</option>
              <option value="done">Concluidas</option>
              <option value="canceled">Canceladas</option>
              <option value="all">Todas</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Cliente</FieldLabel>
            <Input
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              placeholder="Filtrar por nome ou codigo"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                filteredTasks.map((task) => {
                  const client = snapshot.clients.find((entry) => entry.id === task.clientId);
                  return {
                    cliente: client?.nome || '',
                    codigo: client?.codigo || '',
                    tarefa: task.title,
                    tipo: task.kind,
                    status: task.status,
                    prioridade: task.priority,
                    vencimento: formatDate(task.dueAt),
                    notas: task.notes || ''
                  };
                }),
                `tarefas-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
          >
            Exportar CSV
          </Button>
        </div>

        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const client = snapshot.clients.find((entry) => entry.id === task.clientId);
              const overdue = task.status === 'open' && new Date(task.dueAt).getTime() < Date.now();
              return (
                <div key={task.id} className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--ink-900)]">{task.title}</p>
                      <p className="mt-1 text-sm text-[var(--ink-600)]">
                        {client?.nome || 'Cliente removido'} • {task.kind} • vence {formatDate(task.dueAt)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
                        criado em {formatDateTime(task.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        overdue
                          ? 'bg-red-100 text-red-700'
                          : task.status === 'done'
                            ? 'bg-emerald-100 text-emerald-700'
                            : task.status === 'canceled'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-700'
                      }`}>
                        {task.status}
                      </span>
                      <span className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {task.notes ? <p className="mt-3 rounded-2xl bg-[var(--panel-subtle)] p-3 text-sm text-[var(--ink-700)]">{task.notes}</p> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openClient(task.clientId)}>
                      <ScanSearch className="mr-2 h-4 w-4" />
                      Abrir cliente
                    </Button>
                    {task.status === 'open' ? (
                      <Button variant="secondary" onClick={() => void updateTaskStatus(task.id, 'done')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Concluir
                      </Button>
                    ) : null}
                    {task.status === 'open' ? (
                      <Button variant="ghost" onClick={() => void updateTaskStatus(task.id, 'canceled')}>
                        <CircleSlash2 className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => void deleteTask(task.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title="Nenhuma tarefa encontrada" description="Crie retornos, follow-ups e pendencias para os clientes com um clique." />
          )}
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Nova tarefa</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Criar retorno rapido</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Cliente</FieldLabel>
            <Select value={taskForm.clientId} onChange={(event) => setTaskForm((current) => ({ ...current, clientId: event.target.value }))}>
              <option value="">Selecione</option>
              {snapshot.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nome || client.codigo}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <Select value={taskForm.kind} onChange={(event) => setTaskForm((current) => ({ ...current, kind: event.target.value as ClientTask['kind'] }))}>
              <option value="retorno">Retorno</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="visita">Visita</option>
              <option value="rota">Rota</option>
              <option value="pendencia">Pendencia</option>
              <option value="follow-up">Follow-up</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Titulo</FieldLabel>
            <Input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: ligar para confirmar pedido" />
          </div>
          <div>
            <FieldLabel>Vencimento</FieldLabel>
            <Input type="date" value={taskForm.dueAt} onChange={(event) => setTaskForm((current) => ({ ...current, dueAt: event.target.value }))} />
          </div>
          <div>
            <FieldLabel>Prioridade</FieldLabel>
            <Select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as ClientTask['priority'] }))}>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel>Notas</FieldLabel>
          <Textarea rows={5} value={taskForm.notes} onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Contexto do retorno, combinados ou objetivo do contato." />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void handleCreateTask()}>
            <Plus className="mr-2 h-4 w-4" />
            Criar tarefa
          </Button>
          <div className="rounded-[24px] bg-[var(--panel-subtle)] px-4 py-3 text-sm text-[var(--ink-600)]">
            <Clock3 className="mr-2 inline-flex h-4 w-4" />
            {snapshot.tasks.filter((task) => task.status === 'open').length} abertas agora
          </div>
        </div>
      </Card>
    </div>
  );
}

