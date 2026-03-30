import { createId } from '@/shared/lib/utils';
import type {
  AppSnapshot,
  Client,
  ClientTask,
  ClientTimelineEvent,
  ContactEvent,
  HistoryEntry,
  ImportKind,
  Note,
  Sale
} from '@/shared/types/domain';

export const createHistoryEntry = (
  type: ImportKind,
  summary: string,
  options?: Pick<HistoryEntry, 'clientId' | 'entityId' | 'entityKind' | 'metadata'>
): HistoryEntry => ({
  id: createId('history'),
  type,
  timestamp: Date.now(),
  summary,
  clientId: options?.clientId,
  entityId: options?.entityId,
  entityKind: options?.entityKind,
  metadata: options?.metadata
});

const saleTimelineEvent = (sale: Sale): ClientTimelineEvent => ({
  id: `sale-${sale.id}`,
  timestamp: new Date(sale.data).getTime(),
  type: 'sale',
  title: sale.pedido ? `Venda ${sale.pedido}` : 'Venda registrada',
  detail: sale.descricao || sale.tipoVenda || 'Venda sem descricao detalhada.',
  tone: 'success'
});

const noteTimelineEvent = (note: Note): ClientTimelineEvent => ({
  id: `note-${note.id}`,
  timestamp: note.timestamp,
  type: 'note',
  title: 'Anotacao registrada',
  detail: note.text,
  tone: 'info'
});

const contactTimelineEvent = (contact: ContactEvent): ClientTimelineEvent => ({
  id: `contact-${contact.id}`,
  timestamp: contact.timestamp,
  type: 'contact',
  title: `Contato: ${contact.type}`,
  detail: contact.summary,
  tone: contact.type === 'whatsapp-opened' ? 'success' : 'neutral'
});

const taskTimelineEvent = (task: ClientTask): ClientTimelineEvent => ({
  id: `task-${task.id}`,
  timestamp: task.completedAt ?? task.createdAt,
  type: 'task',
  title:
    task.status === 'done'
      ? `Tarefa concluida: ${task.title}`
      : task.status === 'canceled'
        ? `Tarefa cancelada: ${task.title}`
        : `Tarefa criada: ${task.title}`,
  detail: task.notes || task.kind,
  tone: task.status === 'done' ? 'success' : task.status === 'canceled' ? 'warning' : 'info'
});

const historyTimelineEvent = (entry: HistoryEntry): ClientTimelineEvent => ({
  id: `history-${entry.id}`,
  timestamp: entry.timestamp,
  type: 'history',
  title: entry.summary,
  detail: entry.type,
  tone: entry.type === 'backup' || entry.type === 'restore' ? 'warning' : 'neutral'
});

export const deriveClientTimeline = (
  snapshot: AppSnapshot,
  client: Client
): ClientTimelineEvent[] => {
  const taskEvents = snapshot.tasks
    .filter((task) => task.clientId === client.id)
    .map(taskTimelineEvent);
  const historyEvents = snapshot.history
    .filter((entry) => entry.clientId === client.id)
    .map(historyTimelineEvent);

  return [
    ...client.compras.map(saleTimelineEvent),
    ...client.notes.map(noteTimelineEvent),
    ...client.contacts.map(contactTimelineEvent),
    ...taskEvents,
    ...historyEvents
  ].sort((a, b) => b.timestamp - a.timestamp);
};
