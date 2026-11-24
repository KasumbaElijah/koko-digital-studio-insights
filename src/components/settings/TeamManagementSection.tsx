'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Check,
  Trash2,
  Edit3,
  X,
  Lock,
} from 'lucide-react';
import { ClientData, MetaPageItem } from '@/lib/types';
import { DEFAULT_VERIFIED_PAGES } from '@/lib/managedPages';

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNT_MANAGER';
  assignedClientIds: string[];
}

interface TeamManagementSectionProps {
  clients: ClientData[];
  availablePages: MetaPageItem[];
}

export const TeamManagementSection: React.FC<TeamManagementSectionProps> = ({
  clients,
  availablePages,
}) => {
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state for creating/editing a team member
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'ACCOUNT_MANAGER'>('ACCOUNT_MANAGER');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadTeamMembers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/team');
      if (res.data?.success && Array.isArray(res.data?.users)) {
        setMembers(res.data.users);
      }
    } catch {
      // Non-admin or initial load
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Build unified list of assignable client accounts & managed pages
  const assignableChannels = useMemo(() => {
    const map = new Map<string, { key: string; label: string; subLabel: string; aliases: string[] }>();

    DEFAULT_VERIFIED_PAGES.forEach((vp) => {
      const handle = vp.instagramBusinessAccount?.username
        ? `@${vp.instagramBusinessAccount.username}`
        : '';
      map.set(vp.id, {
        key: vp.id,
        label: vp.name,
        subLabel: handle || 'Managed Page',
        aliases: [vp.id, handle].filter(Boolean),
      });
    });

    availablePages.forEach((ap) => {
      if (!map.has(ap.id)) {
        const handle = ap.instagramBusinessAccount?.username
          ? `@${ap.instagramBusinessAccount.username}`
          : '';
        map.set(ap.id, {
          key: ap.id,
          label: ap.name,
          subLabel: handle || 'Connected Page',
          aliases: [ap.id, handle].filter(Boolean),
        });
      }
    });

    clients.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, {
          key: c.id,
          label: c.name,
          subLabel: 'Client Workspace',
          aliases: [c.id, c.name],
        });
      }
    });

    return Array.from(map.values());
  }, [clients, availablePages]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('ACCOUNT_MANAGER');
    setSelectedAssignments([]);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (member: TeamMemberItem) => {
    setEditingId(member.id);
    setName(member.name);
    setEmail(member.email);
    setPassword('');
    setRole(member.role);
    setSelectedAssignments(member.assignedClientIds || []);
    setErrorMsg('');
    setShowModal(true);
  };

  const toggleAssignment = (aliases: string[]) => {
    const hasAny = aliases.some((a) => selectedAssignments.includes(a));
    if (hasAny) {
      setSelectedAssignments((prev) => prev.filter((item) => !aliases.includes(item)));
    } else {
      setSelectedAssignments((prev) => Array.from(new Set([...prev, ...aliases])));
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSaving(true);
    try {
      const res = await axios.post('/api/team', {
        id: editingId || undefined,
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        role,
        assignedClientIds: role === 'ADMIN' ? ['*'] : selectedAssignments,
      });

      if (res.data?.success && Array.isArray(res.data?.users)) {
        setMembers(res.data.users);
        setShowModal(false);
      } else {
        setErrorMsg(res.data?.error || 'Failed to save team member.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error saving team member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (member: TeamMemberItem) => {
    if (!confirm(`Remove "${member.name}" (${member.email}) from the platform?`)) return;
    try {
      const res = await axios.delete(`/api/team?id=${encodeURIComponent(member.id)}`);
      if (res.data?.success && Array.isArray(res.data?.users)) {
        setMembers(res.data.users);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Could not remove team member.');
    }
  };

  const formatAssignedSummary = (assigned: string[]) => {
    if (assigned.includes('*')) return 'All Client Accounts & Pages (Full Admin Access)';
    const matchedLabels = assignableChannels
      .filter((ch) => ch.aliases.some((a) => assigned.includes(a)))
      .map((ch) => ch.label);
    if (matchedLabels.length > 0) {
      return matchedLabels.join(', ');
    }
    return assigned.length > 0 ? assigned.join(', ') : 'No accounts assigned yet';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-7 shadow-sm mb-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight font-heading">
                Team Roles & Account Manager Assignments
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Invite-Only Access
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Assign specific client accounts and managed pages to each Account Manager. Public sign-ups are disabled.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
          Invite Team Member
        </button>
      </div>

      {isLoading && members.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400">Loading team members...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map((m) => {
            const isAdmin = m.role === 'ADMIN';
            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                  isAdmin
                    ? 'bg-neutral-950 text-white border-neutral-800'
                    : 'bg-gray-50/80 text-gray-900 border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Management (Admin)
                        </>
                      ) : (
                        'Account Manager'
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        title="Edit role & assigned accounts"
                        className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isAdmin
                            ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                            : 'text-gray-500 hover:text-black hover:bg-gray-200'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {m.id !== 'user_admin_elijah' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m)}
                          title="Remove team member"
                          className="p-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-sm mt-2">{m.name}</h3>
                  <p className={`text-xs font-mono ${isAdmin ? 'text-neutral-400' : 'text-gray-500'}`}>
                    {m.email}
                  </p>
                </div>

                <div
                  className={`pt-2.5 border-t text-[11px] ${
                    isAdmin ? 'border-neutral-800 text-neutral-300' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <span className="font-bold uppercase text-[10px] block mb-0.5 opacity-75">
                    Assigned Accounts:
                  </span>
                  <p className="font-semibold line-clamp-2">
                    {formatAssignedSummary(m.assignedClientIds || [])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating / Editing Team Member & Assigned Accounts */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-black p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 font-heading">
                  {editingId ? 'Edit Team Member & Assigned Accounts' : 'Invite Team Member'}
                </h3>
                <p className="text-xs text-gray-500">
                  Configure role permissions and select which client accounts they can access
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Namukasa"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-gray-900 font-semibold outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Team Email / Login *</label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah@kokodigitalstudio.com"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-gray-900 font-semibold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    {editingId ? 'New Password (leave blank to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingId ? '••••••••' : 'Enter password'}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-gray-900 font-semibold outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Team Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-gray-900 font-bold outline-none cursor-pointer"
                  >
                    <option value="ACCOUNT_MANAGER">Account Manager (Assigned Accounts Only)</option>
                    <option value="ADMIN">Management (Admin - Full System Access)</option>
                  </select>
                </div>
              </div>

              {role === 'ACCOUNT_MANAGER' && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">
                    Assign Client Accounts & Pages to This Account Manager:
                  </label>
                  <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50 max-h-52 overflow-y-auto space-y-2">
                    {assignableChannels.map((ch) => {
                      const isChecked = ch.aliases.some((a) => selectedAssignments.includes(a));
                      return (
                        <div
                          key={ch.key}
                          onClick={() => toggleAssignment(ch.aliases)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-400 text-gray-900'
                              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-xs">{ch.label}</div>
                            <div className="text-[11px] text-gray-500">{ch.subLabel}</div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 py-2.5 bg-black hover:bg-gray-800 text-white font-extrabold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
