import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Banknote,
  Copy,
  Check,
  Send,
  ShieldCheck,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';
import { MessPaymentInfo, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface MemberPaymentInfoCardProps {
  paymentInfo?: MessPaymentInfo;
  currentMember: Member;
  language: Language;
  onOpenPaymentForm?: () => void;
  compact?: boolean;
}

export const MemberPaymentInfoCard: React.FC<MemberPaymentInfoCardProps> = ({
  paymentInfo,
  currentMember,
  language,
  onOpenPaymentForm,
  compact = false,
}) => {
  const t = translations[language];
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fallbacks in case settings are not yet saved
  const info: MessPaymentInfo = paymentInfo || {
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="h-4 w-4 text-emerald-300" />
            <span>Pay Your Mess Bill (মেস বিল পরিশোধ করুন)</span>
          </div>
          <h3 className="text-base sm:text-lg font-black mt-1">
            বিকাশ, ব্যাংক ট্রান্সফার বা সরাসরি ক্যাশে পরিশোধ করুন
          </h3>
          <p className="text-xs text-emerald-100/90 mt-0.5">
            মেস এডমিন <strong>জাহেদুল ইসলাম (Jahidul Islam)</strong> এর অনুমোদিত পেমেন্ট চ্যানেল
          </p>
        </div>

        {onOpenPaymentForm && (
          <button
            onClick={onOpenPaymentForm}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span>পেমেন্ট জমা দিন (Record Payment)</span>
          </button>
        )}
      </div>

      {/* Grid of 3 Methods: bKash, Bank Transfer, Cash */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Method 1: bKash */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            info.bkash?.enabled !== false
              ? 'bg-gradient-to-b from-pink-50/50 to-white border-pink-200 hover:border-pink-300 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                bK
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">bKash (বিকাশ)</h4>
                <span className="text-[10px] text-pink-700 font-bold bg-pink-100/80 px-2 py-0.5 rounded-full">
                  {info.bkash?.type || 'Personal'} Account
                </span>
              </div>
            </div>
            {info.bkash?.enabled !== false ? (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                সক্রিয়
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded-full">
                বন্ধ
              </span>
            )}
          </div>

          {info.bkash?.enabled !== false ? (
            <div className="space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-pink-100 flex items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">📱 bKash Number</span>
                  <span className="font-mono font-extrabold text-sm text-pink-700">
                    {info.bkash?.number || '01516528497'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(info.bkash?.number || '01516528497', 'bkash')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-bold transition-colors cursor-pointer"
                  title="নম্বর কপি করুন"
                >
                  {copiedKey === 'bkash' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>কপি</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-600 bg-pink-50/40 p-2 rounded-lg">
                <span className="text-slate-500">Account Name:</span>{' '}
                <strong className="text-slate-800">{info.bkash?.accountName || 'Jahidul Islam'}</strong>
              </div>

              {info.bkash?.instructions && (
                <p className="text-[10px] text-slate-500 italic leading-snug pt-0.5">
                  💡 {info.bkash.instructions}
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-3 text-center">বিকাশ পেমেন্ট বর্তমানে বন্ধ রয়েছে।</div>
          )}
        </div>

        {/* Method 2: Bank Transfer */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            info.bank?.enabled !== false
              ? 'bg-gradient-to-b from-blue-50/50 to-white border-blue-200 hover:border-blue-300 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Bank Transfer (ব্যাংক)</h4>
                {info.bank?.accountType && (
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded-full">
                    {info.bank.accountType}
                  </span>
                )}
              </div>
            </div>
            {info.bank?.enabled !== false ? (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                সক্রিয়
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded-full">
                বন্ধ
              </span>
            )}
          </div>

          {info.bank?.enabled !== false ? (
            <div className="space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1 truncate">
                  <span>🏦</span>
                  <span className="truncate">{info.bank?.bankName || 'Dutch-Bangla Bank Limited (DBBL)'}</span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-semibold">Account Number</span>
                    <span className="font-mono font-bold text-xs text-blue-800">
                      {info.bank?.accountNumber || '123.151.0028497'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(info.bank?.accountNumber || '123.151.0028497', 'bank-acc')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition-colors cursor-pointer"
                    title="অ্যাকাউন্ট নম্বর কপি করুন"
                  >
                    {copiedKey === 'bank-acc' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">কপি</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>কপি</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 bg-blue-50/40 p-2 rounded-lg">
                <div>
                  <span className="text-slate-500">Account Name:</span>{' '}
                  <strong className="text-slate-800">{info.bank?.accountName || 'Jahidul Islam'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Branch:</span>{' '}
                  <span className="text-slate-700">{info.bank?.branchName || 'Dhanmondi Branch, Dhaka'}</span>
                </div>
                {info.bank?.routingNumber && (
                  <div className="font-mono text-[10px] text-slate-500">
                    Routing: {info.bank.routingNumber}
                  </div>
                )}
              </div>

              {info.bank?.instructions && (
                <p className="text-[10px] text-slate-500 italic leading-snug">
                  💡 {info.bank.instructions}
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-3 text-center">ব্যাংক পেমেন্ট বর্তমানে বন্ধ রয়েছে।</div>
          )}
        </div>

        {/* Method 3: Cash */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            info.cash?.enabled !== false
              ? 'bg-gradient-to-b from-amber-50/50 to-white border-amber-200 hover:border-amber-300 shadow-2xs'
              : 'bg-slate-50 border-slate-200 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Cash Payment (নগদ)</h4>
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                  হাতে হাতে জমা
                </span>
              </div>
            </div>
            {info.cash?.enabled !== false ? (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                উপলব্ধ
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded-full">
                বন্ধ
              </span>
            )}
          </div>

          {info.cash?.enabled !== false ? (
            <div className="space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs space-y-1">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <span>💵</span>
                  <span>সরাসরি জমা দিন</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {info.cash?.instructions || 'মেস এডমিন জাহিদুল ইসলামের কাছে সরাসরি নগদ টাকা জমা দিন।'}
                </p>
              </div>

              <div className="space-y-1 text-[11px] text-slate-600 bg-amber-50/40 p-2 rounded-lg">
                <div>
                  <span className="text-slate-500">টাকা গ্রহণকারী:</span>{' '}
                  <strong className="text-slate-800">{info.cash?.receiverName || 'Jahidul Islam'}</strong>
                </div>
                {info.cash?.receiverPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono">ফোন: {info.cash.receiverPhone}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(info.cash?.receiverPhone || '01516528497', 'cash-phone')}
                      className="text-amber-700 hover:text-amber-900 text-[10px] font-bold p-0.5 cursor-pointer"
                    >
                      {copiedKey === 'cash-phone' ? 'কপি হয়েছে' : 'কপি'}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-2 rounded-lg bg-amber-100/50 text-[10px] text-amber-900 font-medium">
                নগদ টাকা বুঝিয়ে দেওয়ার পর অ্যাপে এন্ট্রি দিলে এডমিন তা ভেরিফাই করে জমা নিশ্চিত করবেন।
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-3 text-center">ক্যাশ পেমেন্ট বর্তমানে গ্রহণযোগ্য নয়।</div>
          )}
        </div>
      </div>
    </div>
  );
};
