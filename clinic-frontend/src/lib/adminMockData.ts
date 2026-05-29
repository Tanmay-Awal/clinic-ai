
export type UserRole = string;
export type UserStatus = 'active' | 'disabled' | 'invited';

export interface OrganisationSettings {
    id?: number;
    organisation_name: string;
    business_type: string;
    default_timezone: string;
    default_language: string;
    currency: string;
    enable_outbound_calls: boolean;
    enable_ai_insights: boolean;
    enable_locations?: boolean;
    locations?: string[];
    updated_by?: string;
    updated_at?: string;
    created_at?: string;
    insight_agent_ids?: {
        reservation?: string;
        feedback?: string;
        reservation_agent_ids?: string[];
        feedback_agent_ids?: string[];
        reservation_label?: string;
        feedback_label?: string;
        status?: string;
    };
    // Keeping backward compat for now if needed, or remove
    last_updated_by?: string;
    last_updated_at?: string;
}

export interface OrgUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    is_admin?: boolean;
    status: UserStatus;
    lastLogin: string | null;
}

export const currentUser = {
    id: 'u1',
    name: 'Rahul Sharma',
    email: 'rahul@Convo.com',
    role: 'admin' as UserRole,
};

export const mockOrganisation: OrganisationSettings = {
    organisation_name: 'Convo Demo Organisation',
    business_type: 'Hotel',
    default_timezone: 'Asia/Kolkata',
    default_language: 'en',
    currency: 'INR',
    enable_outbound_calls: true,
    enable_ai_insights: true,
    last_updated_by: 'Rahul Sharma',
    last_updated_at: '2025-01-04T20:00:00.000Z',
};

export const mockUsers: OrgUser[] = [
    {
        id: 'u1',
        name: 'Rahul Sharma',
        email: 'rahul@Convo.com',
        role: 'admin',
        status: 'active',
        lastLogin: '2025-01-05T14:45:00.000Z',
    },
    {
        id: 'u2',
        name: 'Priya Patel',
        email: 'priya@Convo.com',
        role: 'viewer',
        status: 'active',
        lastLogin: '2025-01-04T22:15:00.000Z',
    },
    {
        id: 'u3',
        name: 'Amit Kumar',
        email: 'amit@Convo.com',
        role: 'viewer',
        status: 'active',
        lastLogin: '2025-01-03T16:50:00.000Z',
    },
    {
        id: 'u4',
        name: 'Sneha Gupta',
        email: 'sneha@Convo.com',
        role: 'viewer',
        status: 'invited',
        lastLogin: null,
    },
];

export const businessTypes = [
    { value: 'Hotel', label: 'Hotel' },
    { value: 'Clinic', label: 'Clinic' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Other', label: 'Other' },
];

export const timezones = [
    'Asia/Kolkata',
    'America/New_York',
    'Europe/London',
    'Asia/Dubai',
    'Asia/Singapore',
];

export const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
];

export const currencies = [
    { value: 'INR', label: 'INR (₹)' },
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
];
