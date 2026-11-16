import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { AppUpdateSettings } from '@/src/lib/app-update-settings';

const QUERY_KEY = 'appUpdateSettings';

export function useAppUpdateSettings() {
  return useQuery<AppUpdateSettings>({
    queryKey: [QUERY_KEY],
    queryFn: async () => (await api.appUpdate.get()).data,
  });
}

export function useSaveAppUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<AppUpdateSettings, Error, AppUpdateSettings>({
    mutationFn: async (settings) => (await api.appUpdate.update(settings)).data,
    onSuccess: (saved) => queryClient.setQueryData([QUERY_KEY], saved),
  });
}
