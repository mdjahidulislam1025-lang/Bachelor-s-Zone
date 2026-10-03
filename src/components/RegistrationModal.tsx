import React, { useState } from 'react';
import {
  UserPlus,
  Lock,
  Phone,
  User,
  CreditCard,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  KeyRound,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from '../utils/phoneUtils.js';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const { register, verifyPhoneOtp } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [roomNo, setRoomNo] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Flow & State
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [smsConfigured, setSmsConfigured] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validation helpers
  const normalizedPhone = normalizeBangladeshPhone(phone);
  const isPhoneValid = phone.length > 0 && isValidBangladeshPhone(phone);
  const isPasswordMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordLengthOk = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Client-side validations
    if (!fullName.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার পুরো নাম প্রদান করুন (Full name is required)');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('অনুগ্রহ করে সঠিক মোবাইল নম্বর প্রদান করুন (Phone number is required)');
      return;
    }
    if (!isValidBangladeshPhone(phone)) {
      setErrorMsg('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678 বা +8801712345678)');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না (Passwords do not match)');
      return;
    }

    setLoading(true);
    const res = await register({
      fullName: fullName.trim(),
      phone: phone.trim(),
      password,
      confirmPassword,
      studentId: studentId.trim() || undefined,
      roomNo: roomNo.trim() || undefined,
    });
    setLoading(false);

    if (res.success) {
      setRegisteredPhone(normalizedPhone);
      setSmsConfigured(!!res.smsGatewayConfigured);

      if (res.requiresPhoneVerification) {
        setStep('otp');
        setSuccessMsg(res.message || 'আপনার ফোনে ভেরিফিকেশন কোড পাঠানো হয়েছে');
      } else {
        setStep('success');
        setSuccessMsg(
          res.message ||
            'রেজিস্ট্রেশন আবেদন সফলভাবে জমা হয়েছে। স্থায়ী প্রধান এডমিন (Jahidul Islam) অনুমোদন করলে আপনি লগইন করতে পারবেন।'
        );
      }
    } else {
      setErrorMsg(res.error || 'রেজিস্ট্রেশন সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg('অনুগ্রহ করে সঠিক ৬ ডিজিটের ওটিপি কোড লিখুন');
      return;
    }

    setLoading(true);
    const res = await verifyPhoneOtp(registeredPhone, otpCode.trim());
    setLoading(false);

    if (res.success) {
      setStep('success');
      setSuccessMsg(res.message || 'ফোন নম্বর ভেরিফাই হয়েছে! আবেদনটি প্রধান এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।');
    } else {
      setErrorMsg(res.error || 'ভুল ওটিপি কোড');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-xs rounded-2xl border border-white/20 text-white shadow-inner">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">নতুন সদস্য রেজিস্ট্রেশন</h2>
              <p className="text-xs text-emerald-100 font-medium mt-0.5">
                Bachelor Zone — নিরাপদ মেস ম্যানেজমেন্ট সিস্টেম
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && step !== 'success' && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs animate-in slide-in-from-top-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{successMsg}</div>
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  পুরো নাম (Full Name) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="যেমন: মোঃ সাকিব আহমেদ"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Bangladesh Phone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    বাংলাদেশি মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  {phone && (
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        isPhoneValid
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPhoneValid ? `✓ ${normalizedPhone}` : '১১ ডিজিট দিন'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01712345678 অথবা +8801712345678"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 font-mono text-slate-800 placeholder:text-slate-400 ${
                      phone.length > 0 && !isPhoneValid
                        ? 'border-amber-300 focus:ring-amber-500'
                        : 'border-slate-200 focus:ring-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  লগইন করার জন্য আপনার এই নম্বরটি ব্যবহার করতে হবে।
                </p>
              </div>

              {/* Password Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Create Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    পাসওয়ার্ড তৈরি করুন <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষর"
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showPassword ? 'লুকান' : 'দেখান'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    পাসওয়ার্ড নিশ্চিত করুন <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="একই পাসওয়ার্ড লিখুন"
                      className={`w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 font-medium text-slate-800 placeholder:text-slate-400 ${
                        confirmPassword.length > 0 && !isPasswordMatch
                          ? 'border-rose-300 focus:ring-rose-500'
                          : 'border-slate-200 focus:ring-emerald-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showConfirmPassword ? 'লুকান' : 'দেখান'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password checks badge */}
              {password.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                      isPasswordLengthOk ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isPasswordLengthOk ? '✓ ৬+ অক্ষর' : '• ন্যূনতম ৬ অক্ষর'}
                  </span>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                        isPasswordMatch ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isPasswordMatch ? '✓ পাসওয়ার্ড মিলেছে' : '✗ পাসওয়ার্ড মিলছে না'}
                    </span>
                  )}
                </div>
              )}

              {/* Optional Fields: Student ID & Room No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    স্টুডেন্ট / মেম্বার আইডি <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      placeholder="যেমন: 2021-1-60-001"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    রুম নম্বর <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={roomNo}
                      onChange={e => setRoomNo(e.target.value)}
                      placeholder="যেমন: 302, 4A"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Policy note */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700">সুরক্ষা নীতি:</span> রেজিস্ট্রেশন সম্পন্ন করার পর আবেদনটি স্থায়ী প্রধান এডমিন{' '}
                  <span className="font-semibold text-emerald-700">Jahidul Islam</span> এর অনুমোদনের জন্য যাবে। অনুমোদন পাওয়ার পর আপনি আপনার ফোন নম্বর ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>প্রক্রিয়াধীন রয়েছে...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>রেজিস্ট্রেশন আবেদন জমা দিন</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Phone OTP Verification (if SMS Gateway configured) */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full mb-2">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">ফোন নম্বর ভেরিফিকেশন কোড</h3>
                <p className="text-xs text-slate-600 mt-1">
                  আপনার <span className="font-mono font-bold text-emerald-700">{registeredPhone}</span> নম্বরে একটি ৬ ডিজিটের ভেরিফিকেশন কোড পাঠানো হয়েছে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  ৬ ডিজিটের ওটিপি কোড লিখুন
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="******"
                  className="w-full text-center tracking-[0.4em] py-3 text-lg font-mono font-bold bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>যাচাই করা হচ্ছে...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>কোড যাচাই করুন</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Submission Success / Pending Approval */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex p-4 bg-emerald-100 text-emerald-700 rounded-full">
                <Clock className="h-8 w-8 animate-pulse text-emerald-600" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  রেজিস্ট্রেশন আবেদন অনুমোদনের অপেক্ষায়
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  আপনার আবেদনটি সফলভাবে জমা হয়েছে। মেসের গোপনীয় তথ্য ও সুরক্ষার স্বার্থে স্থায়ী প্রধান এডমিন{' '}
                  <strong className="text-slate-800">Jahidul Islam</strong> আপনার রেজিস্ট্রেশন অনুমোদন করার পর আপনি আপনার ফোন নম্বর ও পাসওয়ার্ড দিয়ে মেস সিস্টেমে প্রবেশ করতে পারবেন।
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 font-medium text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">নাম:</span>
                  <span className="font-bold">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">নিবন্ধিত মোবাইল:</span>
                  <span className="font-mono font-bold">{registeredPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">আবেদনের স্থিতি:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                    PENDING_APPROVAL (অনুমোদনের অপেক্ষায়)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ফোন ভেরিফিকেশন:</span>
                  <span className="text-slate-700 font-semibold">
                    {smsConfigured ? '✓ সম্পন্ন হয়েছে' : 'গেটওয়ে নিষ্ক্রিয় (এডমিন সরাসরি অনুমোদন করবেন)'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToLogin();
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>লগইন পেজে যান</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Switch to Login Link */}
          {step === 'form' && (
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                ইতিমধ্যে মেস একাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToLogin();
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer ml-1 inline-flex items-center gap-1"
                >
                  <span>লগইন করুন (Already have an account? Login)</span>
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
