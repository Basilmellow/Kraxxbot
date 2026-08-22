'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
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
  X,
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
        setFeedback({ type: 'success', message: `Task #${data.task.taskNumber} initialized successfully.` });
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
        title="OPERATIONAL TASK TRACKER"
        subtitle="Cross-Department Task Assignments, Milestone Deadlines & Execution"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Filter Bar & Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded bg-[#0A0F16] border border-[#16202E]">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === s
                    ? 'bg-[#111823] text-[#22D3EE] font-semibold border border-[#1E2C3F]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3 h-3 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="font-mono text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW TASK</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded bg-[#0A0F16] border flex items-start gap-3 font-mono text-xs ${
              feedback.type === 'success'
                ? 'border-[#10B981]/40 text-[#10B981]'
                : 'border-[#EF4444]/40 text-[#EF4444]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <div>{feedback.message}</div>
          </div>
        )}

        {/* Task Table */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>ACTIVE TASK INVENTORY ({tasks.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={6} />
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={CheckSquare}
                title="NO TASKS MATCHING PARAMETERS"
                description="There are currently no tasks matching your query."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    className="font-mono text-xs"
                  >
                    CREATE FIRST TASK
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">TASK ID</th>
                    <th className="py-2.5 px-4 font-semibold">PRIORITY</th>
                    <th className="py-2.5 px-4 font-semibold">TITLE / OBJECTIVE</th>
                    <th className="py-2.5 px-4 font-semibold">DIVISION</th>
                    <th className="py-2.5 px-4 font-semibold">ASSIGNEE</th>
                    <th className="py-2.5 px-4 font-semibold">STATUS</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#22D3EE]">#{t.taskNumber}</td>
                      <td className="py-3 px-4">{getPriorityBadge(t.priority)}</td>
                      <td className="py-3 px-4 text-[#F1F5F9] font-medium max-w-sm">
                        <div>{t.title}</div>
                        {t.dueDate && (
                          <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#F59E0B]" />
                            <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] text-[#64748B] bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E]">
                          {t.department}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {t.assigneeName ? `@${t.assigneeName}` : 'UNASSIGNED'}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                          className="bg-[#070B10] border border-[#16202E] rounded px-2 py-1 text-[11px] font-mono text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 rounded bg-[#070B10] border border-[#16202E] text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                          title="Purge Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070B]/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-md bg-[#0A0F16] border border-[#1E2C3F] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#16202E]">
                <h3 className="text-xs font-mono font-bold text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#22D3EE]" />
                  <span>INITIALIZE OPERATIONAL TASK</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#64748B] hover:text-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    TASK TITLE / OBJECTIVE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit KRAXXSEC firewall policies"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    DESCRIPTION / SCOPE
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide detailed instructions or acceptance criteria..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full p-2.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50 resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      DIVISION
                    </label>
                    <select
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="GENERAL">General</option>
                      <option value="KRAXXSEC">KRAXXSEC</option>
                      <option value="KRAXX_STUDIO">KRAXX Studio</option>
                      <option value="MANAGEMENT">Management</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                      PRIORITY
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-2 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    ASSIGNEE
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                    DUE DATE
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#16202E]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isCreating}
                  >
                    CREATE TASK
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
