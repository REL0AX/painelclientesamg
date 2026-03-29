import { useAppContext } from '@/app/state/AppContext';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Card } from '@/shared/ui/Card';
import { formatCurrency } from '@/shared/lib/utils';

export function ProductsPage() {
  const { snapshot } = useAppContext();

  if (snapshot.products.length === 0) {
    return (
      <EmptyState
        title="Sem produtos ainda"
        description="Importe uma planilha de produtos para enriquecer o painel, conectar SKU nas vendas e melhorar as mensagens comerciais."
      />
    );
  }

  return (
    <Card>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Catalogo</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Produtos importados</h2>
        </div>
        <div className="rounded-full bg-[var(--panel-subtle)] px-3 py-1 text-sm font-semibold text-[var(--ink-900)]">
          {snapshot.products.length}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Descricao</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Marca</th>
              <th className="px-3 py-2 text-right">Preco</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.products.map((product) => (
              <tr key={product.id} className="rounded-2xl bg-white">
                <td className="rounded-l-2xl px-3 py-3 font-semibold text-[var(--ink-900)]">{product.sku}</td>
                <td className="px-3 py-3 text-[var(--ink-700)]">{product.description}</td>
                <td className="px-3 py-3 text-[var(--ink-700)]">{product.category || '--'}</td>
                <td className="px-3 py-3 text-[var(--ink-700)]">{product.brand || '--'}</td>
                <td className="rounded-r-2xl px-3 py-3 text-right font-semibold text-[var(--ink-900)]">{formatCurrency(product.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
