import React from 'react';
import { Printer, X, CheckCircle, AlertCircle, Building2, Utensils } from 'lucide-react';
import { MemberMonthlyStatement } from '../types.js';

interface StatementVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: MemberMonthlyStatement | null;
  messName: string;
  messAddress: string;
  monthName: string;
}

export const StatementVoucherModal: React.FC<StatementVoucherModalProps> = ({
  isOpen,
  onClose,
  statement,
  messName,
  messAddress,
  monthName,
}) => {
  if (!isOpen || !statement) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDue = statement.netBalance > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 print:p-0 print:border-0 print:shadow-none">
        {/* Action bar (hidden in print) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            মাসিক হিসাব ভাউচার (Official Statement Voucher)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>প্রিন্ট / PDF ভাউচার</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="space-y-5 text-slate-800">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">{messName}</h2>
            <p className="text-xs text-slate-600 font-medium">{messAddress}</p>
            <div className="inline-block mt-2 px-4 py-1 bg-slate-100 rounded-full text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              {monthName} — ব্যক্তিগত হিসাব বিবরণী
            </div>
          </div>

          {/* Member Information Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">সদস্যের নাম:</span>
              <strong className="text-slate-900 text-sm">{statement.memberName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">রুম নম্বর:</span>
              <strong className="text-slate-900">রুম {statement.roomNo || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">ভাউচার তারিখ:</span>
              <strong className="text-slate-900">{new Date().toLocaleDateString('bn-BD')}</strong>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-[11px] text-slate-600">
                  <th className="py-2.5 px-3">খরচের খাত / বিবরণ</th>
                  <th className="py-2.5 px-3 text-center">পরিমাণ / ভিত্তি</th>
                  <th className="py-2.5 px-3 text-right">টাকা (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    খাবার মিল খরচ (Meal Expense)
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">
                    {statement.totalMeals} টি মিল × ৳{statement.mealRate.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    ৳{statement.mealCost.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">বাসা ভাড়া শেয়ার (Rent)</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.rentShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">বিদ্যুৎ বিল শেয়ার (Electricity)</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.electricityShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">গ্যাস বিল শেয়ার (Gas)</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.gasShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">বুয়ার বেতন শেয়ার (Maid Salary)</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.maidSalaryShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">ওয়াইফাই / ইন্টারনেট শেয়ার (WiFi)</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.internetShare.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-600">ক্লিনিং ও ময়লা বিল শেয়ার</td>
                  <td className="py-2 px-3 text-center text-slate-400">সুষম অংশীদারিত্ব</td>
                  <td className="py-2 px-3 text-right">
                    ৳{statement.breakdown.cleaningShare.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                  <td className="py-2.5 px-3" colSpan={2}>
                    সর্বমোট খরচ (Total Incurred Cost)
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-extrabold">
                    ৳{statement.totalCost.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-emerald-50/50 font-bold text-emerald-800 border-t border-slate-200">
                  <td className="py-2.5 px-3" colSpan={2}>
                    সর্বমোট জমা প্রাপ্তি (Total Payments Received)
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm font-extrabold text-emerald-700">
                    -৳{statement.totalPaid.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Net Balance Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isDue
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block">
                {isDue ? 'পরিশোধযোগ্য চূড়ান্ত বকেয়া (Due to Mess)' : 'উদ্বৃত্ত / ফেরতযোগ্য টাকা (Advance Credit)'}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isDue
                  ? 'অনুগ্রহ করে পরবর্তী মাসের ৩ তারিখের মধ্যে পরিশোধ করুন।'
                  : 'পরবর্তী মাসের অগ্রিম হিসাবে গণ্য অথবা ফেরত প্রদান করা হবে।'}
              </p>
            </div>
            <div className="text-2xl font-black">
              ৳{Math.abs(statement.netBalance).toLocaleString()}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center">
            <div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1.5 font-bold text-slate-700">
                হিসাবরক্ষক / ম্যানেজারের স্বাক্ষর
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 w-48 mx-auto pt-1.5 font-bold text-slate-700">
                সদস্যের স্বাক্ষর
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-3 border-t border-slate-100">
            মেস ম্যানেজার ডিজিটাল সফটওয়্যার সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত • Shantinagar, Dhaka
          </div>
        </div>
      </div>
    </div>
  );
};
