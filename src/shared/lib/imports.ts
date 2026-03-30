import * as XLSX from 'xlsx';
import { createHistoryEntry } from '@/shared/lib/history';
import {
  createId,
  normalizeDigits,
  normalizeForSearch,
  parseCurrency,
  parseDateFromExcel
} from '@/shared/lib/utils';
import { normalizeClient, normalizeProduct } from '@/shared/lib/normalize';
import type {
  AppSnapshot,
  Client,
  HistoryEntry,
  ImportMergePolicy,
  Product,
  Sale
} from '@/shared/types/domain';

export interface ImportPreviewResult<T> {
  validRows: T[];
  errors: string[];
  totalRows: number;
}

export interface ClientImportCandidate {
  client: Client;
  matchType: 'new' | 'codigo' | 'cnpj' | 'multiple';
  matchedClientIds: string[];
}

const normalizeKeys = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeForSearch(String(key)), value])
  );

const findValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeForSearch(key);
    if (normalized in row) {
      return row[normalized];
    }
  }
  return undefined;
};

export const readSpreadsheet = async (file: File) => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
};

export const previewClientImport = (
  rows: Record<string, unknown>[],
  snapshot: AppSnapshot
): ImportPreviewResult<ClientImportCandidate> => {
  const codeMap = new Map(snapshot.clients.map((client) => [normalizeForSearch(client.codigo), client.id]));
  const cnpjMap = new Map(
    snapshot.clients.filter((client) => client.cnpj).map((client) => [normalizeDigits(client.cnpj), client.id])
  );
  const validRows: ClientImportCandidate[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeKeys(row);
    const codigo = String(findValue(normalized, ['codigo', 'código', 'código/nome do cliente']) ?? '').trim();
    const nome = String(findValue(normalized, ['nome do cliente', 'nome', 'razao social', 'razão social']) ?? '').trim();

    if (!codigo) {
      errors.push(`Linha ${index + 2}: codigo nao encontrado.`);
      return;
    }

    if (!nome) {
      errors.push(`Linha ${index + 2}: nome do cliente nao encontrado.`);
      return;
    }

    const cnpj = normalizeDigits(String(findValue(normalized, ['cnpj', 'documento']) ?? ''));
    const byCode = codeMap.get(normalizeForSearch(codigo));
    const byCnpj = cnpj ? cnpjMap.get(cnpj) : undefined;
    const matchedClientIds = [...new Set([byCode, byCnpj].filter(Boolean) as string[])];

    validRows.push({
      client: normalizeClient({
        id: createId('client'),
        codigo,
        nome,
        cnpj,
        cidade: String(findValue(normalized, ['cidade']) ?? ''),
        uf: String(findValue(normalized, ['uf', 'estado']) ?? ''),
        telefone1: String(findValue(normalized, ['telefone 1', 'telefone', 'fone 1']) ?? ''),
        telefone2: String(findValue(normalized, ['telefone 2', 'fone 2']) ?? ''),
        email: String(findValue(normalized, ['email', 'e-mail']) ?? ''),
        compras: [],
        notes: [],
        contacts: []
      }),
      matchType:
        matchedClientIds.length > 1
          ? 'multiple'
          : matchedClientIds.length === 1
            ? byCode
              ? 'codigo'
              : 'cnpj'
            : 'new',
      matchedClientIds
    });
  });

  return { validRows, errors, totalRows: rows.length };
};

export const mergeImportedClients = (
  snapshot: AppSnapshot,
  candidates: ClientImportCandidate[],
  policy: ImportMergePolicy
) => {
  const nextClients = [...snapshot.clients];
  const stats = {
    created: 0,
    merged: 0,
    replaced: 0,
    ignored: 0,
    blocked: 0
  };

  candidates.forEach((candidate) => {
    if (candidate.matchType === 'multiple') {
      stats.blocked += 1;
      return;
    }

    if (candidate.matchType === 'new') {
      nextClients.unshift(candidate.client);
      stats.created += 1;
      return;
    }

    const matchedId = candidate.matchedClientIds[0];
    const index = nextClients.findIndex((client) => client.id === matchedId);
    if (index < 0) {
      nextClients.unshift(candidate.client);
      stats.created += 1;
      return;
    }

    if (policy === 'ignore') {
      stats.ignored += 1;
      return;
    }

    const current = nextClients[index];

    if (policy === 'merge') {
      nextClients[index] = normalizeClient({
        ...current,
        codigo: candidate.client.codigo || current.codigo,
        nome: candidate.client.nome || current.nome,
        cnpj: candidate.client.cnpj || current.cnpj,
        cidade: candidate.client.cidade || current.cidade,
        uf: candidate.client.uf || current.uf,
        telefone1: candidate.client.telefone1 || current.telefone1,
        telefone2: candidate.client.telefone2 || current.telefone2,
        email: candidate.client.email || current.email,
        tags: [...new Set([...(current.tags ?? []), ...(candidate.client.tags ?? [])])]
      });
      stats.merged += 1;
      return;
    }

    nextClients[index] = normalizeClient({
      ...current,
      codigo: candidate.client.codigo,
      nome: candidate.client.nome,
      cnpj: candidate.client.cnpj,
      cidade: candidate.client.cidade,
      uf: candidate.client.uf,
      telefone1: candidate.client.telefone1,
      telefone2: candidate.client.telefone2,
      email: candidate.client.email,
      manualRouteId: candidate.client.manualRouteId,
      stage: candidate.client.stage,
      priority: candidate.client.priority,
      tags: candidate.client.tags,
      preferredChannel: candidate.client.preferredChannel
    });
    stats.replaced += 1;
  });

  return { nextClients, stats };
};

export const previewProductImport = (
  rows: Record<string, unknown>[]
): ImportPreviewResult<Product> => {
  const validRows: Product[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeKeys(row);
    const sku = String(findValue(normalized, ['sku', 'codigo', 'código']) ?? '').trim();
    const description = String(findValue(normalized, ['descricao', 'descrição', 'nome']) ?? '').trim();

    if (!sku || !description) {
      errors.push(`Linha ${index + 2}: SKU ou descricao ausente.`);
      return;
    }

    validRows.push(
      normalizeProduct({
        id: createId('product'),
        sku,
        description,
        price: parseCurrency(findValue(normalized, ['preco', 'preço', 'valor']) ?? 0),
        category: String(findValue(normalized, ['categoria']) ?? ''),
        brand: String(findValue(normalized, ['marca']) ?? '')
      })
    );
  });

  return { validRows, errors, totalRows: rows.length };
};

const saleFingerprint = (clientId: string, sale: Pick<Sale, 'pedido' | 'data' | 'valor'>) =>
  `${clientId}::${sale.pedido.trim().toUpperCase()}::${new Date(sale.data).toISOString().slice(0, 10)}::${sale.valor.toFixed(2)}`;

export const previewSalesImport = (
  rows: Record<string, unknown>[],
  snapshot: AppSnapshot
): ImportPreviewResult<{ clientId: string; sale: Sale }> => {
  const validRows: Array<{ clientId: string; sale: Sale }> = [];
  const errors: string[] = [];
  const clientNameMap = new Map(snapshot.clients.map((client) => [normalizeForSearch(client.nome), client.id]));
  const clientCnpjMap = new Map(
    snapshot.clients.filter((client) => client.cnpj).map((client) => [client.cnpj, client.id])
  );
  const productSkuMap = new Map(snapshot.products.map((product) => [normalizeForSearch(product.sku), product]));
  const existingFingerprints = new Set(
    snapshot.clients.flatMap((client) =>
      client.compras.map((sale) => saleFingerprint(client.id, sale))
    )
  );

  rows.forEach((row, index) => {
    const normalized = normalizeKeys(row);
    const razaoSocial = String(
      findValue(normalized, ['nome do cliente', 'razao social', 'razão social', 'cliente']) ?? ''
    ).trim();
    const cnpj = normalizeDigits(String(findValue(normalized, ['cnpj', 'cpf/cnpj', 'documento']) ?? ''));
    const valor = parseCurrency(findValue(normalized, ['vl total', 'valor total', 'valor', 'total']) ?? 0);
    const dateValue = parseDateFromExcel(
      findValue(normalized, ['data', 'data de emissao', 'data emissão', 'data nf'])
    );
    const sku = normalizeForSearch(String(findValue(normalized, ['sku', 'codigo produto', 'cód. produto']) ?? ''));
    const quantity = Number(findValue(normalized, ['qtde', 'quantidade']) ?? 1);

    const clientId = cnpj ? clientCnpjMap.get(cnpj) : clientNameMap.get(normalizeForSearch(razaoSocial));
    if (!clientId) {
      errors.push(`Linha ${index + 2}: cliente nao encontrado para ${razaoSocial || cnpj || 'registro'}.`);
      return;
    }

    if (!dateValue || valor <= 0) {
      errors.push(`Linha ${index + 2}: data ou valor invalido.`);
      return;
    }

    const sale: Sale = {
      id: createId('sale'),
      pedido: String(findValue(normalized, ['pedido']) ?? ''),
      descricao: String(findValue(normalized, ['docum', 'documento', 'nf-e', 'nota fiscal']) ?? ''),
      tipoVenda: String(findValue(normalized, ['tipo de venda']) ?? ''),
      portador: String(findValue(normalized, ['nome do portador']) ?? ''),
      data: dateValue.toISOString(),
      valor,
      products: productSkuMap.has(sku)
        ? [
            {
              sku: productSkuMap.get(sku)!.sku,
              quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
              price: productSkuMap.get(sku)!.price,
              description: productSkuMap.get(sku)!.description
            }
          ]
        : []
    };

    const fingerprint = saleFingerprint(clientId, sale);
    if (existingFingerprints.has(fingerprint)) {
      errors.push(`Linha ${index + 2}: venda duplicada para ${razaoSocial || cnpj || clientId}.`);
      return;
    }

    existingFingerprints.add(fingerprint);
    validRows.push({ clientId, sale });
  });

  return { validRows, errors, totalRows: rows.length };
};

export const createImportHistoryEntry = (
  type: HistoryEntry['type'],
  summary: string,
  clientId?: string
) =>
  createHistoryEntry(type, summary, clientId
    ? {
        clientId,
        entityKind: 'client',
        entityId: clientId
      }
    : undefined);
