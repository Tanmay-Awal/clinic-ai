'use client';
import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/Layouts/AppLayout';
import { OrganisationSettingsCard } from '@/components/admin/OrganisationSettingsCard';
import { UserManagementCard } from '@/components/admin/UserManagementCard';
import {
  OrganisationSettings,
  OrgUser,
} from '@/lib/adminMockData';

import {
  fetchUsers,
  inviteUser,
  updateUserRole,
  updateUserStatus,
  removeUser
} from '@/lib/api/admin';
import { toast } from 'sonner';
import { useAuthStore, isAdmin as checkIsAdmin } from '@/store/authStore';
import { useOrganisationSettings } from '@/hooks/useOrganisationSettings';

export default function Admin() {
  const { isAuthenticated, user, token } = useAuthStore();

  // Use global hook for organisation settings
  const { settings: orgSettings, isLoading: isLoadingSettings, updateSettings, isUpdating: isSavingSettings } = useOrganisationSettings();

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Check if current user is admin based on real auth user
  const isAdmin = checkIsAdmin(user);

  // Detect if there is a persisted auth token before Zustand rehydrates
  const hasStoredAuthToken = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem('auth-storage');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!parsed?.state?.token;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Only load users data when we know auth state and user is admin
    if (isAuthenticated && token && isAdmin) {
      loadUsersData();
    }
  }, [isAuthenticated, token, isAdmin]);

  const loadUsersData = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to load users data", error);
      toast.error("Failed to load users configuration");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveSettings = async (settings: OrganisationSettings) => {
    try {
      await updateSettings(settings);
    } catch (error) {
      // Error is handled in hook
    }
  };

  const handleInviteUser = async (email: string, role: string, name: string, password: string) => {
    const updatedUsers = await inviteUser(email, role, name, password);
    setUsers(updatedUsers);
  };

  const handleRemoveUser = async (userId: string) => {
    const updatedUsers = await removeUser(userId);
    setUsers(updatedUsers);
  };

  const handleStatusChange = async (userId: string, status: string) => {
    const updatedUsers = await updateUserStatus(userId, status);
    setUsers(updatedUsers);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    const updatedUsers = await updateUserRole(userId, role);
    setUsers(updatedUsers);
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto p-6">
        {/* While auth is still hydrating but we have a stored token, show a loading state instead of Access Denied */}
        {(!isAuthenticated || !token) && hasStoredAuthToken ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Loading...</h2>
              <p className="text-muted-foreground">Please wait while we restore your session.</p>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground">You need Admin access to view this page.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Admin Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your organisation and users.
              </p>
            </div>

            {isLoadingSettings || loadingUsers ? (
              <div className="text-foreground text-center py-20">Loading configuration...</div>
            ) : (
              <div className="mx-auto max-w-[960px] space-y-6">
                <OrganisationSettingsCard
                  settings={orgSettings || {
                    id: 0,
                    organisation_name: '',
                    business_type: '',
                    default_timezone: '',
                    default_language: 'en',
                    currency: 'USD',
                    enable_outbound_calls: false,
                    enable_ai_insights: false,
                    updated_by: '',
                    updated_at: '',
                    created_at: ''
                  }}
                  onSave={handleSaveSettings}
                  isSaving={isSavingSettings}
                />
                <UserManagementCard
                  users={users}
                  onInvite={handleInviteUser}
                  onRemove={handleRemoveUser}
                  onStatusChange={handleStatusChange}
                  onRoleChange={handleRoleChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
