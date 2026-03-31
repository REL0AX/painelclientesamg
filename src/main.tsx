import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MaintenancePage } from '@/maintenance/MaintenancePage';
import { activateMaintenanceMode } from '@/shared/lib/pwa';
import '@/styles.css';

activateMaintenanceMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaintenancePage />
  </StrictMode>
);
