import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Filter,
  Search,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Edit2,
  Trash2,
  Lock,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import { ClosedMonthAlert } from './ClosedMonthAlert.js';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  onSaveExpense: (expense: Partial<ExpenseRecord>) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  currentMember,
  language,
  isMonthClosed = false,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const t = translations[language];
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [date, setDate] = useState('2026-09-05');
  const [category, setCategory] = useState<ExpenseCategory>('rent');
  const [amount, setAmount] = useState<number>(25000);
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('Karimul Haque');

  const isAdmin = currentMember.role === 'admin';
  const isTreasurer = currentMember.role === 'treasurer';
  // Admin or configured treasurer can edit/delete
  const canManage = (isAdmin || isTreasurer) && !isMonthClosed;

  const categories: { id: ExpenseCategory; label: string; icon: string }[] = [
    { id: 'rent', label: 'বাসা ভাড়া (Rent)', icon: '🏠' },
    { id: 'electricity', label: 'বিদ্যুৎ বিল (Electricity)', icon: '⚡' },
    { id: 'gas', label: 'গ্যাস বিল (Gas)', icon: '🔥' },
    { id: 'maid_salary', label: 'বুয়ার বেতন (Maid Salary)', icon: '🧹' },
    { id: 'internet', label: 'ইন্টারনেট বিল (WiFi)', icon: '📶' },
    { id: 'cleaning', label: 'ময়লা বিল ও ক্লিনিং', icon: '🗑️' },
    { id: 'other', label: 'অন্যান্য খরচ (Other)', icon: '📦' },
  ];

  const filteredExpenses = expenses.filter(e => {
    const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.paidByName && e.paidByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.paidBy && e.paidBy.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const openAddModal = () => {
    setEditingExpense(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('rent');
    setAmount(1000);
    setDescription('');
    setPaidBy(currentMember.name);
    setShowModal(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDescription(exp.description);
    setPaidBy(exp.paidBy || exp.paidByName || currentMember.name);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    await onSaveExpense({
      id: editingExpense ? editingExpense.id : undefined,
      date,
      category,
      amount: Number(amount),
      description,
      paidBy,
      paidByName: paidBy,
      distributionRule: 'equal_all_members',
    });
    setShowModal(false);
    setEditingExpense(null);
    setDescription('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteExpense) return;
    try {
      setIsDeleting(true);
      await onDeleteExpense(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'rent':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">বাসা ভাড়া</span>;
      case 'electricity':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">বিদ্যুৎ বিল</span>;
      case 'gas':
        return <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-xs font-bold">গ্যাস বিল</span>;
      case 'maid_salary':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-xs font-bold">বুয়ার বেতন</span>;
      case 'internet':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold">ইন্টারনেট</span>;
      case 'cleaning':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">ক্লিনিং/ময়লা</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold">অন্যান্য</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Closed Banner if locked */}
      {isMonthClosed && <ClosedMonthAlert month="সেপ্টেম্বর" />}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-700 to-rose-800 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-semibold">
            <Receipt className="h-4 w-4" />
            <span>মেসের ফিক্সড ও অন্যান্য খরচ (General Shared Expenses)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
            সেপ্টেম্বর মোট ফিক্সড খরচ: ৳{totalExpense.toLocaleString()}
          </h2>
          <p className="text-xs text-rose-100 mt-1">
            বাসা ভাড়া, ইউটিলিটি, বুয়ার বেতন ও ইন্টারনেট বিল সকল সক্রিয় সদস্যদের মাঝে সমবণ্টন
          </p>
        </div>

        {canManage ? (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-rose-900 hover:bg-rose-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 text-rose-700" />
            <span>নতুন খরচ যোগ করুন</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/90">
            <Eye className="h-4 w-4 text-rose-200" />
            <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সকল ক্যাটাগরি
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.icon} {c.label.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="বিবরণ বা পরিশোধকারীর নাম..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">ক্যাটাগরি</th>
                <th className="py-3 px-4">খরচের বিবরণ</th>
                <th className="py-3 px-4">পরিশোধ করেছেন</th>
                <th className="py-3 px-4 text-right">পরিমাণ (টাকা)</th>
                {canManage && <th className="py-3 px-4 text-center">অ্যাকশন (এডমিন)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-8 text-center text-slate-400 text-xs">
                    কোনো খরচের রেকর্ড পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{exp.date}</td>
                    <td className="py-3.5 px-4">{getCategoryBadge(exp.category)}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{exp.description}</td>
                    <td className="py-3.5 px-4 text-slate-600">{exp.paidBy || exp.paidByName}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                      ৳{exp.amount.toLocaleString()}
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            title="সম্পাদনা করুন"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
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

      {/* Modal: Add/Edit Expense */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingExpense ? 'মেস খরচ সম্পাদনা করুন' : 'নতুন মেস খরচ যোগ করুন'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="পরিমাণ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">খরচের বিবরণ / রসিদ নম্বর</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="উদা: সেপ্টেম্বর মাসের বিদ্যুৎ বিল"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কার পকেট থেকে দেওয়া হয়েছে</label>
                <input
                  type="text"
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  placeholder="উদা: মেস ফান্ড / করিমুল হক"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingExpense ? 'পরিবর্তন সংরক্ষণ করুন' : 'খরচ সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Financial Record */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="মেস খরচ মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান?"
        itemName={deleteTarget ? `${deleteTarget.category} বাবদ ৳${deleteTarget.amount.toLocaleString()}` : ''}
        itemDetails={deleteTarget ? `তারিখ: ${deleteTarget.date} | বিবরণ: ${deleteTarget.description} | পরিশোধক: ${deleteTarget.paidBy || deleteTarget.paidByName}` : ''}
        isFinancial={true}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
