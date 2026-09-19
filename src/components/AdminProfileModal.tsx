import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  ShieldCheck,
  User,
  Phone,
  Mail,
  Building2,
  Lock,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Save,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ isOpen, onClose }) => {
  const { adminProfile, updateProfile, changePassword, isAdmin } = useAuth();

  const [name, setName] = useState(adminProfile?.name || 'Jahidul Islam');
  const [photo, setPhoto] = useState(adminProfile?.photo || '');
  const [phone, setPhone] = useState(adminProfile?.phone || '01711234567');
  const [email, setEmail] = useState(adminProfile?.email || 'mdjahidulislam1025@gmail.com');
  const [messName, setMessName] = useState(adminProfile?.messName || 'Bachelor Zone');

  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (adminProfile) {
      setName(adminProfile.name);
      setPhoto(adminProfile.photo || '');
      setPhone(adminProfile.phone);
      setEmail(adminProfile.email);
      setMessName(adminProfile.messName);
    }
  }, [adminProfile]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setLoading(true);

    const res = await updateProfile({
      name,
      photo,
      phone,
      email,
      messName,
    });

    setLoading(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'এডমিন প্রোফাইল সফলভাবে হালনাগাদ করা হয়েছে' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'নতুন পাসওয়ার্ড দুটি মেলেনি' });
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setLoading(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-emerald-600 via-teal-700 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-emerald-200" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold tracking-tight">{name || 'Admin Profile'}</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  {adminProfile?.role?.toUpperCase() || 'ADMIN'}
                </span>
              </div>
              <p className="text-xs text-emerald-100">{messName || 'Bachelor Zone'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-only System Metadata Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <User className="w-3.5 h-3.5" />
              <span>এডমিন আইডি</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {adminProfile?.id || 'admin_m1'}
            </div>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>স্ট্যাটাস</span>
            </div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {adminProfile?.status === 'active' ? 'সক্রিয় (Active)' : 'Inactive'}
            </div>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>তৈরি হয়েছে</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              {adminProfile?.createdDate || '2026-01-01'}
            </div>
          </div>

          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>সর্বশেষ লগইন</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {adminProfile?.lastLogin ? new Date(adminProfile.lastLogin).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : 'আজ'}
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div className="px-6 pt-4">
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                এডমিনের পুরো নাম <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ফোন নম্বর <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ইমেইল ঠিকানা
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                মেসের নাম <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={messName}
                  onChange={e => setMessName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              প্রোফাইল ছবির লিঙ্ক (URL)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Camera className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={photo}
                onChange={e => setPhoto(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center space-x-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>{showPasswordSection ? 'পাসওয়ার্ড পরিবর্তন লুকান' : 'পাসওয়ার্ড পরিবর্তন করুন'}</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>

        {/* Change Password Sub-Section */}
        {showPasswordSection && (
          <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2 my-3">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>এডমিন পাসওয়ার্ড পরিবর্তন</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বর্তমান পাসওয়ার্ড
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="বর্তমান পাসওয়ার্ড দিন"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড (মিন ৬ অক্ষর)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="নতুন পাসওয়ার্ড"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড নিশ্চিতকরণ
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="পুনরায় পাসওয়ার্ড"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                পাসওয়ার্ড আপডেট করুন
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
