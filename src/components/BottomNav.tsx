import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  Calculator,
  MoreHorizontal,
  Receipt,
  Wallet,
  Users,
  BarChart3,
  Settings,
  X,
  UserCog,
  History,
  MessageSquare,
  User,
} from 'lucide-react';
import { Language, translations } from '../utils/translations.js';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  language: Language;
  userRole?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  language,
  userRole = 'admin',
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const t = translations[language];
  const isAdmin = userRole === 'admin';

  const adminMainItems = [
    { id: 'dashboard', label: language === 'bn' ? 'হোম' : 'Home', icon: LayoutDashboard },
    { id: 'meals', label: language === 'bn' ? 'মিল' : 'Meals', icon: Calculator },
    { id: 'bazar', label: language === 'bn' ? 'বাজার' : 'Bazar', icon: ShoppingBag },
    { id: 'monthly', label: language === 'bn' ? 'হিসাব' : 'Accounts', icon: Wallet },
    { id: 'member-management', label: language === 'bn' ? 'সদস্য' : 'Members', icon: UserCog },
  ];

  const adminExtraItems = [
    { id: 'members', label: language === 'bn' ? 'সদস্য তালিকা' : 'Members List', icon: Users },
    { id: 'cooking', label: t.cooking, icon: ChefHat },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'payments', label: t.payments, icon: Wallet },
    { id: 'sms', label: language === 'bn' ? 'এসএমএস' : 'SMS', icon: MessageSquare },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.smsSettings, icon: Settings },
    { id: 'audit-logs', label: language === 'bn' ? 'অডিট লগ' : 'Audit Logs', icon: History },
  ];

  const memberMainItems = [
    { id: 'dashboard', label: language === 'bn' ? 'হোম' : 'Home', icon: LayoutDashboard },
    { id: 'my-meals', label: language === 'bn' ? 'আমার মিল' : 'My Meals', icon: UtensilsCrossed },
    { id: 'meals', label: language === 'bn' ? 'মিল' : 'Meals', icon: Calculator },
    { id: 'bazar', label: language === 'bn' ? 'বাজার' : 'Bazar', icon: ShoppingBag },
    { id: 'monthly', label: language === 'bn' ? 'হিসাব' : 'Accounts', icon: Wallet },
  ];

  const memberExtraItems = [
    { id: 'cooking', label: t.cooking, icon: ChefHat },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'my-profile', label: language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile', icon: User },
  ];

  const mainItems = isAdmin ? adminMainItems : memberMainItems;
  const extraItems = isAdmin ? adminExtraItems : memberExtraItems;

  return (
    <>
      {/* Drawer for More items */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl p-4 pb-8 max-w-lg w-full mx-auto shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                অন্যান্য মেনু অপশন
              </span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {extraItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] truncate w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-6 items-center">
          {mainItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* 6th item: More / Drawer Toggle */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">আরও</span>
          </button>
        </div>
      </nav>
    </>
  );
};
