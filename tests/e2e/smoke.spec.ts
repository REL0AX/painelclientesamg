import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const client = {
      id: 'CLIENT-1',
      codigo: 'CLI-001',
      nome: 'Mercado Alfa',
      cnpj: '12345678000199',
      cidade: 'Sao Paulo',
      uf: 'SP',
      telefone1: '11999998888',
      telefone2: '',
      totalCompras: 3200,
      compras: [
        {
          id: 'SALE-1',
          pedido: 'PED-1',
          descricao: 'NF 100',
          tipoVenda: 'Balcao',
          portador: 'AMG',
          data: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
          valor: 3200,
          products: []
        }
      ],
      notes: [],
      contacts: []
    };

    localStorage.setItem('amg-clients-data', JSON.stringify([client]));
    localStorage.setItem('amg-products-data', JSON.stringify([]));
    localStorage.setItem('amg-import-history', JSON.stringify([]));
    localStorage.setItem('amg-routes-def', JSON.stringify([]));
    localStorage.setItem('amg-monthly-route-client-selections', JSON.stringify({}));
    localStorage.setItem('amg-monthly-route-dates', JSON.stringify({}));
    localStorage.setItem('amg-sales-goals', JSON.stringify({}));
    localStorage.setItem('amg-settings', JSON.stringify({}));
  });
});

test('opens the client drawer and generates a WhatsApp link', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Clientes' }).click();

  await expect(page.getByText('Mercado Alfa').first()).toBeVisible();
  await page.getByRole('button', { name: 'Abrir 360' }).first().click();
  await expect(page.getByText('Tabela 3').first()).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'WhatsApp' }).first().click();
  const popup = await popupPromise;
  await popup.waitForTimeout(1000);

  expect(popup.url()).toContain('phone=5511999998888');
  expect(popup.url()).toContain('Mercado+Alfa');
});
