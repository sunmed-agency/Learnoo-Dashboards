import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { SubscriptionRequest, SubscriptionRequestPage, SubscriptionRequestStatus } from '@/src/lib/subscription-requests';

const QUERY_KEY = 'subscriptionRequests';

export function useSubscriptionRequests(params: { status?: SubscriptionRequestStatus; search?: string; page?: number }) {
  return useQuery<SubscriptionRequestPage>({
    queryKey: [QUERY_KEY, params],
    queryFn: () => api.subscriptionRequests.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

export function useUpdateSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation<{ data: SubscriptionRequest }, Error, { id: number; status?: SubscriptionRequestStatus; owner_notes?: string | null }>({
    mutationFn: ({ id, ...data }) => api.subscriptionRequests.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, number>({
    mutationFn: (id) => api.subscriptionRequests.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
