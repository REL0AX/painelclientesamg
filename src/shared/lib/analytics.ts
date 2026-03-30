import { DEFAULT_THRESHOLDS } from '@/shared/lib/constants';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { routeDepartureInfo } from '@/shared/lib/routes';
import { daysBetween, formatDate, normalizeForSearch } from '@/shared/lib/utils';
import type {
  AppSnapshot,
  Client,
  ClientSignal,
  DashboardSummary,
  WorklistItem
} from '@/shared/types/domain';

const lastPurchaseDate = (client: Client) => {
  const lastSale = [...client.compras].sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
  return lastSale ? new Date(lastSale.data) : null;
};

const hasOverdueOpenTask = (snapshot: AppSnapshot, clientId: string) =>
  snapshot.tasks.some((task) => {
    if (task.clientId !== clientId || task.status !== 'open') {
      return false;
    }

    const dueAt = new Date(task.dueAt);
    return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now();
  });

export const clientSignals = (
  client: Client,
  snapshot: AppSnapshot,
  selectedYear: number,
  selectedMonth: number | null
) => {
  const thresholds = snapshot.settings.thresholds ?? DEFAULT_THRESHOLDS;
  const profile = commercialProfileForClient(
    client,
    snapshot.settings.commercialBrackets,
    selectedYear,
    selectedMonth,
    snapshot.settings.timezone
  );

  const signals: ClientSignal[] = [];
  const lastPurchase = lastPurchaseDate(client);
  const daysWithoutPurchase = lastPurchase ? daysBetween(lastPurchase, new Date()) : Number.POSITIVE_INFINITY;

  if (!client.telefone1 && !client.telefone2) {
    signals.push({
      id: 'sem-telefone',
      label: 'Sem telefone',
      detail: 'Nenhum telefone valido cadastrado.',
      tone: 'warning'
    });
  }

  if (!client.route?.id) {
    signals.push({
      id: 'sem-rota',
      label: 'Sem rota',
      detail: 'Cliente ainda nao foi vinculado a uma rota.',
      tone: 'warning'
    });
  }

  if (!lastPurchase || daysWithoutPurchase >= thresholds.staleDays) {
    signals.push({
      id: 'sem-compra-recente',
      label: 'Sem compra recente',
      detail: lastPurchase
        ? `Ultima compra em ${formatDate(lastPurchase)}.`
        : 'Cliente ainda nao possui compras registradas.',
      tone: 'warning'
    });
  }

  if (lastPurchase && daysWithoutPurchase >= thresholds.atRiskDays) {
    signals.push({
      id: 'em-risco',
      label: 'Em risco',
      detail: `${daysWithoutPurchase} dias sem comprar.`,
      tone: 'danger'
    });
  }

  if (profile.nextBracket && profile.missingToNext > 0 && profile.missingToNext <= thresholds.nearNextTable) {
    signals.push({
      id: 'perto-da-proxima-tabela',
      label: 'Perto da proxima tabela',
      detail: `Faltam ${profile.missingToNext.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      })}.`,
      tone: 'success'
    });
  }

  if (profile.bracketMovement !== 'manteve') {
    signals.push({
      id: 'mudou-de-tabela',
      label: 'Mudou de tabela',
      detail:
        profile.bracketMovement === 'subiu'
          ? `Subiu para ${profile.currentBracket.label}.`
          : `Desceu para ${profile.currentBracket.label}.`,
      tone: profile.bracketMovement === 'subiu' ? 'success' : 'danger'
    });
  }

  const routeDates = routeDepartureInfo(snapshot.routeDates, client.route?.id);
  if (routeDates?.departure) {
    const departureDate = new Date(routeDates.departure);
    if (!Number.isNaN(departureDate.getTime())) {
      const daysToDeparture = daysBetween(new Date(), departureDate);
      if (daysToDeparture >= 0 && daysToDeparture <= thresholds.routeDepartureSoonDays) {
        signals.push({
          id: 'saida-de-rota-proxima',
          label: 'Saida de rota proxima',
          detail: `Saida prevista para ${formatDate(routeDates.departure)}.`,
          tone: 'info'
        });
      }
    }
  }

  if (!client.cnpj || !client.cidade || !client.uf) {
    signals.push({
      id: 'dados-incompletos',
      label: 'Dados incompletos',
      detail: 'Faltam campos basicos de cadastro.',
      tone: 'warning'
    });
  }

  if (hasOverdueOpenTask(snapshot, client.id)) {
    signals.push({
      id: 'tarefa-vencida',
      label: 'Tarefa vencida',
      detail: 'Existe retorno pendente vencido para este cliente.',
      tone: 'danger'
    });
  }

  if (client.priority === 'alta' || client.priority === 'urgente' || client.stage === 'prioritario') {
    signals.push({
      id: 'cliente-prioritario',
      label: 'Cliente prioritario',
      detail: 'Cliente marcado para acao prioritaria.',
      tone: 'info'
    });
  }

  if (client.stage === 'aguardando' || client.nextActionId) {
    signals.push({
      id: 'aguardando-retorno',
      label: 'Aguardando retorno',
      detail: 'Cliente com proxima acao aberta.',
      tone: 'info'
    });
  }

  return signals;
};

export const dashboardSummary = (
  snapshot: AppSnapshot,
  selectedYear: number,
  selectedMonth: number | null
): DashboardSummary => {
  const activeProfiles = snapshot.clients.map((client) =>
    commercialProfileForClient(
      client,
      snapshot.settings.commercialBrackets,
      selectedYear,
      selectedMonth,
      snapshot.settings.timezone
    )
  );

  const revenue = activeProfiles.reduce((total, profile) => total + profile.revenue, 0);
  const activeClients = activeProfiles.filter((profile) => profile.revenue > 0).length;
  const totalOrders = snapshot.clients.reduce((total, client) => total + client.compras.length, 0);
  const nearNext = activeProfiles.filter(
    (profile) =>
      profile.nextBracket &&
      profile.missingToNext > 0 &&
      profile.missingToNext <= snapshot.settings.thresholds.nearNextTable
  ).length;

  const staleClients = snapshot.clients.filter((client) =>
    clientSignals(client, snapshot, selectedYear, selectedMonth).some((signal) => signal.id === 'sem-compra-recente')
  ).length;

  const atRiskClients = snapshot.clients.filter((client) =>
    clientSignals(client, snapshot, selectedYear, selectedMonth).some((signal) => signal.id === 'em-risco')
  ).length;

  const overdueTasks = snapshot.tasks.filter((task) => {
    if (task.status !== 'open') {
      return false;
    }

    const dueAt = new Date(task.dueAt);
    return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now();
  }).length;

  return {
    totalClients: snapshot.clients.length,
    activeClientsInCommercialMonth: activeClients,
    commercialRevenue: revenue,
    avgTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    clientsNearNextBracket: nearNext,
    staleClients,
    atRiskClients,
    overdueTasks
  };
};

export const worklistsForSnapshot = (
  snapshot: AppSnapshot,
  selectedYear: number,
  selectedMonth: number | null
): WorklistItem[] => {
  const decorated = snapshot.clients.map((client) => ({
    client,
    signals: clientSignals(client, snapshot, selectedYear, selectedMonth)
  }));

  const createWorklist = (
    id: WorklistItem['signal'],
    title: string,
    description: string,
    clients = decorated.filter((item) => item.signals.some((signal) => signal.id === id)).map((item) => item.client)
  ): WorklistItem => ({
    id,
    title,
    description,
    signal: id,
    clients
  });

  const routeCities = new Set(snapshot.routes.flatMap((route) => route.cities.map((city) => normalizeForSearch(city))));
  const outsideCoverage = snapshot.clients.filter((client) => {
    const city = normalizeForSearch(client.cidade);
    return Boolean(city) && !routeCities.has(city);
  });

  const routesWithoutCoverage = snapshot.routes
    .filter((route) => !snapshot.clients.some((client) => client.route?.id === route.id))
    .flatMap((route) =>
      snapshot.clients.filter((client) =>
        route.cities.some((city) => normalizeForSearch(city) === normalizeForSearch(client.cidade))
      )
    );

  return [
    createWorklist('sem-compra-recente', 'Sem compra desde X', 'Clientes para reativacao imediata.'),
    createWorklist('em-risco', 'Em risco', 'Clientes que precisam de retomada urgente.'),
    createWorklist(
      'perto-da-proxima-tabela',
      'Perto da proxima tabela',
      'Clientes com pequena distancia comercial para subir de faixa.'
    ),
    createWorklist('sem-telefone', 'Sem telefone', 'Cadastros que ainda precisam de contato valido.'),
    createWorklist('sem-rota', 'Sem rota', 'Clientes que precisam ser encaixados na operacao.'),
    createWorklist(
      'saida-de-rota-proxima',
      'Rota saindo em breve',
      'Clientes com janela curta para montar pedido antes da saida.'
    ),
    createWorklist(
      'tarefa-vencida',
      'Tarefas vencidas',
      'Clientes com retornos ou pendencias atrasadas.'
    ),
    createWorklist(
      'cliente-prioritario',
      'Clientes prioritarios',
      'Clientes com prioridade alta ou marcados como prioritarios.'
    ),
    createWorklist(
      'aguardando-retorno',
      'Aguardando retorno',
      'Clientes com proxima acao em aberto.'
    ),
    createWorklist(
      'fora-da-malha',
      'Clientes fora da malha',
      'Clientes cuja cidade ainda nao esta coberta por nenhuma rota.',
      outsideCoverage
    ),
    createWorklist(
      'rota-sem-cobertura',
      'Rotas sem cobertura',
      'Rotas configuradas que ainda nao receberam clientes vinculados.',
      routesWithoutCoverage
    )
  ];
};

export const searchClients = (clients: Client[], query: string) => {
  const normalized = normalizeForSearch(query);
  if (!normalized) return clients;
  return clients.filter((client) =>
    [
      client.nome,
      client.codigo,
      client.cnpj,
      client.cidade,
      client.uf,
      client.telefone1,
      client.telefone2,
      client.route?.name,
      client.stage,
      client.priority,
      ...(client.tags ?? [])
    ]
      .filter(Boolean)
      .some((value) => normalizeForSearch(String(value)).includes(normalized))
  );
};

export const clientSelectionForSignal = (
  snapshot: AppSnapshot,
  signal: WorklistItem['signal'],
  selectedYear: number,
  selectedMonth: number | null
) =>
  worklistsForSnapshot(snapshot, selectedYear, selectedMonth).find((item) => item.signal === signal)?.clients ?? [];
