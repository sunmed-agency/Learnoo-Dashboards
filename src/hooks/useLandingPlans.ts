import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { LandingPlans } from '@/src/lib/landing-plans';

const QUERY_KEY = 'landingPlans';

export function useLandingPlans() {
  return useQuery<LandingPlans>({
    queryKey: [QUERY_KEY],
    queryFn: async () => (await api.landingPlans.get()).data,
  });
}

export function useSaveLandingPlans() {
  const queryClient = useQueryClient();

  return useMutation<LandingPlans, Error, LandingPlans>({
    mutationFn: async (plans) => (await api.landingPlans.update(plans)).data,
    onSuccess: (saved) => queryClient.setQueryData([QUERY_KEY], saved),
  });
}
