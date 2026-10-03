import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  UserX,
  Clock,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  UserPlus,
  Building2,
  CreditCard,
  Check,
  X,
  MessageSquare,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { RegistrationRequest, RegistrationStatus } from '../types.js';
import { isPermanentAdminUser } from '../utils/authUtils.js';

interface RegistrationManagementProps {
  onRefreshData?: () => void;
}

export const RegistrationManagement: React.FC<RegistrationManagementProps> = ({
  onRefreshData,
}) => {
  const { session, currentUserId, currentUserName, currentUserRole } = useAuth();
  const isPrimary = isPermanentAdminUser({
    id: currentUserId,
    name: currentUserName,
    phone: session?.phone,
    role: currentUserRole,
  });

  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [selectedReg, setSelectedReg] = useState<RegistrationRequest | null>(null);
  const [roleToAssign, setRoleToAssign] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [assignedRoomNo, setAssignedRoomNo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/registrations', {
        headers: {
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': currentUserId || 'm1',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegistrations(data.registrations || []);
      } else {
        setErrorMsg(data.error || 'রেজিস্ট্রেশন তালিকা লোড করা যায়নি');
      }
    } catch (err: any) {
      setErrorMsg('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি');
    } finally {
      setLoading(false);
    }
  }, [session?.token, currentUserId]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleApprove = async (reg: RegistrationRequest) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/registrations/${reg.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': currentUserId || 'm1',
        },
        body: JSON.stringify({
          role: roleToAssign,
          roomNo: assignedRoomNo || reg.roomNo,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || `${reg.fullName} এর রেজিস্ট্রেশন সফলভাবে অনুমোদন করা হয়েছে!`);
        fetchRegistrations();
        if (onRefreshData) onRefreshData();
        setSelectedReg(null);
      } else {
        setErrorMsg(data.error || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setErrorMsg('নেটওয়ার্ক সংযোগ ত্রুটি');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReg) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/registrations/${selectedReg.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': currentUserId || 'm1',
        },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('রেজিস্ট্রেশন আবেদনটি বাতিল করা হয়েছে।');
        setShowRejectModal(false);
        setSelectedReg(null);
        setRejectionReason('');
        fetchRegistrations();
        if (onRefreshData) onRefreshData();
      } else {
        setErrorMsg(data.error || 'বাতিল করা যায়নি');
      }
    } catch (err: any) {
      setErrorMsg('নেটওয়ার্ক সংযোগ ত্রুটি');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isPrimary) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">অনুমতি সীমাবদ্ধ</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন (Jahidul Islam) নতুন সদস্য রেজিস্ট্রেশন আবেদন পর্যালোচনা, অনুমোদন বা বাতিল করতে পারেন।
        </p>
      </div>
    );
  }

  const pendingList = registrations.filter(r => r.status === 'PENDING_APPROVAL');
  const approvedList = registrations.filter(r => r.status === 'APPROVED');
  const rejectedList = registrations.filter(r => r.status === 'REJECTED');

  const filteredRegistrations = registrations.filter(r => {
    if (activeTab === 'pending' && r.status !== 'PENDING_APPROVAL') return false;
    if (activeTab === 'approved' && r.status !== 'APPROVED') return false;
    if (activeTab === 'rejected' && r.status !== 'REJECTED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.fullName.toLowerCase().includes(q);
      const matchPhone = r.phone.includes(q);
      const matchStudent = r.studentId?.toLowerCase().includes(q);
      return matchName || matchPhone || matchStudent;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>স্থায়ী প্রধান এডমিন প্যানেল — Jahidul Islam</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">নতুন সদস্য রেজিস্ট্রেশন ব্যবস্থাপনা</h2>
          <p className="text-xs text-slate-300 mt-1">
            আবেদন পর্যালোচনা করুন, ফোন ভেরিফিকেশন স্ট্যাটাস দেখুন এবং অনুমোদন দিয়ে রোল প্রদান করুন
          </p>
        </div>

        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>তালিক রিফ্রেশ করুন</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMsg}</div>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>অনুমোদনের অপেক্ষায়</span>
            {pendingList.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
              }`}>
                {pendingList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>অনুমোদিত সদস্য ({approvedList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            <span>বাতিলকৃত ({rejectedList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সকল ({registrations.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Registrations List */}
      <div className="space-y-3">
        {filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">কোনো আবেদন পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'pending'
                ? 'বর্তমানে কোনো নতুন রেজিস্ট্রেশন অনুমোদনের অপেক্ষায় নেই।'
                : 'নির্বাচিত ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি।'}
            </p>
          </div>
        ) : (
          filteredRegistrations.map(reg => {
            const isPending = reg.status === 'PENDING_APPROVAL';
            const isApproved = reg.status === 'APPROVED';
            const isRejected = reg.status === 'REJECTED';

            return (
              <div
                key={reg.id}
                className={`p-5 bg-white rounded-3xl border transition-all ${
                  isPending
                    ? 'border-amber-300/80 shadow-md ring-1 ring-amber-200/50'
                    : isApproved
                    ? 'border-slate-200 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Applicant details */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{reg.fullName}</h4>

                      {/* Status Badge */}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>অনুমোদন প্রয়োজন (PENDING)</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>অনুমোদিত ({reg.assignedRole === 'ADMIN' ? 'এডমিন' : 'সদস্য'})</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold inline-flex items-center gap-1">
                          <X className="h-3 w-3" />
                          <span>বাতিলকৃত</span>
                        </span>
                      )}

                      {/* Phone verification badge */}
                      {reg.isPhoneVerified ? (
                        <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                          ✓ ফোন ভেরিফাইড (OTP)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                          • সরাসরি আবেদন (SMS নিষ্ক্রিয়)
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">{reg.phone}</span>
                      </div>

                      {reg.studentId && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          <span>আইডি: {reg.studentId}</span>
                        </div>
                      )}

                      {reg.roomNo && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>রুম: {reg.roomNo}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>আবেদনের তারিখ: {new Date(reg.registrationDate).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Rejection reason note if applicable */}
                    {isRejected && reg.rejectionReason && (
                      <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-100 font-medium">
                        বাতিলের কারণ: {reg.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {isPending && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {/* Role selection for approval */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setRoleToAssign('MEMBER')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            roleToAssign === 'MEMBER'
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          সদস্য (Member)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleToAssign('ADMIN')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            roleToAssign === 'ADMIN'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          এডমিন (Admin)
                        </button>
                      </div>

                      {/* Approve Button */}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleApprove(reg)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        <span>অনুমোদন করুন</span>
                      </button>

                      {/* Reject Button */}
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          setSelectedReg(reg);
                          setShowRejectModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        <span>বাতিল</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <UserX className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">রেজিস্ট্রেশন আবেদন বাতিল</h3>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              আপনি কি নিশ্চিত যে <strong className="text-slate-900">{selectedReg.fullName}</strong> ({selectedReg.phone})-এর রেজিস্ট্রেশন আবেদনটি বাতিল করতে চান?
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                বাতিলের কারণ (ঐচ্ছিক)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="যেমন: মেসে সিট খালি নেই বা ভুল তথ্য প্রদান"
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'প্রক্রিয়াধীন...' : 'নিশ্চিত বাতিল করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
