import * as XLSX from 'xlsx';
import { createId, normalizeDigits, normalizeForSearch, parseCurrency, parseDateFromExcel } from '@/shared/lib/utils';
import { normalizeClient, normalizeProduct } from '@/shared/lib/normalize';
import type { AppSnapshot, Client, ImportHistoryEntry, Product, Sale } from '@/shared/types/domain';

export interface ImportPreviewResult<T> {
  validRows: T[];
  errors: string[];
  totalRows: number;
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
): ImportPreviewResult<Client> => {
  const existingCodes = new Set(snapshot.clients.map((client) => client.codigo));
  const validRows: Client[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const normalized = normalizeKeys(row);
    const codigo = String(findValue(normalized, ['codigo', 'código', 'código/nome do cliente']) ?? '').trim();
    const nome = String(findValue(normalized, ['nome do cliente', 'nome', 'razao social', 'razão social']) ?? '').trim();

    if (!codigo) {
      errors.push(`Linha ${index + 2}: codigo nao encontrado.`);
      return;
    }

    if (existingCodes.has(codigo)) {
      errors.push(`Linha ${index + 2}: codigo ${codigo} ja existe e foi ignorado.`);
      return;
    }

    if (!nome) {
      errors.push(`Linha ${index + 2}: nome do cliente nao encontrado.`);
      return;
    }

    validRows.push(
      normalizeClient({
        id: createId('client'),
        codigo,
        nome,
        cnpj: normalizeDigits(String(findValue(normalized, ['cnpj', 'documento']) ?? '')),
        cidade: String(findValue(normalized, ['cidade']) ?? ''),
        uf: String(findValue(normalized, ['uf', 'estado']) ?? ''),
        telefone1: String(findValue(normalized, ['telefone 1', 'telefone', 'fone 1']) ?? ''),
        telefone2: String(findValue(normalized, ['telefone 2', 'fone 2']) ?? ''),
        compras: [],
        notes: [],
        contacts: []
      })
    );
  });

  return { validRows, errors, totalRows: rows.length };
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

export const previewSalesImport = (
  rows: Record<string, unknown>[],
  snapshot: AppSnapshot
): ImportPreviewResult<{ clientId: string; sale: Sale }> => {
  const validRows: Array<{ clientId: string; sale: Sale }> = [];
  const errors: string[] = [];
  const clientNameMap = new Map(snapshot.clients.map((client) => [normalizeForSearch(client.nome), client.id]));
  const clientCnpjMap = new Map(snapshot.clients.filter((client) => client.cnpj).map((client) => [client.cnpj, client.id]));
  const productSkuMap = new Map(snapshot.products.map((product) => [normalizeForSearch(product.sku), product]));

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

    const matchedProduct = productSkuMap.get(sku);
    validRows.push({
      clientId,
      sale: {
        id: createId('sale'),
        pedido: String(findValue(normalized, ['pedido']) ?? ''),
        descricao: String(findValue(normalized, ['docum', 'documento', 'nf-e', 'nota fiscal']) ?? ''),
        tipoVenda: String(findValue(normalized, ['tipo de venda']) ?? ''),
        portador: String(findValue(normalized, ['nome do portador']) ?? ''),
        data: dateValue.toISOString(),
        valor,
        products: matchedProduct
          ? [
              {
                sku: matchedProduct.sku,
                quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
                price: matchedProduct.price,
                description: matchedProduct.description
              }
            ]
          : []
      }
    });
  });

  return { validRows, errors, totalRows: rows.length };
};

export const createImportHistoryEntry = (type: ImportHistoryEntry['type'], summary: string): ImportHistoryEntry => ({
  id: createId('history'),
  type,
  timestamp: Date.now(),
  summary
});
