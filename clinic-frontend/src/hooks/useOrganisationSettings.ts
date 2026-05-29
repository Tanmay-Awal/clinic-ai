import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrgSettings, updateOrgSettings } from '@/lib/api/admin';
import { OrganisationSettings } from '@/lib/adminMockData';
import { toast } from 'sonner';

export const useOrganisationSettings = () => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ['organisation-settings'],
        queryFn: fetchOrgSettings,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });

    const updateSettingsMutation = useMutation({
        mutationFn: updateOrgSettings,
        onSuccess: (updatedSettings) => {
            queryClient.setQueryData(['organisation-settings'], updatedSettings);
            toast.success('Settings updated successfully');
        },
        onError: () => {
            toast.error('Failed to update settings');
        }
    });

    return {
        settings,
        isLoading,
        error,
        updateSettings: updateSettingsMutation.mutateAsync,
        isUpdating: updateSettingsMutation.isPending
    };
};
