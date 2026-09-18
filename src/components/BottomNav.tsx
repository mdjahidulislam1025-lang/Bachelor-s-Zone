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
} from 'lucide-react';
import { Language, translations } from '../utils/translations.js';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  language,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const t = translations[language];

  const mainItems = [
    { id: 'dashboard', label: language === 'bn' ? 'হোম' : 'Home', icon: LayoutDashboard },
    { id: 'my-meals', label: language === 'bn' ? 'আমার মিল' : 'My Meals', icon: UtensilsCrossed },
    { id: 'meals', label: language === 'bn' ? 'মিল খাতা' : 'Meals', icon: Calculator },
    { id: 'bazar', label: language === 'bn' ? 'বাজার' : 'Bazar', icon: ShoppingBag },
    { id: 'monthly', label: language === 'bn' ? 'হিসাব' : 'Accounts', icon: Wallet },
  ];

  const extraItems = [
    { id: 'cooking', label: t.cooking, icon: ChefHat },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'payments', label: t.payments, icon: Wallet },
    { id: 'members', label: t.members, icon: Users },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.smsSettings, icon: Settings },
  ];

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
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
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
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
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
                className={`flex flex-col items-center justify-center py-1 transition-colors ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}

          {/* More toggle */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              extraItems.some(i => i.id === activeTab) ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
            <span className="text-[10px] mt-0.5">আরও</span>
          </button>
        </div>
      </nav>
    </>
  );
};
