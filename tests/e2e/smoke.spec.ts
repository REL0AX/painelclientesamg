import { expect, test } from '@playwright/test';

test('shows the maintenance page for root and app routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Painel em manutencao temporaria' })).toBeVisible();
  await expect(page.getByText('Temporariamente bloqueado')).toBeVisible();
  await expect(page.getByText('Preservados')).toBeVisible();

  await page.goto('/clientes');
  await expect(page.getByRole('heading', { name: 'Painel em manutencao temporaria' })).toBeVisible();
  await expect(page.getByText('Nenhuma acao adicional e necessaria agora.')).toBeVisible();
});
