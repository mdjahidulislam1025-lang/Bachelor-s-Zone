import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface ClosedMonthAlertProps {
  month?: string;
}

export const ClosedMonthAlert: React.FC<ClosedMonthAlertProps> = ({ month = 'চলতি' }) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
      <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
        <Lock className="h-5 w-5" />
      </div>
      <div className="text-xs space-y-1">
        <div className="font-bold text-amber-950 flex items-center gap-2">
          <span>{month} মাসের হিসাব বন্ধ ও লককৃত (Month Closed & Locked)</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] uppercase font-bold tracking-wider">
            লক করা
          </span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          আর্থিক তথ্যের স্বচ্ছতা ও সঠিকতা বজায় রাখতে বন্ধকৃত মাসের কোনো রেকর্ড এডিট বা ডিলিট করা অনুমোদিত নয়। কোনো সংশোধনের প্রয়োজন হলে মেস এডমিন কর্তৃক 'হিসাব বন্ধ ও চূড়ান্ত' ট্যাব থেকে মাস পুনরায় উন্মুক্ত (Reopen Month) করতে হবে।
        </p>
      </div>
    </div>
  );
};
