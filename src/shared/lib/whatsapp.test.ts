import { describe, expect, it } from 'vitest';
import { DEFAULT_COMMERCIAL_BRACKETS, DEFAULT_WHATSAPP_TEMPLATES } from '@/shared/lib/constants';
import { commercialProfileForClient } from '@/shared/lib/commercial';
import { normalizeClient } from '@/shared/lib/normalize';
import { buildWhatsAppLink, normalizeClientPhone } from '@/shared/lib/whatsapp';

describe('whatsapp helpers', () => {
  it('normalizes phone numbers and builds wa.me links with variables', () => {
    const now = new Date();
    const client = normalizeClient({
      id: 'client-1',
      codigo: 'B-2',
      nome: 'Oficina Beta',
      cidade: 'Campinas',
      uf: 'SP',
      telefone1: '(19) 99888-7766',
      telefone2: '',
      compras: [
        {
          id: 'sale-1',
          pedido: '200',
          descricao: 'NF 2',
          tipoVenda: 'Entrega',
          portador: 'AMG',
          data: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
          valor: 1500,
          products: []
        }
      ],
      notes: [],
      contacts: []
    });

    const phone = normalizeClientPhone(client);
    const profile = commercialProfileForClient(
      client,
      DEFAULT_COMMERCIAL_BRACKETS,
      now.getFullYear(),
      now.getMonth(),
      'America/Sao_Paulo'
    );
    const link = buildWhatsAppLink(client, DEFAULT_WHATSAPP_TEMPLATES[1], profile, null);

    expect(phone.international).toBe('5519998887766');
    expect(link?.href).toContain('https://wa.me/5519998887766');
    expect(decodeURIComponent(link?.href ?? '')).toContain('Oficina Beta');
    expect(decodeURIComponent(link?.href ?? '')).toContain('Tabela 2');
  });
});
