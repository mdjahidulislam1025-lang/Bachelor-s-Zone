import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Save,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Info,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { MessSettings, MessPaymentInfo, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface AdminPaymentSettingsProps {
  settings: MessSettings;
  currentMember: Member;
  language: Language;
  onSaveSettings: (updated: MessSettings) => Promise<void>;
}

export const AdminPaymentSettings: React.FC<AdminPaymentSettingsProps> = ({
  settings,
  currentMember,
  language,
  onSaveSettings,
}) => {
  const t = translations[language];

  const defaultPaymentInfo: MessPaymentInfo = {
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
      instructions: 'ব্যাংক ট্রান্সফার বা ডিপোজিট স্লিপ প্রদান করে রেফারেন্স নম্বর সহ সাবমিট করুন।',
    },
    cash: {
      enabled: true,
      receiverName: 'Jahidul Islam',
      receiverPhone: '01516528497',
      instructions: 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিয়ে রিসিট বা নিশ্চিতকরণ সংগ্রহ করুন।',
    },
  };

  const initialInfo: MessPaymentInfo = settings.paymentInfo || defaultPaymentInfo;

  // bKash States
  const [bkashEnabled, setBkashEnabled] = useState(initialInfo.bkash?.enabled !== false);
  const [bkashNumber, setBkashNumber] = useState(initialInfo.bkash?.number || '01516528497');
  const [bkashAccountName, setBkashAccountName] = useState(initialInfo.bkash?.accountName || 'Jahidul Islam');
  const [bkashType, setBkashType] = useState<'Personal' | 'Merchant' | 'Other'>(initialInfo.bkash?.type || 'Personal');
  const [bkashInstructions, setBkashInstructions] = useState(
    initialInfo.bkash?.instructions || 'Send Money করে TrxID ও প্রেরক বিকাশ নম্বর দিয়ে নিচে সাবমিট করুন।'
  );

  // Bank States
  const [bankEnabled, setBankEnabled] = useState(initialInfo.bank?.enabled !== false);
  const [bankName, setBankName] = useState(initialInfo.bank?.bankName || 'Dutch-Bangla Bank Limited (DBBL)');
  const [branchName, setBranchName] = useState(initialInfo.bank?.branchName || 'Dhanmondi Branch, Dhaka');
  const [accountName, setAccountName] = useState(initialInfo.bank?.accountName || 'Jahidul Islam');
  const [accountNumber, setAccountNumber] = useState(initialInfo.bank?.accountNumber || '123.151.0028497');
  const [routingNumber, setRoutingNumber] = useState(initialInfo.bank?.routingNumber || '090261234');
  const [accountType, setAccountType] = useState(initialInfo.bank?.accountType || 'Savings');
  const [bankInstructions, setBankInstructions] = useState(
    initialInfo.bank?.instructions || 'ব্যাংক ডিপোজিট বা ফান্ড ট্রান্সফার করে ট্রানজেকশন স্লিপ/রেফারেন্স দিন।'
  );

  // Cash States
  const [cashEnabled, setCashEnabled] = useState(initialInfo.cash?.enabled !== false);
  const [cashReceiverName, setCashReceiverName] = useState(initialInfo.cash?.receiverName || 'Jahidul Islam');
  const [cashReceiverPhone, setCashReceiverPhone] = useState(initialInfo.cash?.receiverPhone || '01516528497');
  const [cashInstructions, setCashInstructions] = useState(
    initialInfo.cash?.instructions || 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিন।'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewCopied, setPreviewCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setPreviewCopied(id);
    setTimeout(() => setPreviewCopied(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedPaymentInfo: MessPaymentInfo = {
        bkash: {
          enabled: bkashEnabled,
          number: bkashNumber.trim(),
          accountName: bkashAccountName.trim(),
          type: bkashType,
          instructions: bkashInstructions.trim(),
        },
        bank: {
          enabled: bankEnabled,
          bankName: bankName.trim(),
          branchName: branchName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          routingNumber: routingNumber.trim(),
          accountType: accountType.trim(),
          instructions: bankInstructions.trim(),
        },
        cash: {
          enabled: cashEnabled,
          receiverName: cashReceiverName.trim(),
          receiverPhone: cashReceiverPhone.trim(),
          instructions: cashInstructions.trim(),
        },
      };

      const updatedSettings: MessSettings = {
        ...settings,
        paymentInfo: updatedPaymentInfo,
      };

      await onSaveSettings(updatedSettings);
      setFeedback('পেমেন্ট রিসিভিং ইনফরমেশন সফলভাবে সংরক্ষিত হয়েছে! সকল সক্রিয় সদস্য এখন এটি দেখতে পাবেন।');
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert('ত্রুটি: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
            <CreditCard className="h-4 w-4 text-emerald-300" />
            <span>মেস পেমেন্ট রিসিভিং কনফিগারেশন (Payment Receiving Information)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1">
            বিকাশ, নগদ ও ব্যাংক পেমেন্ট সেটআপ
          </h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed">
            পার্মানেন্ট এডমিন <strong>জাহেদুল ইসলাম (Jahidul Islam)</strong> হিসেবে মেসের বিল গ্রহণের বিকাশ নম্বর,
            ব্যাংক অ্যাকাউন্ট ও ক্যাশ জমা নির্দেশিকা নির্ধারণ করুন। সক্রিয় সদস্যরা তাঁদের ড্যাশবোর্ডে এই তথ্য দেখে বিল প্রদান করবেন।
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-200 font-medium">এডমিন নিয়ন্ত্রিত সিকিউর চ্যানেল</span>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. bKash Configuration Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-black text-sm">
                bK
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>১. বিকাশ পেমেন্ট তথ্য (bKash Configuration)</span>
                  {bkashEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">চালু (Active)</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">বন্ধ (Disabled)</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">মেস সদস্যদের বিকাশ থেকে টাকা পাঠানোর অ্যাকাউন্ট বিবরণ</p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={bkashEnabled}
                onChange={e => setBkashEnabled(e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded-sm focus:ring-pink-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">বিকাশ পেমেন্ট গ্রহণ করুন</span>
            </label>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity ${!bkashEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বিকাশ মোবাইল নম্বর (bKash Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bkashNumber}
                onChange={e => setBkashNumber(e.target.value)}
                placeholder="01516528497"
                required={bkashEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
              <span className="text-[10px] text-slate-400">মেস ম্যানেজার মো: জাহিদুল ইসলামের বিকাশ নম্বর</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                অ্যাকাউন্ট নাম (Account Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bkashAccountName}
                onChange={e => setBkashAccountName(e.target.value)}
                placeholder="Jahidul Islam"
                required={bkashEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />
              <span className="text-[10px] text-slate-400">উদা: Jahidul Islam</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বিকাশ টাইপ (bKash Type) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['Personal', 'Merchant', 'Other'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBkashType(type)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      bkashType === type
                        ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'Personal' ? 'ব্যক্তিগত' : type === 'Merchant' ? 'মার্চেন্ট' : 'অন্যান্য'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">নির্বাচিত: {bkashType} Account</span>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পেমেন্ট নির্দেশিকা (Instructions for Members)
              </label>
              <input
                type="text"
                value={bkashInstructions}
                onChange={e => setBkashInstructions(e.target.value)}
                placeholder="Send Money করে ট্রানজেকশন আইডি (TrxID) দিন"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Bank Configuration Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>২. ব্যাংক ট্রান্সফার তথ্য (Bank Account Configuration)</span>
                  {bankEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">চালু (Active)</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">বন্ধ (Disabled)</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">মেস ফান্ডের ব্যাংক অ্যাকাউন্ট বা সরাসরি ডিপোজিট বিবরণ</p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={bankEnabled}
                onChange={e => setBankEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">ব্যাংক ট্রান্সফার গ্রহণ করুন</span>
            </label>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${!bankEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ব্যাংকের নাম (Bank Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="Dutch-Bangla Bank Limited (DBBL)"
                required={bankEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                শাখার নাম (Branch Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="Dhanmondi Branch, Dhaka"
                required={bankEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                হিসাবের নাম (Account Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Jahidul Islam"
                required={bankEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                অ্যাকাউন্ট নম্বর (Account Number) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="123.151.0028497"
                required={bankEnabled}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                রাউটিং নম্বর (Routing Number - Optional)
              </label>
              <input
                type="text"
                value={routingNumber}
                onChange={e => setRoutingNumber(e.target.value)}
                placeholder="090261234"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                হিসাবের ধরন (Account Type - Optional)
              </label>
              <input
                type="text"
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                placeholder="Savings / সঞ্চয়ী"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ব্যাংক পেমেন্ট নির্দেশিকা (Instructions for Members)
              </label>
              <input
                type="text"
                value={bankInstructions}
                onChange={e => setBankInstructions(e.target.value)}
                placeholder="ব্যাংক ট্রান্সফার বা ডিপোজিট স্লিপ প্রদান করে রেফারেন্স নম্বর দিন"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Cash Configuration Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>৩. নগদ টাকা গ্রহণ সেটিংস (Cash Payment Configuration)</span>
                  {cashEnabled ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">চালু (Available)</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">বন্ধ (Off)</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">সরাসরি হাতে নগদ টাকা গ্রহণের সুবিধা ও যোগাযোগ নম্বর</p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={cashEnabled}
                onChange={e => setCashEnabled(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">ক্যাশ পেমেন্ট সক্রিয় রাখুন</span>
            </label>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${!cashEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                টাকা গ্রহণকারীর নাম (Cash Receiver Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={cashReceiverName}
                onChange={e => setCashReceiverName(e.target.value)}
                placeholder="Jahidul Islam"
                required={cashEnabled}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                যোগাযোগের ফোন নম্বর (Receiver Phone)
              </label>
              <input
                type="text"
                value={cashReceiverPhone}
                onChange={e => setCashReceiverPhone(e.target.value)}
                placeholder="01516528497"
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ক্যাশ জমা নির্দেশিকা (Cash Payment Instructions) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={cashInstructions}
                onChange={e => setCashInstructions(e.target.value)}
                placeholder="মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিন।"
                required={cashEnabled}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span>সদস্যদের ড্যাশবোর্ডে যেমন দেখাবে (Live Member View Preview)</span>
            </span>
            <span className="text-[11px] text-slate-400">রিয়েল-টাইম প্রিভিউ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {/* bKash Preview */}
            <div className={`p-4 rounded-xl border ${bkashEnabled ? 'bg-slate-800/80 border-pink-500/30' : 'bg-slate-800/30 border-slate-700 opacity-40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-pink-400 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  <span>bKash</span>
                </span>
                <span className="text-[10px] bg-pink-900/50 text-pink-300 px-2 py-0.5 rounded-full font-bold">
                  {bkashType}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <span className="font-mono font-bold text-pink-200">📱 {bkashNumber || '০১৫১৬৫২৮৪৯৭'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(bkashNumber, 'prev-bkash')}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {previewCopied === 'prev-bkash' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-300 pt-1">
                  নাম: <strong>{bkashAccountName}</strong>
                </div>
                {bkashInstructions && (
                  <p className="text-[10px] text-slate-400 italic pt-1">{bkashInstructions}</p>
                )}
              </div>
            </div>

            {/* Bank Preview */}
            <div className={`p-4 rounded-xl border ${bankEnabled ? 'bg-slate-800/80 border-blue-500/30' : 'bg-slate-800/30 border-slate-700 opacity-40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>Bank Transfer</span>
                </span>
                {accountType && (
                  <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    {accountType}
                  </span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-[11px] text-slate-300 font-semibold truncate">
                  🏦 {bankName}
                </div>
                <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <span className="font-mono font-bold text-blue-200 truncate">{accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, 'prev-bank')}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {previewCopied === 'prev-bank' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-300">নাম: <strong>{accountName}</strong></div>
                <div className="text-[10px] text-slate-400">শাখা: {branchName}</div>
                {routingNumber && <div className="text-[10px] text-slate-400 font-mono">Routing: {routingNumber}</div>}
              </div>
            </div>

            {/* Cash Preview */}
            <div className={`p-4 rounded-xl border ${cashEnabled ? 'bg-slate-800/80 border-amber-500/30' : 'bg-slate-800/30 border-slate-700 opacity-40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" />
                  <span>Cash Payment</span>
                </span>
                <span className="text-[10px] bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {cashEnabled ? 'উপলব্ধ' : 'অনুপলব্ধ'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <p className="text-[11px] leading-relaxed">
                  💵 {cashInstructions || 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা দিন।'}
                </p>
                <div className="text-[11px] font-semibold text-amber-200">
                  গ্রহীতা: {cashReceiverName}
                </div>
                {cashReceiverPhone && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    ফোন: {cashReceiverPhone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'পেমেন্ট ইনফরমেশন সেভ করুন (Save Settings)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
