import { useMemo, useState } from 'react';
import { useAppContext } from '@/app/state/AppContext';
import {
  previewClientImport,
  previewProductImport,
  previewSalesImport,
  readSpreadsheet,
  type ImportPreviewResult
} from '@/shared/lib/imports';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { FieldLabel, Select } from '@/shared/ui/Field';

type ImportSectionKey = 'clients' | 'sales' | 'products';

interface SectionState<T> {
  fileName: string;
  preview: ImportPreviewResult<T> | null;
}

export function ImportsPage() {
  const { snapshot, importClients, importProducts, importSales } = useAppContext();
  const [clientMergePolicy, setClientMergePolicy] = useState(snapshot.settings.defaultImportMergePolicy);
  const [sections, setSections] = useState<{
    clients: SectionState<ReturnType<typeof previewClientImport>['validRows'][number]>;
    sales: SectionState<ReturnType<typeof previewSalesImport>['validRows'][number]>;
    products: SectionState<ReturnType<typeof previewProductImport>['validRows'][number]>;
  }>({
    clients: { fileName: '', preview: null },
    sales: { fileName: '', preview: null },
    products: { fileName: '', preview: null }
  });

  const clientPreviewStats = useMemo(() => {
    const rows = sections.clients.preview?.validRows ?? [];
    return {
      new: rows.filter((row) => row.matchType === 'new').length,
      codigo: rows.filter((row) => row.matchType === 'codigo').length,
      cnpj: rows.filter((row) => row.matchType === 'cnpj').length,
      multiple: rows.filter((row) => row.matchType === 'multiple').length
    };
  }, [sections.clients.preview?.validRows]);

  const handleFile = async (kind: ImportSectionKey, file: File | undefined) => {
    if (!file) return;
    const rows = await readSpreadsheet(file);

    if (kind === 'clients') {
      setSections((current) => ({
        ...current,
        clients: {
          fileName: file.name,
          preview: previewClientImport(rows, snapshot)
        }
      }));
    }

    if (kind === 'sales') {
      setSections((current) => ({
        ...current,
        sales: {
          fileName: file.name,
          preview: previewSalesImport(rows, snapshot)
        }
      }));
    }

    if (kind === 'products') {
      setSections((current) => ({
        ...current,
        products: {
          fileName: file.name,
          preview: previewProductImport(rows)
        }
      }));
    }
  };

  const applyClients = async () => {
    const preview = sections.clients.preview;
    if (!preview) return;
    await importClients(preview.validRows, sections.clients.fileName, clientMergePolicy);
    setSections((current) => ({
      ...current,
      clients: { fileName: '', preview: null }
    }));
  };

  const applySales = async () => {
    const preview = sections.sales.preview;
    if (!preview) return;
    await importSales(preview.validRows, sections.sales.fileName);
    setSections((current) => ({
      ...current,
      sales: { fileName: '', preview: null }
    }));
  };

  const applyProducts = async () => {
    const preview = sections.products.preview;
    if (!preview) return;
    await importProducts(preview.validRows, sections.products.fileName);
    setSections((current) => ({
      ...current,
      products: { fileName: '', preview: null }
    }));
  };

  const sectionsConfig = [
    {
      key: 'clients' as const,
      title: 'Clientes',
      description: 'Importe nome, codigo, cidade, UF, telefone e documento com decisao explicita de duplicidade.'
    },
    {
      key: 'sales' as const,
      title: 'Vendas',
      description: 'Vincula vendas por CNPJ ou razao social e barra duplicidade por pedido + data + valor.'
    },
    {
      key: 'products' as const,
      title: 'Produtos',
      description: 'SKU, descricao, preco, categoria e marca para enriquecer vendas e mensagens.'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Governanca de importacao</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Preview, merge policy e validacao por linha</h2>
        <div className="mt-4 max-w-sm">
          <FieldLabel>Politica padrao para clientes com match unico</FieldLabel>
          <Select value={clientMergePolicy} onChange={(event) => setClientMergePolicy(event.target.value as typeof clientMergePolicy)}>
            <option value="merge">Mesclar</option>
            <option value="replace">Substituir</option>
            <option value="ignore">Ignorar</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {sectionsConfig.map((section) => {
          const sectionState = sections[section.key];
          return (
            <Card key={section.key} className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Importacao</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{section.title}</h2>
                <p className="mt-2 text-sm text-[var(--ink-600)]">{section.description}</p>
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel-subtle)] px-4 py-6 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--accent-400)]">
                Selecionar planilha
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => void handleFile(section.key, event.target.files?.[0])}
                />
              </label>

              {sectionState.preview ? (
                <div className="space-y-3 rounded-[24px] border border-[var(--line)] bg-white p-4">
                  <p className="text-sm font-semibold text-[var(--ink-900)]">{sectionState.fileName}</p>
                  <p className="text-sm text-[var(--ink-600)]">
                    {sectionState.preview.validRows.length} linhas validas de {sectionState.preview.totalRows}.
                  </p>

                  {section.key === 'clients' ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-[var(--ink-700)]">Novos: {clientPreviewStats.new}</div>
                      <div className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-[var(--ink-700)]">Match codigo: {clientPreviewStats.codigo}</div>
                      <div className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-[var(--ink-700)]">Match CNPJ: {clientPreviewStats.cnpj}</div>
                      <div className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-[var(--ink-700)]">Bloqueados: {clientPreviewStats.multiple}</div>
                    </div>
                  ) : null}

                  {sectionState.preview.errors.length > 0 ? (
                    <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                      <p className="font-semibold">Erros encontrados</p>
                      <ul className="mt-2 space-y-1">
                        {sectionState.preview.errors.slice(0, 6).map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {section.key === 'clients'
                      ? (sectionState.preview.validRows as ReturnType<typeof previewClientImport>['validRows']).slice(0, 8).map((row) => (
                          <div key={row.client.id} className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-sm text-[var(--ink-700)]">
                            <p className="font-semibold text-[var(--ink-900)]">{row.client.nome}</p>
                            <p className="mt-1">{row.client.codigo} • {row.client.cidade || 'Sem cidade'} / {row.client.uf || '--'}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
                              decisao: {row.matchType}
                            </p>
                          </div>
                        ))
                      : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {section.key === 'clients' ? <Button onClick={() => void applyClients()}>Aplicar clientes</Button> : null}
                    {section.key === 'sales' ? <Button onClick={() => void applySales()}>Aplicar vendas</Button> : null}
                    {section.key === 'products' ? <Button onClick={() => void applyProducts()}>Aplicar produtos</Button> : null}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSections((current) => ({
                          ...current,
                          [section.key]: { fileName: '', preview: null }
                        }))
                      }
                    >
                      Descartar preview
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Preview aguardando arquivo"
                  description="Quando voce selecionar uma planilha, validacoes, duplicidades e erros por linha aparecerao aqui."
                />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
