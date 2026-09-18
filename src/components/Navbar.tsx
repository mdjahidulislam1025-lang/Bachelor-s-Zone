import React, { useState } from 'react';
import {
  Utensils,
  UtensilsCrossed,
  Bell,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { Member, InAppNotification } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface NavbarProps {
  messName: string;
  messAddress: string;
  language: Language;
  onToggleLanguage: () => void;
  members: Member[];
  currentMember: Member;
  onChangeCurrentMember: (memberId: string) => void;
  notifications: InAppNotification[];
  onOpenAi: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  onTabSelect: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  messName,
  messAddress,
  language,
  onToggleLanguage,
  members,
  currentMember,
  onChangeCurrentMember,
  notifications,
  onOpenAi,
  onRefresh,
  isLoading,
  onTabSelect,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const t = translations[language];
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Mess Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {messName || t.appName}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Bangladesh
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs">
              {messAddress}
            </p>
          </div>
        </div>

        {/* Right: Actions, AI, Language, Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Quick My Meals Button */}
          <button
            onClick={() => onTabSelect('my-meals')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            title="My Meals ON/OFF"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-emerald-600" />
            <span>{language === 'bn' ? 'আমার মিল' : 'My Meals'}</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-medium shadow-xs hover:opacity-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span className="hidden xs:inline">মেস AI</span>
            <span className="xs:hidden">AI</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Notifications dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    নোটিফিকেশন সেন্টার ({notifications.length})
                  </h4>
                  <span className="text-[11px] text-emerald-600 font-medium">ইন-অ্যাপ বার্তা</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">কোন নোটিফিকেশন নেই</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.linkTab) onTabSelect(n.linkTab);
                          setShowNotifs(false);
                        }}
                        className="py-2 px-1 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {n.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : n.type === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <Bell className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User / Role Switcher */}
          <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-200">
            <div className="relative flex items-center gap-1.5">
              <div
                className={`h-7 w-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${currentMember.avatarColor}`}
              >
                {currentMember.nickname.slice(0, 1)}
              </div>
              <div className="hidden sm:block text-left">
                <select
                  value={currentMember.id}
                  onChange={e => onChangeCurrentMember(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 p-0 pr-4 cursor-pointer outline-none"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role === 'admin' ? 'এডমিন' : m.role === 'treasurer' ? 'ক্যাশিয়ার' : 'সদস্য'})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>রুম {currentMember.roomNo || 'N/A'}</span>
                  <span>•</span>
                  <span className="capitalize font-medium text-emerald-600">
                    {currentMember.role === 'admin' ? t.admin : currentMember.role === 'treasurer' ? t.treasurer : t.member}
                  </span>
                </div>
              </div>

              {/* Mobile selector */}
              <select
                value={currentMember.id}
                onChange={e => onChangeCurrentMember(e.target.value)}
                className="sm:hidden absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Switch User Role"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
