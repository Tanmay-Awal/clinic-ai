'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreateAction } from '@/hooks/use-actions';
import type { ActionRequestType, ActionPriority, CreateActionRequest } from '@/types/actions';
import { ACTION_REQUEST_TYPE_LABELS } from '@/types/actions';

export function NewActionDialog() {
    const [open, setOpen] = useState(false);
    const [requestType, setRequestType] = useState<ActionRequestType>('misc');
    const [guestName, setGuestName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [priority, setPriority] = useState<ActionPriority | ''>('');
    const [notes, setNotes] = useState('');

    const createAction = useCreateAction();

    const handleSubmit = async () => {
        const data: CreateActionRequest = {
            request_type: requestType,
            ...(guestName.trim() ? { guest_name: guestName.trim() } : {}),
            ...(phoneNumber.trim() ? { phone_number: phoneNumber.trim() } : {}),
            ...(priority ? { priority } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        };

        createAction.mutate(data, {
            onSuccess: () => {
                setOpen(false);
                // Reset form
                setRequestType('misc');
                setGuestName('');
                setPhoneNumber('');
                setPriority('');
                setNotes('');
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Action
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Action</DialogTitle>
                    <DialogDescription>
                        Manually create an action item for team follow-up.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Request Type */}
                    <div className="space-y-2">
                        <Label>Issue Type *</Label>
                        <Select value={requestType} onValueChange={(v) => setRequestType(v as ActionRequestType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(Object.entries(ACTION_REQUEST_TYPE_LABELS) as [ActionRequestType, string][]).map(
                                    ([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Guest Name */}
                    <div className="space-y-2">
                        <Label>Guest Name</Label>
                        <Input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="John Smith"
                        />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+44 7700 900000"
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as ActionPriority)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Use default for type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional context for this action..."
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={createAction.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createAction.isPending}>
                        {createAction.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Action'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
