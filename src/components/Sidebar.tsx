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
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Language, translations } from '../utils/translations.js';
import { useAuth } from '../context/AuthContext.js';
import { BachelorZoneLogo } from './BachelorZoneLogo.js';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  language: Language;
  userRole: string;
  onOpenAdminLogin?: () => void;
  onOpenAdminProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  language,
  userRole,
  onOpenAdminLogin,
  onOpenAdminProfile,
}) => {
  const t = translations[language];
  const { isAdmin, adminProfile } = useAuth();

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
      {/* Brand Badge */}
      <div className="mb-3 px-2 py-2.5 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-slate-50 border border-emerald-100/80">
        <BachelorZoneLogo size="sm" subtitle="Mess Management System" />
        <p className="text-[10px] text-emerald-800/80 mt-1.5 font-medium leading-tight px-0.5">
          {language === 'bn'
            ? 'মেসের মিল, বাজার, রান্না ও হিসাব'
            : 'Your Mess, Meals & হিসাব in one place'}
        </p>
      </div>

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

      {/* Admin Action Button & Role badge card at bottom */}
      <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
        {isAdmin ? (
          <button
            onClick={onOpenAdminProfile}
            className="w-full flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left truncate">
                <div className="truncate">{adminProfile?.name || 'এডমিন প্রোফাইল'}</div>
                <div className="text-[10px] text-emerald-600 font-normal">প্রোফাইল ও পাসওয়ার্ড পরিবর্তন</div>
              </div>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenAdminLogin}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>এডমিন লগইন (Admin Login)</span>
          </button>
        )}

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
