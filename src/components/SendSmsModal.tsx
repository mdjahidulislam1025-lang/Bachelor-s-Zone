import React, { useState } from 'react';
import { Send, X, MessageSquare, CheckCircle2, Smartphone } from 'lucide-react';
import { Member, SmsType } from '../types.js';

interface SendSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSendSms: (recipientId: string, phone: string, message: string, type: SmsType) => Promise<void>;
  initialRecipientId?: string;
  initialType?: SmsType;
  initialMessage?: string;
}

export const SendSmsModal: React.FC<SendSmsModalProps> = ({
  isOpen,
  onClose,
  members,
  onSendSms,
  initialRecipientId,
  initialType = 'custom',
  initialMessage = '',
}) => {
  if (!isOpen) return null;

  const [recipientId, setRecipientId] = useState(initialRecipientId || members[0]?.id || '');
  const [phone, setPhone] = useState(
    members.find(m => m.id === (initialRecipientId || members[0]?.id))?.phone || ''
  );
  const [smsType, setSmsType] = useState<SmsType>(initialType);
  const [message, setMessage] = useState(
    initialMessage || 'আসসালামু আলাইকুম। Bachelor Zone জরুরি নোটিশ: নির্ধারিত সময় অনুযায়ী মেস একাউন্ট আপডেট করা হয়েছে। - Bachelor Zone'
  );
  const [isSending, setIsSending] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleRecipientChange = (mId: string) => {
    setRecipientId(mId);
    const m = members.find(mem => mem.id === mId);
    if (m) {
      setPhone(m.phone);
    }
  };

  const handleTemplateSelect = (type: SmsType) => {
    setSmsType(type);
    const m = members.find(mem => mem.id === recipientId);
    const name = m ? m.name : 'ভাই';
    switch (type) {
      case 'cooking_reminder':
        setMessage(`Bachelor Zone: আসসালামু আলাইকুম ${name}। আজ আপনার রান্নার দায়িত্ব।`);
        break;
      case 'bazar_reminder':
        setMessage(`Bachelor Zone: আসসালামু আলাইকুম ${name}। আজ আপনার বাজার করার দায়িত্ব।`);
        break;
      case 'payment_reminder':
        setMessage(`Bachelor Zone: আসসালামু আলাইকুম ${name}। আপনার মেস বিল বাবদ কিছু বকেয়া রয়েছে। অনুগ্রহ করে হিসাব পরিশোধ করুন।`);
        break;
      case 'monthly_account':
        setMessage(`Bachelor Zone: আসসালামু আলাইকুম ${name}। চলতি সেপ্টেম্বর মাসের হিসাব প্রস্তুত হয়েছে। বিস্তারিত হিসাব অ্যাপে দেখুন।`);
        break;
      default:
        setMessage('');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !message.trim()) return;
    setIsSending(true);
    await onSendSms(recipientId, phone, message, smsType);
    setIsSending(false);
    setSuccessNotice(`এসএমএস সফলভাবে ${phone} নম্বরে প্রেরণ করা হয়েছে!`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <MessageSquare className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">এসএমএস পাঠান (Send SMS)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successNotice ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-slate-800">{successNotice}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
            {/* Template buttons */}
            <div>
              <span className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                রেডিমেড টেমপ্লেট
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('cooking_reminder')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left truncate border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer"
                >
                  🍳 রান্নার রিমাইন্ডার
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('bazar_reminder')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left truncate border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100 cursor-pointer"
                >
                  🛒 বাজারের রিমাইন্ডার
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('payment_reminder')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left truncate border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 cursor-pointer"
                >
                  💵 বকেয়া রিমাইন্ডার
                </button>
                <button
                  type="button"
                  onClick={() => handleTemplateSelect('monthly_account')}
                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold text-left truncate border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100 cursor-pointer"
                >
                  📊 মাসিক হিসাব SMS
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রাপক সদস্য
              </label>
              <select
                value={recipientId}
                onChange={e => handleRecipientChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.nickname}) - রুম {m.roomNo || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                মোবাইল নম্বর
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                বার্তার মূল বক্তব্য (Message Text)
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? 'পাঠানো হচ্ছে...' : 'এসএমএস পাঠান'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
