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
  UserCog,
  Maximize2,
  Check,
  History,
} from 'lucide-react';
import { Member, MemberRole, MemberStatus } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { RegistrationManagement } from './RegistrationManagement.js';

export function isPermanentAdminMember(m?: { id?: string; name?: string; phone?: string; email?: string } | null): boolean {
  if (!m) return false;
  const name = (m.name || '').toLowerCase();
  const phone = (m.phone || '').replace(/[\s\-\+]/g, '');
  const email = (m.email || '').toLowerCase();
  return (
    m.id === 'm1' ||
    m.id === 'admin_m1' ||
    name.includes('jahidul') ||
    name.includes('জাহিদুল') ||
    phone === '01516528497' ||
    email === 'mdjahidulislam1025@gmail.com'
  );
}

interface MembersViewProps {
  members: Member[];
  currentMember: Member;
  language: Language;
  memberLimit?: number;
  onUpdateMemberLimit?: (limit: number) => Promise<void>;
  onSaveMember: (member: Partial<Member>) => Promise<void>;
  onChangeRole?: (memberId: string, newRole: MemberRole) => Promise<void>;
  onRemoveMember?: (id: string) => Promise<void>;
  onReactivateMember?: (id: string) => Promise<void>;
  onDeleteMember?: (id: string) => Promise<void>;
  isManagementMode?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  currentMember,
  language,
  memberLimit = 6,
  onUpdateMemberLimit,
  onSaveMember,
  onChangeRole,
  onRemoveMember,
  onReactivateMember,
  onDeleteMember,
  isManagementMode = false,
  onNavigateToTab,
}) => {
  const t = translations[language];
  const [membersSubTab, setMembersSubTab] = useState<'directory' | 'registrations'>('directory');
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

  // Member Limit Capacity State
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [customLimit, setCustomLimit] = useState(memberLimit || 6);
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  // Form State (for Add / Edit)
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [joiningDate, setJoiningDate] = useState('2026-01-01');
  const [initialPassword, setInitialPassword] = useState('123456');
  const [selectedColor, setSelectedColor] = useState('bg-emerald-600');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentMember.role === 'admin';
  const isJahidulCurrent = isPermanentAdminMember(currentMember);

  const avatarColorOptions = [
    'bg-emerald-600',
    'bg-blue-600',
    'bg-indigo-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-teal-600',
    'bg-cyan-600',
  ];

  const openAddModal = () => {
    setName('');
    setNickname('');
    setPhone('');
    setEmail('');
    setUsername(`m_${Date.now().toString().slice(-4)}`);
    setRoomNo('101');
    setRole('member');
    setStatus('active');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setInitialPassword('123456');
    setSelectedColor(avatarColorOptions[Math.floor(Math.random() * avatarColorOptions.length)]);
    setShowAddModal(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setNickname(m.nickname || '');
    setPhone(m.phone);
    setEmail(m.email || '');
    setUsername(m.id);
    setRoomNo(m.roomNo || '');
    setRole(m.role);
    setStatus(m.status);
    setJoiningDate(m.joiningDate || '2026-01-01');
    setSelectedColor(m.avatarColor || 'bg-emerald-600');
  };

  const openChangeRoleModal = (m: Member) => {
    if (!isJahidulCurrent) return;
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

      // Only Jahidul Islam can assign or change roles
      const finalRole: MemberRole = isTargetPermanent
        ? 'admin'
        : isJahidulCurrent
        ? role
        : editingMember
        ? editingMember.role
        : 'member';

      await onSaveMember({
        id: editingMember ? editingMember.id : username.trim() || undefined,
        name: name.trim(),
        nickname: (nickname || name.split(' ')[0]).trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        roomNo: roomNo.trim() || undefined,
        role: finalRole,
        status: isTargetPermanent ? 'active' : status,
        joiningDate,
        avatarColor: selectedColor,
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

  const handleSaveMemberLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateMemberLimit) return;
    try {
      setIsUpdatingLimit(true);
      await onUpdateMemberLimit(Number(customLimit));
      setShowLimitModal(false);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  const handleQuickIncreaseLimit = async () => {
    if (!onUpdateMemberLimit) return;
    const newLimit = (memberLimit || 6) + 1;
    await onUpdateMemberLimit(newLimit);
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
  const effectiveLimit = Math.max(memberLimit || 6, activeCount);

  return (
    <div className="space-y-6">
      {/* Sub Tabs: Directory vs Registrations */}
      {isAdmin && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200">
          <button
            onClick={() => setMembersSubTab('directory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              membersSubTab === 'directory'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>সদস্য তালিকা ও রোল (Members Directory)</span>
          </button>
          <button
            onClick={() => setMembersSubTab('registrations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              membersSubTab === 'registrations'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>নতুন রেজিস্ট্রেশন আবেদন (Registrations)</span>
          </button>
        </div>
      )}

      {membersSubTab === 'registrations' ? (
        <RegistrationManagement onRefreshData={() => {}} />
      ) : (
        <>
          {/* Top Banner & Statistics */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <Users className="h-4 w-4 text-emerald-300" />
              <span>Bachelor Zone • {isManagementMode ? 'সদস্য ও রোল ব্যবস্থাপনা (Member & Role Management)' : 'মেস সদস্য তালিকা (Member Directory)'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1.5 tracking-tight text-white">
              {isManagementMode ? 'সদস্য ও নিরাপত্তা ব্যবস্থাপনা' : 'সদস্য তালিকা'} ({members.length} জন)
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              {isManagementMode
                ? 'মেসের এডমিন ও সদস্যদের ভূমিকা নির্ধারণ, সংযোজন, অপসারণ ও ধারণক্ষমতা নিয়ন্ত্রণ।'
                : 'মেসের মিল, বাজার, রান্না, খরচ ও আর্থিক হিসাব পরিচালনার মেম্বার ডিরেক্টরি।'}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-emerald-700/40 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-200 font-medium">সক্রিয় সদস্য (Active)</span>
            <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{activeCount} জন</div>
          </div>

          {/* Member Limit / Capacity Card */}
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-emerald-200 font-medium">ধারণক্ষমতা (Capacity)</span>
              {isAdmin && (
                <button
                  onClick={() => {
                    setCustomLimit(effectiveLimit);
                    setShowLimitModal(true);
                  }}
                  className="text-[10px] text-emerald-300 hover:text-white underline font-bold cursor-pointer"
                >
                  লিমিট পরিবর্তন
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-white">{activeCount} / {effectiveLimit} জন</span>
              {isAdmin && (
                <button
                  onClick={handleQuickIncreaseLimit}
                  className="px-1.5 py-0.5 text-[10px] bg-emerald-700/80 hover:bg-emerald-600 rounded text-white font-bold cursor-pointer transition-colors"
                  title="আসন সংখ্যা ১ জন বৃদ্ধি করুন"
                >
                  +১ বৃদ্ধি
                </button>
              )}
            </div>
          </div>

          {/* Permanent Admin Card */}
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-amber-200 font-medium flex items-center gap-1">
              <Crown className="h-3 w-3 text-amber-300" />
              <span>স্থায়ী প্রধান এডমিন</span>
            </span>
            <div className="text-sm font-black text-amber-300 mt-1 truncate">Jahidul Islam 👑</div>
            <div className="text-[10px] text-amber-200/80 mt-0.5">Primary Admin / Owner</div>
          </div>

          {/* Removed / Preserved Card */}
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-300 font-medium">অপসারিত (হিসাব সংরক্ষিত)</span>
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
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            অপসারিত সদস্য ({inactiveCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="নাম, ফোন অথবা রুম নম্বর খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 text-[11px]">
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
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-900 border border-amber-300 shadow-2xs">
                              <Crown className="h-3 w-3 text-amber-600" />
                              <span>Permanent Admin</span>
                            </span>
                            <div className="text-[10px] text-amber-800 font-semibold pl-1">Primary Admin / Owner</div>
                          </div>
                        ) : m.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <ShieldCheck className="h-3 w-3 text-purple-600" />
                            <span>Admin</span>
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
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black text-amber-950 bg-amber-100/70 border border-amber-300 shadow-2xs">
                            <Lock className="h-3 w-3 text-amber-700" />
                            <span>Permanent / Active</span>
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
                                title="প্রোফাইল দেখুন বা সম্পাদনা করুন"
                              >
                                Edit Profile / View Profile
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
                                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                    title="সম্পাদনা করুন"
                                  >
                                    Edit
                                  </button>

                                  {/* Change Role - Only Jahidul Islam can assign or change roles */}
                                  {isJahidulCurrent && (
                                    <button
                                      onClick={() => openChangeRoleModal(m)}
                                      className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                                      title="সদস্যের রোল পরিবর্তন করুন (শুধুমাত্র জাহিদুল ইসলাম অনুমোদিত)"
                                    >
                                      Change Role
                                    </button>
                                  )}

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
                                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
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
                                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                  View Profile
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
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map(m => {
            const isPermanent = isPermanentAdminMember(m);
            const isRemoved = m.status === 'left' || m.status === 'inactive';

            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs relative flex flex-col justify-between transition-all ${
                  isPermanent
                    ? 'border-amber-300 ring-2 ring-amber-100 bg-gradient-to-b from-amber-50/20 to-white'
                    : isRemoved
                    ? 'border-slate-200 opacity-75 bg-slate-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-2xl text-white text-base font-black flex items-center justify-center shadow-xs ${
                          isPermanent ? 'bg-amber-600 ring-2 ring-amber-300' : m.avatarColor
                        }`}
                      >
                        {m.nickname ? m.nickname.slice(0, 1) : m.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                          {isPermanent && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-400">ডাকনাম: {m.nickname || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Role badge */}
                    {isPermanent ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        Permanent Admin
                      </span>
                    ) : m.role === 'admin' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Member
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{m.phone}</span>
                    </div>
                    {m.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-400">
                      <span>রুম: {m.roomNo || 'N/A'}</span>
                      <span>যোগদান: {m.joiningDate || '2026-01-01'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    {isPermanent ? (
                      <span className="text-amber-800 font-bold flex items-center gap-1">
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span>Protected</span>
                      </span>
                    ) : m.status === 'active' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-rose-500" />
                        <span>Removed</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPermanent ? (
                      <button
                        onClick={() => openEditModal(m)}
                        className="px-3 py-1 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                      >
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(m)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                            {isJahidulCurrent && (
                              <button
                                onClick={() => openChangeRoleModal(m)}
                                className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 border border-purple-200 rounded-lg cursor-pointer transition-colors"
                              >
                                Role
                              </button>
                            )}
                            {isRemoved ? (
                              <button
                                onClick={() => handleReactivate(m)}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => setRemoveTarget(m)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                        {!isAdmin && (
                          <button
                            onClick={() => openEditModal(m)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                          >
                            View
                          </button>
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

      {/* MODAL 1: Change Member Role (Only Jahidul Islam can perform this - Section 3, 8) */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
                <UserCog className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">সদস্য রোল পরিবর্তন (Change Role)</h3>
                <p className="text-xs text-slate-500">মেস পরিচালক জাহিদুল ইসলাম কর্তৃক রোল অ্যাসাইনমেন্ট</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Target Member Info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{roleChangeTarget.name}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                  <span>ফোন: {roleChangeTarget.phone}</span>
                  <span>বর্তমান রোল: <strong className="text-purple-700 capitalize">{roleChangeTarget.role}</strong></span>
                </div>
              </div>

              {/* Role Radio Options */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">
                  নতুন রোল নির্বাচন করুন (Select New Role):
                </label>

                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNewRole === 'admin'
                        ? 'border-purple-600 bg-purple-50/70 ring-1 ring-purple-500'
                        : 'border-slate-200 hover:bg-slate-50'
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
                        নতুন সদস্য যোগ, অপসারণ, মিল পরিচালনা, বাজার শিডিউল, খরচ এন্ট্রি, পেমেন্ট ও মাসিক হিসাবের সম্পূর্ণ অধিকার।
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedNewRole === 'member'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50'
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
                        নিজের প্রতিদিনের মিল অন/অফ করা এবং মেসের সার্বিক মিল, বাজার ও হিসাব বিবরণী স্বচ্ছভাবে দেখার অধিকার।
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Audit Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  এই রোল পরিবর্তনের রেকর্ড অডিট লগে সংরক্ষিত হবে (কে পরিবর্তন করেছেন, কোন সদস্য, পূর্বের ও নতুন রোল এবং সময়)।
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
              {/* Mandatory Prompt Message from User Specification */}
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
                <p>• অতীতের সকল মিল, বাজার খরচ, পেমেন্ট এবং মাসিক স্টেটমেন্ট সম্পূর্ণ সংরক্ষিত থাকবে।</p>
                <p>• সদস্য ভবিষ্যতের সক্রিয় মিল ও নতুন বাজার হিসাব থেকে বাদ পড়বেন।</p>
                <p>• পরবর্তীতে যেকোনো সময় মেস এডমিন কর্তৃক পুনরায় সক্রিয় (Reactivate) করা যাবে।</p>
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

      {/* MODAL 3: Add New Member (Section 4) */}
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
                  placeholder="উদা: ফাহিম আহমেদ"
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
                    placeholder="উদা: ফাহিম"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রুম নম্বর (Room No)</label>
                  <input
                    type="text"
                    value={roomNo}
                    onChange={e => setRoomNo(e.target.value)}
                    placeholder="উদা: ১০৪"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইউজারনেম / Member ID</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="উদা: m_105"
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রোল (Role) {isJahidulCurrent ? '' : <span className="text-[10px] text-amber-600 font-normal">(শুধুমাত্র জাহিদুল ইসলাম অনুমোদিত)</span>}
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as MemberRole)}
                    disabled={!isJahidulCurrent}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="member">সাধারণ সদস্য (Member)</option>
                    {isJahidulCurrent && <option value="admin">মেস এডমিন (Admin)</option>}
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

              {/* Avatar Color Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">প্রোফাইল কালার (Avatar Color)</label>
                <div className="flex items-center gap-2">
                  {avatarColorOptions.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedColor(col)}
                      className={`h-7 w-7 rounded-full ${col} flex items-center justify-center cursor-pointer transition-transform ${
                        selectedColor === col ? 'ring-2 ring-slate-900 ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                    >
                      {selectedColor === col && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                নতুন সদস্য যুক্ত হলে তারা ভবিষ্যতের মিল ও হিসাব পরিকল্পনায় অন্তর্ভুক্ত হবেন। পূর্ববর্তী মাসের ক্লোজড হিসাবে কোনো পরিবর্তন হবে না।
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
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`h-10 w-10 rounded-full text-white text-sm font-bold flex items-center justify-center ${
                  isPermanentAdminMember(editingMember) ? 'bg-amber-600 ring-2 ring-amber-300' : editingMember.avatarColor
                }`}
              >
                {editingMember.nickname ? editingMember.nickname.slice(0, 1) : editingMember.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isPermanentAdminMember(editingMember) ? 'স্থায়ী প্রধান এডমিন প্রোফাইল' : 'সদস্য প্রোফাইল সম্পাদনা'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isPermanentAdminMember(editingMember)
                    ? 'জাহিদুল ইসলাম — Permanent Primary Admin / Owner'
                    : `${editingMember.name} এর তথ্য হালনাগাদ`}
                </p>
              </div>
            </div>

            {/* Permanent Admin Notice */}
            {isPermanentAdminMember(editingMember) && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">স্থায়ী প্রধান এডমিন ও মেস প্রতিষ্ঠাতা (Protected Identity):</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন। অ্যাপের নিয়ম অনুযায়ী তার এডমিন পদ, সক্রিয় স্ট্যাটাস ও মালিকানা স্থায়ী এবং কোনো অবস্থাতেই পরিবর্তন বা অপসারণযোগ্য নয়।
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveAddOrEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পূর্ণ নাম (Full Name) <span className="text-rose-500">*</span>
                </label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">ডাকনাম (Nickname)</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">রুম নম্বর (Room No)</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর (Phone Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল (Email)</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রোল (Role)
                    {isPermanentAdminMember(editingMember) && (
                      <span className="text-amber-600 font-bold ml-1 text-[10px]">(স্থায়ী এডমিন - অপরিবর্তনীয়)</span>
                    )}
                  </label>
                  {isPermanentAdminMember(editingMember) ? (
                    <div className="w-full px-3.5 py-2 text-xs border border-amber-300 rounded-xl bg-amber-50 font-bold text-amber-900 flex items-center gap-1.5 select-none">
                      <Crown className="h-3.5 w-3.5 text-amber-600" />
                      <span>Permanent Admin (সুরক্ষিত)</span>
                    </div>
                  ) : (
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as MemberRole)}
                      disabled={!isJahidulCurrent}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="member">সাধারণ সদস্য (Member)</option>
                      {isJahidulCurrent && <option value="admin">মেস এডমিন (Admin)</option>}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    স্ট্যাটাস (Status)
                    {isPermanentAdminMember(editingMember) && (
                      <span className="text-emerald-700 font-bold ml-1 text-[10px]">(স্থায়ী সক্রিয়)</span>
                    )}
                  </label>
                  {isPermanentAdminMember(editingMember) ? (
                    <div className="w-full px-3.5 py-2 text-xs border border-emerald-300 rounded-xl bg-emerald-50 font-bold text-emerald-900 flex items-center gap-1.5 select-none">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Active (Permanent)</span>
                    </div>
                  ) : (
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as MemberStatus)}
                      disabled={!isAdmin}
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100"
                    >
                      <option value="active">সক্রিয় (Active)</option>
                      <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                      <option value="left">অপসারিত (Removed / Left)</option>
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
                  disabled={!isAdmin}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
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

      {/* MODAL 5: Member Limit Capacity (Section 10) */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <Maximize2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">মেস সদস্য ধারণক্ষমতা লিমিট</h3>
                <p className="text-xs text-slate-500">সর্বোচ্চ সক্রিয় সদস্য সংখ্যার লিমিট নির্ধারণ</p>
              </div>
            </div>

            <form onSubmit={handleSaveMemberLimit} className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>বর্তমান সক্রিয় সদস্য:</span>
                  <span className="font-bold text-emerald-700">{activeCount} জন</span>
                </div>
                <div className="flex justify-between">
                  <span>ডিফল্ট প্রাথমিক লিমিট:</span>
                  <span className="font-bold text-slate-800">৬ জন</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নতুন সদস্য লিমিট সংখ্যা (Max Active Members):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={Math.max(activeCount, 1)}
                    max={50}
                    value={customLimit}
                    onChange={e => setCustomLimit(parseInt(e.target.value, 10) || activeCount)}
                    className="w-full px-3.5 py-2 text-sm font-bold border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">জন</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                {[6, 7, 8, 10, 12].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCustomLimit(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                      customLimit === num
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {num} জন
                  </button>
                ))}
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                সদস্য সংখ্যা বৃদ্ধি পেলে স্বয়ংক্রিয়ভাবে মিল হিসাব, মিল রেট, শেয়ার খরচ, বাজার ও রান্নার শিডিউল আপডেট হবে।
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  disabled={isUpdatingLimit}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLimit}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingLimit && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>লিমিট সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
