import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Calendar,
  Send,
  CheckCircle2,
  Trash2,
  ListPlus,
  AlertTriangle,
  Receipt,
  Search,
  Edit2,
  Eye,
  Lock,
} from 'lucide-react';
import { Member, BazarDuty, BazarRecord, MarketItem, BazarLineItem } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import { ClosedMonthAlert } from './ClosedMonthAlert.js';

interface BazarViewProps {
  members: Member[];
  bazarDuties: BazarDuty[];
  bazarRecords: BazarRecord[];
  marketList: MarketItem[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  onSaveBazarRecord: (record: Partial<BazarRecord>) => Promise<void>;
  onDeleteBazarRecord?: (id: string) => Promise<void>;
  onSaveBazarDuty: (duty: Partial<BazarDuty>) => Promise<void>;
  onDeleteBazarDuty?: (id: string) => Promise<void>;
  onSaveMarketItem: (item: Partial<MarketItem>) => Promise<void>;
  onDeleteMarketItem?: (id: string) => Promise<void>;
  onTriggerBazarSms: (duty: BazarDuty) => void;
}

export const BazarView: React.FC<BazarViewProps> = ({
  members,
  bazarDuties,
  bazarRecords,
  marketList,
  currentMember,
  language,
  isMonthClosed = false,
  onSaveBazarRecord,
  onDeleteBazarRecord,
  onSaveBazarDuty,
  onDeleteBazarDuty,
  onSaveMarketItem,
  onDeleteMarketItem,
  onTriggerBazarSms,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');

  const [activeSubTab, setActiveSubTab] = useState<'records' | 'schedule' | 'checklist'>('records');
  const [showBazarModal, setShowBazarModal] = useState(false);
  const [editingBazarRecord, setEditingBazarRecord] = useState<BazarRecord | null>(null);

  const [showDutyModal, setShowDutyModal] = useState(false);
  const [editingDuty, setEditingDuty] = useState<BazarDuty | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);

  // Deletion modal state
  const [deleteRecordTarget, setDeleteRecordTarget] = useState<BazarRecord | null>(null);
  const [deleteDutyTarget, setDeleteDutyTarget] = useState<BazarDuty | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<MarketItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New/Edit Bazar form state
  const [bazarDate, setBazarDate] = useState('2026-09-17');
  const [bazarPersonId, setBazarPersonId] = useState(activeMembers[0]?.id || 'm1');
  const [bazarNotes, setBazarNotes] = useState('');
  const [bazarItems, setBazarItems] = useState<BazarLineItem[]>([
    { id: '1', name: 'রুই মাছ', itemName: 'রুই মাছ', quantity: 2, unit: 'কেজি', price: 340, subtotal: 680 },
    { id: '2', name: 'আলু', itemName: 'আলু', quantity: 3, unit: 'কেজি', price: 55, subtotal: 165 },
    { id: '3', name: 'কাঁচা মরিচ ও ধনেপাতা', itemName: 'কাঁচা মরিচ ও ধনেপাতা', quantity: 1, unit: 'প্যাকেট', price: 40, subtotal: 40 },
  ]);

  // Bazar Duty form state
  const [dutyDate, setDutyDate] = useState('2026-09-18');
  const [dutyMemberId, setDutyMemberId] = useState(activeMembers[1]?.id || 'm2');
  const [dutyBudget, setDutyBudget] = useState(1500);

  // Market checklist form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'urgent' | 'medium' | 'low'>('medium');

  const isAdmin = currentMember.role === 'admin';
  const isTreasurer = currentMember.role === 'treasurer';
  const canManageBazar = (isAdmin || isTreasurer) && !isMonthClosed;
  const canManageSchedule = isAdmin && !isMonthClosed;
  const canManageMarketList = isAdmin && !isMonthClosed;

  const totalBazarSpent = bazarRecords.reduce((sum, b) => sum + b.totalAmount, 0);

  const openAddBazarModal = () => {
    setEditingBazarRecord(null);
    setBazarDate(new Date().toISOString().split('T')[0]);
    setBazarPersonId(currentMember.id);
    setBazarNotes('');
    setBazarItems([
      { id: Date.now().toString(), name: '', itemName: '', quantity: 1, unit: 'কেজি', price: 0, subtotal: 0 },
    ]);
    setShowBazarModal(true);
  };

  const openEditBazarModal = (record: BazarRecord) => {
    setEditingBazarRecord(record);
    setBazarDate(record.date);
    setBazarPersonId(record.bazarPersonId);
    setBazarNotes(record.notes || '');
    setBazarItems(
      record.items.map((item, idx) => ({
        id: item.id || `item-${idx}`,
        name: item.name || item.itemName || '',
        itemName: item.itemName || item.name || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'কেজি',
        price: item.price || 0,
        subtotal: item.subtotal || 0,
      }))
    );
    setShowBazarModal(true);
  };

  const openAddDutyModal = () => {
    setEditingDuty(null);
    setDutyDate(new Date().toISOString().split('T')[0]);
    setDutyMemberId(activeMembers[0]?.id || 'm1');
    setDutyBudget(1500);
    setShowDutyModal(true);
  };

  const openEditDutyModal = (duty: BazarDuty) => {
    setEditingDuty(duty);
    setDutyDate(duty.date);
    setDutyMemberId(duty.memberId);
    setDutyBudget(duty.expectedBudget || 1500);
    setShowDutyModal(true);
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setNewItemName('');
    setNewItemQty('');
    setNewItemPriority('medium');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: MarketItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemQty(item.quantity || item.estimatedQuantity || '');
    setNewItemPriority(item.priority || 'medium');
    setShowItemModal(true);
  };

  const handleAddLineItem = () => {
    setBazarItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        itemName: '',
        quantity: 1,
        unit: 'কেজি',
        price: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleUpdateLineItem = (id: string, field: keyof BazarLineItem, val: any) => {
    setBazarItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        if (field === 'itemName') {
          updated.name = val;
        }
        if (field === 'quantity' || field === 'price') {
          updated.subtotal = Number(updated.quantity || 0) * Number(updated.price || 0);
        }
        return updated;
      })
    );
  };

  const handleRemoveLineItem = (id: string) => {
    if (bazarItems.length <= 1) return;
    setBazarItems(prev => prev.filter(it => it.id !== id));
  };

  const calculateFormTotal = () => {
    return bazarItems.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
  };

  const handleBazarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = members.find(m => m.id === bazarPersonId);
    const validItems = bazarItems.filter(it => (it.itemName || it.name) && it.subtotal > 0);
    if (validItems.length === 0) {
      alert('কমপক্ষে একটি পণ্যের নাম ও সঠিক মূল্য দিন');
      return;
    }

    await onSaveBazarRecord({
      id: editingBazarRecord ? editingBazarRecord.id : undefined,
      date: bazarDate,
      bazarPersonId,
      bazarPersonName: person?.name || 'Member',
      notes: bazarNotes,
      items: validItems.map(it => ({
        ...it,
        name: it.itemName || it.name,
      })),
      totalAmount: calculateFormTotal(),
    });
    setShowBazarModal(false);
    setEditingBazarRecord(null);
  };

  const handleDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = members.find(m => m.id === dutyMemberId);
    await onSaveBazarDuty({
      id: editingDuty ? editingDuty.id : undefined,
      date: dutyDate,
      memberId: dutyMemberId,
      memberName: person?.name || 'Member',
      expectedBudget: dutyBudget,
      status: editingDuty ? editingDuty.status : 'pending',
    });
    setShowDutyModal(false);
    setEditingDuty(null);
  };

  const handleChecklistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;
    await onSaveMarketItem({
      id: editingItem ? editingItem.id : undefined,
      name: newItemName,
      quantity: newItemQty || 'প্রয়োজনমতো',
      estimatedQuantity: newItemQty,
      priority: newItemPriority,
      status: editingItem ? editingItem.status : 'needed',
      addedBy: editingItem ? editingItem.addedBy : currentMember.name,
    });
    setShowItemModal(false);
    setEditingItem(null);
    setNewItemName('');
    setNewItemQty('');
  };

  const handleConfirmDeleteBazarRecord = async () => {
    if (!deleteRecordTarget || !onDeleteBazarRecord) return;
    try {
      setIsDeleting(true);
      await onDeleteBazarRecord(deleteRecordTarget.id);
      setDeleteRecordTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteDuty = async () => {
    if (!deleteDutyTarget || !onDeleteBazarDuty) return;
    try {
      setIsDeleting(true);
      await onDeleteBazarDuty(deleteDutyTarget.id);
      setDeleteDutyTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget || !onDeleteMarketItem) return;
    try {
      setIsDeleting(true);
      await onDeleteMarketItem(deleteItemTarget.id);
      setDeleteItemTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Closed Alert */}
      {isMonthClosed && <ClosedMonthAlert month="সেপ্টেম্বর" />}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold">
            <ShoppingBag className="h-4 w-4" />
            <span>দৈনিক মেস বাজার ও শিডিউল (Bazar Management)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
            সেপ্টেম্বর মোট বাজার খরচ: ৳{totalBazarSpent.toLocaleString()}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            আইটেমভিত্তিক স্বচ্ছ হিসাব, বাজার শিডিউল এবং প্রয়োজনীয় পণ্যের রিয়েল-টাইম শেয়ার্ড লিস্ট
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageBazar ? (
            <button
              onClick={openAddBazarModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-emerald-700" />
              <span>নতুন বাজার এন্ট্রি</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white/90">
              <Eye className="h-4 w-4 text-emerald-200" />
              <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('records')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'records'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          বাজারের রসিদ ও খরচ ({bazarRecords.length})
        </button>
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'schedule'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          বাজার শিডিউল ({bazarDuties.length})
        </button>
        <button
          onClick={() => setActiveSubTab('checklist')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'checklist'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          প্রয়োজনীয় পণ্যের তালিকা ({marketList.filter(m => m.status === 'needed').length})
        </button>
      </div>

      {/* Sub-tab 1: Bazar Expense Records */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bazarRecords.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                কোনো বাজারের রেকর্ড পাওয়া যায়নি
              </div>
            ) : (
              bazarRecords.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">{b.date}</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        বাজারকারী: {b.bazarPersonName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        ৳{b.totalAmount.toLocaleString()}
                      </span>
                      {canManageBazar && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditBazarModal(b)}
                            title="সম্পাদনা করুন"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteRecordTarget(b)}
                            title="মুছে ফেলুন"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="bg-slate-50 rounded-xl p-2.5 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200/60">
                          <th className="pb-1">পণ্য</th>
                          <th className="pb-1 text-center">পরিমাণ</th>
                          <th className="pb-1 text-center">দর</th>
                          <th className="pb-1 text-right">মূল্য</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/40 text-slate-700">
                        {b.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium">{it.name || it.itemName}</td>
                            <td className="py-1 text-center text-slate-500">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="py-1 text-center text-slate-500">৳{it.price}</td>
                            <td className="py-1 text-right font-bold">৳{it.subtotal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {b.notes && (
                    <p className="text-[11px] text-slate-500 italic">মন্তব্য: {b.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Bazar Schedule / Duty */}
      {activeSubTab === 'schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">বাজারের দায়িত্ব তালিকা</h3>
              <p className="text-xs text-slate-400">কোন সদস্য কোন দিন বাজারে যাবেন</p>
            </div>
            {canManageSchedule && (
              <button
                onClick={openAddDutyModal}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>শিডিউল যোগ করুন</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">বাজারকারী</th>
                  <th className="py-3 px-4">প্রত্যাশিত বাজেট</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-center">রিমাইন্ডার</th>
                  {canManageSchedule && <th className="py-3 px-4 text-center">অ্যাকশন (এডমিন)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bazarDuties.length === 0 ? (
                  <tr>
                    <td colSpan={canManageSchedule ? 6 : 5} className="py-8 text-center text-slate-400 text-xs">
                      কোনো শিডিউল পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  bazarDuties.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{d.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{d.memberName}</td>
                      <td className="py-3 px-4">৳{d.expectedBudget || 1500}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            d.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.status === 'completed' ? 'বাজার সম্পন্ন' : 'অপেক্ষমাণ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onTriggerBazarSms(d)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>এসএমএস পাঠান</span>
                        </button>
                      </td>
                      {canManageSchedule && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditDutyModal(d)}
                              title="শিডিউল সম্পাদনা"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteDutyTarget(d)}
                              title="শিডিউল মুছুন"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      )}

      {/* Sub-tab 3: Shared Market Wishlist / Checklist */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">প্রয়োজনীয় পণ্যের তালিকা</h3>
              <p className="text-xs text-slate-500">মেসে কি কি লাগবে তা সদস্যরা এখানে দেখতে পারেন</p>
            </div>
            {canManageMarketList && (
              <button
                onClick={openAddItemModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer hover:bg-emerald-700"
              >
                <ListPlus className="h-4 w-4" />
                <span>পণ্য যুক্ত করুন</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {marketList.length === 0 ? (
              <div className="col-span-3 py-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                বাজার তালিকায় কোনো পণ্য নেই
              </div>
            ) : (
              marketList.map(item => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      {(item.estimatedQuantity || item.quantity) && (
                        <span className="text-xs text-slate-500 font-medium">
                          পরিমাণ: {item.estimatedQuantity || item.quantity}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : item.priority === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.priority === 'urgent' ? 'জরুরি' : item.priority === 'medium' ? 'মাঝারি' : 'সাধারণ'}
                      </span>
                      {canManageMarketList && (
                        <div className="flex items-center">
                          <button
                            onClick={() => openEditItemModal(item)}
                            title="সম্পাদনা"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setDeleteItemTarget(item)}
                            title="মুছে ফেলুন"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>যোগ করেছেন: {item.addedBy}</span>
                    <button
                      disabled={!canManageMarketList}
                      onClick={() =>
                        onSaveMarketItem({
                          ...item,
                          status: item.status === 'needed' ? 'purchased' : 'needed',
                        })
                      }
                      className={`px-2 py-0.5 rounded font-semibold ${
                        canManageMarketList ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        item.status === 'purchased'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
                      }`}
                    >
                      {item.status === 'purchased' ? '✓ কেনা হয়েছে' : 'কেনা বাকি'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: New/Edit Bazar Expense Record */}
      {showBazarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingBazarRecord ? 'বাজার রেকর্ড সম্পাদনা করুন' : 'নতুন বাজার এন্ট্রি (Add Bazar Record)'}
              </h3>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                মোট: ৳{calculateFormTotal().toLocaleString()}
              </span>
            </div>

            <form onSubmit={handleBazarSubmit} className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input
                    type="date"
                    value={bazarDate}
                    onChange={e => setBazarDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">বাজারকারী সদস্য</label>
                  <select
                    value={bazarPersonId}
                    onChange={e => setBazarPersonId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                    required
                  >
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.nickname})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">বাজারের পণ্য তালিকা</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>আইটেম যোগ করুন</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {bazarItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200"
                    >
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={item.itemName || item.name}
                          onChange={e => handleUpdateLineItem(item.id, 'itemName', e.target.value)}
                          placeholder="পণ্যের নাম (উদা: আলু)"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={e => handleUpdateLineItem(item.id, 'quantity', parseFloat(e.target.value))}
                          placeholder="পরিমাণ"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none text-center"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => handleUpdateLineItem(item.id, 'unit', e.target.value)}
                          placeholder="একক"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => handleUpdateLineItem(item.id, 'price', parseFloat(e.target.value))}
                          placeholder="দর (৳)"
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg outline-none text-right"
                          required
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  অতিরিক্ত নোট / বিবরণ
                </label>
                <input
                  type="text"
                  value={bazarNotes}
                  onChange={e => setBazarNotes(e.target.value)}
                  placeholder="উদা: কারওয়ান বাজার থেকে ক্রয় করা হয়েছে"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowBazarModal(false);
                    setEditingBazarRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingBazarRecord ? 'পরিবর্তন সংরক্ষণ করুন' : `বাজার সংরক্ষণ করুন (৳${calculateFormTotal()})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Duty */}
      {showDutyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingDuty ? 'বাজারের দায়িত্ব শিডিউল সম্পাদনা' : 'বাজারের দায়িত্ব বরাদ্দ করুন'}
            </h3>
            <form onSubmit={handleDutySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={dutyDate}
                  onChange={e => setDutyDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">সদস্য</label>
                <select
                  value={dutyMemberId}
                  onChange={e => setDutyMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.nickname})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রত্যাশিত বাজেট (৳)</label>
                <input
                  type="number"
                  value={dutyBudget}
                  onChange={e => setDutyBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDutyModal(false);
                    setEditingDuty(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {editingDuty ? 'পরিবর্তন সংরক্ষণ করুন' : 'শিডিউল সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Wishlist Item */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              {editingItem ? 'বাজারের পণ্য সম্পাদনা করুন' : 'প্রয়োজনীয় পণ্য যুক্ত করুন'}
            </h3>
            <form onSubmit={handleChecklistSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পণ্যের নাম</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="উদা: মশুরের ডাল, সয়াবিন তেল, লবণ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আনুমানিক পরিমাণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value)}
                  placeholder="উদা: ২ কেজি বা ৫ লিটার"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জরুরিতা (Priority)</label>
                <select
                  value={newItemPriority}
                  onChange={e => setNewItemPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="urgent">জরুরি (Urgent - আজকেই লাগবে)</option>
                  <option value="medium">মাঝারি (Medium)</option>
                  <option value="low">সাধারণ (Low)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  {editingItem ? 'পরিবর্তন সংরক্ষণ করুন' : 'যুক্ত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bazar Record Deletion (Financial) */}
      <ConfirmDeleteModal
        isOpen={!!deleteRecordTarget}
        title="বাজার রেকর্ড মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে এই বাজার রেকর্ডটি মুছে ফেলতে চান?"
        itemName={deleteRecordTarget ? `${deleteRecordTarget.date} তারিখের বাজার: ৳${deleteRecordTarget.totalAmount.toLocaleString()} (${deleteRecordTarget.bazarPersonName})` : ''}
        itemDetails={deleteRecordTarget ? `আইটেম সংখ্যা: ${deleteRecordTarget.items?.length || 0} টি | নোট: ${deleteRecordTarget.notes || 'N/A'}` : ''}
        isFinancial={true}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteBazarRecord}
        onClose={() => setDeleteRecordTarget(null)}
      />

      {/* Confirmation Modal for Bazar Duty Deletion */}
      <ConfirmDeleteModal
        isOpen={!!deleteDutyTarget}
        title="বাজারের দায়িত্ব শিডিউল মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে এই বাজার দায়িত্ব শিডিউলটি মুছে ফেলতে চান?"
        itemName={deleteDutyTarget ? `${deleteDutyTarget.date} তারিখে ${deleteDutyTarget.memberName}-এর দায়িত্ব` : ''}
        itemDetails={deleteDutyTarget ? `বাজেট: ৳${deleteDutyTarget.expectedBudget || 1500} | অবস্থা: ${deleteDutyTarget.status}` : ''}
        isFinancial={false}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteDuty}
        onClose={() => setDeleteDutyTarget(null)}
      />

      {/* Confirmation Modal for Market Item Deletion */}
      <ConfirmDeleteModal
        isOpen={!!deleteItemTarget}
        title="বাজারের পণ্য মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত যে বাজার তালিকা থেকে '${deleteItemTarget?.name}' মুছে ফেলতে চান?`}
        itemName={deleteItemTarget?.name}
        isFinancial={false}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteItem}
        onClose={() => setDeleteItemTarget(null)}
      />
    </div>
  );
};
