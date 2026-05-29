'use client';

import { useEffect, useState, useMemo } from 'react';
import { authApi } from '@/lib/api/auth';
import { useSummaryDashboard } from '@/hooks/use-dashboard';
import { User } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, User as UserIcon, Mail, Phone, Clock, Calendar, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';

import AppLayout from '@/components/Layouts/AppLayout';

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const dateParams = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Format as YYYY-MM-DD for the API
        const formattedStart = startOfMonth.toISOString().split('T')[0];
        const formattedEnd = now.toISOString().split('T')[0];

        return {
            startDate: startOfMonth.toISOString(), // Some APIs prefer full ISO
            endDate: now.toISOString(),
            dateRange: `custom|${formattedStart}|${formattedEnd}`
        };
    }, []);

    const { data: summaryData, isLoading: isLoadingSummary } = useSummaryDashboard({
        params: dateParams
    });

    useEffect(() => {
        setMounted(true);
        const fetchProfile = async () => {
            try {
                const userData = await authApi.getCurrentUser();
                console.log(userData);
                setUser(userData);
            } catch (err) {
                setError('Failed to load profile');
                // Log error only in development
                if (process.env.NODE_ENV === 'development') {
                    console.error(err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading || isLoadingSummary) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout>
                <div className="flex h-full items-center justify-center text-destructive p-6">
                    {error}
                </div>
            </AppLayout>
        );
    }

    if (!user) {
        return null;
    }

    const isFredrick = user.email?.toLowerCase() === 'fredrick@huemanai.co.uk';
    const displayTotalMinutes = isFredrick ? 4500 : (user.total_call_minutes || 1000);
    const displayMinutesLeft = displayTotalMinutes - (user.call_minutes_used || 0);

    const totalCallsProvided = 2000;
    const callsUsedThisMonth = summaryData?.totalCalls || 0;
    const callsLeft = totalCallsProvided - callsUsedThisMonth;

    return (
        <AppLayout>
            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your account settings and view usage statistics.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserIcon className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                <p className="text-lg font-medium">
                                    {user.first_name} {user.last_name}
                                </p>
                            </div>
                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email Address
                                </p>
                                <p className="text-lg font-medium">{user.email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Usage Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Total Call Minutes
                                </p>
                                <p className="text-2xl font-bold">{displayTotalMinutes} mins</p>
                            </div>

                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Minutes Left (This Month)
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-primary">
                                        {displayMinutesLeft}
                                    </p>
                                    <span className="text-sm text-muted-foreground">
                                        / {user.plan_type === 'per_month' ? 'Month' : 'Custom Plan'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Calls Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Total Calls Provided
                                </p>
                                <p className="text-2xl font-bold">{totalCallsProvided} Calls</p>
                            </div>

                            <div className="grid gap-1">
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Calls Left (This Month)
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-primary">
                                        {callsLeft}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Appearance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        {mounted && theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                        <p className="text-base font-medium">Dark Mode</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Toggle between light and dark themes for the dashboard.
                                    </p>
                                </div>
                                <Switch
                                    checked={mounted && theme === 'dark'}
                                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
