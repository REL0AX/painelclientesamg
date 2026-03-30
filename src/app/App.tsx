import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage').then((module) => ({ default: module.ClientsPage })));
const RoutesPage = lazy(() => import('@/features/routes/RoutesPage').then((module) => ({ default: module.RoutesPage })));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const ImportsPage = lazy(() => import('@/features/imports/ImportsPage').then((module) => ({ default: module.ImportsPage })));
const TasksPage = lazy(() => import('@/features/tasks/TasksPage').then((module) => ({ default: module.TasksPage })));
const CampaignsPage = lazy(() => import('@/features/campaigns/CampaignsPage').then((module) => ({ default: module.CampaignsPage })));
const DiagnosticsPage = lazy(() =>
  import('@/features/diagnostics/DiagnosticsPage').then((module) => ({ default: module.DiagnosticsPage }))
);
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function RoutedPage({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 text-sm text-[var(--ink-600)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          Carregando modulo...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<RoutedPage><DashboardPage /></RoutedPage>} />
          <Route path="clientes" element={<RoutedPage><ClientsPage /></RoutedPage>} />
          <Route path="rotas" element={<RoutedPage><RoutesPage /></RoutedPage>} />
          <Route path="produtos" element={<RoutedPage><ProductsPage /></RoutedPage>} />
          <Route path="tarefas" element={<RoutedPage><TasksPage /></RoutedPage>} />
          <Route path="campanhas" element={<RoutedPage><CampaignsPage /></RoutedPage>} />
          <Route path="importacoes" element={<RoutedPage><ImportsPage /></RoutedPage>} />
          <Route path="diagnostico" element={<RoutedPage><DiagnosticsPage /></RoutedPage>} />
          <Route path="configuracoes" element={<RoutedPage><SettingsPage /></RoutedPage>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
