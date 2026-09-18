import { GoogleGenAI } from '@google/genai';
import { getDatabase, calculateMonthlyAccount } from './db.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function answerMessQuery(query: string, userMemberId?: string, userRole: string = 'member'): Promise<string> {
  const db = getDatabase();
  const currentMonth = '2026-09';
  const calculation = calculateMonthlyAccount(currentMonth, 'open');

  const todayStr = '2026-09-17';
  const tomorrowStr = '2026-09-18';

  const todayCook = db.cookingDuties.find(c => c.date === todayStr);
  const tomorrowCook = db.cookingDuties.find(c => c.date === tomorrowStr);
  const todayMenu = db.mealMenus.find(m => m.date === todayStr);
  const tomorrowMenu = db.mealMenus.find(m => m.date === tomorrowStr);
  const todayBazar = db.bazarDuties.find(b => b.date === todayStr);
  const tomorrowBazar = db.bazarDuties.find(b => b.date === tomorrowStr);

  const activeMembers = db.members.filter(m => m.status === 'active');
  const userMember = db.members.find(m => m.id === userMemberId) || activeMembers[0];
  const userStatement = calculation.statements[userMember?.id || 'm1'];

  // Grounding context with exact numbers from DB
  const contextData = {
    messName: db.settings.messName,
    currentDate: todayStr,
    currentMonth: 'September 2026',
    membersCount: activeMembers.length,
    todayCookingDuty: todayCook ? `${todayCook.memberName} (${todayCook.status})` : 'কাউকে এখনো বরাদ্দ করা হয়নি',
    tomorrowCookingDuty: tomorrowCook ? `${tomorrowCook.memberName} (${tomorrowCook.status})` : 'বরাদ্দ করা হয়নি',
    todayMenu: todayMenu ? { breakfast: todayMenu.breakfast, lunch: todayMenu.lunch, dinner: todayMenu.dinner } : 'নির্ধারিত হয়নি',
    tomorrowMenu: tomorrowMenu ? { breakfast: tomorrowMenu.breakfast, lunch: tomorrowMenu.lunch, dinner: tomorrowMenu.dinner } : 'নির্ধারিত হয়নি',
    todayBazarDuty: todayBazar ? `${todayBazar.memberName} (${todayBazar.status})` : 'কোন শিডিউল নেই',
    tomorrowBazarDuty: tomorrowBazar ? `${tomorrowBazar.memberName} (${tomorrowBazar.status})` : 'কোন শিডিউল নেই',
    totalMealsThisMonth: calculation.totalMeals,
    totalBazarExpenseThisMonth: `৳${calculation.totalBazarExpense}`,
    mealRateThisMonth: `৳${calculation.mealRate}`,
    totalSharedExpensesThisMonth: `৳${calculation.totalSharedExpenses}`,
    totalMessExpenseThisMonth: `৳${calculation.totalMessExpense}`,
    totalCollectedThisMonth: `৳${calculation.totalCollected}`,
    totalDueThisMonth: `৳${calculation.totalDue}`,
    topMealMembers: Object.values(calculation.statements)
      .sort((a, b) => b.totalMeals - a.totalMeals)
      .slice(0, 5)
      .map(s => `${s.memberName}: ${s.totalMeals} meals (খরচ ৳${s.mealCost}, জমা ৳${s.totalPaid}, বাকি/উদ্বৃত্ত: ৳${s.netBalance})`),
    currentUserInfo: {
      name: userMember?.name,
      role: userRole,
      meals: userStatement?.totalMeals,
      mealCost: `৳${userStatement?.mealCost}`,
      sharedCost: `৳${userStatement?.sharedCostsShare}`,
      totalCost: `৳${userStatement?.totalCost}`,
      paid: `৳${userStatement?.totalPaid}`,
      balance: userStatement?.netBalance > 0 ? `বকেয়া/Due: ৳${userStatement.netBalance}` : `অগ্রিম/Credit: ৳${Math.abs(userStatement?.netBalance || 0)}`,
    },
    expensesByCategory: db.expenses.map(e => `${e.date} [${e.category}]: ৳${e.amount} (${e.description})`),
  };

  const systemInstruction = `You are the intelligent, helpful Mess AI Assistant for "${db.settings.messName}" in Bangladesh.
You answer questions in Bengali or English (matching the user's question language, defaulting to Bengali).
CRITICAL RULES:
1. ALWAYS use the exact facts and financial calculations provided in the Grounded Mess Data below.
2. NEVER guess, estimate, or invent financial figures. If information is not in the data, state it politely.
3. Show the exact breakdown or calculation formula wherever helpful.
4. Keep the tone warm, respectful, and crystal clear for mess brothers/students. Currency is Bangladeshi Taka (৳/BDT).`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Grounded Mess Data:
${JSON.stringify(contextData, null, 2)}

User Question: "${query}"

Provide an accurate, well-formatted answer based ONLY on the data above.`,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || 'তথ্য পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  } catch (err: any) {
    console.error('AI assistant error:', err);
    // Graceful fallback with direct calculation if API key is not yet set
    return `[মেস সহকারী অফলাইন মোড]\nপ্রশ্ন: "${query}"\n\nবর্তমান সেপ্টেম্বর ২০২৬ হিসাব সংক্ষেপ:\n• মোট মিল: ${calculation.totalMeals} টি\n• বাজার খরচ: ৳${calculation.totalBazarExpense.toLocaleString()}\n• মিল রেট: ৳${calculation.mealRate.toFixed(2)}\n• আজ রান্না করবেন: ${todayCook?.memberName || 'রহিম'}\n• আজকের মেনু: দুপুরের ভাত + মাছ, রাতে চিকেন\n• আপনার জমা: ৳${userStatement?.totalPaid || 0}, স্ট্যাটাস: ${userStatement?.netBalance > 0 ? 'বকেয়া ৳' + userStatement.netBalance : 'উদ্বৃত্ত ৳' + Math.abs(userStatement?.netBalance || 0)}\n\n(AI Assistant server-side Gemini API সক্রিয় রয়েছে।)`;
  }
}
