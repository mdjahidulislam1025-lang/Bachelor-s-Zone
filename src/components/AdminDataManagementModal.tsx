import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  FileJson,
  UserPlus,
  Lock,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { Member } from '../types.js';

interface AdminDataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
  onMemberAdded?: (member: Member) => void;
}

export const AdminDataManagementModal: React.FC<AdminDataManagementModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  onMemberAdded,
}) => {
  const { session, currentUserName, isAdmin } = useAuth();
  const [tab, setTab] = useState<'backup' | 'addMember'>('backup');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup state
  const [restoreJson, setRestoreJson] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Add Member state
  const [memberName, setMemberName] = useState('');
  const [memberNickname, setMemberNickname] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRoom, setMemberRoom] = useState('106');
  const [memberRole, setMemberRole] = useState<'member' | 'treasurer'>('member');
  const [memberInitialBalance, setMemberInitialBalance] = useState('3000');
  const [createLogin, setCreateLogin] = useState(true);
  const [memberPassword, setMemberPassword] = useState('member123');
  const [sendInvitationSms, setSendInvitationSms] = useState(true);

  if (!isOpen) return null;

  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backup/export', {
        headers: {
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': session?.userId || 'm1',
        },
      });
      if (!res.ok) throw new Error('এক্সপোর্ট ব্যর্থ হয়েছে');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mess-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMsg({ type: 'success', text: 'মেস ডাটাবেজের সম্পূর্ণ ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'ব্যাকআপ ডাউনলোড ব্যর্থ হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setRestoreJson(content);
    };
    reader.readAsText(file);
  };

  const handleRestoreBackup = async () => {
    if (!restoreJson.trim()) {
      setStatusMsg({ type: 'error', text: 'অনুগ্রহ করে ব্যাকআপ JSON ফাইল সিলেক্ট অথবা পেস্ট করুন' });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);
      let parsed = JSON.parse(restoreJson);
      if (parsed.data && parsed.data.members) {
        parsed = parsed.data;
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': session?.userId || 'm1',
        },
        body: JSON.stringify({ backupData: parsed }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'রিস্টোর ব্যর্থ হয়েছে');
      }

      setStatusMsg({ type: 'success', text: 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে! তথ্য রিফ্রেশ করা হচ্ছে...' });
      setTimeout(() => {
        if (onDataRestored) onDataRestored();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'ভুল JSON ডাটা ফরম্যাট: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberPhone.trim()) {
      setStatusMsg({ type: 'error', text: 'সদস্যের নাম ও ফোন নম্বর আবশ্যক' });
      return;
    }

    try {
      setLoading(true);
      setStatusMsg(null);

      const payload = {
        member: {
          name: memberName.trim(),
          nickname: memberNickname.trim() || memberName.trim().split(' ')[0],
          phone: memberPhone.trim(),
          email: memberEmail.trim(),
          roomNo: memberRoom.trim(),
          role: memberRole,
          status: 'active' as const,
          notes: 'নতুন সদস্য',
        },
        createLogin,
        initialPassword: memberPassword,
        initialBalance: memberInitialBalance ? Number(memberInitialBalance) : 0,
        sendInvitationSms,
      };

      const res = await fetch('/api/members/with-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.token || ''}`,
          'x-user-id': session?.userId || 'm1',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'সদস্য যোগ করতে ব্যর্থ হয়েছে');
      }

      setStatusMsg({ type: 'success', text: `সদস্য ${memberName} সফলভাবে যুক্ত করা হয়েছে!` });
      if (onMemberAdded && data.member) {
        onMemberAdded(data.member);
      }

      // Reset form
      setMemberName('');
      setMemberNickname('');
      setMemberPhone('');
      setMemberEmail('');
      setMemberInitialBalance('3000');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'সমস্যা হয়েছে' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">এডমিন ডেটা ও মেম্বার ব্যবস্থাপনা</h2>
              <p className="text-xs text-slate-400">মেসের সম্পূর্ণ ব্যাকআপ, রিস্টোর ও সুরক্ষিত সদস্য তৈরি</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1.5 text-xs font-medium">
          <button
            onClick={() => {
              setTab('backup');
              setStatusMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              tab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ব্যাকআপ ও রিস্টোর
          </button>
          <button
            onClick={() => {
              setTab('addMember');
              setStatusMsg(null);
            }}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${
              tab === 'addMember'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            লগইনসহ নতুন সদস্য যোগ
          </button>
        </div>

        {/* Alerts */}
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
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          </div>
        )}

        {/* TAB 1: BACKUP & RESTORE */}
        {tab === 'backup' && (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center space-x-1.5">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>সম্পূর্ণ মেস ডাটাবেজ ব্যাকআপ (Export)</span>
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                  সকল মিল রেকর্ড, বাজার খরচ, পেমেন্ট ও সদস্য তথ্যের নিরাপদ JSON কপি সংরক্ষণ করুন।
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={loading}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 ml-3 shadow-xs"
              >
                ব্যাকআপ ডাউনলোড
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>পূর্বে সংরক্ষিত ব্যাকআপ রিস্টোর (Restore)</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center space-x-1"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>ফাইল থেকে আপলোড</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />

              <textarea
                rows={4}
                value={restoreJson}
                onChange={e => setRestoreJson(e.target.value)}
                placeholder="এখানে ব্যাকআপ JSON কোড পেস্ট করুন অথবা উপরের 'ফাইল থেকে আপলোড' চাপুন..."
                className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>সতর্কতা: রিস্টোর করলে বর্তমান ডাটাবেজ ফাইলের তথ্য প্রতিস্থাপিত হবে। শুধুমাত্র বিশ্বস্ত ব্যাকআপ ফাইল ব্যবহার করুন।</span>
              </div>

              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={loading || !restoreJson.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {loading ? 'রিস্টোর সম্পন্ন হচ্ছে...' : 'ডাটাবেজ রিস্টোর নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ADD MEMBER WITH LOGIN CREDENTIALS */}
        {tab === 'addMember' && (
          <form onSubmit={handleCreateMember} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  সদস্যের পুরো নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  placeholder="নাঈম ইসলাম"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ডাকনাম
                </label>
                <input
                  type="text"
                  value={memberNickname}
                  onChange={e => setMemberNickname(e.target.value)}
                  placeholder="নাঈম"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মোবাইল নম্বর (লগইন আইডি) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memberPhone}
                  onChange={e => setMemberPhone(e.target.value)}
                  placeholder="01712000000"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  রুম নম্বর
                </label>
                <input
                  type="text"
                  value={memberRoom}
                  onChange={e => setMemberRoom(e.target.value)}
                  placeholder="106"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  মেসের রোল
                </label>
                <select
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                >
                  <option value="member">সাধারণ সদস্য (Member)</option>
                  <option value="treasurer">মেস ক্যাশিয়ার (Treasurer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  প্রারম্ভিক অগ্রিম জমা (৳)
                </label>
                <input
                  type="number"
                  value={memberInitialBalance}
                  onChange={e => setMemberInitialBalance(e.target.value)}
                  placeholder="3000"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                />
              </div>
            </div>

            {/* Login Credential Generation */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={createLogin}
                  onChange={e => setCreateLogin(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>সদস্যের জন্য নিজস্ব লগইন অ্যাকাউন্ট তৈরি করুন</span>
                </span>
              </label>

              {createLogin && (
                <div className="pt-1 pl-5 space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                      প্রাথমিক পাসওয়ার্ড (ডিফল্ট: member123)
                    </label>
                    <input
                      type="text"
                      value={memberPassword}
                      onChange={e => setMemberPassword(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={sendInvitationSms}
                      onChange={e => setSendInvitationSms(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3 text-emerald-500" />
                      <span>স্বাগতম ও লগইন নির্দেশনাবলী SMS প্রেরণ করুন</span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'সদস্য যুক্ত হচ্ছে...' : 'সদস্য নিশ্চিত ও সংরক্ষণ করুন'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
