
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { MoreHorizontal, Plus, UserPlus, Eye, EyeOff } from 'lucide-react';
import { OrgUser, UserRole, UserStatus, currentUser } from '@/lib/adminMockData';
import { useAuthStore, isAdmin, hasActionsOnlyRole } from '@/store/authStore';

interface UserManagementCardProps {
    users: OrgUser[];
    onInvite: (email: string, role: string, name: string, password: string) => Promise<void>;
    onRemove: (userId: string) => Promise<void>;
    onStatusChange: (userId: string, status: string) => Promise<void>;
    onRoleChange: (userId: string, role: string) => Promise<void>;
}

export function UserManagementCard({
    users,
    onInvite,
    onRemove,
    onStatusChange,
    onRoleChange
}: UserManagementCardProps) {
    const { user: currentLoggedInUser } = useAuthStore();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: string; user: OrgUser } | null>(null);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePassword, setInvitePassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
    const [isInviting, setIsInviting] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Helper function to check if actions should be disabled
    // System Admin can do anything, regular users cannot modify Admin users
    const isActionDisabled = (targetUserRole: string) => {
        // System Admin or Admin can do anything
        if (isAdmin(currentLoggedInUser)) {
            return false;
        }

        // Regular users cannot modify admin users
        const targetRole = (targetUserRole || '').toLowerCase();
        return targetRole === 'admin';
    };

    const handleInvite = async () => {
        if (!inviteName.trim()) {
            toast.error('Please enter a name');
            return;
        }

        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (!invitePassword.trim()) {
            toast.error('Please enter a password');
            return;
        }

        if (invitePassword.length < 6) {
            toast.error('Password should be at least 6 characters');
            return;
        }

        try {
            setIsInviting(true);
            // Pass name along with email and role
            await onInvite(inviteEmail, inviteRole, inviteName, invitePassword);
            setIsInviteOpen(false);
            setInviteName('');
            setInviteEmail('');
            setInvitePassword('');
            setShowPassword(false);
            setInviteRole('viewer');
            toast.success('Invitation sent');
        } catch (error) {
            toast.error('Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        if (userId === currentUser.id) {
            toast.error("You cannot change your own role");
            return;
        }

        try {
            await onRoleChange(userId, newRole);
            toast.success(`Role updated to ${newRole}`);
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
        if (userId === currentUser.id) {
            toast.error("You cannot disable your own account");
            return;
        }

        try {
            setIsProcessing(true);
            await onStatusChange(userId, newStatus);
            toast.success(`User ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            setIsConfirmOpen(false);
            setConfirmAction(null);
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (userId === currentUser.id) {
            toast.error("You cannot remove your own account");
            return;
        }

        try {
            setIsProcessing(true);
            await onRemove(userId);
            toast.success('User removed');
            setIsConfirmOpen(false);
            setConfirmAction(null);
        } catch (error) {
            toast.error('Failed to remove user');
        } finally {
            setIsProcessing(false);
        }
    };

    const openConfirmDialog = (type: string, user: OrgUser) => {
        setConfirmAction({ type, user });
        setIsConfirmOpen(true);
    };

    const getStatusBadge = (status: UserStatus) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10">Active</Badge>;
            case 'disabled':
                return <Badge variant="outline" className="border-red-500/50 text-destructive bg-destructive/10">Disabled</Badge>;
            case 'invited':
                return <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10">Invited</Badge>;
        }
    };

    const getRoleBadge = (user: OrgUser) => {
        if (isAdmin(user)) {
            return <Badge variant="outline" className="border-border text-foreground bg-accent">Admin</Badge>;
        }
        
        if (hasActionsOnlyRole(user)) {
            return <Badge variant="outline" className="border-violet-500/30 text-violet-400 bg-violet-500/10">Actions</Badge>;
        }
        
        const role = user.role;
        if ((role || '').toLowerCase() === 'viewer') {
            return <Badge variant="outline" className="border-border text-muted-foreground bg-accent/50">Viewer</Badge>;
        }
        
        // Default: Capitalize first letter for display
        const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
        return <Badge variant="outline" className="border-border text-muted-foreground bg-accent/50">{displayRole}</Badge>;
    };

    return (
        <>
            <Card className="border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-semibold text-foreground">Users</CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Manage who can access this organisation.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setIsInviteOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-muted-foreground">Name</TableHead>
                                    <TableHead className="text-muted-foreground">Email</TableHead>
                                    <TableHead className="text-muted-foreground">Role</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-muted-foreground">Last Login</TableHead>
                                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id} className="border-border hover:bg-accent/50">
                                        <TableCell className="text-foreground font-medium">
                                            {user.name}
                                            {user.id === currentUser.id && (
                                                <span className="text-muted-foreground text-xs ml-2">(you)</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user)}</TableCell>
                                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {(() => {
                                                if (!user.lastLogin) return '—';
                                                try {
                                                    const date = new Date(user.lastLogin);
                                                    return isNaN(date.getTime()) ? '—' : formatInTimeZone(date, 'Europe/London', 'PP p');
                                                } catch (e) {
                                                    return '—';
                                                }
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                                                        disabled={user.id === currentUser.id}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="border-border bg-card">
                                                    {user.status === 'active' ? (
                                                        <DropdownMenuItem
                                                            onClick={() => openConfirmDialog('disable', user)}
                                                            className="text-yellow-400 hover:bg-accent cursor-pointer"
                                                            disabled={isActionDisabled(user.role)}
                                                        >
                                                            Disable User
                                                        </DropdownMenuItem>
                                                    ) : user.status === 'disabled' ? (
                                                        <DropdownMenuItem
                                                            onClick={() => handleStatusChange(user.id, 'active')}
                                                            className="text-green-400 hover:bg-accent cursor-pointer"
                                                            disabled={isActionDisabled(user.role)}
                                                        >
                                                            Enable User
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    <DropdownMenuItem
                                                        onClick={() => openConfirmDialog('remove', user)}
                                                        className="text-destructive hover:bg-accent cursor-pointer"
                                                        disabled={isActionDisabled(user.role)}
                                                    >
                                                        Remove User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Invite User Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="border-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Invite User</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Send an invitation to join your organisation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-muted-foreground">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                className="border-border bg-background text-foreground"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground">
                                Email Address <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="border-border bg-background text-foreground"
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-muted-foreground">
                                Password <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={invitePassword}
                                    onChange={(e) => setInvitePassword(e.target.value)}
                                    className="border-border bg-background text-foreground pr-10"
                                    placeholder="******"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-muted-foreground">
                                Role
                            </Label>
                            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                                <SelectTrigger className="border-border bg-background text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    <SelectItem value="admin" className="text-foreground hover:bg-accent">
                                        Admin
                                    </SelectItem>
                                    <SelectItem value="viewer" className="text-foreground hover:bg-accent">
                                        Viewer
                                    </SelectItem>
                                    <SelectItem value="actions" className="text-foreground hover:bg-accent">
                                        Actions
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsInviteOpen(false)}
                            className="border-border bg-transparent text-foreground hover:bg-accent"
                            disabled={isInviting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInvite}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={isInviting}
                        >
                            {isInviting ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="border-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">
                            {confirmAction?.type === 'remove' ? 'Remove User' : 'Disable User'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {confirmAction?.type === 'remove'
                                ? `Are you sure you want to remove ${confirmAction?.user.name}? This action cannot be undone.`
                                : `Are you sure you want to disable ${confirmAction?.user.name}? They will no longer be able to access the platform.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                            className="border-border bg-transparent text-foreground hover:bg-accent"
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (confirmAction?.type === 'remove') {
                                    handleRemoveUser(confirmAction.user.id);
                                } else if (confirmAction?.type === 'disable') {
                                    handleStatusChange(confirmAction.user.id, 'disabled');
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isProcessing}
                        >
                            {isProcessing
                                ? (confirmAction?.type === 'remove' ? 'Removing...' : 'Disabling...')
                                : (confirmAction?.type === 'remove' ? 'Remove' : 'Disable')
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
