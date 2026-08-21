'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Layers,
  ArrowRight,
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
        console.error('Failed to load members for assignment:', err);
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
    if (!newTitle.trim() || !newDesc.trim()) return;

    setIsCreating(true);
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
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `Task #${data.task.taskNumber} created successfully.` });
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewAssignee('');
        setNewDueDate('');
        fetchTasks();
      } else {
        alert(data.error || 'Failed to create task');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t)));
        setFeedback({ type: 'success', message: 'Task status updated.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update task');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating task');
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Delete task "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
        setFeedback({ type: 'success', message: 'Task deleted.' });
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting task');
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'URGENT':
        return <Badge variant="danger">URGENT</Badge>;
      case 'HIGH':
        return <Badge variant="warning">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge variant="brand">MEDIUM</Badge>;
      case 'LOW':
        return <Badge variant="neutral">LOW</Badge>;
      default:
        return <Badge variant="neutral">{pri}</Badge>;
    }
  };

  return (
    <div>
      <Topbar
        title="Task Management"
        subtitle="Operational Task Dispatch, Assignee Tracking & Due Dates"
        onRefresh={fetchTasks}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Navigation, Filter Bar & Create Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  statusFilter === st
                    ? 'bg-[#00f0ff] text-[#0a0e15] border-[#00f0ff]'
                    : 'bg-[#0f1318] border-[#1e2a38] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
              />
            </div>

            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              <span>New Task</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              feedback.type === 'success'
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-current opacity-70 hover:opacity-100 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Task Table Card */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <CheckSquare className="w-4 h-4 text-[#00f0ff]" />
              <span>Tasks Pipeline ({tasks.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Status Filter: {statusFilter}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Task #</th>
                  <th>Title & Description</th>
                  <th>Division</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                  <th>Status State</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-xs text-[#64748b]">
                      Loading tasks pipeline...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-xs text-[#64748b]">
                      No tasks found in this view.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs font-bold text-[#00f0ff]">
                        #{t.taskNumber}
                      </td>

                      <td className="max-w-sm">
                        <div className="font-semibold text-xs text-[#e2e8f0] truncate">{t.title}</div>
                        <div className="text-[11px] text-[#64748b] line-clamp-1 mt-0.5">{t.description}</div>
                      </td>

                      <td>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0f1318] border border-[#1e2a38] text-[#94a3b8]">
                          {t.department}
                        </span>
                      </td>

                      <td>{getPriorityBadge(t.priority)}</td>

                      <td className="text-xs text-[#94a3b8] font-mono">
                        {t.assigneeName ? (
                          <span className="text-[#10b981] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{t.assigneeName}</span>
                          </span>
                        ) : (
                          <span className="text-[#64748b] italic">Unassigned</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap font-mono text-xs text-[#94a3b8]">
                        {t.dueDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#64748b]" />
                            <span>{new Date(t.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-[#64748b]">—</span>
                        )}
                      </td>

                      <td>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className="px-2 py-1 rounded bg-[#0f1318] border border-[#1e2a38] text-xs font-semibold focus:outline-none focus:border-[#00f0ff]/50"
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
                          onClick={() => handleDeleteTask(t.id, t.title)}
                          className="p-1.5 rounded hover:bg-[#141a22] text-[#64748b] hover:text-[#ef4444]"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1318] border border-[#1e2a38] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2a38] pb-3">
              <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#00f0ff]" />
                <span>Create New Operational Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#64748b] hover:text-[#e2e8f0]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Audit API authentication headers"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Description / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Task details and expected deliverables..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value="GENERAL">General HQ</option>
                    <option value="KRAXXSEC">KRAXXSEC</option>
                    <option value="KRAXX_STUDIO">KRAXX STUDIO</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Assignee</label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
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
                  <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#1e2a38]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
