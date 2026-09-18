import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  X,
  UserCheck,
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  UserPlus,
  HelpCircle,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Member } from '../types.js';
import { BachelorZoneLogo } from './BachelorZoneLogo.js';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  members?: Member[];
  currentMemberId?: string;
  onSelectMember?: (memberId: string) => void;
  initialRole?: 'admin' | 'member';
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  members = [],
  currentMemberId,
  onSelectMember,
  initialRole = 'admin',
}) => {
  const { login, firstTimeSetup, forgotPassword, adminProfile, currentUserName, isAdmin, logout } = useAuth();

  const [activeRole, setActiveRole] = useState<'admin' | 'member'>(initialRole);
  const [mode, setMode] = useState<'login' | 'setup' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('01711234567');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Member login states
  const [selectedMemberLoginId, setSelectedMemberLoginId] = useState<string>(
    currentMemberId || (members[0]?.id || '')
  );
  const [memberPhoneInput, setMemberPhoneInput] = useState('');

  // Setup form states
  const [setupName, setSetupName] = useState(adminProfile?.name || 'Rahim Uddin');
  const [setupPhone, setSetupPhone] = useState(adminProfile?.phone || '01711234567');
  const [setupEmail, setSetupEmail] = useState(adminProfile?.email || 'rahim.mess@gmail.com');
  const [setupMessName, setSetupMessName] = useState(adminProfile?.messName || 'শান্তিনগর মেস');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let targetMember: Member | undefined;
    if (memberPhoneInput.trim()) {
      targetMember = members.find(
        m => m.phone === memberPhoneInput.trim() || m.roomNo === memberPhoneInput.trim()
      );
      if (!targetMember) {
        setErrorMsg('প্রদত্ত মোবাইল নম্বর বা রুম নম্বরের কোনো সদস্য পাওয়া যায়নি');
        return;
      }
    } else {
      targetMember = members.find(m => m.id === selectedMemberLoginId);
    }

    if (targetMember && onSelectMember) {
      onSelectMember(targetMember.id);
      setSuccessMsg(`${targetMember.name} (রুম ${targetMember.roomNo}) সদস্য পোর্টালে লগইন সম্পন্ন হয়েছে!`);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }, 700);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const result = await login(identifier, password, rememberMe);
    setLoading(false);

    if (result.success) {
      setSuccessMsg('লগইন সফল হয়েছে! ড্যাশবোর্ডে আপনাকে স্বাগতম।');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }, 700);
    } else {
      setErrorMsg(result.error || 'ভুল ফোন নম্বর/ইমেইল অথবা পাসওয়ার্ড');
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (setupPassword.length < 6) {
      setErrorMsg('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setErrorMsg('পাসওয়ার্ড দুটি মেলেনি');
      return;
    }

    setLoading(true);
    const result = await firstTimeSetup({
      name: setupName,
      phone: setupPhone,
      email: setupEmail,
      messName: setupMessName,
      password: setupPassword,
      confirmPassword: setupConfirmPassword,
    });
    setLoading(false);

    if (result.success) {
      setSuccessMsg('এডমিন অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }, 800);
    } else {
      setErrorMsg(result.error || 'সেটআপ সম্পন্ন করা সম্ভব হয়নি');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const result = await forgotPassword(identifier);
    setLoading(false);

    if (result.success) {
      setSuccessMsg(result.message || 'পাসওয়ার্ড রিসেট নির্দেশনাবলী পাঠানো হয়েছে।');
    } else {
      setErrorMsg(result.error || 'অনুরোধ ব্যর্থ হয়েছে');
    }
  };

  const fillQuickDemo = (idVal: string, passVal: string) => {
    setIdentifier(idVal);
    setPassword(passVal);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header with Bachelor Zone branding */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <BachelorZoneLogo size="md" theme="white" subtitle="Mess Management System" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Role Selector: Admin Login vs Member Login (strictly separated) */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveRole('admin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Admin Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('member');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeRole === 'member'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-100" />
            <span>Member Login</span>
          </button>
        </div>

        {/* ADMIN LOGIN SECTION */}
        {activeRole === 'admin' && (
          <>
            {/* Navigation Mode Pill for Admin */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                এডমিন লগইন
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('setup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  mode === 'setup'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                নতুন এডমিন সেটআপ
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  mode === 'forgot'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                পাসওয়ার্ড উদ্ধার
              </button>
            </div>

            {/* Current status bar if already logged in as Admin */}
            {isAdmin && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>বর্তমানে <strong>{currentUserName}</strong> হিসেবে এডমিন লগইন আছেন</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setSuccessMsg('এডমিন সেশন লগআউট করা হয়েছে');
                  }}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-800 rounded font-medium hover:bg-rose-50 cursor-pointer"
                >
                  লগআউট
                </button>
              </div>
            )}
          </>
        )}

        {/* MEMBER LOGIN SECTION */}
        {activeRole === 'member' && (
          <form onSubmit={handleMemberLogin} className="p-6 pt-4 space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-200">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bachelor Zone মেস সদস্য লগইন</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                আপনার মেস একাউন্টে প্রবেশ করে মিল অন/অফ, আজকের মেনু, বাজার ও রান্নার দায়িত্ব এবং মাসিক ব্যক্তিগত হিসাব দেখুন।
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মেস সদস্য নির্বাচন করুন
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {members.map(mem => (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberLoginId(mem.id);
                      setMemberPhoneInput('');
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      selectedMemberLoginId === mem.id && !memberPhoneInput
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center ${mem.avatarColor}`}>
                        {mem.nickname?.slice(0, 1) || mem.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-slate-900 dark:text-white font-semibold">{mem.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">রুম {mem.roomNo || 'N/A'} • {mem.phone}</div>
                      </div>
                    </div>
                    {selectedMemberLoginId === mem.id && !memberPhoneInput && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        নির্বাচিত
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                অথবা মোবাইল নম্বর / রুম নং লিখুন
              </label>
              <input
                type="text"
                value={memberPhoneInput}
                onChange={e => setMemberPhoneInput(e.target.value)}
                placeholder="যেমন: 01811234567 বা রুম 101"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>সদস্য হিসেবে প্রবেশ করুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Alerts */}
        <div className="px-6 pt-2">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300 mb-3 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-700 dark:text-emerald-300 mb-3 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* ADMIN AUTH FORMS */}
        {activeRole === 'admin' && (
          <>
            {/* Form Mode 1: LOGIN */}
            {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 pt-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ইমেইল অথবা ফোন নম্বর <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="01711234567 অথবা rahim.mess@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  পাসওয়ার্ড <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>এই ব্রাউজারে মনে রাখুন (Remember Me)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>যাচাই করা হচ্ছে...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>লগইন করুন (Login)</span>
                </>
              )}
            </button>

            {/* Quick Demo Fill Shortcut Chips */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 mb-2 font-medium flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>টেস্টিং ডেমো ক্রেডেনশিয়ালস:</span>
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('01711234567', 'admin123')}
                  className="p-1.5 text-left rounded-lg bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 transition-colors"
                >
                  <div className="font-semibold">এডমিন (Rahim)</div>
                  <div className="text-[10px] text-slate-500">01711234567 / admin123</div>
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('01913456789', 'member123')}
                  className="p-1.5 text-left rounded-lg bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 transition-colors"
                >
                  <div className="font-semibold">মেম্বার (Hasan)</div>
                  <div className="text-[10px] text-slate-500">01913456789 / member123</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Form Mode 2: FIRST-TIME SETUP */}
        {mode === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="p-6 pt-2 space-y-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
              <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>মেসের প্রথমবার ব্যবহারের জন্য এডমিন অ্যাকাউন্ট ও মেস নাম নির্ধারণ করুন।</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মেসের নাম <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={setupMessName}
                onChange={e => setSetupMessName(e.target.value)}
                placeholder="যেমন: শান্তিনগর মেস"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  এডমিনের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  placeholder="রহিম উদ্দিন"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ফোন নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={setupPhone}
                  onChange={e => setSetupPhone(e.target.value)}
                  placeholder="01711234567"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ইমেইল ঠিকানা (ঐচ্ছিক)
              </label>
              <input
                type="email"
                value={setupEmail}
                onChange={e => setSetupEmail(e.target.value)}
                placeholder="admin@mess.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পাসওয়ার্ড <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  পাসওয়ার্ড নিশ্চিতকরণ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={setupConfirmPassword}
                  onChange={e => setSetupConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 mt-3"
            >
              {loading ? (
                <span>সংরক্ষণ হচ্ছে...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>এডমিন অ্যাকাউন্ট সংরক্ষণ করুন</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form Mode 3: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="p-6 pt-2 space-y-4">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              আপনার নিবন্ধিত মোবাইল নম্বর অথবা ইমেইল ঠিকানা প্রদান করুন। পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড প্রেরণ করা হবে।
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নিবন্ধিত ফোন অথবা ইমেইল <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="01711234567 অথবা email@example.com"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? <span>অনুরোধ প্রক্রিয়া হচ্ছে...</span> : <span>রিসেট নির্দেশ পাঠান</span>}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              >
                লগইন পাতায় ফিরে যান
              </button>
            </div>
          </form>
        )}
        </>
      )}

        {/* Security Footer Badge */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>নিরাপদ সেশন ও হ্যাশকৃত সুরক্ষা</span>
          </span>
          <span>RBAC Mess Authorization</span>
        </div>
      </div>
    </div>
  );
};
