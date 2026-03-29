import { clsx } from 'clsx';
import { MONTH_LABELS } from '@/shared/lib/constants';

export const cn = (...inputs: Array<string | boolean | null | undefined>) => clsx(inputs);

export const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

export const formatNumber = (value: number) =>
  value.toLocaleString('pt-BR', {
    maximumFractionDigits: 0
  });

export const formatDate = (value?: string | number | Date | null) => {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nao informado';
  return date.toLocaleDateString('pt-BR');
};

export const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nao informado';
  return date.toLocaleString('pt-BR');
};

export const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export const normalizeDigits = (value: string) => value.replace(/\D/g, '');

export const parseCurrency = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const parseDateFromExcel = (value: unknown) => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch;
  }

  if (typeof value === 'string') {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate;

    const [day, month, year] = value.split(/[/-]/).map(Number);
    if (day && month && year) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const monthKeyFor = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}`;

export const getMonthLabel = (month: number, year: number) => `${MONTH_LABELS[month]}/${year}`;

export const deepClone = <T,>(value: T): T => structuredClone(value);

export const sortByDateDesc = <T extends { timestamp: number }>(items: T[]) =>
  [...items].sort((a, b) => b.timestamp - a.timestamp);

export const sum = (values: number[]) => values.reduce((total, current) => total + current, 0);

export const daysBetween = (from: Date, to: Date) => {
  const diff = to.getTime() - from.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const withLeading55 = (digits: string) => {
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
};
