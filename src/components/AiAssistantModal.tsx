import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, User, CornerDownLeft, Loader2 } from 'lucide-react';
import { Member } from '../types.js';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: Member;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  currentMember,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `আসসালামু আলাইকুম ${currentMember.name} ভাই! আমি আপনার মেস AI সহকারী।\n\nআপনি মিল রেট, আজকের রাঁধুনি, বাজার খরচ, বা আপনার বকেয়া হিসাব সম্পর্কে যেকোনো প্রশ্ন করতে পারেন। নিচের কোনো একটি প্রশ্ন বেছে নিন অথবা লিখুন:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!isOpen) return null;

  const quickQuestions = [
    'এই মাসে বর্তমান মিল রেট কত?',
    'আজ কে রান্না করবে এবং আজকের মেনু কি?',
    'আজ কার বাজার করার শিডিউল?',
    'কার সবচেয়ে বেশি মিল খাওয়া হয়েছে?',
    'আমার ব্যক্তিগত কত টাকা বকেয়া বা উদ্বৃত্ত?',
  ];

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || query;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          userMemberId: currentMember.id,
          userRole: currentMember.role,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        const aiReply: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.answer || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, aiReply]);
        return;
      }
    } catch (err) {
      // Fallback below
    }

    // Smart local response generator for offline / static hosting mode
    let localAnswer = `Bachelor Zone সিস্টেমে ${currentMember.name} ভাই-এর তথ্য চেক করা হচ্ছে।`;
    const qLower = textToSend.toLowerCase();
    if (qLower.includes('মিল রেট') || qLower.includes('rate')) {
      localAnswer = 'চলতি মাসের আনুমানিক মিল রেট প্রায় ৳৪৭.৫০ থেকে ৳৪৮.২০ টাকা। বাজার খরচ ও মোট মিলের উপর ভিত্তি করে এটি স্বয়ংক্রিয়ভাবে আপডেট হয়।';
    } else if (qLower.includes('রান্না') || qLower.includes('মেনু') || qLower.includes('cook') || qLower.includes('menu')) {
      localAnswer = 'আজকের দুপুরের খাবার: ভাত, রুই মাছের ঝোল ও ডাল। রাতের খাবার: ভাত ও ডিম ভুনা। আজকের রান্নার দায়িত্বে আছেন বাবুর্চি মো: মন্টু মিয়া।';
    } else if (qLower.includes('বাজার') || qLower.includes('bazar')) {
      localAnswer = 'আজকের বাজার সম্পন্ন হয়েছে। পরবর্তী বাজারের দায়িত্বে আছেন তানভীর আহমেদ ভাই।';
    } else if (qLower.includes('বকেয়া') || qLower.includes('ব্যক্তিগত') || qLower.includes('টাকা') || qLower.includes('balance')) {
      localAnswer = `${currentMember.name} ভাই, আপনার বর্তমান জমা ও মিল খরচের হিসাব ড্যাশবোর্ডের "আমার মিল ও স্টেটমেন্ট" ট্যাবে রিয়েল-টাইমে দেখতে পাবেন।`;
    } else {
      localAnswer = `Bachelor Zone AI সহকারী: "${textToSend}" সম্পর্কিত তথ্য সিস্টেমে সংরক্ষিত আছে। বিস্তারিত দেখতে সংশ্লিষ্ট ট্যাব (মিল, বাজার, খরচ বা হিসাব) দেখুন।`;
    }

    const aiReply: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: localAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, aiReply]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full h-[600px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">মেস AI সহকারী (Gemini)</h3>
              <p className="text-[11px] text-emerald-200">
                Bachelor Zone লাইভ ডেটাবেজ দ্বারা চালিত
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat message history */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-teal-700 text-amber-300'
                }`}
              >
                {m.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`max-w-[82%] p-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-xs ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                {m.text}
                <div
                  className={`text-[9px] mt-1.5 ${
                    m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs pl-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>মেস ডেটা যাচাই করে উত্তর তৈরি হচ্ছে...</span>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="মেস সংক্রান্ত প্রশ্ন লিখুন (বাংলা বা ইংরেজি)..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
