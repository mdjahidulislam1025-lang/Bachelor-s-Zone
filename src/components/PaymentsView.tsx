import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  CheckCircle2,
  Clock,
  Search,
  ArrowDownLeft,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Edit2,
  Trash2,
  Eye,
  Lock,
} from 'lucide-react';
import { PaymentRecord, Member, PaymentMethod } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import { ClosedMonthAlert } from './ClosedMonthAlert.js';

interface PaymentsViewProps {
  payments: PaymentRecord[];
  members: Member[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  onSavePayment: (payment: Partial<PaymentRecord>) => Promise<void>;
  onDeletePayment?: (paymentId: string) => Promise<void>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  members,
  currentMember,
  language,
  isMonthClosed = false,
  onSavePayment,
  onDeletePayment,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');

  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMemberId, setFilterMemberId] = useState<string>('all');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [date, setDate] = useState('2026-09-05');
  const [memberId, setMemberId] = useState(activeMembers[0]?.id || 'm1');
  const [amount, setAmount] = useState<number>(5000);
  const [method, setMethod] = useState<PaymentMethod>('bKash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState('Karimul Haque (Treasurer)');

  const isAdmin = currentMember.role === 'admin';
  const isTreasurer = currentMember.role === 'treasurer';
  const canManage = (isAdmin || isTreasurer) && !isMonthClosed;

  const totalCollected = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const filteredPayments = payments.filter(p => {
    const matchesMember = filterMemberId === 'all' || p.memberId === filterMemberId;
    const matchesSearch =
      p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMember && matchesSearch;
  });

  const openAddModal = () => {
    setEditingPayment(null);
    setDate(new Date().toISOString().split('T')[0]);
    setMemberId(activeMembers[0]?.id || 'm1');
    setAmount(2000);
    setMethod('bKash');
    setTransactionRef('');
    setNotes('');
    setReceivedBy(currentMember.name);
    setShowModal(true);
  };

  const openEditModal = (p: PaymentRecord) => {
    setEditingPayment(p);
    setDate(p.date);
    setMemberId(p.memberId);
    setAmount(p.amount);
    setMethod(p.paymentMethod);
    setTransactionRef(p.transactionRef || '');
    setNotes(p.notes || '');
    setReceivedBy(p.receivedBy || currentMember.name);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    const targetMember = members.find(m => m.id === memberId);
    await onSavePayment({
      id: editingPayment ? editingPayment.id : undefined,
      date,
      memberId,
      memberName: targetMember?.name || 'Member',
      amount: Number(amount),
      paymentMethod: method,
      transactionRef,
      notes,
      receivedBy,
      status: 'verified',
    });
    setShowModal(false);
    setEditingPayment(null);
    setTransactionRef('');
    setNotes('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeletePayment) return;
    try {
      setIsDeleting(true);
      await onDeletePayment(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getMethodIcon = (m: PaymentMethod) => {
    switch (m) {
      case 'bKash':
      case 'Nagad':
        return <Smartphone className="h-4 w-4 text-pink-600" />;
      case 'bank':
        return <Building className="h-4 w-4 text-blue-600" />;
      default:
        return <Banknote className="h-4 w-4 text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Closed Month Banner */}
      {isMonthClosed && <ClosedMonthAlert month="সেপ্টেম্বর" />}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold">
            <Wallet className="h-4 w-4" />
            <span>সদস্যদের মেস জমা ও রসিদ (Member Deposits & Collections)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
            সেপ্টেম্বর মোট সংগৃহীত জমা: ৳{totalCollected.toLocaleString()}
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            ক্যাশ, বিকাশ, নগদ ও ব্যাংক ট্রান্সফার মাধ্যমে গৃহীত সকল জমার স্বচ্ছ ডিজিটাল রেকর্ড
          </p>
        </div>

        {canManage ? (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 text-blue-700" />
            <span>নতুন জমা রেকর্ড করুন</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/90">
            <Eye className="h-4 w-4 text-blue-200" />
            <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterMemberId}
            onChange={e => setFilterMemberId(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
          >
            <option value="all">সকল সদস্যের জমা</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.nickname})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="সদস্যের নাম বা ট্রানজেকশন আইডি..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">সদস্যের নাম</th>
                <th className="py-3 px-4">পেমেন্ট মেথড</th>
                <th className="py-3 px-4">ট্রানজেকশন রেফারেন্স / নোট</th>
                <th className="py-3 px-4">গৃহীতকারী</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">জমার পরিমাণ</th>
                {canManage && <th className="py-3 px-4 text-center">অ্যাকশন (এডমিন)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-8 text-center text-slate-400 text-xs">
                    কোনো জমার রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{p.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">{p.memberName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium">
                        {getMethodIcon(p.paymentMethod)}
                        <span>{p.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-slate-700">
                        {p.transactionRef || 'নগদ ক্যাশ'}
                      </div>
                      {p.notes && <div className="text-[10px] text-slate-400">{p.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.receivedBy}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>যাচাইকৃত</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 text-sm whitespace-nowrap">
                      +৳{p.amount.toLocaleString()}
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            title="সম্পাদনা করুন"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title="মুছে ফেলুন"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record/Edit Payment */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingPayment ? 'মেস জমা তথ্য সম্পাদনা করুন' : 'মেস জমা গ্রহণ ও রেকর্ড করুন'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্যের নাম</label>
                <select
                  value={memberId}
                  onChange={e => setMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.nickname}) - রুম {m.roomNo || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="উদা: ৫০০০"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মেথড</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="cash">নগদ ক্যাশ (Cash)</option>
                  <option value="bank">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি / রেফারেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="উদা: BK987123 / Cash Voucher"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য (নোট)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="উদা: সেপ্টেম্বর অগ্রিম ডিপোজিট"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingPayment ? 'পরিবর্তন সংরক্ষণ করুন' : 'জমা সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Payment */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="মেস জমা রেকর্ড মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে এই সদস্যের জমা রেকর্ডটি মুছে ফেলতে চান?"
        itemName={deleteTarget ? `${deleteTarget.memberName}-এর ৳${deleteTarget.amount.toLocaleString()} (${deleteTarget.paymentMethod}) জমা` : ''}
        itemDetails={deleteTarget ? `তারিখ: ${deleteTarget.date} | ট্রানজেকশন: ${deleteTarget.transactionRef || 'ক্যাশ'} | গৃহীতকারী: ${deleteTarget.receivedBy}` : ''}
        isFinancial={true}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
