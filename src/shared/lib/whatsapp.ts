import { formatCurrency, formatDate, normalizeDigits, withLeading55 } from '@/shared/lib/utils';
import type { Client, ClientCommercialProfile, RouteDates, WhatsAppTemplate } from '@/shared/types/domain';

export const normalizeClientPhone = (client: Client) => {
  const primary = normalizeDigits(client.telefone1 || '');
  const secondary = normalizeDigits(client.telefone2 || '');
  const selected = primary || secondary;

  if (selected.length < 10) {
    return {
      isValid: false,
      digits: '',
      international: '',
      reason: 'Cliente sem telefone valido'
    };
  }

  const localDigits = selected.length > 11 ? selected.slice(-11) : selected;
  const international = withLeading55(localDigits);

  return {
    isValid: international.length >= 12,
    digits: localDigits,
    international,
    reason: null
  };
};

export const latestSaleDate = (client: Client) => {
  const lastSale = [...client.compras].sort((a, b) => +new Date(b.data) - +new Date(a.data))[0];
  return lastSale ? new Date(lastSale.data) : null;
};

export const daysSinceLastPurchase = (client: Client) => {
  const lastDate = latestSaleDate(client);
  if (!lastDate) return null;
  const today = new Date();
  const diff = today.getTime() - lastDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const variableMapFor = (
  client: Client,
  profile: ClientCommercialProfile,
  routeDates: RouteDates | null
) => ({
  nome: client.nome || 'cliente',
  ultima_compra: formatDate(latestSaleDate(client)),
  dias_sem_comprar: String(daysSinceLastPurchase(client) ?? 0),
  faturamento_mes: formatCurrency(profile.revenue),
  tabela_atual: profile.currentBracket.label,
  proxima_tabela: profile.nextBracket?.label ?? profile.currentBracket.label,
  falta_para_proxima: formatCurrency(profile.missingToNext),
  rota: client.route?.name ?? 'Sem rota',
  prazo_pedido: routeDates?.deadline ? formatDate(routeDates.deadline) : 'Nao definido',
  saida_rota: routeDates?.departure ? formatDate(routeDates.departure) : 'Nao definida'
});

export const renderWhatsAppMessage = (
  template: WhatsAppTemplate,
  client: Client,
  profile: ClientCommercialProfile,
  routeDates: RouteDates | null
) => {
  const variables = variableMapFor(client, profile, routeDates);
  return template.message.replace(/\{\{(.*?)\}\}/g, (_, key: string) => {
    const normalizedKey = key.trim() as keyof typeof variables;
    return variables[normalizedKey] ?? '';
  });
};

export const buildWhatsAppLink = (
  client: Client,
  template: WhatsAppTemplate,
  profile: ClientCommercialProfile,
  routeDates: RouteDates | null
) => {
  const phone = normalizeClientPhone(client);
  if (!phone.isValid) return null;

  const message = renderWhatsAppMessage(template, client, profile, routeDates);
  return {
    href: `https://wa.me/${phone.international}?text=${encodeURIComponent(message)}`,
    preview: message
  };
};
