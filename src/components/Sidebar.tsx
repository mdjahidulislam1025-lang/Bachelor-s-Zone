import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarCheck,
  ChefHat,
  ShoppingBag,
  Receipt,
  Wallet,
  Calculator,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Language, translations } from '../utils/translations.js';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  language: Language;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  language,
  userRole,
}) => {
  const t = translations[language];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'my-meals', label: t.myMeals, icon: UtensilsCrossed },
    { id: 'meals', label: t.dailyMealManagement, icon: CalendarCheck },
    { id: 'cooking', label: t.cooking, icon: ChefHat },
    { id: 'bazar', label: t.bazar, icon: ShoppingBag },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'payments', label: t.payments, icon: Wallet },
    { id: 'monthly', label: t.monthlyCalc, icon: Calculator },
    { id: 'members', label: t.members, icon: Users },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.smsSettings, icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-61px)] p-3">
      <div className="space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role badge card at bottom */}
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>বর্তমান রোল</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase text-[10px]">
              {userRole}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            {userRole === 'admin'
              ? 'ম্যানেজার: সম্পূর্ণ হিসাব এন্ট্রি, এডিট ও মাস বন্ধের অনুমতি রয়েছে।'
              : userRole === 'treasurer'
              ? 'ক্যাশিয়ার: খরচ, বাজার ও জমা রেকর্ড পরিচালনা করতে পারবেন।'
              : 'সদস্য: স্বচ্ছ ব্যক্তিগত ও সার্বিক হিসাব দেখার অধিকার রয়েছে।'}
          </p>
        </div>
      </div>
    </aside>
  );
};
