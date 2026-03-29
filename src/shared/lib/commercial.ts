import { DEFAULT_COMMERCIAL_BRACKETS, MONTH_LABELS } from '@/shared/lib/constants';
import { formatCurrency, sum } from '@/shared/lib/utils';
import type {
  Client,
  ClientCommercialProfile,
  MonthlyCommercialBracket
} from '@/shared/types/domain';

const salesInMonth = (client: Client, year: number, month: number) =>
  client.compras.filter((sale) => {
    const date = new Date(sale.data);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month;
  });

export const getCurrentMonthInTimeZone = (timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? new Date().getFullYear());
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? new Date().getMonth() + 1) - 1;
  return { year, month };
};

export const resolveCommercialContext = (
  selectedYear: number,
  selectedMonth: number | null,
  timeZone: string
) => {
  if (selectedMonth !== null) {
    return {
      year: selectedYear,
      month: selectedMonth,
      label: `${MONTH_LABELS[selectedMonth]}/${selectedYear}`,
      usedFallbackMonth: false
    };
  }

  const now = getCurrentMonthInTimeZone(timeZone);
  return {
    year: now.year,
    month: now.month,
    label: `${MONTH_LABELS[now.month]}/${now.year}`,
    usedFallbackMonth: true
  };
};

export const revenueForMonth = (client: Client, year: number, month: number) =>
  sum(salesInMonth(client, year, month).map((sale) => sale.valor));

export const classifyBracket = (
  brackets: MonthlyCommercialBracket[],
  revenue: number
): MonthlyCommercialBracket => {
  const sorted = [...(brackets.length > 0 ? brackets : DEFAULT_COMMERCIAL_BRACKETS)].sort(
    (a, b) => a.order - b.order
  );
  return (
    sorted.find((bracket) => revenue >= bracket.min && (bracket.max === null || revenue <= bracket.max)) ??
    sorted[0]
  );
};

export const nextBracketFor = (
  brackets: MonthlyCommercialBracket[],
  currentBracket: MonthlyCommercialBracket
) => {
  const sorted = [...(brackets.length > 0 ? brackets : DEFAULT_COMMERCIAL_BRACKETS)].sort(
    (a, b) => a.order - b.order
  );
  const index = sorted.findIndex((item) => item.id === currentBracket.id);
  return index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null;
};

export const commercialProfileForClient = (
  client: Client,
  brackets: MonthlyCommercialBracket[],
  selectedYear: number,
  selectedMonth: number | null,
  timeZone: string
): ClientCommercialProfile => {
  const context = resolveCommercialContext(selectedYear, selectedMonth, timeZone);
  const previousMonth = context.month === 0 ? 11 : context.month - 1;
  const previousYear = context.month === 0 ? context.year - 1 : context.year;
  const revenue = revenueForMonth(client, context.year, context.month);
  const previousRevenue = revenueForMonth(client, previousYear, previousMonth);
  const currentBracket = classifyBracket(brackets, revenue);
  const previousBracket = classifyBracket(brackets, previousRevenue);
  const nextBracket = nextBracketFor(brackets, currentBracket);
  const missingToNext = nextBracket ? Math.max(0, nextBracket.min - revenue) : 0;
  const bracketMovement =
    currentBracket.order > previousBracket.order
      ? 'subiu'
      : currentBracket.order < previousBracket.order
        ? 'desceu'
        : 'manteve';

  return {
    revenue,
    previousRevenue,
    currentBracket,
    previousBracket,
    nextBracket,
    missingToNext,
    bracketMovement,
    contextYear: context.year,
    contextMonth: context.month,
    contextLabel: context.label,
    usedFallbackMonth: context.usedFallbackMonth
  };
};

export const commercialSummaryText = (profile: ClientCommercialProfile) => {
  if (!profile.nextBracket) {
    return `${formatCurrency(profile.revenue)} neste mes. Cliente ja esta na faixa maxima.`;
  }

  return `${formatCurrency(profile.revenue)} neste mes. Faltam ${formatCurrency(profile.missingToNext)} para ${profile.nextBracket.label}.`;
};
