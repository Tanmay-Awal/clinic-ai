
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, X, Loader2 } from 'lucide-react';
import {
    OrganisationSettings,
    timezones,
    languages,
    currencies,
    businessTypes,
} from '@/lib/adminMockData';

export function OrganisationSettingsCard({ settings, onSave, isSaving }: {
    settings: OrganisationSettings;
    onSave: (settings: OrganisationSettings) => void;
    isSaving?: boolean;
}) {
    const [formData, setFormData] = useState<OrganisationSettings>(settings);
    const [locationInput, setLocationInput] = useState('');

    // Update local state when prop changes (for initial load)
    useMemo(() => {
        setFormData(settings);
    }, [settings]);

    const handleSave = () => {
        if (!formData.organisation_name.trim()) {
            toast.error('Organisation name is required');
            return;
        }
        onSave(formData);
    };

    const handleAddLocation = () => {
        if (!locationInput.trim()) return;

        const currentLocations = formData.locations || [];
        if (currentLocations.includes(locationInput.trim())) {
            toast.error('Location already exists');
            return;
        }

        setFormData({
            ...formData,
            locations: [...currentLocations, locationInput.trim()]
        });
        setLocationInput('');
    };

    const handleRemoveLocation = (locationToRemove: string) => {
        const currentLocations = formData.locations || [];
        setFormData({
            ...formData,
            locations: currentLocations.filter(loc => loc !== locationToRemove)
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddLocation();
        }
    };

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle className="text-xl font-semibold text-foreground">Organisation Settings</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Basic configuration for your organisation.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Organisation Name */}
                <div className="space-y-2">
                    <Label htmlFor="org-name" className="text-sm text-muted-foreground">
                        Organisation Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="org-name"
                        value={formData.organisation_name}
                        onChange={(e) => setFormData({ ...formData, organisation_name: e.target.value })}
                        className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                        placeholder="Enter organisation name"
                    />
                </div>

                {/* Business Type */}
                <div className="space-y-2">
                    <Label htmlFor="business-type" className="text-sm text-muted-foreground">
                        Business Type
                    </Label>
                    <Select
                        value={formData.business_type}
                        onValueChange={(value) => setFormData({ ...formData, business_type: value as OrganisationSettings['business_type'] })}
                    >
                        <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                            {businessTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="text-foreground hover:bg-accent">
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm text-muted-foreground">
                        Default Timezone
                    </Label>
                    <Select
                        value={formData.default_timezone}
                        onValueChange={(value) => setFormData({ ...formData, default_timezone: value })}
                    >
                        <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                            {timezones.map((tz) => (
                                <SelectItem key={tz} value={tz} className="text-foreground hover:bg-accent">
                                    {tz}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Language */}
                <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm text-muted-foreground">
                        Default Language
                    </Label>
                    <Select
                        value={formData.default_language}
                        onValueChange={(value) => setFormData({ ...formData, default_language: value })}
                    >
                        <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                            {languages.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value} className="text-foreground hover:bg-accent">
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm text-muted-foreground">
                        Currency
                    </Label>
                    <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                        <SelectTrigger className="border-border bg-background text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-card">
                            {currencies.map((curr) => (
                                <SelectItem key={curr.value} value={curr.value} className="text-foreground hover:bg-accent">
                                    {curr.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="outbound" className="text-sm text-muted-foreground">
                            Enable Outbound Calls
                        </Label>
                        <Switch
                            id="outbound"
                            checked={formData.enable_outbound_calls}
                            onCheckedChange={(checked) => setFormData({ ...formData, enable_outbound_calls: checked })}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="insights" className="text-sm text-muted-foreground">
                            Enable AI Insights
                        </Label>
                        <Switch
                            id="insights"
                            checked={formData.enable_ai_insights}
                            onCheckedChange={(checked) => setFormData({ ...formData, enable_ai_insights: checked })}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="locations" className="text-sm text-muted-foreground">
                            Enable Locations
                        </Label>
                        <Switch
                            id="locations"
                            checked={!!formData.enable_locations}
                            onCheckedChange={(checked) => setFormData({ ...formData, enable_locations: checked })}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                        />
                    </div>

                    {/* Location Management */}
                    {formData.enable_locations && (
                        <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 fade-in duration-300">
                            <Label className="text-sm text-muted-foreground">
                                Manage Locations
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={locationInput}
                                    onChange={(e) => setLocationInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Add a location..."
                                    className="border-border bg-background text-foreground placeholder:text-muted-foreground"
                                />
                                <Button
                                    onClick={handleAddLocation}
                                    size="icon"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            {formData.locations && formData.locations.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {formData.locations.map((loc, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 bg-accent text-foreground px-3 py-1 rounded-full text-sm animate-in zoom-in-95 duration-200"
                                        >
                                            <span>{loc}</span>
                                            <button
                                                onClick={() => handleRemoveLocation(loc)}
                                                className="hover:text-destructive transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                {/* Footer */}
                {formData.updated_at && (
                    <p className="text-xs text-muted-foreground pt-2">
                        Last updated by {formData.updated_by || 'Unknown'} on{' '}
                        {format(new Date(formData.updated_at), 'PPP p')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
