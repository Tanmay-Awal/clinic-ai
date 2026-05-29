import { useState } from 'react';
import { X, Tag, FileText, UserCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'tags' | 'notes' | 'assignment' | 'history';

export function SideDrawer({ isOpen, onClose }: SideDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('tags');
  const [tags, setTags] = useState(['VIP', 'Anniversary', 'Follow-up']);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const tabs = [
    { id: 'tags' as Tab, label: 'Tags', icon: Tag },
    { id: 'notes' as Tab, label: 'Notes', icon: FileText },
    { id: 'assignment' as Tab, label: 'Assignment', icon: UserCircle },
    { id: 'history' as Tab, label: 'History', icon: Clock }
  ];

  const mockNotes = [
    {
      id: '1',
      author: 'Sarah Chen',
      timestamp: '2025-11-12 17:45',
      text: 'Customer specifically requested window seating. Added note to reservation.'
    },
    {
      id: '2',
      author: 'System',
      timestamp: '2025-11-12 17:30',
      text: 'Call automatically classified as Reservation.'
    }
  ];

  const mockHistory = [
    { timestamp: '2025-11-12 17:45', event: 'Tag added: VIP', user: 'Sarah Chen' },
    { timestamp: '2025-11-12 17:43', event: 'Sentiment re-summarized', user: 'System' },
    { timestamp: '2025-11-12 17:30', event: 'Call completed', user: 'System' }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-[#000000] border-l border-border z-50 transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Call Details
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-white border-b-2 border-white"
                    : "text-white/60 hover:text-white/80"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'tags' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 bg-[#0A0A0A] border-border"
                  />
                  <Button onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-white/40 text-white/80 group"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] bg-[#0A0A0A] border-border"
                  />
                  <Button size="sm" className="w-full">
                    Add Note
                  </Button>
                </div>
                <div className="space-y-3">
                  {mockNotes.map(note => (
                    <div key={note.id} className="rounded-lg border border-border bg-[#0A0A0A] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/80">{note.author}</span>
                        <span className="text-xs text-white/40">{note.timestamp}</span>
                      </div>
                      <p className="text-sm text-white/70">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'assignment' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-white/60 mb-2 block">
                    Assigned To
                  </label>
                  <select className="w-full rounded-lg border border-border bg-[#0A0A0A] px-3 py-2 text-sm text-white">
                    <option>Unassigned</option>
                    <option>Sarah Chen</option>
                    <option>James Wilson</option>
                    <option>Maria Garcia</option>
                  </select>
                </div>
                <Button size="sm" className="w-full">
                  Save Assignment
                </Button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {mockHistory.map((entry, i) => (
                  <div key={i} className="rounded-lg border border-border bg-[#0A0A0A] p-3">
                    <div className="text-xs text-white/40 mb-1">{entry.timestamp}</div>
                    <div className="text-sm text-white/80">{entry.event}</div>
                    <div className="text-xs text-white/60 mt-1">by {entry.user}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
