'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Layers,
} from 'lucide-react';

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
const PRIORITIES = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TasksPage() {
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

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
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
    async function loadMembers() {
      try {
        const res = await fetch('/api/members?limit=200');
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    }
    loadMembers();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTasks();
    }, 250);
    return () => clearTimeout(handler);
  }, [statusFilter, priorityFilter, searchQuery]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Task creation error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t)));
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Confirm deletion of this task item?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
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
        title="Operational Task Tracker"
        subtitle="Cross-Department Task Assignments, Milestone Deadlines & Execution"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Filter Bar & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-[#667085] hover:text-[#101828] hover:bg-[#F8FAFC]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8.5 pr-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs w-48 sm:w-60"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
            )}
            <div className="font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Task Table */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
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
            <div className="overflow-x-auto">
              <table className="kraxx-table">
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
                      <td className="font-semibold text-indigo-600 font-mono text-xs">
                        #{task.taskNumber}
                      </td>
                      <td>{getPriorityBadge(task.priority)}</td>
                      <td>
                        <div className="font-semibold text-[#101828] text-xs">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-[#667085] truncate max-w-xs mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="text-[11px] font-semibold text-[#475467] bg-[#F3F5FA] px-2 py-0.5 rounded-md border border-[#E5E7EB]">
                          {task.department}
                        </span>
                      </td>
                      <td className="text-[#475467] text-xs">
                        {task.assigneeName ? (
                          <span className="font-medium text-[#101828]">@{task.assigneeName}</span>
                        ) : (
                          <span className="text-[#98A2B3]">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Task Objective / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Upgrade backend Redis cluster"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#344054] mb-1">
                Detailed Scope & Deliverables
              </label>
              <textarea
                rows={3}
                placeholder="Description, requirements, and reference notes..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Division
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="GENERAL">KRAXX HQ</option>
                  <option value="KRAXXSEC">KRAXXSEC</option>
                  <option value="STUDIO">KRAXX STUDIO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Assignee
                </label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      @{m.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
      </div>
    </div>
  );
}
