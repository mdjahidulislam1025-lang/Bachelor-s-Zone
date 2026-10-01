import React, { useState, useRef } from 'react';
import {
  Smartphone,
  Building2,
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
} from 'lucide-react';
import { Member, PaymentRecord, PaymentMethod } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface PaymentMethodSectionProps {
  members: Member[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  onPaymentSubmitted: (payment: Partial<PaymentRecord>) => Promise<void>;
  onViewHistory?: () => void;
}

type SelectedOption = 'bKash' | 'bank';

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
  isMonthClosed = false,
  onPaymentSubmitted,
  onViewHistory,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');
  const isAdminOrTreasurer = currentMember.role === 'admin' || currentMember.role === 'treasurer';

  // 1. Two Payment Options: 'bKash' or 'bank'
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

  // Screenshot Upload State
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [screenshotFileSize, setScreenshotFileSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal to preview enlarged screenshot
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // bKash Specific Fields
  const [bkashNumber, setBkashNumber] = useState<string>('');
  const [bkashAccountType, setBkashAccountType] = useState<'Personal' | 'Agent'>('Personal');
  const [bkashHolderName, setBkashHolderName] = useState<string>(currentMember.name || '');
  const [bkashTrxId, setBkashTrxId] = useState<string>('');

  // Bank Account Specific Fields
  const [bankName, setBankName] = useState<string>('Dutch-Bangla Bank Limited (DBBL)');
  const [customBankName, setCustomBankName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('Dhanmondi Branch, Dhaka');
  const [accountName, setAccountName] = useState<string>('Bachelor Zone Mess Fund');
  const [accountNumber, setAccountNumber] = useState<string>('123.151.0028497');
  const [routingNumber, setRoutingNumber] = useState<string>('090261234');

  // Form State & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedReceipt, setSubmittedReceipt] = useState<Partial<PaymentRecord> | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Quick Amount Selector
  const quickAmounts = [1000, 2000, 3000, 4000, 5000, 8000];

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Image Upload Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
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

  // Required Field Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate Amount
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'সঠিক জমার পরিমাণ উল্লেখ করুন (০ টাকার বেশি হতে হবে)';
    }

    // Validate Date
    if (!date) {
      newErrors.date = 'পেমেন্টের তারিখ নির্বাচন করা আবশ্যক';
    }

    if (selectedMethod === 'bKash') {
      // 1. bKash Account Number
      const cleanedPhone = bkashNumber.replace(/\D/g, '');
      if (!cleanedPhone) {
        newErrors.bkashNumber = 'bKash Account Number আবশ্যক';
      } else if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith('01')) {
        newErrors.bkashNumber = 'সঠিক ১১ ডিজিটের বিকাশ মোবাইল নম্বর দিন (উদা: 01711234567)';
      }

      // 2. Account Type (Personal/Agent)
      if (!bkashAccountType) {
        newErrors.bkashAccountType = 'Account Type নির্বাচন করুন';
      }

      // 3. Account Holder Name
      if (!bkashHolderName.trim()) {
        newErrors.bkashHolderName = 'Account Holder Name আবশ্যক';
      }

      // 4. Transaction ID
      if (!bkashTrxId.trim()) {
        newErrors.bkashTrxId = 'Transaction ID (TrxID) আবশ্যক';
      } else if (bkashTrxId.trim().length < 6) {
        newErrors.bkashTrxId = 'সঠিক Transaction ID লিখুন (কমপক্ষে ৬ অক্ষর)';
      }

      // 7. Upload Payment Screenshot
      if (!screenshotPreview) {
        newErrors.screenshot = 'বিকাশ পেমেন্ট ভেরিফিকেশনের জন্য স্ক্রিনশট আপলোড করুন';
      }
    } else {
      // Bank Account validation
      // 1. Bank Name
      const actualBank = bankName === 'অন্যান্য (Other Bank)' ? customBankName : bankName;
      if (!actualBank.trim()) {
        newErrors.bankName = 'Bank Name (ব্যাংকের নাম) আবশ্যক';
      }

      // 2. Branch Name
      if (!branchName.trim()) {
        newErrors.branchName = 'Branch Name (শাখার নাম) আবশ্যক';
      }

      // 3. Account Name
      if (!accountName.trim()) {
        newErrors.accountName = 'Account Name (অ্যাকাউন্টের নাম) আবশ্যক';
      }

      // 4. Account Number
      if (!accountNumber.trim()) {
        newErrors.accountNumber = 'Account Number (হিসাব নম্বর) আবশ্যক';
      }

      // 5. Routing Number
      if (!routingNumber.trim()) {
        newErrors.routingNumber = 'Routing Number (রাউটিং নম্বর) আবশ্যক';
      } else if (routingNumber.replace(/\D/g, '').length < 8) {
        newErrors.routingNumber = 'সঠিক ৮-৯ ডিজিটের রাউটিং নম্বর দিন';
      }

      // 8. Upload Payment Slip/Screenshot
      if (!screenshotPreview) {
        newErrors.screenshot = 'ব্যাংক ডিপোজিট স্লিপ বা অনলাইন ট্রান্সফারের স্ক্রিনশট আপলোড করুন';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const targetMember = members.find(m => m.id === selectedMemberId) || currentMember;
    const numAmount = Number(amount);

    setIsSubmitting(true);

    try {
      const paymentPayload: Partial<PaymentRecord> = {
        memberId: targetMember.id,
        memberName: targetMember.name,
        date,
        amount: numAmount,
        paymentMethod: selectedMethod === 'bKash' ? 'bKash' : 'bank',
        transactionRef:
          selectedMethod === 'bKash'
            ? bkashTrxId.toUpperCase().trim()
            : `${accountNumber.trim()} (${branchName.trim()})`,
        receivedBy: isAdminOrTreasurer ? currentMember.name : 'Bachelor Zone Mess Fund',
        status: 'verified',
        screenshotUrl: screenshotPreview || undefined,
        notes:
          selectedMethod === 'bKash'
            ? `bKash ${bkashAccountType} (${bkashNumber}) - TrxID: ${bkashTrxId.toUpperCase().trim()}`
            : `Bank: ${bankName === 'অন্যান্য (Other Bank)' ? customBankName : bankName}, A/C: ${accountNumber}, Routing: ${routingNumber}`,
        bkashNumber: selectedMethod === 'bKash' ? bkashNumber.trim() : undefined,
        bkashAccountType: selectedMethod === 'bKash' ? bkashAccountType : undefined,
        accountHolderName: selectedMethod === 'bKash' ? bkashHolderName.trim() : undefined,
        bankName:
          selectedMethod === 'bank'
            ? bankName === 'অন্যান্য (Other Bank)'
              ? customBankName
              : bankName
            : undefined,
        branchName: selectedMethod === 'bank' ? branchName.trim() : undefined,
        accountName: selectedMethod === 'bank' ? accountName.trim() : undefined,
        accountNumber: selectedMethod === 'bank' ? accountNumber.trim() : undefined,
        routingNumber: selectedMethod === 'bank' ? routingNumber.trim() : undefined,
      };

      await onPaymentSubmitted(paymentPayload);
      setSubmittedReceipt(paymentPayload);
    } catch (err: any) {
      alert(err.message || 'পেমেন্ট জমা দিতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedReceipt(null);
    setAmount('3000');
    setBkashTrxId('');
    setScreenshotPreview(null);
    setScreenshotFileName('');
    setScreenshotFileSize('');
    setErrors({});
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* SECTION HEADER & OVERVIEW */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>নিরাপদ মেস ডিপোজিট পোর্টাল (Verified Mess Payment Portal)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              পেমেন্ট মেথড নির্বাচন ও জমা (Payment Method)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              মেস মিল, বাজার ও ইউটিলিটি ব্যালেন্স জমা দিতে bKash অথবা Bank Account মাধ্যম নির্বাচন করুন।
            </p>
          </div>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
            >
              <FileText className="h-4 w-4 text-slate-500" />
              <span>পূর্ববর্তী জমার তালিকা</span>
            </button>
          )}
        </div>

        {/* OFFICIAL MESS RECEIVING ACCOUNT INFO (Copy-to-clipboard cards) */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <CreditCard className="h-3.5 w-3.5" />
              <span>মেসের অফিশিয়াল পেমেন্ট তথ্য (Official Send Money Accounts)</span>
            </span>
            <span className="text-[10px] text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
              টাকা পাঠিয়ে নিচে তথ্য দিন
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* bKash Official Account */}
            <div className="p-3 rounded-lg bg-white/10 border border-white/10 hover:border-pink-500/50 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-pink-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-pink-300 font-bold uppercase flex items-center gap-1">
                    <span>bKash (Personal)</span>
                    <span className="text-[9px] bg-pink-500/30 text-pink-200 px-1.5 rounded">সেন্ড মানি</span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-white tracking-wide">
                    01516528497
                  </div>
                  <div className="text-[10px] text-slate-300">প্রাপক: মোঃ জাহিদুল ইসলাম (ম্যানেজার)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('01516528497', 'bKash')}
                className="px-2.5 py-1.5 rounded-md bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 border border-pink-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {copiedField === 'bKash' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>

            {/* Bank Official Account */}
            <div className="p-3 rounded-lg bg-white/10 border border-white/10 hover:border-blue-500/50 transition-all flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] text-blue-300 font-bold uppercase flex items-center gap-1">
                    <span>DBBL (Dutch-Bangla Bank)</span>
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 rounded">BEFTN / NPSB</span>
                  </div>
                  <div className="font-mono text-sm font-extrabold text-white tracking-wide">
                    123-151-0028497
                  </div>
                  <div className="text-[10px] text-slate-300">শাখা: ধানমন্ডি | রাউটিং: 090261234</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('1231510028497', 'Bank')}
                className="px-2.5 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {copiedField === 'Bank' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>কপি হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION RECEIPT */}
      {submittedReceipt && (
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 shadow-md animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-black text-slate-900">
                  পেমেন্ট সফলভাবে জমা সম্পন্ন হয়েছে! (Payment Submitted Successfully)
                </h3>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  যাচাইকৃত (Verified)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                আপনার প্রদত্ত জমা রেকর্ড মেসের মূল হিসাব এবং মাসিক স্টেটমেন্টে সাথে সাথে যুক্ত করা হয়েছে।
              </p>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">সদস্যের নাম:</span>
              <span className="font-bold text-slate-900 text-sm">{submittedReceipt.memberName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">পেমেন্ট মেথড:</span>
              <span className="font-bold text-slate-900 text-sm">
                {submittedReceipt.paymentMethod === 'bKash' ? 'bKash (বিকাশ)' : 'Bank Account (ব্যাংক)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">জমার পরিমাণ:</span>
              <span className="font-extrabold text-emerald-600 text-base">
                ৳{submittedReceipt.amount?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">ট্রানজেকশন / রেফারেন্স:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">
                {submittedReceipt.transactionRef || 'N/A'}
              </span>
            </div>
          </div>

          {submittedReceipt.screenshotUrl && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={submittedReceipt.screenshotUrl}
                  alt="Proof Thumbnail"
                  className="h-10 w-10 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <span className="text-xs font-bold text-slate-700">সংযুক্ত পেমেন্ট স্লিপ/স্ক্রিনশট</span>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedImage(submittedReceipt.screenshotUrl || null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-blue-700 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>বড় করে দেখুন</span>
              </button>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              আরেকটি পেমেন্ট জমা দিন
            </button>
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                সকল জমার তালিকা দেখুন
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN FORM */}
      {!submittedReceipt && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: SELECTABLE PAYMENT METHOD CARDS */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                পেমেন্ট মেথড নির্বাচন করুন (Select Payment Option) *
              </label>
              <span className="text-[11px] text-slate-400 font-medium">যেকোনো একটি নির্বাচন করুন</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: bKash Card */}
              <div
                onClick={() => {
                  setSelectedMethod('bKash');
                  setErrors(prev => {
                    const next = { ...prev };
                    delete next.screenshot;
                    return next;
                  });
                }}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  selectedMethod === 'bKash'
                    ? 'border-pink-500 bg-gradient-to-br from-pink-50/90 via-rose-50/40 to-white shadow-md ring-2 ring-pink-500/20'
                    : 'border-slate-200 bg-white hover:border-pink-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform ${
                        selectedMethod === 'bKash'
                          ? 'bg-pink-600 text-white shadow-sm scale-105'
                          : 'bg-pink-100 text-pink-700'
                      }`}
                    >
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">1. bKash (বিকাশ)</span>
                        <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-bold">
                          ইনস্ট্যান্ট
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        মোবাইল ব্যাংকিং, TrxID ও পেমেন্ট স্ক্রিনশট
                      </p>
                    </div>
                  </div>

                  {/* Radio Selector Indicator */}
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedMethod === 'bKash'
                        ? 'border-pink-600 bg-pink-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selectedMethod === 'bKash' && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-pink-100/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>অফিশিয়াল নম্বর: 01516528497</span>
                  <span className="font-bold text-pink-700">TrxID যাচাইকরণ</span>
                </div>
              </div>

              {/* Option 2: Bank Account Card */}
              <div
                onClick={() => {
                  setSelectedMethod('bank');
                  setErrors(prev => {
                    const next = { ...prev };
                    delete next.screenshot;
                    return next;
                  });
                }}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  selectedMethod === 'bank'
                    ? 'border-blue-600 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white shadow-md ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform ${
                        selectedMethod === 'bank'
                          ? 'bg-blue-600 text-white shadow-sm scale-105'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          2. Bank Account (ব্যাংক)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          BEFTN / NPSB
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ব্যাংক ট্রান্সফার, অনলাইন ব্যাংকিং বা ক্যাশ ডিপোজিট
                      </p>
                    </div>
                  </div>

                  {/* Radio Selector Indicator */}
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedMethod === 'bank'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selectedMethod === 'bank' && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>ডাচ-বাংলা ব্যাংক লিমিটেড</span>
                  <span className="font-bold text-blue-700">স্লিপ / রসিদ কপি</span>
                </div>
              </div>
            </div>
          </div>

          {/* MEMBER SELECTION (If Admin/Treasurer managing for another member) */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <User className="h-4 w-4 text-slate-500 shrink-0" />
              <span>টাকা জমার সদস্য (Deposit Credited To):</span>
            </div>
            {isAdminOrTreasurer ? (
              <select
                value={selectedMemberId}
                onChange={e => {
                  setSelectedMemberId(e.target.value);
                  const m = members.find(mem => mem.id === e.target.value);
                  if (m) setBkashHolderName(m.name);
                }}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.nickname}) — রুম {m.roomNo || 'N/A'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
                <span>{currentMember.name}</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (রুম {currentMember.roomNo || 'N/A'})
                </span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* OPTION 1: bKash FIELDS FORM */}
          {/* ========================================================================= */}
          {selectedMethod === 'bKash' && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-pink-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      bKash পেমেন্ট বিবরণ (bKash Payment Form)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      বিকাশ সংক্রান্ত নিম্নের সকল প্রয়োজনীয় তথ্য পূরণ করুন
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
                  সকল ফিল্ড আবশ্যক (*)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. bKash Account Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    bKash Account Number (বিকাশ একাউন্ট নম্বর) *
                  </label>
                  <input
                    type="tel"
                    maxLength={11}
                    value={bkashNumber}
                    onChange={e => {
                      setBkashNumber(e.target.value);
                      if (errors.bkashNumber) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.bkashNumber;
                          return n;
                        });
                      }
                    }}
                    placeholder="01XXXXXXXXX"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.bkashNumber
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-pink-500'
                    }`}
                    required
                  />
                  {errors.bkashNumber ? (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.bkashNumber}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">যে বিকাশ নম্বর থেকে টাকা পাঠিয়েছেন</p>
                  )}
                </div>

                {/* 2. Account Type (Personal/Agent) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Account Type (অ্যাকাউন্ট টাইপ) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBkashAccountType('Personal')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        bkashAccountType === 'Personal'
                          ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {bkashAccountType === 'Personal' && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>Personal (ব্যক্তিগত)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBkashAccountType('Agent')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        bkashAccountType === 'Agent'
                          ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {bkashAccountType === 'Agent' && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>Agent (এজেন্ট / দোকান)</span>
                    </button>
                  </div>
                  {errors.bkashAccountType && (
                    <p className="text-[10px] text-rose-600 font-bold">{errors.bkashAccountType}</p>
                  )}
                </div>

                {/* 3. Account Holder Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Account Holder Name (অ্যাকাউন্ট হোল্ডার নাম) *
                  </label>
                  <input
                    type="text"
                    value={bkashHolderName}
                    onChange={e => {
                      setBkashHolderName(e.target.value);
                      if (errors.bkashHolderName) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.bkashHolderName;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: Jahidul Islam"
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.bkashHolderName
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-pink-500'
                    }`}
                    required
                  />
                  {errors.bkashHolderName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.bkashHolderName}</span>
                    </p>
                  )}
                </div>

                {/* 4. Transaction ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Transaction ID (TrxID) *
                  </label>
                  <input
                    type="text"
                    value={bkashTrxId}
                    onChange={e => {
                      setBkashTrxId(e.target.value.toUpperCase());
                      if (errors.bkashTrxId) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.bkashTrxId;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: 9K7A2BC1D"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono font-black tracking-wider bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.bkashTrxId
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-pink-500'
                    }`}
                    required
                  />
                  {errors.bkashTrxId ? (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.bkashTrxId}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">বিকাশ সেন্ড মানি মেসেজ থেকে প্রাপ্ত TrxID</p>
                  )}
                </div>

                {/* 5. Payment Amount */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Amount (জমার পরিমাণ - ৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={e => {
                        setAmount(e.target.value);
                        if (errors.amount) {
                          setErrors(prev => {
                            const n = { ...prev };
                            delete n.amount;
                            return n;
                          });
                        }
                      }}
                      placeholder="উদা: ৩০০০"
                      className={`w-full pl-8 pr-3.5 py-2.5 text-xs font-black bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                        errors.amount
                          ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                          : 'border-slate-300 focus:ring-pink-500'
                      }`}
                      required
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.amount}</span>
                    </p>
                  )}
                </div>

                {/* 6. Payment Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Date (পেমেন্টের তারিখ) *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      if (errors.date) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.date;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.date
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-pink-500'
                    }`}
                    required
                  />
                  {errors.date && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.date}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="p-3 bg-pink-50/40 rounded-xl border border-pink-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-bold">দ্রুত অ্যামাউন্ট নির্বাচন:</span>
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(String(val));
                      if (errors.amount) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.amount;
                          return n;
                        });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      amount === String(val)
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white hover:bg-pink-100 text-slate-700 border-pink-200'
                    }`}
                  >
                    ৳{val.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* 7. Upload Payment Screenshot */}
              <div className="space-y-2 pt-2 border-t border-pink-100">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Upload Payment Screenshot (পেমেন্টের স্ক্রিনশট) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG বা WEBP (সর্বোচ্চ 5MB)</span>
                </label>

                {screenshotPreview ? (
                  <div className="p-3.5 rounded-xl bg-pink-50/70 border border-pink-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(screenshotPreview)}>
                        <img
                          src={screenshotPreview}
                          alt="bKash Screenshot Preview"
                          className="h-16 w-16 rounded-lg object-cover border border-pink-200 shrink-0 shadow-2xs"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {screenshotFileName || 'bkash_screenshot.jpg'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {screenshotFileSize || 'Screen capture'} • ক্লিক করে বড় দেখুন
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEnlargedImage(screenshotPreview)}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                        title="স্ক্রিনশট প্রিভিউ"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                        title="স্ক্রিনশট মুছুন"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                      errors.screenshot
                        ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/70'
                        : 'border-slate-300 bg-slate-50/70 hover:bg-pink-50/50 hover:border-pink-300'
                    }`}
                  >
                    <div className="h-11 w-11 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center shadow-2xs">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-800 block">
                        বিকাশ অ্যাপের পেমেন্ট সফল স্ক্রিনশট নির্বাচন করুন
                      </span>
                      <span className="text-[11px] text-slate-500">
                        এখানে ক্লিক করে ছবি নির্বাচন করুন অথবা ড্রপ করুন
                      </span>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                {errors.screenshot && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.screenshot}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPTION 2: BANK ACCOUNT FIELDS FORM */}
          {/* ========================================================================= */}
          {selectedMethod === 'bank' && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-blue-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Bank Account ট্রান্সফার বিবরণ (Bank Account Form)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ব্যাংক ডিপোজিট বা অনলাইন ফান্ড ট্রান্সফারের সকল তথ্য পূরণ করুন
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  সকল ফিল্ড আবশ্যক (*)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Bank Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Bank Name (ব্যাংকের নাম) *
                  </label>
                  <select
                    value={bankName}
                    onChange={e => {
                      setBankName(e.target.value);
                      if (errors.bankName) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.bankName;
                          return n;
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  >
                    {BANGLADESH_BANKS.map(bank => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                  {bankName === 'অন্যান্য (Other Bank)' && (
                    <input
                      type="text"
                      value={customBankName}
                      onChange={e => {
                        setCustomBankName(e.target.value);
                        if (errors.bankName) {
                          setErrors(prev => {
                            const n = { ...prev };
                            delete n.bankName;
                            return n;
                          });
                        }
                      }}
                      placeholder="ব্যাংকের সঠিক নাম লিখুন"
                      className="w-full mt-2 px-3.5 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  )}
                  {errors.bankName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.bankName}</span>
                    </p>
                  )}
                </div>

                {/* 2. Branch Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Branch Name (শাখা / ব্রাঞ্চ) *
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={e => {
                      setBranchName(e.target.value);
                      if (errors.branchName) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.branchName;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: Dhanmondi Branch, Dhaka"
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.branchName
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {errors.branchName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.branchName}</span>
                    </p>
                  )}
                </div>

                {/* 3. Account Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Account Name (অ্যাকাউন্টের নাম) *
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={e => {
                      setAccountName(e.target.value);
                      if (errors.accountName) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.accountName;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: Bachelor Zone Mess Fund"
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.accountName
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {errors.accountName && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.accountName}</span>
                    </p>
                  )}
                </div>

                {/* 4. Account Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Account Number (হিসাব নম্বর) *
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => {
                      setAccountNumber(e.target.value);
                      if (errors.accountNumber) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.accountNumber;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: 123.101.987654"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.accountNumber
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {errors.accountNumber && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.accountNumber}</span>
                    </p>
                  )}
                </div>

                {/* 5. Routing Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Routing Number (রাউটিং নম্বর) *
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={routingNumber}
                    onChange={e => {
                      setRoutingNumber(e.target.value);
                      if (errors.routingNumber) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.routingNumber;
                          return n;
                        });
                      }
                    }}
                    placeholder="উদা: 090261234 (৯ ডিজিট)"
                    className={`w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.routingNumber
                        ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {errors.routingNumber ? (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.routingNumber}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">BEFTN / NPSB অনলাইন ব্যাংকিংয়ের রাউটিং নম্বর</p>
                  )}
                </div>

                {/* 6. Payment Amount */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Amount (জমার পরিমাণ - ৳) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={e => {
                        setAmount(e.target.value);
                        if (errors.amount) {
                          setErrors(prev => {
                            const n = { ...prev };
                            delete n.amount;
                            return n;
                          });
                        }
                      }}
                      placeholder="উদা: ৩০০০"
                      className={`w-full pl-8 pr-3.5 py-2.5 text-xs font-black bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                        errors.amount
                          ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/30'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                      required
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.amount}</span>
                    </p>
                  )}
                </div>

                {/* 7. Payment Date */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Date (পেমেন্টের তারিখ) *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      if (errors.date) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.date;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${
                      errors.date
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                    required
                  />
                  {errors.date && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors.date}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 font-bold">দ্রুত অ্যামাউন্ট নির্বাচন:</span>
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setAmount(String(val));
                      if (errors.amount) {
                        setErrors(prev => {
                          const n = { ...prev };
                          delete n.amount;
                          return n;
                        });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      amount === String(val)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white hover:bg-blue-100 text-slate-700 border-blue-200'
                    }`}
                  >
                    ৳{val.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* 8. Upload Payment Slip/Screenshot */}
              <div className="space-y-2 pt-2 border-t border-blue-100">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Upload Payment Slip/Screenshot (ব্যাংক ডিপোজিট স্লিপ বা স্ক্রিনশট) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">PNG, JPG বা WEBP (সর্বোচ্চ 5MB)</span>
                </label>

                {screenshotPreview ? (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="relative group cursor-pointer" onClick={() => setEnlargedImage(screenshotPreview)}>
                        <img
                          src={screenshotPreview}
                          alt="Bank Slip Preview"
                          className="h-16 w-16 rounded-lg object-cover border border-blue-200 shrink-0 shadow-2xs"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {screenshotFileName || 'bank_slip.jpg'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {screenshotFileSize || 'Deposit slip'} • ক্লিক করে বড় দেখুন
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEnlargedImage(screenshotPreview)}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                        title="স্লিপ প্রিভিউ"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                        title="স্লিপ মুছুন"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                      errors.screenshot
                        ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/70'
                        : 'border-slate-300 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300'
                    }`}
                  >
                    <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-800 block">
                        ব্যাংক জমা স্লিপের ছবি বা অ্যাপ ট্রান্সফারের স্ক্রিনশট দিন
                      </span>
                      <span className="text-[11px] text-slate-500">
                        এখানে ক্লিক করে ফাইল সিলেক্ট করুন বা ড্রপ করুন
                      </span>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                {errors.screenshot && (
                  <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.screenshot}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SUBMIT PAYMENT BUTTON & ACTIONS */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                পেমেন্ট জমা দেওয়ার সাথে সাথে মেসের ব্যালেন্সে যুক্ত হবে ও অফিশিয়াল রসিদ সংরক্ষিত হবে।
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isMonthClosed}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-xl text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMethod === 'bKash'
                  ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-800 shadow-pink-500/20 active:scale-98'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-500/20 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <span>যাচাই ও জমা হচ্ছে...</span>
              ) : (
                <>
                  <span>
                    Submit Payment (পেমেন্ট জমা দিন — ৳{Number(amount || 0).toLocaleString()})
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* FULL-SIZE IMAGE PREVIEW MODAL */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-slate-500" />
                <span>পেমেন্ট স্ক্রিনশট / ব্যাংক স্লিপ প্রিভিউ</span>
              </span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={enlargedImage}
                alt="Enlarged Slip Proof"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
