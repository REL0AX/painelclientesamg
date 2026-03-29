import { useAppContext } from '@/app/state/AppContext';
import { dashboardSummary, worklistsForSnapshot } from '@/shared/lib/analytics';

export function useDashboardInsights() {
  const { snapshot, selectedYear, selectedMonth } = useAppContext();

  return {
    summary: dashboardSummary(snapshot, selectedYear, selectedMonth),
    worklists: worklistsForSnapshot(snapshot, selectedYear, selectedMonth)
  };
}
