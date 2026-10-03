import React, { useState, useRef } from 'react';
import {
  Smartphone,
  Building2,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Copy,
  Check,
  Calendar,
  User,
  Hash,
  FileText,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  CreditCard,
  Building,
  Eye,
  Maximize2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Member, PaymentRecord, PaymentMethod, MessPaymentInfo } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface PaymentMethodSectionProps {
  members: Member[];
  currentMember: Member;
  language: Language;
  paymentInfo?: MessPaymentInfo;
  isMonthClosed?: boolean;
  onPaymentSubmitted: (payment: Partial<PaymentRecord>) => Promise<void>;
  onViewHistory?: () => void;
}

export type SelectedOption = 'bKash' | 'cash' | 'bank';

const BANGLADESH_BANKS = [
  'Dutch-Bangla Bank Limited (DBBL)',
  'BRAC Bank PLC',
  'Islami Bank Bangladesh Limited',
  'The City Bank Limited',
  'Eastern Bank Limited (EBL)',
  'Sonali Bank PLC',
  'United Commercial Bank (UCB)',
  'Mutual Trust Bank (MTB)',
  'Standard Chartered Bangladesh',
  'Dhaka Bank Limited',
  'Pubali Bank Limited',
  'Prime Bank Limited',
  'Bank Asia Limited',
  'Southeast Bank Limited',
  'অন্যান্য (Other Bank)',
];

export const PaymentMethodSection: React.FC<PaymentMethodSectionProps> = ({
  members,
  currentMember,
  language,
  paymentInfo,
  isMonthClosed = false,
  onPaymentSubmitted,
  onViewHistory,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');
  const isAdminOrTreasurer = currentMember.role === 'admin' || currentMember.role === 'treasurer';

  // Configured receiving details from Admin (Jahidul Islam)
  const receiving: MessPaymentInfo = paymentInfo || {
    bkash: {
      enabled: true,
      number: '01516528497',
      accountName: 'Jahidul Islam',
      type: 'Personal',
      instructions: 'Send Money করে TrxID ও প্রেরক বিকাশ নম্বর দিয়ে নিচে সাবমিট করুন।',
    },
    bank: {
      enabled: true,
      bankName: 'Dutch-Bangla Bank Limited (DBBL)',
      branchName: 'Dhanmondi Branch, Dhaka',
      accountName: 'Jahidul Islam',
      accountNumber: '123.151.0028497',
      routingNumber: '090261234',
      accountType: 'Savings',
      instructions: 'ব্যাংক ডিপোজিট বা ফান্ড ট্রান্সফার করে স্লিপ বা রেফারেন্স নম্বর দিন।',
    },
    cash: {
      enabled: true,
      receiverName: 'Jahidul Islam',
      receiverPhone: '01516528497',
      instructions: 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিয়ে রিসিট সংগ্রহ করুন।',
    },
  };

  // 1. Three Payment Options: 'bKash' | 'cash' | 'bank'
  const [selectedMethod, setSelectedMethod] = useState<SelectedOption>('bKash');

  // Member context (Admin can pick member, regular member is locked to self)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(currentMember.id);

  // Common payment fields
  const [amount, setAmount] = useState<string>('3000');
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [notes, setNotes] = useState<string>('');

  // Screenshot Upload State
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [screenshotFileSize, setScreenshotFileSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal to preview enlarged screenshot
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // bKash Specific Fields
  const [senderBkashNumber, setSenderBkashNumber] = useState<string>(currentMember.phone || '');
  const [senderBkashType, setSenderBkashType] = useState<'Personal' | 'Agent' | 'Merchant'>('Personal');
  const [bkashHolderName, setBkashHolderName] = useState<string>(currentMember.name || '');
  const [bkashTrxId, setBkashTrxId] = useState<string>('');

  // Cash Specific Fields
  const [cashHandedTo, setCashHandedTo] = useState<string>(receiving.cash?.receiverName || 'Jahidul Islam (Admin)');
  const [cashReceiptNote, setCashReceiptNote] = useState<string>('');

  // Bank Specific Fields
  const [senderBankName, setSenderBankName] = useState<string>('Dutch-Bangla Bank Limited (DBBL)');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [senderAccountName, setSenderAccountName] = useState<string>(currentMember.name || '');
  const [senderAccountNumber, setSenderAccountNumber] = useState<string>('');
  const [bankTrxRef, setBankTrxRef] = useState<string>('');

  // Form State & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedReceipt, setSubmittedReceipt] = useState<Partial<PaymentRecord> | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick Amount Selector
  const quickAmounts = [1000, 2000, 3000, 4000, 5000, 8000];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        screenshot: 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে।',
      }));
      return;
    }

    setScreenshotFileName(file.name);
    setScreenshotFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
      setErrors(prev => {
        const next = { ...prev };
        delete next.screenshot;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setScreenshotPreview(null);
    setScreenshotFileName('');
    setScreenshotFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'সঠিক জমার পরিমাণ উল্লেখ করুন (০ টাকার বেশি হতে হবে)';
    }

    if (!date) {
      newErrors.date = 'পেমেন্টের তারিখ নির্বাচন করা আবশ্যক';
    }

    if (selectedMethod === 'bKash') {
      const cleanedPhone = senderBkashNumber.replace(/\D/g, '');
      if (!cleanedPhone) {
        newErrors.senderBkashNumber = 'প্রেরক বিকাশ মোবাইল নম্বর আবশ্যক';
      } else if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith('01')) {
        newErrors.senderBkashNumber = 'সঠিক ১১ ডিজিটের বিকাশ মোবাইল নম্বর দিন (উদা: 017XXXXXXXX)';
      }

      if (!bkashTrxId.trim()) {
        newErrors.bkashTrxId = 'Transaction ID (TrxID) আবশ্যক';
      } else if (bkashTrxId.trim().length < 6) {
        newErrors.bkashTrxId = 'সঠিক Transaction ID লিখুন (কমপক্ষে ৬ অক্ষর)';
      }
    } else if (selectedMethod === 'cash') {
      if (!cashHandedTo.trim()) {
        newErrors.cashHandedTo = 'টাকা গ্রহণকারী ব্যক্তির নাম লিখুন';
      }
    } else if (selectedMethod === 'bank') {
      const effectiveBank = senderBankName === 'অন্যান্য (Other Bank)' ? customBankName : senderBankName;
      if (!effectiveBank.trim()) {
        newErrors.senderBankName = 'ব্যাংকের নাম উল্লেখ করুন';
      }

      if (!bankTrxRef.trim()) {
        newErrors.bankTrxRef = 'ট্রানজেকশন আইডি / রেফারেন্স / ডিপোজিট স্লিপ নম্বর আবশ্যক';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMonthClosed) {
      setErrors({ form: 'বর্তমান মাসের হিসাব বন্ধ থাকায় নতুন জমা গ্রহণ সম্ভব নয়।' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const targetMember = members.find(m => m.id === selectedMemberId) || currentMember;

      let paymentRecord: Partial<PaymentRecord>;

      if (selectedMethod === 'bKash') {
        paymentRecord = {
          memberId: targetMember.id,
          memberName: targetMember.name,
          date,
          amount: Number(amount),
          paymentMethod: 'bKash',
          transactionRef: bkashTrxId.trim().toUpperCase(),
          bkashNumber: senderBkashNumber.trim(),
          bkashAccountType: senderBkashType,
          accountHolderName: bkashHolderName.trim() || targetMember.name,
          screenshotUrl: screenshotPreview || undefined,
          notes: notes.trim() || undefined,
          status: isAdminOrTreasurer ? 'verified' : 'pending',
          receivedBy: receiving.bkash?.accountName || 'Jahidul Islam (Admin)',
        };
      } else if (selectedMethod === 'cash') {
        paymentRecord = {
          memberId: targetMember.id,
          memberName: targetMember.name,
          date,
          amount: Number(amount),
          paymentMethod: 'cash',
          transactionRef: `CASH-${Date.now().toString().slice(-6)}`,
          cashReceivedBy: cashHandedTo.trim(),
          cashNotes: cashReceiptNote.trim() || undefined,
          screenshotUrl: screenshotPreview || undefined,
          notes: notes.trim() || undefined,
          status: isAdminOrTreasurer ? 'verified' : 'pending',
          receivedBy: cashHandedTo.trim() || 'Jahidul Islam (Admin)',
        };
      } else {
        const effectiveBank = senderBankName === 'অন্যান্য (Other Bank)' ? customBankName : senderBankName;
        paymentRecord = {
          memberId: targetMember.id,
          memberName: targetMember.name,
          date,
          amount: Number(amount),
          paymentMethod: 'bank',
          transactionRef: bankTrxRef.trim().toUpperCase(),
          senderBankName: effectiveBank.trim(),
          senderAccountName: senderAccountName.trim() || targetMember.name,
          senderAccountNumber: senderAccountNumber.trim() || undefined,
          bankName: receiving.bank?.bankName || 'Dutch-Bangla Bank Limited (DBBL)',
          branchName: receiving.bank?.branchName || 'Dhanmondi Branch, Dhaka',
          accountName: receiving.bank?.accountName || 'Jahidul Islam',
          accountNumber: receiving.bank?.accountNumber || '123.151.0028497',
          routingNumber: receiving.bank?.routingNumber,
          accountType: receiving.bank?.accountType,
          screenshotUrl: screenshotPreview || undefined,
          notes: notes.trim() || undefined,
          status: isAdminOrTreasurer ? 'verified' : 'pending',
          receivedBy: receiving.bank?.accountName || 'Jahidul Islam (Admin)',
        };
      }

      await onPaymentSubmitted(paymentRecord);

      setSubmittedReceipt(paymentRecord);

      // Reset form
      setBkashTrxId('');
      setBankTrxRef('');
      setCashReceiptNote('');
      setNotes('');
      handleRemoveImage();
    } catch (err: any) {
      setErrors({ form: err.message || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ADMIN RECEIVING INFORMATION DISPLAY CARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>এডমিন পেমেন্ট রিসিভিং চ্যানেল (Admin Receiving Information)</span>
            </div>
            <h3 className="text-base sm:text-lg font-black mt-1">
              মেস ফান্ডে টাকা পাঠানোর অনুমোদিত তথ্য
            </h3>
            <p className="text-xs text-slate-300">
              পার্মানেন্ট এডমিন <strong>জাহেদুল ইসলাম (Jahidul Islam)</strong> এর অ্যাকাউন্টে টাকা পাঠিয়ে নিচে এন্ট্রি সাবমিট করুন
            </p>
          </div>
          <span className="text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-3 py-1 rounded-xl self-start sm:self-auto">
            সুরক্ষিত মেস অ্যাকাউন্ট
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* bKash Admin Receiving Info */}
          <div
            onClick={() => setSelectedMethod('bKash')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedMethod === 'bKash'
                ? 'bg-pink-950/40 border-pink-500 shadow-sm'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-pink-400">
                <Smartphone className="h-4 w-4" />
                <span>bKash</span>
              </div>
              <span className="text-[10px] bg-pink-900/60 text-pink-300 px-2 py-0.5 rounded-full font-bold">
                {receiving.bkash?.type || 'Personal'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
                <span className="font-mono font-black text-pink-200 text-xs">
                  📱 {receiving.bkash?.number || '01516528497'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(receiving.bkash?.number || '01516528497', 'banner-bkash');
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  title="কপি করুন"
                >
                  {copiedField === 'banner-bkash' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-slate-300 pt-1">
                Account Name: <strong>{receiving.bkash?.accountName || 'Jahidul Islam'}</strong>
              </div>
            </div>
          </div>

          {/* Bank Transfer Admin Receiving Info */}
          <div
            onClick={() => setSelectedMethod('bank')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedMethod === 'bank'
                ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-400">
                <Building2 className="h-4 w-4" />
                <span>Bank Transfer</span>
              </div>
              {receiving.bank?.accountType && (
                <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                  {receiving.bank.accountType}
                </span>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-[11px] text-slate-200 font-semibold truncate">
                🏦 {receiving.bank?.bankName || 'Dutch-Bangla Bank Limited'}
              </div>
              <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-700">
                <span className="font-mono font-bold text-blue-200 text-xs truncate">
                  {receiving.bank?.accountNumber || '123.151.0028497'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(receiving.bank?.accountNumber || '123.151.0028497', 'banner-bank');
                  }}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                  title="কপি করুন"
                >
                  {copiedField === 'banner-bank' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[11px] text-slate-300">
                Name: <strong>{receiving.bank?.accountName || 'Jahidul Islam'}</strong>
              </div>
            </div>
          </div>

          {/* Cash Admin Receiving Info */}
          <div
            onClick={() => setSelectedMethod('cash')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
              selectedMethod === 'cash'
                ? 'bg-amber-950/40 border-amber-500 shadow-sm'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                <Banknote className="h-4 w-4" />
                <span>Cash Payment</span>
              </div>
              <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                {receiving.cash?.enabled !== false ? 'উপলব্ধ' : 'বন্ধ'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p className="text-[11px] leading-relaxed">
                💵 {receiving.cash?.instructions || 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিন।'}
              </p>
              <div className="text-[11px] font-semibold text-amber-200 flex items-center justify-between">
                <span>গ্রহীতা: {receiving.cash?.receiverName || 'Jahidul Islam'}</span>
                <span className="font-mono text-slate-400 text-[10px]">
                  {receiving.cash?.receiverPhone || '01516528497'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. RECORD A PAYMENT FORM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
        {/* Method Selection (Requirement 1: bKash, Cash, Bank Transfer) */}
        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-2 uppercase tracking-wide">
            ১. পেমেন্ট মেথড নির্বাচন করুন (Payment Method) <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* bKash Option */}
            <label
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'bKash'
                  ? 'border-pink-500 bg-pink-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethodRadio"
                checked={selectedMethod === 'bKash'}
                onChange={() => setSelectedMethod('bKash')}
                className="w-4 h-4 text-pink-600 focus:ring-pink-500 cursor-pointer"
              />
              <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                bK
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-black text-slate-900">bKash (বিকাশ)</span>
                <span className="text-[11px] text-slate-500 block truncate">মোবাইল ব্যাংকিং</span>
              </div>
            </label>

            {/* Cash Option */}
            <label
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'cash'
                  ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethodRadio"
                checked={selectedMethod === 'cash'}
                onChange={() => setSelectedMethod('cash')}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-black text-slate-900">Cash (নগদ টাকা)</span>
                <span className="text-[11px] text-slate-500 block truncate">হাতে হাতে জমা</span>
              </div>
            </label>

            {/* Bank Transfer Option */}
            <label
              className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedMethod === 'bank'
                  ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethodRadio"
                checked={selectedMethod === 'bank'}
                onChange={() => setSelectedMethod('bank')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-black text-slate-900">Bank Transfer (ব্যাংক)</span>
                <span className="text-[11px] text-slate-500 block truncate">ডিপোজিট / ট্রান্সফার</span>
              </div>
            </label>
          </div>
        </div>

        {errors.form && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Member Selection (If admin) & Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Member selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মেস সদস্য (Member) <span className="text-rose-500">*</span>
              </label>
              {isAdminOrTreasurer ? (
                <select
                  value={selectedMemberId}
                  onChange={e => {
                    setSelectedMemberId(e.target.value);
                    const mem = members.find(m => m.id === e.target.value);
                    if (mem) {
                      setSenderBkashNumber(mem.phone || '');
                      setBkashHolderName(mem.name);
                      setSenderAccountName(mem.name);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-emerald-500"
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.roomNo ? `রুম ${m.roomNo}` : m.phone})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl text-slate-800 flex items-center justify-between">
                  <span>{currentMember.name}</span>
                  <span className="text-[10px] text-slate-500">রুম: {currentMember.roomNo || 'N/A'}</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                জমার পরিমাণ (Amount ৳) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold text-xs">৳</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="3000"
                  required
                  className={`w-full pl-7 pr-3 py-2 text-xs font-mono font-bold border rounded-xl outline-none focus:ring-1 ${
                    errors.amount
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-[10px] text-rose-600 mt-1">{errors.amount}</p>}

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      amount === val.toString()
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ৳{val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পেমেন্টের তারিখ (Payment Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className={`w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-1 ${
                  errors.date
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500'
                }`}
              />
              {errors.date && <p className="text-[10px] text-rose-600 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* METHOD-SPECIFIC FIELDS */}

          {/* bKash Specific Fields */}
          {selectedMethod === 'bKash' && (
            <div className="bg-pink-50/40 rounded-2xl p-4 sm:p-5 border border-pink-100 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-pink-200/60">
                <span className="text-xs font-extrabold text-pink-900 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-pink-600" />
                  <span>বিকাশ ট্রানজেকশন তথ্য (bKash Payment Details)</span>
                </span>
                <span className="text-[10px] text-pink-700 font-semibold">
                  প্রাপক বিকাশ: {receiving.bkash?.number || '01516528497'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রেরকের বিকাশ নম্বর (Sender bKash No) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={senderBkashNumber}
                    onChange={e => setSenderBkashNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    required
                    className={`w-full px-3 py-2 text-xs font-mono border rounded-xl outline-none focus:ring-1 ${
                      errors.senderBkashNumber
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-slate-300 focus:border-pink-500 focus:ring-pink-500'
                    }`}
                  />
                  {errors.senderBkashNumber && (
                    <p className="text-[10px] text-rose-600 mt-1">{errors.senderBkashNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction ID (TrxID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bkashTrxId}
                    onChange={e => setBkashTrxId(e.target.value.toUpperCase())}
                    placeholder="উদা: BL93K09X"
                    required
                    className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase border rounded-xl outline-none focus:ring-1 ${
                      errors.bkashTrxId
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-slate-300 focus:border-pink-500 focus:ring-pink-500'
                    }`}
                  />
                  {errors.bkashTrxId && <p className="text-[10px] text-rose-600 mt-1">{errors.bkashTrxId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রেরকের অ্যাকাউন্ট ধরন (Account Type)
                  </label>
                  <select
                    value={senderBkashType}
                    onChange={e => setSenderBkashType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-pink-500"
                  >
                    <option value="Personal">Personal (ব্যক্তিগত)</option>
                    <option value="Agent">Agent (এজেন্ট পয়েন্ট)</option>
                    <option value="Merchant">Merchant (মার্চেন্ট)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Cash Specific Fields */}
          {selectedMethod === 'cash' && (
            <div className="bg-amber-50/40 rounded-2xl p-4 sm:p-5 border border-amber-100 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span>নগদ জমা তথ্য (Cash Handover Details)</span>
                </span>
                <span className="text-[10px] text-amber-800 font-semibold">
                  এডমিন জাহাঙ্গীর/জাহিদুল ইসলাম এর কাছে সরাসরি নগদ দিন
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    টাকা গ্রহণকারীর নাম (Received By) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cashHandedTo}
                    onChange={e => setCashHandedTo(e.target.value)}
                    placeholder="Jahidul Islam (Admin)"
                    required
                    className={`w-full px-3 py-2 text-xs border rounded-xl outline-none focus:ring-1 ${
                      errors.cashHandedTo
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                    }`}
                  />
                  {errors.cashHandedTo && <p className="text-[10px] text-rose-600 mt-1">{errors.cashHandedTo}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ক্যাশ জমা রেফারেন্স বা রিসিট নোট (Optional Note)
                  </label>
                  <input
                    type="text"
                    value={cashReceiptNote}
                    onChange={e => setCashReceiptNote(e.target.value)}
                    placeholder="উদা: রুমে সরাসরি ৫০০ টাকার নোটে প্রদান করা হয়েছে"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Specific Fields */}
          {selectedMethod === 'bank' && (
            <div className="bg-blue-50/40 rounded-2xl p-4 sm:p-5 border border-blue-100 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>ব্যাংক ট্রান্সফার তথ্য (Bank Transfer Details)</span>
                </span>
                <span className="text-[10px] text-blue-700 font-semibold truncate max-w-xs">
                  মেস ব্যাংক: {receiving.bank?.bankName || 'DBBL'} ({receiving.bank?.accountNumber || '123.151.0028497'})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রেরক ব্যাংকের নাম (Sender Bank) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={senderBankName}
                    onChange={e => setSenderBankName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                  >
                    {BANGLADESH_BANKS.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {senderBankName === 'অন্যান্য (Other Bank)' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      নির্দিষ্ট ব্যাংকের নাম লিখুন <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customBankName}
                      onChange={e => setCustomBankName(e.target.value)}
                      placeholder="অন্যান্য ব্যাংক"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্রেরকের নাম ও অ্যাকাউন্ট নম্বর (Sender Details)
                  </label>
                  <input
                    type="text"
                    value={senderAccountName}
                    onChange={e => setSenderAccountName(e.target.value)}
                    placeholder="হিসাবধারীর নাম / অ্যাকাউন্ট নম্বর"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ট্রানজেকশন আইডি / রেফারেন্স / স্লিপ নং <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankTrxRef}
                    onChange={e => setBankTrxRef(e.target.value.toUpperCase())}
                    placeholder="উদা: FT20261003445"
                    required
                    className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase border rounded-xl outline-none focus:ring-1 ${
                      errors.bankTrxRef
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  {errors.bankTrxRef && <p className="text-[10px] text-rose-600 mt-1">{errors.bankTrxRef}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Screenshot / Slip Upload & Additional Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Screenshot attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পেমেন্ট স্লিপ বা স্ক্রিনশট (Screenshot / Receipt Image)
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-3.5 text-center transition-all bg-slate-50/50">
                {screenshotPreview ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={screenshotPreview}
                        alt="Receipt preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 cursor-pointer"
                        onClick={() => setEnlargedImage(screenshotPreview)}
                      />
                      <div className="text-left min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {screenshotFileName || 'receipt.jpg'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{screenshotFileSize}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEnlargedImage(screenshotPreview)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                        title="বড় করে দেখুন"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-100 cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="payment-receipt-upload"
                    />
                    <label
                      htmlFor="payment-receipt-upload"
                      className="flex flex-col items-center justify-center cursor-pointer py-1"
                    >
                      <Upload className="h-6 w-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-emerald-700">ছবি সিলেক্ট করুন</span>
                      <span className="text-[10px] text-slate-400">সর্বোচ্চ ৫ মেগাবাইট (JPG, PNG)</span>
                    </label>
                  </div>
                )}
              </div>
              {errors.screenshot && <p className="text-[10px] text-rose-600 mt-1">{errors.screenshot}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মন্তব্য বা বিবরণ (Notes - Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="প্রয়োজনীয় যে কোন অতিরিক্ত নোট বা বিবরণ লিখুন..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {isAdminOrTreasurer
                  ? 'এডমিন অনুমোদনক্রমে স্বয়ংক্রিয়ভাবে জমা হিসেবে গণ্য হবে।'
                  : 'সাবমিট করার পর এডমিন ভেরিফাই করলে আপনার জমা ব্যালেন্সে যোগ হবে।'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onViewHistory && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer text-center"
                >
                  জমার তালিকা দেখুন
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isMonthClosed}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? 'সাবমিট হচ্ছে...'
                    : `৳${Number(amount || 0).toLocaleString()} টাকা পেমেন্ট নিশ্চিত করুন`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. SUBMISSION SUCCESS MODAL */}
      {submittedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">পেমেন্ট সফলভাবে জমা দেওয়া হয়েছে!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAdminOrTreasurer
                  ? 'জমা এন্ট্রি সরাসরি ভেরিফাইড হিসেবে সংরক্ষিত হয়েছে এবং মাসিক হিসাবে যুক্ত হয়েছে।'
                  : 'আপনার পেমেন্ট রেকর্ড গৃহীত হয়েছে। এডমিন যাচাই করে দ্রুত অনুমোদন প্রদান করবেন।'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 font-medium">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900">{submittedReceipt.memberName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">জমার পরিমাণ:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ৳{submittedReceipt.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">পেমেন্ট মেথড:</span>
                <span className="font-bold text-slate-900">
                  {submittedReceipt.paymentMethod === 'bKash'
                    ? '📱 বিকাশ (bKash)'
                    : submittedReceipt.paymentMethod === 'cash'
                    ? '💵 নগদ (Cash)'
                    : '🏦 ব্যাংক ট্রান্সফার (Bank)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">ট্রানজেকশন রেফারেন্স:</span>
                <span className="font-mono font-bold text-slate-800">
                  {submittedReceipt.transactionRef || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">স্ট্যাটাস:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    submittedReceipt.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {submittedReceipt.status === 'verified' ? 'ভেরিফাইড (Approved)' : 'পেন্ডিং ভেরিফিকেশন'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubmittedReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                আরেকটি পেমেন্ট দিন
              </button>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedReceipt(null);
                    onViewHistory();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  হিস্ট্রি দেখুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Screenshot Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors z-10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={enlargedImage}
              alt="Enlarged screenshot"
              className="max-h-[85vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
