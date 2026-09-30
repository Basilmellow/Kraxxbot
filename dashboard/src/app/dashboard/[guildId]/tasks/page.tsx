'use client';
import { Tabs } from '@/components/ui/Tabs';

import { PageContainer } from '@/components/ui/Page';
import { Input, Select, Textarea, FilterBar, SearchField } from '@/components/ui/Form';
import { Table } from '@/components/ui/Table';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildId } from '@/lib/useGuildId';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { CheckSquare, Plus, Search, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

interface TaskItem {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  department: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId: string | null;
  assigneeName: string | null;
  creatorId: string;
  creatorName: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

const STATUSES = ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const isTaskStatus = (value: string): value is TaskItem['status'] =>
  value === 'PENDING' || value === 'IN_PROGRESS' || value === 'COMPLETED' || value === 'CANCELLED';
const PRIORITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TasksPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const guildId = useGuildId();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [members, setMembers] = useState<{ id: string; displayName: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDept, setNewDept] = useState('GENERAL');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!guildId) {
      router.push('/dashboard/select-server');
      return;
    }
  }, [guildId, router]);

  const fetchTasks = async () => {
    if (!guildId) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('guildId', guildId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!guildId) return;
    async function loadMembers() {
      try {
        const res = await fetch(`/api/members?guildId=${guildId}&limit=200`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    }
    loadMembers();
  }, [guildId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTasks();
    }, 250);
    return () => clearTimeout(handler);
  }, [statusFilter, priorityFilter, searchQuery, guildId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !guildId) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          title: newTitle.trim(),
          description: newDesc.trim(),
          department: newDept,
          priority: newPriority,
          assigneeId: newAssignee || undefined,
          dueDate: newDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Task #${data.task.taskNumber} created successfully.` });
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        fetchTasks();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create task' });
      }
    } catch (error: unknown) {
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Task creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskItem['status']) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}?guildId=${guildId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!await confirm('Confirm deletion of this task item?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}?guildId=${guildId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
        setFeedback({ type: 'success', message: 'Task purged.' });
      }
    } catch (err) {
      console.error('Delete task failed:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger">URGENT</Badge>;
      case 'HIGH':
        return <Badge variant="warning">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="brand">MEDIUM</Badge>;
      default:
        return <Badge variant="neutral">LOW</Badge>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Tasks"
        subtitle="Manage assignments, priorities, and deadlines."
      />

      <PageContainer className="space-y-6">
        {/* Filter Bar & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs label="Filter by status" items={STATUSES.map(item => ({ value: item, label: item }))} value={statusFilter} onChange={setStatusFilter} />

          <FilterBar className="">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <SearchField label="Search tasks..."
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 w-48 sm:w-60"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </Button>
          </FilterBar>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-[13px] ${
              feedback.type === 'success'
                ? 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]'
                : 'bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--success)]" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--danger)]" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Task Table */}
        <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl overflow-hidden p-0 ">
          <div className="p-5 border-b border-[var(--border-base)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
              <span>Active Task Inventory ({tasks.length})</span>
            </h3>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={6} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={CheckSquare}
                title="No tasks matching parameters"
                description="There are currently no tasks matching your query."
                actionLabel="Create First Task"
                onAction={() => setShowCreateModal(true)}
              />
            </div>
          ) : (
            <div tabIndex={0} role="region" aria-label="Scrollable table" className="overflow-x-auto table-scroll">
              <Table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Priority</th>
                    <th>Title / Objective</th>
                    <th>Division</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="font-semibold text-[var(--accent)] font-mono text-[13px]">
                        #{task.taskNumber}
                      </td>
                      <td>{getPriorityBadge(task.priority)}</td>
                      <td>
                        <div className="font-semibold text-[var(--text-primary)] text-[13px]">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[13px] text-[var(--text-secondary)] truncate max-w-xs mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="text-[13px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border-base)]">
                          {task.department}
                        </span>
                      </td>
                      <td className="text-[var(--text-secondary)] text-[13px]">
                        {task.assigneeName ? (
                          <span className="font-medium text-[var(--text-primary)]">@{task.assigneeName}</span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <Select aria-label="status"
                          value={task.status}
                          onChange={(e) => { if (isTaskStatus(e.target.value)) void handleUpdateStatus(task.id, e.target.value); }}
                          className=""
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </Select>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Operational Task"
          subtitle="Define a milestone, priority, and assign to team members"
        >
          <form onSubmit={handleCreateTask} className="space-y-4 text-[13px]">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Task Objective / Title
              </label>
              <Input aria-label="Task Objective / Title"
                type="text"
                required
                placeholder="e.g. Upgrade backend Redis cluster"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Detailed Scope & Deliverables
              </label>
              <Textarea aria-label="Detailed Scope & Deliverables"
                rows={3}
                placeholder="Description, requirements, and reference notes..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Division
                </label>
                <Select aria-label="Division"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full"
                >
                  <option value="GENERAL">KRAXX HQ</option>
                  <option value="KRAXXSEC">KRAXXSEC</option>
                  <option value="STUDIO">KRAXX STUDIO</option>
                </Select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Priority
                </label>
                <Select aria-label="Priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Assignee
                </label>
                <Select aria-label="Assignee"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      @{m.displayName}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Due Date
                </label>
                <Input aria-label="Due Date"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isCreating}
              >
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </div>
  );
}
