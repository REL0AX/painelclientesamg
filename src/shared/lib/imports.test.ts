import { describe, expect, it } from 'vitest';
import { createEmptySnapshot, normalizeClient } from '@/shared/lib/normalize';
import { previewClientImport, previewSalesImport } from '@/shared/lib/imports';

describe('imports helpers', () => {
  it('accepts the client spreadsheet layout used in Meus clientes.xlsx', () => {
    const snapshot = createEmptySnapshot();
    const result = previewClientImport(
      [
        {
          Código: 3670,
          'Nome do Cliente': 'MERCADO ALFA LTDA                ',
          Cidade: 'MARINGA                    ',
          UF: 'PR',
          'Telefone 1': '(44) 3253-5793',
          'Telefone 2': '(44) 99888-7766'
        }
      ],
      snapshot
    );

    expect(result.errors).toEqual([]);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].client.codigo).toBe('3670');
    expect(result.validRows[0].client.nome).toBe('MERCADO ALFA LTDA');
    expect(result.validRows[0].client.telefone1).toBe('4432535793');
  });

  it('imports sales from the monthly layout and creates a client when it is missing', () => {
    const snapshot = createEmptySnapshot();
    snapshot.clients = [
      normalizeClient({
        id: 'client-1',
        codigo: '3670',
        nome: 'MERCADO ALFA LTDA',
        cidade: 'MARINGA',
        uf: 'PR',
        telefone1: '(44) 3253-5793',
        telefone2: '',
        compras: [],
        notes: [],
        contacts: []
      })
    ];

    const result = previewSalesImport(
      [
        {
          'Data Saída': '25/11/2025',
          Pedido: '1001',
          'NF-e / Pré Fatura': '63857',
          'CNPJ / CPF': '',
          'Razão Social': 'MERCADO ALFA   LTDA',
          UF: 'PR',
          Observações: '540B',
          ' Valor Total  ': 3185.85,
          Origem: 'FRG',
          Empresa: 'AMG FRG'
        },
        {
          'Data Saída': '24/11/2025',
          Pedido: '1002',
          'NF-e': '60489',
          CNPJ: '21.698.050/0001-64',
          'Razão Social': 'JOSIAS ANTONIO ALMEIDA - CASA DAS LATARIAS',
          UF: 'PR',
          Observações: '540B',
          ' Valor Total  ': 1686.35,
          Origem: 'FRG',
          Empresa: 'AMG FRG'
        }
      ],
      snapshot
    );

    expect(result.errors).toEqual([]);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0].matchType).toBe('existing');
    expect(result.validRows[0].clientId).toBe('client-1');
    expect(result.validRows[0].sale.descricao).toBe('63857');
    expect(result.validRows[1].matchType).toBe('created');
    expect(result.validRows[1].createdClient?.nome).toBe('JOSIAS ANTONIO ALMEIDA - CASA DAS LATARIAS');
    expect(result.validRows[1].createdClient?.cnpj).toBe('21698050000164');
    expect(result.validRows[1].createdClient?.tags).toContain('criado-via-venda');
  });
});
