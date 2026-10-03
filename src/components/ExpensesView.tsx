import React, { useState, useMemo } from 'react';
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
  ShoppingBag,
  Layers,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  History,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { ExpenseRecord, ExpenseCategory, Member, BazarRecord } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import { ClosedMonthAlert } from './ClosedMonthAlert.js';
import {
  getCurrentDhakaPeriod,
  getPreviousMonthPeriod,
  getMonthNameBengali,
  getTodayDhakaDate,
  toBengaliNumber,
} from '../utils/monthlyPeriodUtils.js';

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  bazarRecords?: BazarRecord[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  onSaveExpense: (expense: Partial<ExpenseRecord>) => Promise<void>;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  bazarRecords = [],
  currentMember,
  language,
  isMonthClosed = false,
  onSaveExpense,
  onDeleteExpense,
}) => {
  const t = translations[language];

  // 1. Current Dhaka month as default (Asia/Dhaka)
  const currentDhakaPeriod = useMemo(() => getCurrentDhakaPeriod().periodId, []);
  const previousDhakaPeriod = useMemo(() => getPreviousMonthPeriod(currentDhakaPeriod), [currentDhakaPeriod]);

  // Selected filter mode: 'current' | 'previous' | 'custom' | 'all'
  const [filterMode, setFilterMode] = useState<'current' | 'previous' | 'custom' | 'all'>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentDhakaPeriod);

  // Available historical months from records
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentDhakaPeriod);
    monthsSet.add(previousDhakaPeriod);
    expenses.forEach(e => {
      const m = e.periodId || e.date?.slice(0, 7);
      if (m && m.length === 7) monthsSet.add(m);
    });
    bazarRecords.forEach(b => {
      const m = b.date?.slice(0, 7);
      if (m && m.length === 7) monthsSet.add(m);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [expenses, bazarRecords, currentDhakaPeriod, previousDhakaPeriod]);

  // Role permissions
  const isAdmin = currentMember.role === 'admin' || currentMember.role === 'PRIMARY_ADMIN' || (currentMember.role as string) === 'ADMIN';
  const isTreasurer = currentMember.role === 'treasurer';
  const canManage = (isAdmin || isTreasurer) && !isMonthClosed;

  // Search & category filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add/Edit Form states
  const [formDate, setFormDate] = useState(() => getTodayDhakaDate());
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('rent');
  const [formAmount, setFormAmount] = useState<string>('2000');
  const [formDescription, setFormDescription] = useState('');
  const [formPaidBy, setFormPaidBy] = useState(currentMember.name);
  const [formNotes, setFormNotes] = useState('');

  // Update selected month when filterMode changes
  const handleFilterModeChange = (mode: 'current' | 'previous' | 'custom' | 'all') => {
    // Regular members cannot access 'all' (All-Time History is Admin only)
    if (mode === 'all' && !isAdmin) {
      return;
    }
    setFilterMode(mode);
    if (mode === 'current') {
      setSelectedMonth(currentDhakaPeriod);
    } else if (mode === 'previous') {
      setSelectedMonth(previousDhakaPeriod);
    }
  };

  // Filter expenses strictly by selected month (unless Admin explicitly chose 'all')
  const periodExpenses = useMemo(() => {
    if (filterMode === 'all' && isAdmin) {
      return expenses;
    }
    return expenses.filter(e => {
      const p = e.periodId || e.date?.slice(0, 7);
      return p === selectedMonth;
    });
  }, [expenses, filterMode, selectedMonth, isAdmin]);

  // Filter bazar records strictly by selected month
  const periodBazarRecords = useMemo(() => {
    if (filterMode === 'all' && isAdmin) {
      return bazarRecords;
    }
    return bazarRecords.filter(b => b.date?.startsWith(selectedMonth));
  }, [bazarRecords, filterMode, selectedMonth, isAdmin]);

  // Totals calculations strictly for the selected month
  const totalGeneralExpenses = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [periodExpenses]);

  const totalBazarExpenses = useMemo(() => {
    return periodBazarRecords.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  }, [periodBazarRecords]);

  const totalSharedExpenses = useMemo(() => {
    return periodExpenses
      .filter(e => e.expenseClassification !== 'individual' && e.expenseClassification !== 'excluded')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [periodExpenses]);

  const totalCombinedMessExpenses = totalGeneralExpenses + totalBazarExpenses;

  // Filtered expenses list based on search and category
  const filteredList = useMemo(() => {
    return periodExpenses.filter(e => {
      const matchesCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchesSearch =
        !searchTerm.trim() ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.paidByName && e.paidByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [periodExpenses, selectedCategory, searchTerm]);

  // Category breakdowns for selected month
  const categories: { id: ExpenseCategory; label: string; icon: string }[] = [
    { id: 'rent', label: 'বাসা ভাড়া (Rent)', icon: '🏠' },
    { id: 'electricity', label: 'বিদ্যুৎ বিল (Electricity)', icon: '⚡' },
    { id: 'gas', label: 'গ্যাস বিল (Gas)', icon: '🔥' },
    { id: 'maid_salary', label: 'বুয়ার বেতন (Maid Salary)', icon: '🧹' },
    { id: 'internet', label: 'ইন্টারনেট বিল (WiFi)', icon: '📶' },
    { id: 'cleaning', label: 'ময়লা বিল ও ক্লিনিং', icon: '🗑️' },
    { id: 'other', label: 'অন্যান্য খরচ (Other)', icon: '📦' },
  ];

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => {
      map[c.id] = 0;
    });
    periodExpenses.forEach(e => {
      if (map[e.category] !== undefined) {
        map[e.category] += Number(e.amount) || 0;
      } else {
        map['other'] = (map['other'] || 0) + (Number(e.amount) || 0);
      }
    });
    return map;
  }, [periodExpenses, categories]);

  const openAddModal = () => {
    setEditingExpense(null);
    setFormDate(getTodayDhakaDate());
    setFormCategory('rent');
    setFormAmount('2000');
    setFormDescription('');
    setFormPaidBy(currentMember.name);
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setFormDate(exp.date);
    setFormCategory(exp.category);
    setFormAmount(exp.amount.toString());
    setFormDescription(exp.description);
    setFormPaidBy(exp.paidBy || exp.paidByName || currentMember.name);
    setFormNotes(exp.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(formAmount);
    if (!formAmount || isNaN(numAmount) || numAmount <= 0) {
      alert('সঠিক খরচের পরিমাণ দিন');
      return;
    }

    const assignedPeriod = formDate.slice(0, 7);

    await onSaveExpense({
      id: editingExpense ? editingExpense.id : undefined,
      date: formDate,
      category: formCategory,
      amount: numAmount,
      description: formDescription.trim(),
      paidBy: formPaidBy.trim(),
      paidByName: formPaidBy.trim(),
      notes: formNotes.trim() || undefined,
      periodId: assignedPeriod,
      distributionRule: 'equal_all_members',
    });

    setShowModal(false);
    setEditingExpense(null);
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
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">বাসা ভাড়া</span>;
      case 'electricity':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">বিদ্যুৎ বিল</span>;
      case 'gas':
        return <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">গ্যাস বিল</span>;
      case 'maid_salary':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">বুয়ার বেতন</span>;
      case 'internet':
        return <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">ইন্টারনেট</span>;
      case 'cleaning':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">ক্লিনিং/ময়লা</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">অন্যান্য</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Closed Banner if locked */}
      {isMonthClosed && <ClosedMonthAlert month={getMonthNameBengali(selectedMonth)} />}

      {/* TOP HEADER: Clear Month Label & Action */}
      <div className="bg-gradient-to-r from-rose-800 via-rose-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <Receipt className="h-4 w-4 text-rose-400" />
            <span>মেসের ফিক্সড ও সাধারণ খরচ (Monthly Expenses)</span>
            <span className="bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[10px] px-2 py-0.5 rounded-full font-mono">
              Asia/Dhaka
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-1.5 flex items-center gap-2 flex-wrap">
            <span>
              {filterMode === 'all'
                ? 'সর্বকালের সর্বমোট খরচ (All-Time Expenses)'
                : `${getMonthNameBengali(selectedMonth)} — মোট খরচ:`}
            </span>
            <span className="text-emerald-400 font-mono">
              ৳{totalGeneralExpenses.toLocaleString()}
            </span>
          </h2>

          <p className="text-xs text-rose-200/90 mt-1 max-w-2xl leading-relaxed">
            {filterMode === 'all'
              ? 'এডমিন ভিউ: মেসের শুরু থেকে এ পর্যন্ত সকল ফিক্সড খরচের সমন্বিত হিসাব।'
              : `বর্তমানে ${getMonthNameBengali(selectedMonth)} মাসের খরচ প্রদর্শিত হচ্ছে। পূর্ববর্তী মাসের খরচ বর্তমান মাসে যুক্ত হবে না।`}
          </p>
        </div>

        {canManage ? (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-rose-900 hover:bg-rose-50 text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 text-rose-700" />
            <span>নতুন খরচ যুক্ত করুন</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/90 shrink-0">
            <Eye className="h-4 w-4 text-rose-300" />
            <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
          </div>
        )}
      </div>

      {/* MONTH FILTERS BAR (Requirement 5) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => handleFilterModeChange('current')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
              filterMode === 'current'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>চলতি মাস ({getMonthNameBengali(currentDhakaPeriod)})</span>
          </button>

          <button
            onClick={() => handleFilterModeChange('previous')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
              filterMode === 'previous'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>পূর্ববর্তী মাস ({getMonthNameBengali(previousDhakaPeriod)})</span>
          </button>

          {/* Custom Month Dropdown */}
          <div className="relative shrink-0">
            <select
              value={filterMode === 'custom' ? selectedMonth : ''}
              onChange={e => {
                if (e.target.value) {
                  setFilterMode('custom');
                  setSelectedMonth(e.target.value);
                }
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl border outline-none cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-rose-50 border-rose-400 text-rose-900 font-extrabold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <option value="" disabled>
                📅 নির্দিষ্ট মাস নির্বাচন করুন...
              </option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {getMonthNameBengali(m)} ({m})
                </option>
              ))}
            </select>
          </div>

          {/* All-Time History (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => handleFilterModeChange('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
              title="সকল মাসের খরচ একত্রে দেখুন (Admin only)"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>সর্বকালের ইতিহাস (All-Time)</span>
            </button>
          )}
        </div>

        {/* Selected Month Badge */}
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 self-start md:self-auto">
          <span>নির্বাচিত:</span>
          <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filterMode === 'all' ? 'সকল মাস' : `${getMonthNameBengali(selectedMonth)} (${selectedMonth})`}
          </span>
        </div>
      </div>

      {/* SUMMARY METRICS CARDS (Strictly for the selected month) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total General Expenses */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>মোট সাধারণ খরচ (General)</span>
            <Receipt className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            ৳{totalGeneralExpenses.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {getMonthNameBengali(selectedMonth)} মাসের ফিক্সড বিল
          </span>
        </div>

        {/* Card 2: Bazar Expenses for this month */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>বাজার খরচ (Bazar Expense)</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">
            ৳{totalBazarExpenses.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {periodBazarRecords.length} টি বাজার এন্ট্রি
          </span>
        </div>

        {/* Card 3: Shared / Fixed Expenses */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>শেয়ার ও ফিক্সড বণ্টন</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            ৳{totalSharedExpenses.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            সকল সদস্যের মাঝে সমবণ্টনযোগ্য
          </span>
        </div>

        {/* Card 4: Total Records Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>মোট খরচ রেকর্ড সংখ্যা</span>
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700">
            {periodExpenses.length} টি
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            সর্বমোট মেস খরচ: ৳{totalCombinedMessExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CATEGORY SUMMARY BAR (Visual breakdown for selected month) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-rose-600" />
            <span>ক্যাটাগরি ভিত্তিক খরচের বিবরণ ({getMonthNameBengali(selectedMonth)})</span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            মোট ৭টি প্রধান খাত
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {categories.map(c => {
            const amt = categoryTotals[c.id] || 0;
            const percentage = totalGeneralExpenses > 0 ? ((amt / totalGeneralExpenses) * 100).toFixed(0) : '0';
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCategory(selectedCategory === c.id ? 'all' : c.id)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                  selectedCategory === c.id
                    ? 'border-rose-500 bg-rose-50/50 shadow-2xs ring-1 ring-rose-400'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <span className="text-base block mb-0.5">{c.icon}</span>
                <span className="text-[11px] font-bold text-slate-700 block truncate">
                  {c.label.split(' ')[0]}
                </span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  ৳{amt.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            সকল ক্যাটাগরি ({periodExpenses.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.icon} {c.label.split(' ')[0]} ({periodExpenses.filter(e => e.category === c.id).length})
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

      {/* EXPENSES TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">তারিখ</th>
                <th className="py-3.5 px-4">ক্যাটাগরি</th>
                <th className="py-3.5 px-4">খরচের বিবরণ ও রেফারেন্স</th>
                <th className="py-3.5 px-4">হিসাব মাস</th>
                <th className="py-3.5 px-4">পরিশোধ করেছেন</th>
                <th className="py-3.5 px-4 text-right">পরিমাণ (টাকা)</th>
                {canManage && <th className="py-3.5 px-4 text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-12 text-center text-slate-400 text-xs">
                    <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      {filterMode === 'all'
                        ? 'কোন খরচের রেকর্ড পাওয়া যায়নি'
                        : `${getMonthNameBengali(selectedMonth)} মাসের কোনো খরচের রেকর্ড পাওয়া যায়নি`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {canManage ? 'উপরে "নতুন খরচ যুক্ত করুন" বাটনে ক্লিক করে খরচ এন্ট্রি দিন।' : ''}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(exp.category)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{exp.description}</div>
                      {exp.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {exp.periodId || exp.date?.slice(0, 7)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {exp.paidBy || exp.paidByName || 'মেস ফান্ড'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-700 text-sm whitespace-nowrap font-mono">
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

      {/* ADD / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-rose-600" />
                <span>{editingExpense ? 'খরচ সম্পাদনা করুন' : 'নতুন খরচ যোগ করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ (Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    হিসাব মাস: {formDate.slice(0, 7)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ক্যাটাগরি <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  টাকার পরিমাণ (Amount ৳) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">৳</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    placeholder="2000"
                    className="w-full pl-7 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  খরচের বিবরণ (Description) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  required
                  placeholder="উদা: অক্টোবর মাসের বাসা ভাড়া পরিশোধ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পরিশোধ করেছেন (Paid By)
                  </label>
                  <input
                    type="text"
                    value={formPaidBy}
                    onChange={e => setFormPaidBy(e.target.value)}
                    placeholder="Jahidul Islam"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মন্তব্য (Notes)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="ঐচ্ছিক রিসিট নম্বর বা নোট"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {editingExpense ? 'আপডেট করুন' : 'খরচ সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          title="খরচের রেকর্ড মুছে ফেলবেন?"
          message={`আপনি কি নিশ্চিত যে "${deleteTarget.description}" (৳${deleteTarget.amount.toLocaleString()}) খরচের রেকর্ডটি মুছে ফেলতে চান?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
