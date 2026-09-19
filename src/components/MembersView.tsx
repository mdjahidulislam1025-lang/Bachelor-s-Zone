import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  DoorOpen,
  Calendar,
  Shield,
  ShieldCheck,
  Crown,
  Lock,
  Edit2,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Mail,
  KeyRound,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Member, MemberRole, MemberStatus } from '../types.js';
import { Language, translations } from '../utils/translations.js';

export function isPermanentAdminMember(m?: Member | null): boolean {
  if (!m) return false;
  const name = (m.name || '').toLowerCase();
  const phone = (m.phone || '').replace(/[\s\-\+]/g, '');
  const email = (m.email || '').toLowerCase();
  return (
    m.id === 'm1' ||
    name.includes('jahidul') ||
    name.includes('জাহিদুল') ||
    phone === '8801711234567' ||
    phone === '01711234567' ||
    email === 'mdjahidulislam1025@gmail.com'
  );
}

interface MembersViewProps {
  members: Member[];
  currentMember: Member;
  language: Language;
  onSaveMember: (member: Partial<Member>) => Promise<void>;
  onChangeRole?: (memberId: string, newRole: MemberRole) => Promise<void>;
  onRemoveMember?: (id: string) => Promise<void>;
  onReactivateMember?: (id: string) => Promise<void>;
  onDeleteMember?: (id: string) => Promise<void>;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  currentMember,
  language,
  onSaveMember,
  onChangeRole,
  onRemoveMember,
  onReactivateMember,
  onDeleteMember,
}) => {
  const t = translations[language];
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');

  // Change Role Modal State
  const [roleChangeTarget, setRoleChangeTarget] = useState<Member | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<MemberRole>('member');
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Remove Member Modal State
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Reactivate Member State
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Form State (for Add / Edit)
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [joiningDate, setJoiningDate] = useState('2026-01-01');
  const [initialPassword, setInitialPassword] = useState('123456');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentMember.role === 'admin';
  const isJahidulCurrent = isPermanentAdminMember(currentMember);

  const openAddModal = () => {
    setName('');
    setNickname('');
    setPhone('');
    setEmail('');
    setRoomNo('101');
    setRole('member');
    setStatus('active');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setInitialPassword('123456');
    setShowAddModal(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setNickname(m.nickname || '');
    setPhone(m.phone);
    setEmail(m.email || '');
    setRoomNo(m.roomNo || '');
    setRole(m.role);
    setStatus(m.status);
    setJoiningDate(m.joiningDate || '2026-01-01');
  };

  const openChangeRoleModal = (m: Member) => {
    if (isPermanentAdminMember(m)) return;
    setRoleChangeTarget(m);
    setSelectedNewRole(m.role === 'admin' ? 'member' : 'admin');
  };

  const handleSaveAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    try {
      setIsSubmitting(true);
      const isTargetPermanent = isPermanentAdminMember(editingMember);

      await onSaveMember({
        id: editingMember ? editingMember.id : undefined,
        name: name.trim(),
        nickname: (nickname || name.split(' ')[0]).trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        roomNo: roomNo.trim() || undefined,
        role: isTargetPermanent ? 'admin' : role,
        status: isTargetPermanent ? 'active' : status,
        joiningDate,
        avatarColor: editingMember ? editingMember.avatarColor : getRandomAvatarColor(),
      });

      setShowAddModal(false);
      setEditingMember(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    try {
      setIsChangingRole(true);
      if (onChangeRole) {
        await onChangeRole(roleChangeTarget.id, selectedNewRole);
      } else {
        await onSaveMember({
          id: roleChangeTarget.id,
          role: selectedNewRole,
        });
      }
      setRoleChangeTarget(null);
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      setIsRemoving(true);
      if (onRemoveMember) {
        await onRemoveMember(removeTarget.id);
      } else if (onDeleteMember) {
        await onDeleteMember(removeTarget.id);
      } else {
        await onSaveMember({
          id: removeTarget.id,
          status: 'left',
        });
      }
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleReactivate = async (m: Member) => {
    try {
      setReactivatingId(m.id);
      if (onReactivateMember) {
        await onReactivateMember(m.id);
      } else {
        await onSaveMember({
          id: m.id,
          status: 'active',
        });
      }
    } finally {
      setReactivatingId(null);
    }
  };

  const getRandomAvatarColor = () => {
    const colors = [
      'bg-emerald-600',
      'bg-blue-600',
      'bg-indigo-600',
      'bg-purple-600',
      'bg-amber-600',
      'bg-teal-600',
      'bg-rose-600',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const filteredMembers = members.filter(m => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? m.status === 'active'
        : m.status !== 'active';

    const query = searchTerm.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(query) ||
      m.nickname.toLowerCase().includes(query) ||
      m.phone.includes(query) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.roomNo && m.roomNo.includes(query));

    return matchesStatus && matchesSearch;
  });

  const activeCount = members.filter(m => m.status === 'active').length;
  const inactiveCount = members.filter(m => m.status !== 'active').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Statistics */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <Users className="h-4 w-4 text-emerald-300" />
              <span>Bachelor Zone • মেস সদস্য ও রোল ব্যবস্থাপনা (Member & Role Management)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight text-white">
              সদস্য তালিকা ({members.length} জন)
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              মেসের মিল, বাজার, রান্না, খরচ ও আর্থিক হিসাব পরিচালনার সুরক্ষিত মেম্বার ডিরেক্টরি।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-black shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-emerald-700" />
                <span>নতুন সদস্য যোগ করুন (Add Member)</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:text-white'
                }`}
                title="টেবিল ভিউ"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">টেবিল ভিউ</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:text-white'
                }`}
                title="কার্ড ভিউ"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">কার্ড ভিউ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-emerald-700/40">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-200 font-medium">মোট সদস্য</span>
            <div className="text-xl font-extrabold text-white mt-0.5">{members.length} জন</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-200 font-medium">সক্রিয় সদস্য (Active)</span>
            <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{activeCount} জন</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-amber-200 font-medium flex items-center gap-1">
              <Crown className="h-3 w-3 text-amber-300" />
              <span>স্থায়ী প্রধান এডমিন</span>
            </span>
            <div className="text-sm font-black text-amber-300 mt-1 truncate">Jahidul Islam 👑</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-300 font-medium">অপসারিত / নিষ্ক্রিয়</span>
            <div className="text-xl font-extrabold text-slate-300 mt-0.5">{inactiveCount} জন</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সকল সদস্য ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সক্রিয় সদস্য ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('left')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === 'left'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            অপসারিত / নিষ্ক্রিয় ({inactiveCount})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="নাম, ডাকনাম, ফোন বা রুম দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* VIEW MODE 1: Table View (Requested by section 7) */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Member (সদস্য)</th>
                  <th className="py-3.5 px-4">Role (রোল)</th>
                  <th className="py-3.5 px-4">Phone (মোবাইল)</th>
                  <th className="py-3.5 px-4">Status (স্ট্যাটাস)</th>
                  <th className="py-3.5 px-4">Joined (যোগদান)</th>
                  <th className="py-3.5 px-4 text-right">Actions (অ্যাকশন)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMembers.map(m => {
                  const isPermanent = isPermanentAdminMember(m);
                  const isRemoved = m.status === 'left' || m.status === 'inactive';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPermanent ? 'bg-amber-50/30' : isRemoved ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      {/* Member Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs ${
                              isPermanent ? 'bg-amber-600 ring-2 ring-amber-300' : m.avatarColor
                            }`}
                          >
                            {m.nickname ? m.nickname.slice(0, 1) : m.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                              {isPermanent && (
                                <span title="Primary Admin / Owner" className="inline-flex">
                                  <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>ডাকনাম: {m.nickname}</span>
                              {m.roomNo && <span>• রুম {m.roomNo}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-3.5 px-4">
                        {isPermanent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-900 border border-amber-300 shadow-2xs">
                            <Crown className="h-3 w-3 text-amber-600" />
                            <span>Permanent Admin</span>
                          </span>
                        ) : m.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <ShieldCheck className="h-3 w-3 text-purple-600" />
                            <span>Admin</span>
                          </span>
                        ) : m.role === 'treasurer' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <span>ক্যাশিয়ার</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span>Member</span>
                          </span>
                        )}
                      </td>

                      {/* Phone Column */}
                      <td className="py-3.5 px-4 font-mono text-slate-800 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{m.phone}</span>
                        </div>
                        {m.email && <div className="text-[10px] text-slate-400 truncate max-w-xs">{m.email}</div>}
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        {isPermanent ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span>Active (Permanent)</span>
                          </div>
                        ) : m.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50">
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100">
                            <XCircle className="h-3 w-3 text-rose-500" />
                            <span>Removed (হিসাব সংরক্ষিত)</span>
                          </span>
                        )}
                      </td>

                      {/* Joined Column */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{m.joiningDate || '2026-01-01'}</span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Permanent Admin: Edit Profile / View Profile only */}
                          {isPermanent ? (
                            <>
                              <button
                                onClick={() => openEditModal(m)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer"
                                title="প্রোফাইল সম্পাদনা বা দেখুন"
                              >
                                Edit Profile / View
                              </button>
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-1 rounded-lg select-none"
                                title="জাহিদুল ইসলাম মেসের স্থায়ী প্রধান এডমিন — অপরিবর্তনীয় ও সুরক্ষিত"
                              >
                                <Lock className="h-3 w-3 text-amber-600" />
                                <span>Protected</span>
                              </span>
                            </>
                          ) : (
                            <>
                              {/* Non-permanent member actions */}
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditModal(m)}
                                    className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="সম্পাদনা করুন"
                                  >
                                    Edit
                                  </button>

                                  {/* Change Role - Only Jahidul Islam (or Admin) can trigger */}
                                  <button
                                    onClick={() => openChangeRoleModal(m)}
                                    className="px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                    title="সদস্যের রোল পরিবর্তন করুন"
                                  >
                                    Change Role
                                  </button>

                                  {/* Remove / Reactivate */}
                                  {isRemoved ? (
                                    <button
                                      onClick={() => handleReactivate(m)}
                                      disabled={reactivatingId === m.id}
                                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                      title="পুনরায় সক্রিয় করুন"
                                    >
                                      <RefreshCw className={`h-3 w-3 ${reactivatingId === m.id ? 'animate-spin' : ''}`} />
                                      <span>Reactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setRemoveTarget(m)}
                                      className="px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                      title="সদস্য অপসারণ করুন (আর্থিক ইতিহাস সংরক্ষিত থাকবে)"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </>
                              )}

                              {!isAdmin && (
                                <button
                                  onClick={() => openEditModal(m)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  View
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(m => {
            const isPermanent = isPermanentAdminMember(m);
            const isRemoved = m.status === 'left' || m.status === 'inactive';

            return (
              <div
                key={m.id}
                className={`rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                  isPermanent
                    ? 'bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 border-amber-200 ring-1 ring-amber-200/60'
                    : isRemoved
                    ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Header Row */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-2xl text-white text-base font-black flex items-center justify-center shrink-0 shadow-2xs ${
                          isPermanent ? 'bg-amber-600 ring-2 ring-amber-300' : m.avatarColor
                        }`}
                      >
                        {m.nickname ? m.nickname.slice(0, 1) : m.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="text-sm font-black text-slate-900 leading-tight">{m.name}</h3>
                          {isPermanent && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">ডাকনাম: {m.nickname}</span>
                      </div>
                    </div>

                    {isPermanent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-900 border border-amber-300 shadow-2xs">
                        <Crown className="h-3 w-3 text-amber-600" />
                        <span>Permanent Admin</span>
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : m.role === 'treasurer'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {m.role === 'admin' ? 'Admin' : m.role === 'treasurer' ? 'ক্যাশিয়ার' : 'Member'}
                      </span>
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="space-y-2 mt-3.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-900 font-semibold">{m.phone}</span>
                    </div>
                    {m.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>রুম নম্বর: {m.roomNo || 'নির্ধারিত নয়'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>যোগদানের তারিখ: {m.joiningDate}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Status & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      isPermanent
                        ? 'text-emerald-700 font-black'
                        : m.status === 'active'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {m.status === 'active' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span>
                      {isPermanent
                        ? 'Active (Permanent Admin)'
                        : m.status === 'active'
                        ? 'সক্রিয় সদস্য'
                        : 'অপসারিত (হিসাব সংরক্ষিত)'}
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isPermanent ? (
                      <>
                        <button
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                        >
                          Edit Profile
                        </button>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-1 rounded-lg"
                          title="জাহিদুল ইসলাম মেসের স্থায়ী প্রধান এডমিন — অপরিবর্তনীয়"
                        >
                          <Lock className="h-3 w-3 text-amber-600" />
                          <span>Protected</span>
                        </span>
                      </>
                    ) : (
                      <>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(m)}
                              className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="সম্পাদনা"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => openChangeRoleModal(m)}
                              className="px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors"
                              title="রোল পরিবর্তন"
                            >
                              Change Role
                            </button>
                            {isRemoved ? (
                              <button
                                onClick={() => handleReactivate(m)}
                                disabled={reactivatingId === m.id}
                                className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer transition-colors"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => setRemoveTarget(m)}
                                className="px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="সদস্য অপসারণ"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Change Member Role (Requested by Section 8) */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">সদস্যের রোল পরিবর্তন (Change Role)</h3>
                  <p className="text-xs text-slate-500">শুধুমাত্র প্রধান এডমিন জাহিদুল ইসলাম এই পরিবর্তন করতে পারবেন</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Member Summary Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full text-white font-bold flex items-center justify-center ${roleChangeTarget.avatarColor}`}
                >
                  {roleChangeTarget.nickname.slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{roleChangeTarget.name}</div>
                  <div className="text-xs text-slate-500">ফোন: {roleChangeTarget.phone}</div>
                </div>
              </div>

              {/* Current Role Display */}
              <div className="flex items-center justify-between text-xs bg-slate-100/70 px-3.5 py-2.5 rounded-xl">
                <span className="text-slate-600 font-semibold">বর্তমান রোল (Current Role):</span>
                <span className="font-black px-2.5 py-0.5 rounded-md uppercase bg-white border border-slate-200 text-slate-800">
                  {roleChangeTarget.role === 'admin' ? 'Admin (এডমিন)' : 'Member (সাধারণ সদস্য)'}
                </span>
              </div>

              {/* Select New Role Radio Options */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  নতুন রোল নির্বাচন করুন (Change to):
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNewRole === 'admin'
                        ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newRole"
                      value="admin"
                      checked={selectedNewRole === 'admin'}
                      onChange={() => setSelectedNewRole('admin')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                        <span>Admin (মেস এডমিন)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        মেসের মিল ব্যবস্থাপনা, বাজার তালিকা, রান্না শিডিউল, খরচ এন্ট্রি ও সেটিংস পরিচালনার পূর্ণ প্রশাসনিক ক্ষমতা।
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNewRole === 'member'
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newRole"
                      value="member"
                      checked={selectedNewRole === 'member'}
                      onChange={() => setSelectedNewRole('member')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-emerald-600" />
                        <span>Member (সাধারণ সদস্য)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        নিজের প্রতিদিনের মিল অন/অফ করা এবং মেসের সার্বিক মিল, বাজার ও হিসাব বিবরণী স্বচ্ছভাবে দেখার অনুমতি।
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Audit Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  এই রোল পরিবর্তনের রেকর্ড স্বয়ংক্রিয়ভাবে অডিট লগে সংরক্ষিত হবে (কে পরিবর্তন করেছেন, কোন সদস্য, পূর্বের ও নতুন রোল এবং সময়)।
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                disabled={isChangingRole}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isChangingRole}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isChangingRole && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>রোল পরিবর্তন নিশ্চিত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Remove Member Confirmation (Requested by Section 5) */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <UserMinus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">সদস্য অপসারণ (Remove Member)</h3>
                  <p className="text-xs text-slate-500">ঐতিহাসিক হিসাব অক্ষত রেখে সদস্য স্ট্যাটাস আপডেট</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-700">
              {/* Mandatory Prompt Message */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                <p className="font-bold text-sm leading-relaxed">
                  “Are you sure you want to remove this member? Their historical meal, expense, payment and account records will be preserved.”
                </p>
                <p className="text-xs text-rose-800 mt-2 font-medium">
                  “আপনি কি নিশ্চিতভাবে এই সদস্যকে অপসারণ করতে চান? তাদের পূর্বের সমস্ত মিল, বাজার খরচ, পেমেন্ট এবং হিসাবের রেকর্ড সম্পূর্ণ সংরক্ষিত থাকবে।”
                </p>
              </div>

              {/* Target Details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">{removeTarget.name}</div>
                <div className="text-slate-500 text-xs flex items-center gap-3">
                  <span>ফোন: {removeTarget.phone}</span>
                  <span>রুম: {removeTarget.roomNo || 'N/A'}</span>
                  <span className="capitalize">রোল: {removeTarget.role}</span>
                </div>
              </div>

              {/* Rules Bulletins */}
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1 leading-relaxed">
                <div className="font-bold text-amber-950 mb-1">গুরুত্বপূর্ণ নিরাপত্তা নির্দেশিকা:</div>
                <p>• সদস্যের অ্যাকাউন্ট স্ট্যাটাস <code className="bg-white px-1 py-0.5 rounded text-amber-900 font-bold font-mono">Removed / Inactive</code> করা হবে।</p>
                <p>• অতীতের সকল মিল, বাজার খরচ, পেমেন্ট এবং মাসিক স্টেটমেন্ট সম্পূর্ণ অবিকৃত থাকবে।</p>
                <p>• সদস্য শুধুমাত্র ভবিষ্যতের সক্রিয় মিল ও নতুন বাজার হিসাব থেকে বাদ পড়বেন।</p>
                <p>• প্রয়োজন হলে পরবর্তীতে যেকোনো সময় এডমিন কর্তৃক পুনরায় সক্রিয় করা যাবে।</p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={isRemoving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isRemoving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>সদস্য অপসারণ নিশ্চিত করুন (Remove)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add New Member (Requested by Section 4) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">নতুন মেস সদস্য যোগ করুন (Add Member)</h3>
                <p className="text-xs text-slate-500">Bachelor Zone এ নতুন সদস্য প্রোফাইল ও অ্যাকাউন্ট তৈরি</p>
              </div>
            </div>

            <form onSubmit={handleSaveAddOrEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পূর্ণ নাম (Full Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="উদা: আরমান হোসেন"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ডাকনাম (Nickname)</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="উদা: আরমান"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রুম নম্বর (Room No)</label>
                  <input
                    type="text"
                    value={roomNo}
                    onChange={e => setRoomNo(e.target.value)}
                    placeholder="উদা: ২০৩"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর (Phone Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল (Email - optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রোল (Role)</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as MemberRole)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="member">সাধারণ সদস্য (Member)</option>
                    <option value="admin">মেস এডমিন (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">স্ট্যাটাস (Status)</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as MemberStatus)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">যোগদানের তারিখ (Join Date)</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">প্রাথমিক পাসওয়ার্ড / পিন</label>
                  <input
                    type="text"
                    value={initialPassword}
                    onChange={e => setInitialPassword(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                নতুন সদস্য যুক্ত হলে তারা ভবিষ্যতের মিল ও হিসাব পরিকল্পনায় অন্তর্ভুক্ত হবেন। পূর্ববর্তী মাসের ক্লোজড হিসাবে কোনো ব্যাঘাত ঘটবে না।
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>নতুন সদস্য যুক্ত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Member Profile */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full text-white font-bold flex items-center justify-center ${
                    isPermanentAdminMember(editingMember) ? 'bg-amber-600 ring-2 ring-amber-300' : editingMember.avatarColor
                  }`}
                >
                  {editingMember.nickname ? editingMember.nickname.slice(0, 1) : editingMember.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingMember.name} — প্রোফাইল সম্পাদনা
                  </h3>
                  <p className="text-xs text-slate-500">মেম্বার তথ্য ও অ্যাকাউন্ট ব্যবস্থাপনা</p>
                </div>
              </div>
            </div>

            {/* Permanent Admin Special Banner */}
            {isPermanentAdminMember(editingMember) && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                <Crown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <span>স্থায়ী প্রধান এডমিন ও মেস প্রতিষ্ঠাতা (Permanent Primary Admin / Owner)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                    জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর আজীবন স্থায়ী প্রধান এডমিন। তার এডমিন পদবি, সক্রিয় স্ট্যাটাস ও মালিকানা স্থায়ীভাবে সুরক্ষিত এবং কোনোভাবেই পরিবর্তনযোগ্য নয়।
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveAddOrEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ডাকনাম</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রুম নম্বর</label>
                  <input
                    type="text"
                    value={roomNo}
                    onChange={e => setRoomNo(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>মেস রোল</span>
                    {isPermanentAdminMember(editingMember) && (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> সুরক্ষিত
                      </span>
                    )}
                  </label>
                  {isPermanentAdminMember(editingMember) ? (
                    <div className="w-full px-3.5 py-2 text-xs bg-amber-50 border border-amber-300 text-amber-950 rounded-xl font-bold flex items-center justify-between">
                      <span>স্থায়ী প্রধান এডমিন</span>
                      <Crown className="h-4 w-4 text-amber-600" />
                    </div>
                  ) : (
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as MemberRole)}
                      disabled={!isJahidulCurrent}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="member">সাধারণ সদস্য (Member)</option>
                      <option value="admin">মেস এডমিন (Admin)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>স্ট্যাটাস</span>
                    {isPermanentAdminMember(editingMember) && (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> অপরিবর্তনীয়
                      </span>
                    )}
                  </label>
                  {isPermanentAdminMember(editingMember) ? (
                    <div className="w-full px-3.5 py-2 text-xs bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl font-bold flex items-center justify-between">
                      <span>সক্রিয় (Permanent Active)</span>
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                  ) : (
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as MemberStatus)}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="active">সক্রিয় (Active)</option>
                      <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                      <option value="left">মেস ত্যাগ / অপসারিত</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">যোগদানের তারিখ</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>পরিবর্তন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
