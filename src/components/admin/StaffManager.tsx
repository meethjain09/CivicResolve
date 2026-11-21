'use client';

import React, { useState } from 'react';
import { Profile, DEPARTMENTS, Department } from '@/types/database';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { TypingIndicatorWrapper } from '@/components/ui/TypingIndicatorWrapper';
import { RippleButton } from '@/components/ui/RippleButton';
import { NumberTicker } from '@/components/ui/NumberTicker';
import {
  Shield,
  Lock,
  Trash2,
  UserPlus,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Users,
} from 'lucide-react';

interface StaffManagerProps {
  initialStaff: Profile[];
  onStaffUpdated?: (staff: Profile[]) => void;
}

export function StaffManager({ initialStaff, onStaffUpdated }: StaffManagerProps) {
  const [staffList, setStaffList] = useState<Profile[]>(initialStaff);

  // Add form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);

  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!userToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserToDelete(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userToDelete]);

  const handleAddResolver = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/resolvers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          department,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create department resolver');
      }

      setSuccessMsg(`Resolver "${data.resolver.full_name}" added successfully.`);
      const nextStaff = [...staffList, data.resolver];
      setStaffList(nextStaff);
      onStaffUpdated?.(nextStaff);

      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setDepartment(DEPARTMENTS[0]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred while creating the account.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setDeletingId(userToDelete.id);
    setFormError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/resolvers?id=${encodeURIComponent(userToDelete.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete user');
      }

      const nextStaff = staffList.filter((u) => u.id !== userToDelete.id);
      setStaffList(nextStaff);
      onStaffUpdated?.(nextStaff);
      setSuccessMsg(`Account for "${userToDelete.full_name}" removed successfully.`);
      setUserToDelete(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete resolver account.';
      setFormError(errMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
          <RippleButton
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer rounded-lg"
          >
            <X className="w-4 h-4" />
          </RippleButton>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{formError}</div>
          <RippleButton
            type="button"
            onClick={() => setFormError(null)}
            className="opacity-60 hover:opacity-100 p-0.5 cursor-pointer rounded-lg"
          >
            <X className="w-4 h-4" />
          </RippleButton>
        </div>
      )}

      {/* Split Grid: Left Form (4 cols), Right Roster (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (lg:col-span-4): Add Department Resolver Card */}
        <SpotlightCard shine className="lg:col-span-4 p-6 space-y-5 sticky top-24">
          <div className="border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Add Department Resolver
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Provision an official account with authorized access to its assigned municipal department queue.
            </p>
          </div>

          <form onSubmit={handleAddResolver} className="space-y-4">
            <div>
              <label
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Full Name <span className="text-rose-500">*</span>
              </label>
              <TypingIndicatorWrapper value={fullName}>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Officer Maria Santos"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors border"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
              </TypingIndicatorWrapper>
            </div>

            <div>
              <label
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Official Email <span className="text-rose-500">*</span>
              </label>
              <TypingIndicatorWrapper value={email}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. msantos@civicresolve.gov"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors border"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
              </TypingIndicatorWrapper>
            </div>

            <div>
              <label
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Temporary Password <span className="text-rose-500">*</span>
              </label>
              <TypingIndicatorWrapper value={password}>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors border"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-strong)',
                  }}
                />
              </TypingIndicatorWrapper>
            </div>

            <div>
              <label
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Assigned Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <RippleButton
              type="submit"
              disabled={submitting}
              className="btn-shimmer w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 hover:opacity-95 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Save & Activate Resolver</span>
                </>
              )}
            </RippleButton>
          </form>
        </SpotlightCard>

        {/* Right Column (lg:col-span-8): Official Roster Table / List */}
        <SpotlightCard className="lg:col-span-8 overflow-hidden">
          {/* Roster Header */}
          <div
            className="p-5 sm:p-6 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                <Users className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span>Official Municipal Staff Roster</span>
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Active administrative heads and authorized department officers.
              </p>
            </div>
            <span
              className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <NumberTicker value={staffList.length} /> Accounts
            </span>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className="border-b uppercase font-mono tracking-wider font-semibold"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                <tr>
                  <th className="px-5 py-3">Officer & Role</th>
                  <th className="px-5 py-3">Assigned Department</th>
                  <th className="px-5 py-3">Contact Email</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {staffList.map((member) => {
                  const isHead = member.role === 'head';
                  const isProtected = member.is_protected;

                  return (
                    <tr
                      key={member.id}
                      className="transition-colors hover:bg-[var(--bg-elevated)]"
                    >
                      {/* Name & Role */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border"
                            style={{
                              backgroundColor: isHead ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-soft)',
                              color: isHead ? '#D97706' : 'var(--accent)',
                              borderColor: isHead ? 'rgba(245, 158, 11, 0.3)' : 'color-mix(in srgb, var(--accent) 30%, transparent)',
                            }}
                          >
                            {isHead ? <Shield className="w-4 h-4" /> : member.full_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              <span>{member.full_name}</span>
                              {isProtected && (
                                <span
                                  title="Protected Root Account — Permanent System Administrator"
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Protected Root Account</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
                              {isHead ? 'Chief Administrator' : 'Department Officer'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5">
                        {isHead ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              color: 'var(--text-secondary)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            All Municipal Sectors
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                            style={{
                              backgroundColor: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                            }}
                          >
                            {member.department || 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Contact Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span>{member.email}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(member.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        {isProtected || isHead ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs opacity-50 font-mono font-medium cursor-not-allowed select-none"
                            style={{ color: 'var(--text-muted)' }}
                            title="Root Administrator account is permanent and undeletable"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <RippleButton
                            type="button"
                            onClick={() => setUserToDelete(member)}
                            disabled={deletingId === member.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </RippleButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setUserToDelete(null)}
        >
          <div
            className="rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-strong)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-500/15 text-rose-500 rounded-xl border border-rose-500/30">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Revoke Resolver Access
                </h3>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Are you sure you want to delete the department resolver account for{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {userToDelete.full_name}
                  </span>{' '}
                  ({userToDelete.email})?
                </p>
                <div className="mt-2.5 text-[11px] p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 leading-relaxed">
                  Notice: This action permanently revokes all authentication credentials and removes officer assignment to the{' '}
                  <span className="font-semibold">{userToDelete.department}</span> division.
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-3 pt-3 border-t"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <RippleButton
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </RippleButton>
              <RippleButton
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking Access...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Revocation</span>
                  </>
                )}
              </RippleButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
