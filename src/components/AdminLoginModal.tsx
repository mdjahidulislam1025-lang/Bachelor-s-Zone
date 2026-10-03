import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  Lock,
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
  Info,
  Clock,
} from 'lucide-react';
import { Member } from '../types.js';
import { BachelorZoneLogo } from './BachelorZoneLogo.js';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from '../utils/phoneUtils.js';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  members?: Member[];
  currentMemberId?: string;
  onSelectMember?: (memberId: string) => void;
  initialRole?: 'admin' | 'member';
  onOpenRegister?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  members = [],
  currentMemberId,
  initialRole = 'member',
  onOpenRegister,
}) => {
  const { login, forgotPassword, adminProfile, currentUserName, currentUserRole, isLoggedIn, logout } = useAuth();

  const [activeRole, setActiveRole] = useState<'admin' | 'member'>(initialRole);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  // Login form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password form fields
  const [forgotPhone, setForgotPhone] = useState('');

  // Status and feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingRegInfo, setPendingRegInfo] = useState<any | null>(null);

  if (!isOpen) return null;

  const normalizedPhone = normalizeBangladeshPhone(identifier);
  const isPhoneFormat = isValidBangladeshPhone(identifier);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setPendingRegInfo(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg('অনুগ্রহ করে আপনার রেজিস্টার্ড ফোন নম্বর দিন (Registered phone number is required)');
      return;
    }

    if (!password) {
      setErrorMsg('অনুগ্রহ করে আপনার গোপন পাসওয়ার্ড দিন (Password is required)');
      return;
    }

    // If typing digits and not matching standard BD phone format, give helpful warning
    if (/^\+?[0-9\s-]+$/.test(cleanId) && !isPhoneFormat && cleanId.length > 5 && cleanId !== '01711234567') {
      setErrorMsg('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678 বা +8801712345678)');
      return;
    }

    setLoading(true);
    const result = await login(cleanId, password, rememberMe);
    setLoading(false);

    if (result.success) {
      setSuccessMsg('লগইন সফল হয়েছে! ড্যাশবোর্ডে আপনাকে স্বাগতম।');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      }, 700);
    } else {
      if (result.isPendingApproval) {
        setPendingRegInfo(result.registration || true);
        setErrorMsg(
          result.error ||
            'আপনার রেজিস্ট্রেশনটি প্রধান এডমিন (Jahidul Islam) এর অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পাওয়ার পর আপনি লগইন করতে পারবেন।'
        );
      } else if (result.isRejected) {
        setErrorMsg(result.error || 'আপনার রেজিস্ট্রেশন আবেদনটি বাতিল করা হয়েছে। মেস এডমিনের সাথে যোগাযোগ করুন।');
      } else {
        setErrorMsg(result.error || 'ভুল ফোন নম্বর অথবা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = forgotPhone.trim();
    if (!cleanPhone) {
      setErrorMsg('অনুগ্রহ করে আপনার রেজিস্টার্ড ফোন নম্বর দিন');
      return;
    }

    if (!isValidBangladeshPhone(cleanPhone)) {
      setErrorMsg('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    setLoading(true);
    const res = await forgotPassword(cleanPhone);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'পাসওয়ার্ড পুনরুদ্ধারের তথ্য প্রদান করা হয়েছে।');
    } else {
      setErrorMsg(res.error || 'পাসওয়ার্ড উদ্ধার প্রক্রিয়া ব্যর্থ হয়েছে। মেস প্রধান এডমিনের সাথে যোগাযোগ করুন।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="relative p-5 pb-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <BachelorZoneLogo className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Bachelor Zone</span>
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  লগইন
                </span>
              </h2>
              <p className="text-xs text-emerald-200">ফোন নম্বর ও পাসওয়ার্ড দিয়ে একাউন্টে প্রবেশ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently logged-in notification bar */}
        {isLoggedIn && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                বর্তমানে <strong>{currentUserName}</strong> ({currentUserRole === 'admin' ? 'এডমিন' : 'সদস্য'}) লগইন আছেন
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                setSuccessMsg('সফলভাবে লগআউট করা হয়েছে');
              }}
              className="text-[11px] px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              লগআউট
            </button>
          </div>
        )}

        {/* Tab Selection: Member Login vs Admin Login */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveRole('member');
              setMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
              setPendingRegInfo(null);
              setIdentifier('');
              setPassword('');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeRole === 'member'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>সদস্য লগইন (Member)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('admin');
              setMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
              setPendingRegInfo(null);
              setIdentifier('01516528497');
              setPassword('');
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeRole === 'admin'
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>এডমিন লগইন (Admin)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Informative Header per Role */}
          {mode === 'login' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeRole === 'member' ? 'মেস সদস্য পোর্টাল লগইন' : 'প্রধান এডমিন ও পরিচালনা প্যানেল'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeRole === 'member'
                    ? 'আপনার রেজিস্টার্ড মোবাইল নম্বর ও ব্যক্তিগত পাসওয়ার্ড দিয়ে লগইন করে নিজের মিল, বাজার ও ব্যক্তিগত পেমেন্ট হিসাব বিবরণী দেখুন।'
                    : 'মেস প্রধান এডমিন (Jahidul Islam) হিসেবে সকল সদস্যের হিসাব, অনুমোদন ও মেস পরিচালনা করতে প্রবেশ করুন।'}
                </p>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{errorMsg}</span>
                {pendingRegInfo && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[11px]">
                    <div className="font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>স্ট্যাটাস: PENDING_APPROVAL (অনুমোদনের অপেক্ষায়)</span>
                    </div>
                    <p className="mt-1">
                      প্রধান এডমিন জাহিদুল ইসলাম যাচাই বাছাই করে অনুমোদন দেওয়ার সাথে সাথেই আপনার একাউন্টটি সক্রিয় হয়ে যাবে।
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Mode 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Registered Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  রেজিস্টার্ড মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={e => {
                      setIdentifier(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={activeRole === 'member' ? '01712345678 বা 88017...' : '01516528497 বা ইমেইল'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                {identifier.length > 3 && isPhoneFormat && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3 inline" />
                    <span>স্ট্যান্ডার্ড ফরম্যাট: {normalizedPhone}</span>
                  </p>
                )}
              </div>

              {/* Password Field with Show/Hide */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    পাসওয়ার্ড (Password) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotPhone(identifier);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="আপনার ব্যক্তিগত পাসওয়ার্ড"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>লগইন মনে রাখুন (Remember Me)</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block animate-spin mr-2">⏳</span>
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>{loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন (Login)'}</span>
              </button>

              {/* Link to Registration */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bachelor Zone মেসে নতুন?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRegister) {
                        onOpenRegister();
                      }
                    }}
                    className="font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>নতুন রেজিস্ট্রেশন করুন</span>
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Form Mode 2: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>পাসওয়ার্ড উদ্ধার ও রিসেট নির্দেশিকা</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  আপনার রেজিস্টার্ড ১১ ডিজিটের ফোন নম্বর দিন। এসএমএস গেটওয়ে সক্রিয় থাকলে ভেরিফিকেশন ওটিপি পাঠানো হবে, নতুবা মেসের স্থায়ী প্রধান এডমিন (জাহিদুল ইসলাম) এর সাথে যোগাযোগ করে নিরাপত্তা ভেরিফিকেশনের মাধ্যমে পাসওয়ার্ড রিসেট করতে পারবেন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  রেজিস্টার্ড মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={forgotPhone}
                    onChange={e => setForgotPhone(e.target.value)}
                    placeholder="01712345678"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  লগইনে ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading ? 'প্রক্রিয়াকরণ...' : 'রিসেট অনুরোধ পাঠান'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
