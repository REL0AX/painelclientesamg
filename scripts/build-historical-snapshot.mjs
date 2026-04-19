import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import XLSX from 'xlsx';

const { console, process } = globalThis;

const parseArgs = (argv) => {
  const args = {
    clients: '',
    salesDir: '',
    out: path.join(process.cwd(), 'local-data', 'painel-historico-consolidado.json'),
    report: path.join(process.cwd(), 'local-data', 'painel-historico-relatorio.json')
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === '--clients' && next) {
      args.clients = next;
      index += 1;
    } else if (current === '--sales-dir' && next) {
      args.salesDir = next;
      index += 1;
    } else if (current === '--out' && next) {
      args.out = next;
      index += 1;
    } else if (current === '--report' && next) {
      args.report = next;
      index += 1;
    }
  }

  return args;
};

const args = parseArgs(process.argv.slice(2));

if (!args.clients || !args.salesDir) {
  console.error(
    'Uso: node scripts/build-historical-snapshot.mjs --clients "c:\\caminho\\clientes.xlsx" --sales-dir "Meses antigos" [--out arquivo.json] [--report relatorio.json]'
  );
  process.exit(1);
}

const ensureDir = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const createId = (prefix) => `${prefix}-${randomUUID()}`;

const normalizeForSearch = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const cleanText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '');
const normalizeKeys = (row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeForSearch(key), value]));

const findValue = (row, keys) => {
  for (const key of keys) {
    const normalizedKey = normalizeForSearch(key);
    if (normalizedKey in row) {
      return row[normalizedKey];
    }
  }
  return undefined;
};

const parseCurrency = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDateFromExcel = (value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return null;
    }

    const brDateMatch = normalized.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (brDateMatch) {
      const [, dayText, monthText, yearText, hourText = '0', minuteText = '0', secondText = '0'] =
        brDateMatch;
      const date = new Date(
        Number(yearText),
        Number(monthText) - 1,
        Number(dayText),
        Number(hourText),
        Number(minuteText),
        Number(secondText)
      );

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const readSpreadsheet = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  return { sheetName, rows };
};

const saleFingerprint = (clientId, sale) =>
  `${clientId}::${sale.pedido.trim().toUpperCase()}::${new Date(sale.data).toISOString().slice(0, 10)}::${sale.valor.toFixed(2)}`;

const DEFAULT_SETTINGS = {
  commissionTransitionDate: '2025-08-01',
  tiers: {
    MESTRE: { level: 6, name: 'Mestre', min: 200000 },
    DIAMANTE: { level: 5, name: 'Diamante', min: 100000 },
    PLATINA: { level: 4, name: 'Platina', min: 50000 },
    OURO: { level: 3, name: 'Ouro', min: 10000 },
    PRATA: { level: 2, name: 'Prata', min: 5000 },
    BRONZE: { level: 1, name: 'Bronze', min: 300 },
    INATIVO: { level: 0, name: 'Inativo', min: 0 }
  },
  commercialBrackets: [
    { id: 'table-1', label: 'Tabela 1', min: 0, max: 999.99, color: 'bg-stone-200 text-stone-800', order: 1 },
    { id: 'table-2', label: 'Tabela 2', min: 1000, max: 1999.99, color: 'bg-sky-100 text-sky-900', order: 2 },
    { id: 'table-3', label: 'Tabela 3', min: 2000, max: 3499.99, color: 'bg-amber-100 text-amber-900', order: 3 },
    { id: 'table-4', label: 'Tabela 4', min: 3500, max: 4999.99, color: 'bg-orange-100 text-orange-900', order: 4 },
    { id: 'table-5', label: 'Tabela 5', min: 5000, max: null, color: 'bg-emerald-100 text-emerald-900', order: 5 }
  ],
  whatsappTemplates: [
    {
      id: 'reactivation',
      category: 'reativacao',
      enabled: true,
      name: 'Reativacao',
      description: 'Mensagem para clientes sem compra recente.',
      message:
        'Oi {{nome}}, tudo bem? Notei que voce nao compra com a AMG desde {{ultima_compra}}. Posso te ajudar a repor algum item ou montar um pedido rapido para sua rota?'
    },
    {
      id: 'progress',
      category: 'progresso',
      enabled: true,
      name: 'Progresso de Tabela',
      description: 'Mensagem comercial com acumulado mensal e distancia para a proxima tabela.',
      message:
        'Oi {{nome}}! Ate agora voce acumulou {{faturamento_mes}} em compras neste mes e esta na {{tabela_atual}} para o proximo mes. Ainda faltam {{falta_para_proxima}} para chegar na {{proxima_tabela}}.'
    },
    {
      id: 'route',
      category: 'rota',
      enabled: true,
      name: 'Rota e Agenda',
      description: 'Mensagem com rota, prazo de pedido e saida da rota.',
      message:
        'Oi {{nome}}! Sua rota atual e {{rota}}. O prazo para pedido vai ate {{prazo_pedido}} e a saida da rota esta prevista para {{saida_rota}}.'
    }
  ],
  thresholds: {
    nearNextTable: 300,
    staleDays: 45,
    atRiskDays: 75,
    routeDepartureSoonDays: 7
  },
  timezone: 'America/Sao_Paulo',
  maxBackups: 20,
  defaultImportMergePolicy: 'merge'
};

const createEmptySnapshot = () => ({
  schemaVersion: 3,
  clients: [],
  products: [],
  routes: [],
  routeSelections: {},
  routeDates: {},
  tasks: [],
  savedViews: [],
  history: [],
  settings: DEFAULT_SETTINGS,
  meta: {
    migratedFromLegacy: false,
    updatedAt: new Date().toISOString(),
    syncLedger: {
      lastSuccessfulSyncAt: null,
      dirtyClients: {},
      dirtyProducts: {},
      dirtyRoutes: {},
      dirtyTasks: {},
      dirtySavedViews: {},
      dirtySettings: false,
      lastError: null
    }
  }
});

const createHistoryEntry = (type, summary, extra = {}) => ({
  id: createId('history'),
  type,
  timestamp: Date.now(),
  summary,
  ...extra
});

const normalizeClient = (raw) => ({
  id: raw.id ?? createId('client'),
  codigo: cleanText(raw.codigo),
  nome: cleanText(raw.nome),
  cnpj: normalizeDigits(raw.cnpj),
  cidade: cleanText(raw.cidade),
  uf: cleanText(raw.uf).toUpperCase(),
  telefone1: normalizeDigits(raw.telefone1),
  telefone2: normalizeDigits(raw.telefone2),
  email: cleanText(raw.email),
  totalCompras: Array.isArray(raw.compras)
    ? raw.compras.reduce((total, sale) => total + (Number(sale.valor) || 0), 0)
    : 0,
  compras: Array.isArray(raw.compras) ? raw.compras : [],
  notes: Array.isArray(raw.notes) ? raw.notes : [],
  contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
  stage: raw.stage ?? 'ativo',
  priority: raw.priority ?? 'media',
  tags: [...new Set((raw.tags ?? []).map((tag) => cleanText(tag)).filter(Boolean))],
  preferredChannel: raw.preferredChannel ?? 'whatsapp'
});

const findExistingClient = (maps, nome, cnpj, codigo) => {
  if (cnpj && maps.byCnpj.has(cnpj)) {
    return maps.byId.get(maps.byCnpj.get(cnpj));
  }

  if (codigo && maps.byCode.has(codigo)) {
    return maps.byId.get(maps.byCode.get(codigo));
  }

  if (nome && maps.byName.has(nome)) {
    return maps.byId.get(maps.byName.get(nome));
  }

  return null;
};

const snapshot = createEmptySnapshot();
const clientMaps = {
  byId: new Map(),
  byCode: new Map(),
  byName: new Map(),
  byCnpj: new Map()
};
const report = {
  generatedAt: new Date().toISOString(),
  clientFile: args.clients,
  salesDir: args.salesDir,
  importedClientsFromSheet: 0,
  mergedClientsFromSheet: 0,
  createdClientsFromSales: 0,
  importedSales: 0,
  duplicateSalesSkipped: 0,
  invalidSalesRows: [],
  salesFiles: [],
  createdClients: []
};
const globalFingerprints = new Set();

const addOrMergeClient = (candidate, source) => {
  const normalizedCode = normalizeForSearch(candidate.codigo);
  const normalizedName = normalizeForSearch(candidate.nome);
  const normalizedCnpj = normalizeDigits(candidate.cnpj);
  const existing =
    findExistingClient(clientMaps, normalizedName, normalizedCnpj, normalizedCode) ?? null;

  if (existing) {
    existing.codigo = existing.codigo || candidate.codigo;
    existing.nome = existing.nome || candidate.nome;
    existing.cnpj = existing.cnpj || candidate.cnpj;
    existing.cidade = existing.cidade || candidate.cidade;
    existing.uf = existing.uf || candidate.uf;
    existing.telefone1 = existing.telefone1 || candidate.telefone1;
    existing.telefone2 = existing.telefone2 || candidate.telefone2;
    existing.email = existing.email || candidate.email;
    existing.tags = [...new Set([...(existing.tags ?? []), ...(candidate.tags ?? [])])];
    if (source === 'client-sheet') {
      report.mergedClientsFromSheet += 1;
    }
    return existing;
  }

  const client = normalizeClient(candidate);
  snapshot.clients.push(client);
  clientMaps.byId.set(client.id, client);
  if (client.codigo) {
    clientMaps.byCode.set(normalizeForSearch(client.codigo), client.id);
  }
  if (client.nome) {
    clientMaps.byName.set(normalizeForSearch(client.nome), client.id);
  }
  if (client.cnpj) {
    clientMaps.byCnpj.set(client.cnpj, client.id);
  }

  if (source === 'client-sheet') {
    report.importedClientsFromSheet += 1;
  }

  if (source === 'sales-auto') {
    report.createdClientsFromSales += 1;
    report.createdClients.push({
      id: client.id,
      codigo: client.codigo,
      nome: client.nome,
      cnpj: client.cnpj,
      uf: client.uf
    });
  }

  return client;
};

const importClientSheet = () => {
  const { rows, sheetName } = readSpreadsheet(args.clients);

  rows.forEach((row, index) => {
    const normalizedRow = normalizeKeys(row);
    const codigo = cleanText(findValue(normalizedRow, ['codigo', 'código']));
    const nome = cleanText(findValue(normalizedRow, ['nome do cliente', 'nome']));

    if (!codigo || !nome) {
      report.invalidSalesRows.push({
        source: 'clients-sheet',
        row: index + 2,
        reason: 'codigo ou nome ausente'
      });
      return;
    }

    addOrMergeClient(
      {
        codigo,
        nome,
        cidade: cleanText(findValue(normalizedRow, ['cidade'])),
        uf: cleanText(findValue(normalizedRow, ['uf'])),
        telefone1: cleanText(findValue(normalizedRow, ['telefone 1', 'telefone', 'fone 1'])),
        telefone2: cleanText(findValue(normalizedRow, ['telefone 2', 'fone 2'])),
        email: '',
        cnpj: '',
        compras: [],
        notes: [],
        contacts: []
      },
      'client-sheet'
    );
  });

  snapshot.history.unshift(
    createHistoryEntry(
      'clients',
      `${report.importedClientsFromSheet} clientes importados e ${report.mergedClientsFromSheet} mesclados de ${path.basename(args.clients)}.`,
      {
        entityKind: 'system',
        metadata: {
          sheetName
        }
      }
    )
  );
};

const importSalesFiles = () => {
  const files = fs
    .readdirSync(args.salesDir)
    .filter((file) => /\.(xlsx|xls|csv)$/i.test(file))
    .map((file) => {
      const filePath = path.join(args.salesDir, file);
      const { rows, sheetName } = readSpreadsheet(filePath);
      const dates = rows
        .map((row) => {
          const normalizedRow = normalizeKeys(row);
          return parseDateFromExcel(findValue(normalizedRow, ['data saída', 'data saida', 'data']));
        })
        .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
        .sort((left, right) => left - right);

      return {
        file,
        filePath,
        sheetName,
        rows,
        minDate: dates[0]?.getTime() ?? Number.MAX_SAFE_INTEGER
      };
    })
    .sort((left, right) => left.minDate - right.minDate || left.file.localeCompare(right.file, 'pt-BR'));

  files.forEach((fileInfo) => {
    let imported = 0;
    let duplicates = 0;
    let createdClients = 0;
    const fileErrors = [];

    fileInfo.rows.forEach((row, index) => {
      const normalizedRow = normalizeKeys(row);
      const razaoSocial = cleanText(
        findValue(normalizedRow, ['razao social', 'razão social', 'cliente', 'nome do cliente'])
      );
      const cnpj = normalizeDigits(
        findValue(normalizedRow, ['cnpj', 'cnpj / cpf', 'cpf/cnpj', 'documento'])
      );
      const data = parseDateFromExcel(
        findValue(normalizedRow, ['data saída', 'data saida', 'data', 'data nf'])
      );
      const valor = parseCurrency(
        findValue(normalizedRow, ['valor total', 'vl total', 'valor', 'total'])
      );
      const pedido = cleanText(findValue(normalizedRow, ['pedido']));
      const documento = cleanText(
        findValue(normalizedRow, ['nf-e / pré fatura', 'nf-e / pre fatura', 'nf-e', 'documento'])
      );

      if (!razaoSocial && !cnpj) {
        fileErrors.push(`Linha ${index + 2}: cliente sem nome e sem documento.`);
        return;
      }

      if (!data || valor <= 0) {
        fileErrors.push(`Linha ${index + 2}: data ou valor invalido.`);
        return;
      }

      const normalizedName = normalizeForSearch(razaoSocial);
      let client =
        findExistingClient(clientMaps, normalizedName, cnpj, '') ??
        null;

      if (!client) {
        client = addOrMergeClient(
          {
            codigo: cnpj ? `AUTO-${cnpj.slice(-8)}` : `AUTO-${String(report.createdClientsFromSales + 1).padStart(4, '0')}`,
            nome: razaoSocial,
            cnpj,
            cidade: cleanText(findValue(normalizedRow, ['cidade'])),
            uf: cleanText(findValue(normalizedRow, ['uf', 'estado'])),
            telefone1: '',
            telefone2: '',
            email: '',
            compras: [],
            notes: [],
            contacts: [],
            tags: ['criado-via-venda']
          },
          'sales-auto'
        );
        createdClients += 1;
      }

      const sale = {
        id: createId('sale'),
        pedido,
        descricao: documento,
        tipoVenda: cleanText(findValue(normalizedRow, ['observações', 'observacoes', 'tipo de venda'])),
        portador: cleanText(findValue(normalizedRow, ['empresa', 'origem', 'nome do portador'])),
        data: data.toISOString(),
        valor,
        products: []
      };

      const fingerprint = saleFingerprint(client.id, sale);
      if (globalFingerprints.has(fingerprint)) {
        duplicates += 1;
        return;
      }

      globalFingerprints.add(fingerprint);
      client.compras.push(sale);
      imported += 1;
      report.importedSales += 1;
    });

    report.duplicateSalesSkipped += duplicates;
    report.invalidSalesRows.push(
      ...fileErrors.map((reason) => ({
        source: fileInfo.file,
        reason
      }))
    );
    report.salesFiles.push({
      file: fileInfo.file,
      sheetName: fileInfo.sheetName,
      rows: fileInfo.rows.length,
      importedSales: imported,
      createdClients,
      duplicates,
      errors: fileErrors.length
    });

    snapshot.history.unshift(
      createHistoryEntry(
        'sales',
        `${imported} vendas importadas de ${fileInfo.file}.${createdClients > 0 ? ` ${createdClients} clientes criados automaticamente.` : ''}`,
        {
          entityKind: 'system',
          metadata: {
            duplicates,
            rows: fileInfo.rows.length
          }
        }
      )
    );
  });
};

const finalizeSnapshot = () => {
  snapshot.clients.forEach((client) => {
    client.compras.sort((left, right) => +new Date(right.data) - +new Date(left.data));
    client.totalCompras = client.compras.reduce((total, sale) => total + sale.valor, 0);
  });

  snapshot.clients.sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
  snapshot.history.sort((left, right) => right.timestamp - left.timestamp);
  snapshot.meta.updatedAt = new Date().toISOString();
};

importClientSheet();
importSalesFiles();
finalizeSnapshot();

ensureDir(args.out);
ensureDir(args.report);
fs.writeFileSync(args.out, JSON.stringify(snapshot, null, 2));
fs.writeFileSync(args.report, JSON.stringify(report, null, 2));

console.log(`Snapshot salvo em ${args.out}`);
console.log(`Relatorio salvo em ${args.report}`);
console.log(`Clientes totais: ${snapshot.clients.length}`);
console.log(`Clientes da planilha: ${report.importedClientsFromSheet}`);
console.log(`Clientes criados por venda: ${report.createdClientsFromSales}`);
console.log(`Vendas importadas: ${report.importedSales}`);
