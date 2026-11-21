'use client';

import React, { useState } from 'react';
import { Profile, DEPARTMENTS, Department } from '@/types/database';
import {
  Shield,
  Lock,
  Trash2,
  UserPlus,
  Building2,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

interface StaffManagerProps {
  initialStaff: Profile[];
  onStaffUpdated?: (staff: Profile[]) => void;
}

export function StaffManager({ initialStaff, onStaffUpdated }: StaffManagerProps) {
  const [staffList, setStaffList] = useState<Profile[]>(initialStaff);
  const [isAdding, setIsAdding] = useState(false);

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
      setIsAdding(false);
    } catch (err: any) {
      setFormError(err?.message || 'An error occurred while creating the account.');
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
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete resolver account.');
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
      {/* Action / Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Official Staff & Resolver Roster
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oversee authorized municipal personnel and department resolvers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding);
            setFormError(null);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            isAdding
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100'
          }`}
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add Department Resolver
            </>
          )}
        </button>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-950">Success</p>
            <p className="text-xs mt-0.5">{successMsg}</p>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-950">Staff Operation Error</p>
            <p className="text-xs mt-0.5">{formError}</p>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Resolver Form Accordion */}
      {isAdding && (
        <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md transition-all">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Provision New Department Officer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create an official account with authorized access to its assigned department queue.
            </p>
          </div>

          <form onSubmit={handleAddResolver} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Inspector John Davis"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jdavis@civicresolve.gov"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Save & Activate Resolver
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Officer & Role</th>
                <th className="px-6 py-3.5">Contact Email</th>
                <th className="px-6 py-3.5">Assigned Department</th>
                <th className="px-6 py-3.5">Member Since</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((staff) => {
                const isHead = staff.role === 'head';
                const isProtected = staff.is_protected;

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name & Role badge */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isHead
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {isHead ? <Shield className="w-4 h-4 text-amber-600" /> : staff.full_name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {staff.full_name}
                            {isProtected && (
                              <span
                                title="Protected Account — Cannot be deleted"
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                Protected Default
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 capitalize">
                            {isHead ? 'Chief Administrator' : 'Department Resolver'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {staff.email}
                      </div>
                    </td>

                    {/* Department Badge */}
                    <td className="px-6 py-4">
                      {isHead ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          All Municipal Departments
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {staff.department || 'Unassigned'}
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(staff.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {isProtected || isHead ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium cursor-not-allowed select-none"
                          title="System Default Chief Administrator is undeletable"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Permanent
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setUserToDelete(staff)}
                          disabled={deletingId === staff.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Revoke Resolver Access
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete the resolver account for{' '}
                  <span className="font-semibold text-slate-800">{userToDelete.full_name}</span> (
                  {userToDelete.email})?
                </p>
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  This action permanently revokes login credentials and department assignment.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deletingId !== null}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
