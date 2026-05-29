import { apiClient } from '@/lib/api/client';
import { OrganisationSettings, OrgUser } from '@/lib/adminMockData';

// Re-using the types from adminMockData for now, but in real app should be shared or redefined
// We need to match the backend DTO structure

export const fetchOrgSettings = async (): Promise<OrganisationSettings> => {
    const { data } = await apiClient.get('/admin/settings');
    return data;
};

export const updateOrgSettings = async (settings: Partial<OrganisationSettings>): Promise<OrganisationSettings> => {
    const { data } = await apiClient.put('/admin/settings', settings);
    return data;
};

export const fetchUsers = async (): Promise<OrgUser[]> => {
    const { data } = await apiClient.get('/admin/users');
    return data;
};

export const inviteUser = async (email: string, role: string, name: string, password: string): Promise<OrgUser[]> => {
    const { data } = await apiClient.post('/admin/users/invite', { email, role, name, password });
    return data;
};

export const updateUserStatus = async (userId: string, status: string): Promise<OrgUser[]> => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return data;
};

export const updateUserRole = async (userId: string, role: string): Promise<OrgUser[]> => {
    const { data } = await apiClient.patch(`/admin/users/${userId}/role`, { role });
    return data;
};

export const removeUser = async (userId: string): Promise<OrgUser[]> => {
    const { data } = await apiClient.delete(`/admin/users/${userId}`);
    return data;
};
