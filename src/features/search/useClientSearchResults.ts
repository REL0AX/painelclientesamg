import { useAppContext } from '@/app/state/AppContext';
import { searchClients } from '@/shared/lib/analytics';

export function useClientSearchResults() {
  const { snapshot, globalSearch } = useAppContext();
  return searchClients(snapshot.clients, globalSearch);
}
