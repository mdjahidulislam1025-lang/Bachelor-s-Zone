import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  DoorOpen,
  Calendar,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { Member, MemberRole, MemberStatus } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';

interface MembersViewProps {
  members: Member[];
  currentMember: Member;
  language: Language;
  onSaveMember: (member: Partial<Member>) => Promise<void>;
  onDeleteMember?: (id: string) => Promise<void>;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  currentMember,
  language,
  onSaveMember,
  onDeleteMember,
}) => {
  const t = translations[language];
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [status, setStatus] = useState<MemberStatus>('active');
  const [joiningDate, setJoiningDate] = useState('2026-01-01');

  const isAdmin = currentMember.role === 'admin';

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setNickname('');
    setPhone('');
    setRoomNo('101');
    setRole('member');
    setStatus('active');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setNickname(m.nickname);
    setPhone(m.phone);
    setRoomNo(m.roomNo || '');
    setRole(m.role);
    setStatus(m.status);
    setJoiningDate(m.joiningDate);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    await onSaveMember({
      id: editingMember ? editingMember.id : undefined,
      name,
      nickname: nickname || name.split(' ')[0],
      phone,
      roomNo,
      role,
      status,
      joiningDate,
      avatarColor: editingMember ? editingMember.avatarColor : 'bg-emerald-600',
    });
    setShowModal(false);
    setEditingMember(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteMember) return;
    try {
      setIsDeleting(true);
      await onDeleteMember(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      (m.roomNo && m.roomNo.includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
            <Users className="h-4 w-4" />
            <span>মেস সদস্য পরিচিতি ও ডিরেক্টরি (Mess Members Directory)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
            মোট সদস্য: {members.length} জন (সক্রিয়: {members.filter(m => m.status === 'active').length} জন)
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            মেস ম্যানেজমেন্টের আওতাধীন সকল সদস্যের বিস্তারিত তথ্য ও রোল বিন্যাস
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4 text-emerald-700" />
            <span>নতুন সদস্য যোগ করুন</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/90">
            <Eye className="h-4 w-4 text-emerald-200" />
            <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সকল সদস্য ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সক্রিয় ({members.filter(m => m.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            নিষ্ক্রিয়
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Members Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(m => (
          <div
            key={m.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-full text-white text-base font-extrabold flex items-center justify-center shrink-0 ${m.avatarColor}`}
                  >
                    {m.nickname.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{m.name}</h3>
                    <span className="text-xs text-slate-400 font-medium">ডাকনাম: {m.nickname}</span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    m.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : m.role === 'treasurer'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.role === 'admin' ? 'এডমিন' : m.role === 'treasurer' ? 'ক্যাশিয়ার' : 'সদস্য'}
                </span>
              </div>

              <div className="space-y-2 mt-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-800">{m.phone}</span>
                </div>
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

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                  m.status === 'active'
                    ? 'text-emerald-600'
                    : m.status === 'inactive'
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {m.status === 'active' ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>
                  {m.status === 'active' ? 'সক্রিয় সদস্য' : m.status === 'inactive' ? 'নিষ্ক্রিয়' : 'মেস ত্যাগ করেছে'}
                </span>
              </span>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(m)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    title="সম্পাদনা করুন"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>সম্পাদনা</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                    title="সদস্য মুছে ফেলুন"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add/Edit Member */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingMember ? 'সদস্যের তথ্য সম্পাদনা করুন' : 'নতুন মেস সদস্য যোগ করুন'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="উদা: আরিফুল ইসলাম"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ডাকনাম</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="উদা: আরিফ"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">রুম নম্বর</label>
                  <input
                    type="text"
                    value={roomNo}
                    onChange={e => setRoomNo(e.target.value)}
                    placeholder="উদা: ২০২"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মেস রোল</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as MemberRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="member">সাধারণ সদস্য</option>
                    <option value="treasurer">ক্যাশিয়ার (Treasurer)</option>
                    <option value="admin">মেস এডমিন (Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্য অবস্থা</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as MemberStatus)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                    <option value="left">মেস ত্যাগ করেছে</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">যোগদানের তারিখ</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingMember ? 'পরিবর্তন সংরক্ষণ' : 'সদস্য সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Member Deletion */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="মেস সদস্য অপসারণের নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত যে '${deleteTarget?.name}' সদস্যের প্রোফাইল মেস থেকে মুছে ফেলতে চান?`}
        itemName={`${deleteTarget?.name} (${deleteTarget?.role === 'admin' ? 'এডমিন' : deleteTarget?.role === 'treasurer' ? 'ক্যাশিয়ার' : 'সদস্য'})`}
        itemDetails={`ফোন: ${deleteTarget?.phone} | রুম: ${deleteTarget?.roomNo || 'N/A'} | অবস্থা: ${deleteTarget?.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}`}
        isFinancial={false}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
