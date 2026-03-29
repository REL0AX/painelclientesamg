import { describe, expect, it } from 'vitest';
import { DEFAULT_COMMERCIAL_BRACKETS } from '@/shared/lib/constants';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { normalizeClient } from '@/shared/lib/normalize';

describe('commercialProfileForClient', () => {
  it('classifies the current bracket and missing value to next bracket', () => {
    const now = new Date();
    const client = normalizeClient({
      id: 'client-1',
      codigo: 'A-1',
      nome: 'Mercado Alfa',
      cidade: 'Sao Paulo',
      uf: 'SP',
      telefone1: '11999998888',
      telefone2: '',
      compras: [
        {
          id: 'sale-1',
          pedido: '100',
          descricao: 'NF 1',
          tipoVenda: 'Balcao',
          portador: 'AMG',
          data: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
          valor: 3200,
          products: []
        }
      ],
      notes: [],
      contacts: []
    });

    const profile = commercialProfileForClient(
      client,
      DEFAULT_COMMERCIAL_BRACKETS,
      now.getFullYear(),
      now.getMonth(),
      'America/Sao_Paulo'
    );

    expect(profile.currentBracket.label).toBe('Tabela 3');
    expect(profile.nextBracket?.label).toBe('Tabela 4');
    expect(profile.missingToNext).toBeCloseTo(300);
  });
});
