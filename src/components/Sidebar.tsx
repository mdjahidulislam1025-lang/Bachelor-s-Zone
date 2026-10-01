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
  ShieldAlert,
  UserCog,
  MessageSquare,
  Lock,
  User,
  History,
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
  const isUserAdmin = userRole === 'admin' || isAdmin;

  // Exact navigation as per Section 14
  const adminNavItems = [
    { id: 'dashboard', label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: language === 'bn' ? 'সদস্য তালিকা' : 'Members', icon: Users },
    { id: 'meals', label: language === 'bn' ? 'মিল খাতা' : 'Meals', icon: CalendarCheck },
    { id: 'cooking', label: language === 'bn' ? 'রান্নার রুটিন' : 'Cooking', icon: ChefHat },
    { id: 'bazar', label: language === 'bn' ? 'বাজার ব্যবস্থাপনা' : 'Bazar', icon: ShoppingBag },
    { id: 'expenses', label: language === 'bn' ? 'মেস খরচ' : 'Expenses', icon: Receipt },
    { id: 'payments', label: language === 'bn' ? 'জমা ও পেমেন্ট' : 'Payments', icon: Wallet },
    { id: 'monthly', label: language === 'bn' ? 'মাসিক হিসাব' : 'Monthly Accounts', icon: Calculator },
    { id: 'sms', label: language === 'bn' ? 'এসএমএস (SMS)' : 'SMS', icon: MessageSquare },
    { id: 'reports', label: language === 'bn' ? 'রিপোর্ট ও বিশ্লেষণ' : 'Reports', icon: BarChart3 },
    { id: 'member-management', label: language === 'bn' ? 'সদস্য ও রোল ব্যবস্থাপনা' : 'Member Management', icon: UserCog, isHighlight: true },
    { id: 'settings', label: language === 'bn' ? 'সেটিংস' : 'Settings', icon: Settings },
    { id: 'audit-logs', label: language === 'bn' ? 'অডিট লগ (Audit Logs)' : 'Audit Logs', icon: History },
  ];

  const memberNavItems = [
    { id: 'dashboard', label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: LayoutDashboard },
    { id: 'my-meals', label: language === 'bn' ? 'আমার মিল (ON/OFF)' : 'My Meals', icon: UtensilsCrossed, isHighlight: true },
    { id: 'meals', label: language === 'bn' ? 'মিল তালিকা' : 'Meals', icon: CalendarCheck },
    { id: 'cooking', label: language === 'bn' ? 'রান্নার রুটিন' : 'Cooking', icon: ChefHat },
    { id: 'bazar', label: language === 'bn' ? 'বাজার তালিকা ও হিসাব' : 'Bazar', icon: ShoppingBag },
    { id: 'expenses', label: language === 'bn' ? 'মেস খরচ' : 'Expenses', icon: Receipt },
    { id: 'monthly', label: language === 'bn' ? 'মাসিক হিসাব' : 'Monthly Accounts', icon: Calculator },
    { id: 'my-profile', label: language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile', icon: User },
  ];

  const currentNavItems = isUserAdmin ? adminNavItems : memberNavItems;

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-61px)] p-3">
      {/* Brand Badge */}
      <div className="mb-3 px-2 py-2.5 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-slate-50 border border-emerald-100/80">
        <BachelorZoneLogo size="sm" subtitle="Mess Management System" />
        <p className="text-[10px] text-emerald-800/80 mt-1.5 font-medium leading-tight px-0.5">
          {language === 'bn'
            ? 'মেসের মিল, বাজার, রান্না ও হিসাব — সব এক জায়গায়'
            : 'Your Mess, Meals & হিসাব in one place'}
        </p>
      </div>

      <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
        {currentNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : item.isHighlight
                  ? 'text-purple-700 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : item.isHighlight ? 'text-purple-600' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Admin Action Button & Role badge card at bottom */}
      <div className="mt-auto pt-3 border-t border-slate-200 space-y-2">
        {isUserAdmin ? (
          <button
            onClick={onOpenAdminProfile}
            className="w-full flex items-center justify-between p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left truncate">
                <div className="truncate font-bold">{adminProfile?.name || 'Jahidul Islam'}</div>
                <div className="text-[10px] text-emerald-600 font-normal">এডমিন প্রোফাইল ও নিরাপত্তা</div>
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

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>বর্তমান ইন্টারফেস</span>
            <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-bold ${
              isUserAdmin ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {isUserAdmin ? 'Admin Mode' : 'Member Mode'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            {isUserAdmin
              ? 'এডমিন কন্ট্রোল: মেসের মিল, বাজার, খরচ, সদস্য ব্যবস্থাপনা ও অডিট লগের সম্পূর্ণ নিয়ন্ত্রণ।'
              : 'সদস্য ভিউ: নিজের মিল অন/অফ এবং মেসের স্বচ্ছ আর্থিক বিবরণী দেখার অধিকার।'}
          </p>
        </div>
      </div>
    </aside>
  );
};
