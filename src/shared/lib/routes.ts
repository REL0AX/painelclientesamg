import { normalizeForSearch } from '@/shared/lib/utils';
import type {
  Client,
  ClientRouteInfo,
  MonthlyRouteDates,
  MonthlyRouteSelections,
  RouteDefinition
} from '@/shared/types/domain';

const routeLabel = (route: RouteDefinition) => {
  switch (route.frequency.type) {
    case 'semanal':
      return 'Semanal';
    case 'quinzenal':
      return 'Quinzenal';
    case 'mensal':
      return 'Mensal';
    case 'personalizado':
      return route.frequency.days.length > 0
        ? `Dias ${route.frequency.days.join(', ')}`
        : 'Personalizado';
    default:
      return 'Nao definido';
  }
};

export const inferRouteForClient = (client: Client, routes: RouteDefinition[]): ClientRouteInfo => {
  const routesById = new Map(routes.map((route) => [route.id, route]));

  if (client.manualRouteId && routesById.has(client.manualRouteId)) {
    const route = routesById.get(client.manualRouteId)!;
    return {
      id: route.id,
      name: route.name,
      frequencyLabel: routeLabel(route),
      manual: true
    };
  }

  const normalizedCity = normalizeForSearch(client.cidade);
  if (!normalizedCity) {
    return {
      id: null,
      name: 'Sem rota',
      manual: false
    };
  }

  const matchedRoute = routes.find((route) =>
    route.cities.some((city) => normalizeForSearch(city) === normalizedCity)
  );

  if (!matchedRoute) {
    return {
      id: null,
      name: 'Sem rota',
      manual: false
    };
  }

  return {
    id: matchedRoute.id,
    name: matchedRoute.name,
    frequencyLabel: routeLabel(matchedRoute),
    manual: false
  };
};

export const decorateClientsWithRoutes = (clients: Client[], routes: RouteDefinition[]) =>
  clients.map((client) => ({
    ...client,
    route: inferRouteForClient(client, routes)
  }));

export const clientIsSelectedInRouteMonth = (
  routeSelections: MonthlyRouteSelections,
  monthKey: string,
  routeId: string | null | undefined,
  clientId: string
) => {
  if (!routeId) return false;
  return Boolean(routeSelections[monthKey]?.[routeId]?.[clientId]);
};

export const routeDepartureInfo = (
  routeDates: MonthlyRouteDates,
  routeId: string | null | undefined
) => {
  if (!routeId) return null;
  return routeDates[routeId] ?? null;
};
