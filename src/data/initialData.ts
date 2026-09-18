import {
  MessDatabaseState,
  AdminProfile,
  MemberCredentials,
  MealMenu,
  BazarRecord,
  MarketListItem,
  MonthlyAccount,
  MessSettings,
} from '../types.js';
import { simpleHashSync } from '../utils/authUtils.js';

export function getInitialMessData(): MessDatabaseState {
  const members = [
    {
      id: 'm1',
      name: 'Rahim Uddin',
      nickname: 'রহিম',
      phone: '+8801711234567',
      email: 'rahim.mess@gmail.com',
      roomNo: '101',
      role: 'admin' as const,
      status: 'active' as const,
      joiningDate: '2026-01-01',
      notes: 'মেস পরিচালক / এডমিন',
      avatarColor: 'bg-emerald-600',
    },
    {
      id: 'm2',
      name: 'Karimul Haque',
      nickname: 'করিম',
      phone: '+8801812345678',
      email: 'karim.finance@gmail.com',
      roomNo: '101',
      role: 'treasurer' as const,
      status: 'active' as const,
      joiningDate: '2026-01-01',
      notes: 'মেসের ক্যাশিয়ার ও হিসাবরক্ষক',
      avatarColor: 'bg-blue-600',
    },
    {
      id: 'm3',
      name: 'Hasan Mahmud',
      nickname: 'হাসান',
      phone: '+8801913456789',
      email: 'hasan.buet@gmail.com',
      roomNo: '102',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-02-15',
      notes: 'সদস্য - ইঞ্জিনিয়ারিং শিক্ষার্থী',
      avatarColor: 'bg-indigo-600',
    },
    {
      id: 'm4',
      name: 'Sakib Al Amin',
      nickname: 'সাকিব',
      phone: '+8801614567890',
      email: 'sakib.du@gmail.com',
      roomNo: '102',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-03-01',
      notes: 'সদস্য - ঢাকা বিশ্ববিদ্যালয়',
      avatarColor: 'bg-amber-600',
    },
    {
      id: 'm5',
      name: 'Tanvir Ahmed',
      nickname: 'তানভীর',
      phone: '+8801715678901',
      email: 'tanvir.jobs@gmail.com',
      roomNo: '103',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-01-10',
      notes: 'সদস্য - সফটওয়্যার ডেভেলপার',
      avatarColor: 'bg-purple-600',
    },
    {
      id: 'm6',
      name: 'Mehedi Hasan',
      nickname: 'মেহেদী',
      phone: '+8801516789012',
      email: 'mehedi.bba@gmail.com',
      roomNo: '103',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-04-01',
      notes: 'সদস্য - ব্যাংক কর্মকর্তা',
      avatarColor: 'bg-rose-600',
    },
    {
      id: 'm7',
      name: 'Faisal Hossain',
      nickname: 'ফয়সাল',
      phone: '+8801817890123',
      roomNo: '104',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-05-01',
      notes: 'সদস্য',
      avatarColor: 'bg-teal-600',
    },
    {
      id: 'm8',
      name: 'Tariqul Islam',
      nickname: 'তারিক',
      phone: '+8801918901234',
      roomNo: '104',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-06-01',
      notes: 'সদস্য',
      avatarColor: 'bg-cyan-600',
    },
    {
      id: 'm9',
      name: 'Rafiqul Islam',
      nickname: 'রফিক',
      phone: '+8801319012345',
      roomNo: '105',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-02-01',
      notes: 'সদস্য',
      avatarColor: 'bg-orange-600',
    },
    {
      id: 'm10',
      name: 'Shahadat Hossain',
      nickname: 'শাহাদাত',
      phone: '+8801410123456',
      roomNo: '105',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-07-01',
      notes: 'সদস্য',
      avatarColor: 'bg-lime-600',
    },
    {
      id: 'm11',
      name: 'Nayeem Khan',
      nickname: 'নাঈম',
      phone: '+8801712345679',
      roomNo: '106',
      role: 'member' as const,
      status: 'inactive' as const,
      joiningDate: '2026-01-01',
      leavingDate: '2026-08-31',
      notes: 'সাবেক সদস্য (আগস্টে মেস ছেড়েছেন)',
      avatarColor: 'bg-slate-500',
    },
  ];

  const adminProfile: AdminProfile = {
    id: 'admin_m1',
    name: 'Rahim Uddin',
    photo: '',
    phone: '01711234567',
    email: 'rahim.mess@gmail.com',
    passwordHash: simpleHashSync('admin123'),
    messName: 'শান্তিনগর মেস (Shantinagar Mess)',
    role: 'admin',
    status: 'active',
    createdDate: '2026-01-01',
    lastLogin: '2026-09-18T08:00:00.000Z',
  };

  const memberCredentials: Record<string, MemberCredentials> = {
    m1: {
      memberId: 'm1',
      phone: '01711234567',
      passwordHash: simpleHashSync('admin123'),
      isActive: true,
    },
    m2: {
      memberId: 'm2',
      phone: '01812345678',
      passwordHash: simpleHashSync('treasurer123'),
      isActive: true,
    },
    m3: {
      memberId: 'm3',
      phone: '01913456789',
      passwordHash: simpleHashSync('member123'),
      isActive: true,
    },
  };

  // 18 days of September 2026 Daily Meals
  const dailyMeals: any[] = [];
  for (let day = 1; day <= 18; day++) {
    const dateStr = `2026-09-${day.toString().padStart(2, '0')}`;
    const records: Record<string, any> = {};
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;

    members.forEach((m, idx) => {
      if (m.status !== 'active') return;
      const b = (day + idx) % 3 === 0 ? 1 : idx % 2 === 0 ? 1 : 0;
      const l = idx === 4 ? 0 : 1;
      const d = (day + idx) % 5 === 0 ? 0 : 1;

      records[m.id] = {
        memberId: m.id,
        breakfast: b,
        lunch: l,
        dinner: d,
        total: b + l + d,
        notes: '',
      };

      totalBreakfast += b;
      totalLunch += l;
      totalDinner += d;
    });

    dailyMeals.push({
      id: `dm-${dateStr}`,
      date: dateStr,
      records,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalMeals: totalBreakfast + totalLunch + totalDinner,
      status: 'confirmed',
      notes: day === 18 ? 'আজকের মিল হিসাব সম্পন্ন' : '',
    });
  }

  // Meal Menus for 7 days
  const mealMenus: MealMenu[] = [
    { id: 'menu-1', date: '2026-09-17', breakfast: 'খিচুড়ি + ডিম ভুনা', lunch: 'ভাত + রুই মাছ ঝোল + ডাল', dinner: 'ভাত + মুরগির মাংস + সবজি', updatedBy: 'Rahim Uddin' },
    { id: 'menu-2', date: '2026-09-18', breakfast: 'পরোটা + ডালভাজি + চা', lunch: 'ভাত + পাবদা মাছ + সালাদ', dinner: 'ভাত + ডিম তরকারি + আলুভর্তা', updatedBy: 'Rahim Uddin' },
    { id: 'menu-3', date: '2026-09-19', breakfast: 'ভাত + আলুভর্তা + ডাল', lunch: 'ভাত + গরুর মাংস ভুনা + লেবু', dinner: 'ভাত + ছোট মাছ চচ্চড়ি + ডাল', updatedBy: 'Rahim Uddin' },
    { id: 'menu-4', date: '2026-09-20', breakfast: 'রুটি + ডিম পোজ + কলা', lunch: 'ভাত + পাঙ্গাশ মাছ দো পেঁয়াজা', dinner: 'ভাত + মুরগি কারি + ডাল', updatedBy: 'Rahim Uddin' },
    { id: 'menu-5', date: '2026-09-21', breakfast: 'ভুনা খিচুড়ি + বেগুন ভাজা', lunch: 'ভাত + তেলাপিয়া ভুনা + শাকভাজি', dinner: 'ভাত + ডিম কারি + পাতলা ডাল', updatedBy: 'Rahim Uddin' },
    { id: 'menu-6', date: '2026-09-22', breakfast: 'স্পেশাল পরাটা + হালুয়া + ডিম', lunch: 'স্পেশাল বিফ তেহারি / পোলাও + সালাদ', dinner: 'ভাত + কাতল মাছ কালিয়া + ডাল', updatedBy: 'Rahim Uddin' },
    { id: 'menu-7', date: '2026-09-23', breakfast: 'রুটি + সবজি ভাজি + ডিম', lunch: 'ভাত + মুরগি ঝোল + লাবড়া সবজি', dinner: 'ভাত + ডিম ভুনা + মসুর ডাল', updatedBy: 'Rahim Uddin' },
  ];

  // Duties
  const cookingDuties: any[] = [];
  const bazarDuties: any[] = [];
  for (let day = 1; day <= 22; day++) {
    const dStr = `2026-09-${day.toString().padStart(2, '0')}`;
    const cookMember = members[(day - 1) % 10];
    const bazarMember = members[(day + 2) % 10];

    cookingDuties.push({
      id: `cd-${dStr}`,
      date: dStr,
      memberId: cookMember.id,
      memberName: cookMember.name,
      shift: 'both',
      status: day <= 18 ? 'completed' : 'scheduled',
      notes: day === 18 ? 'আজ দুপুরের রান্না সম্পন্ন' : '',
    });

    bazarDuties.push({
      id: `bd-${dStr}`,
      date: dStr,
      memberId: bazarMember.id,
      memberName: bazarMember.name,
      status: day <= 18 ? 'completed' : 'scheduled',
      budget: 1500,
      notes: day === 18 ? 'তাজা মাছ ও সবজি বাজার' : '',
    });
  }

  // Bazar records
  const bazarRecords: BazarRecord[] = [
    {
      id: 'br-2026-09-18',
      date: '2026-09-18',
      bazarPersonId: 'm7',
      bazarPersonName: 'Faisal Hossain',
      location: 'শান্তিনগর কাঁচাবাজার',
      totalAmount: 1850,
      notes: 'মাছ, মুরগি, আলু ও কাঁচাবাজার',
      items: [
        { id: 'bi-1', name: 'রুই মাছ (১.৫ কেজি)', quantity: 1.5, unit: 'কেজি', price: 433, subtotal: 650 },
        { id: 'bi-2', name: 'ব্রয়লার মুরগি', quantity: 2, unit: 'কেজি', price: 210, subtotal: 420 },
        { id: 'bi-3', name: 'আলু ও পিঁয়াজ', quantity: 5, unit: 'কেজি', price: 56, subtotal: 280 },
        { id: 'bi-4', name: 'সয়াবিন তেল ও মশলা', quantity: 1, unit: 'প্যাকেট', price: 350, subtotal: 350 },
        { id: 'bi-5', name: 'কাঁচামরিচ, ধনেপাতা', quantity: 1, unit: 'আঁটি', price: 150, subtotal: 150 },
      ],
      createdBy: 'm7',
      createdAt: '2026-09-18T09:30:00.000Z',
    },
    {
      id: 'br-2026-09-17',
      date: '2026-09-17',
      bazarPersonId: 'm6',
      bazarPersonName: 'Mehedi Hasan',
      location: 'মালিবাগ বাজার',
      totalAmount: 1420,
      items: [
        { id: 'bi-6', name: 'মিনিকেট চাল', quantity: 10, unit: 'কেজি', price: 72, subtotal: 720 },
        { id: 'bi-7', name: 'ডিম (২ ডজন)', quantity: 24, unit: 'পিস', price: 13.33, subtotal: 320 },
        { id: 'bi-8', name: 'সবজি', quantity: 1, unit: 'প্যাকেট', price: 380, subtotal: 380 },
      ],
      createdBy: 'm6',
      createdAt: '2026-09-17T09:15:00.000Z',
    },
  ];

  const marketList: MarketListItem[] = [
    { id: 'ml-1', name: 'মিনিকেট চাল (৫০ কেজি বস্তা)', quantity: '১ বস্তা', priority: 'urgent', status: 'needed', addedBy: 'Rahim Uddin', addedAt: '2026-09-18T08:00:00.000Z' },
    { id: 'ml-2', name: 'সয়াবিন তেল ৫ লিটার', quantity: '১ বোতল', priority: 'medium', status: 'needed', addedBy: 'Karimul Haque', addedAt: '2026-09-18T08:15:00.000Z' },
    { id: 'ml-3', name: 'মসুর ডাল', quantity: '৫ কেজি', priority: 'low', status: 'needed', addedBy: 'Rahim Uddin', addedAt: '2026-09-18T08:30:00.000Z' },
  ];

  const expenses = [
    {
      id: 'exp-1',
      date: '2026-09-02',
      category: 'rent' as const,
      amount: 18000,
      paidById: 'm1',
      paidByName: 'Rahim Uddin (Admin)',
      description: 'সেপ্টেম্বর মাসের বাসা ভাড়া পরিশোধ',
      createdBy: 'm1',
      createdAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'exp-2',
      date: '2026-09-05',
      category: 'gas' as const,
      amount: 2160,
      paidById: 'm2',
      paidByName: 'Karimul Haque (Treasurer)',
      description: 'দুই চুলার সরকারি গ্যাস বিল (সেপ্টেম্বর)',
      createdBy: 'm2',
      createdAt: '2026-09-05T12:00:00.000Z',
    },
    {
      id: 'exp-3',
      date: '2026-09-08',
      category: 'internet' as const,
      amount: 1200,
      paidById: 'm2',
      paidByName: 'Karimul Haque (Treasurer)',
      description: 'ওয়াইফাই বিল (সেপ্টেম্বর - কার্নিভাল ইন্টারনেট)',
      createdBy: 'm2',
      createdAt: '2026-09-08T15:30:00.000Z',
    },
  ];

  const payments = [
    {
      id: 'pay-1',
      memberId: 'm1',
      memberName: 'Rahim Uddin',
      date: '2026-09-01',
      amount: 5000,
      paymentMethod: 'bKash' as const,
      transactionRef: 'BK923847291',
      receivedBy: 'Karimul Haque (Treasurer)',
      notes: 'মাসিক অগ্রিম জমা',
      status: 'verified' as const,
      createdAt: '2026-09-01T10:30:00.000Z',
    },
    {
      id: 'pay-2',
      memberId: 'm2',
      memberName: 'Karimul Haque',
      date: '2026-09-01',
      amount: 5000,
      paymentMethod: 'bKash' as const,
      transactionRef: 'BK923847292',
      receivedBy: 'Rahim Uddin (Admin)',
      notes: 'অগ্রিম মেস খরচ জমা',
      status: 'verified' as const,
      createdAt: '2026-09-01T11:00:00.000Z',
    },
    {
      id: 'pay-3',
      memberId: 'm3',
      memberName: 'Hasan Mahmud',
      date: '2026-09-03',
      amount: 4500,
      paymentMethod: 'Nagad' as const,
      transactionRef: 'NG192837465',
      receivedBy: 'Karimul Haque (Treasurer)',
      notes: 'সেপ্টেম্বর অগ্রিম',
      status: 'verified' as const,
      createdAt: '2026-09-03T16:00:00.000Z',
    },
  ];

  const augustAccount: MonthlyAccount = {
    id: 'ma-2026-08',
    month: '2026-08',
    monthName: 'আগস্ট ২০২৬',
    status: 'closed',
    totalMeals: 580,
    totalBazarExpense: 28450,
    mealRate: 49.05,
    totalSharedExpenses: 23660,
    totalMessExpense: 52110,
    totalCollected: 52500,
    totalDue: 0,
    totalAdvance: 390,
    closedAt: '2026-09-01T10:00:00.000Z',
    closedBy: 'Rahim Uddin (Admin)',
    statements: {},
    formulaNote: 'মিল রেট = মোট বাজার খরচ ÷ মোট মিল সংখ্যা',
  };

  const auditLogs = [
    {
      id: 'log-1',
      timestamp: '2026-09-01T10:00:00.000Z',
      userId: 'm1',
      userName: 'Rahim Uddin (Admin)',
      action: 'মাস সমাপ্তি (Month Closed)',
      module: 'monthly' as const,
      details: 'আগস্ট ২০২৬ মাসের হিসাব সফলভাবে সম্পন্ন ও ক্লোজ করা হয়েছে। মিল রেট: ৳৪৯.০৫',
    },
    {
      id: 'log-2',
      timestamp: '2026-09-18T08:00:00.000Z',
      userId: 'admin_m1',
      userName: 'Rahim Uddin (Admin)',
      action: 'এডমিন লগইন',
      module: 'settings' as const,
      details: 'এডমিন সফলভাবে Bachelor Zone সিস্টেমে প্রবেশ করেছেন',
    }
  ];

  const smsLogs = [
    {
      id: 'sms-1',
      timestamp: '2026-09-17T20:00:00.000Z',
      recipientId: 'm7',
      recipientName: 'Faisal Hossain',
      phone: '+8801817890123',
      type: 'bazar_reminder' as const,
      message: 'আসসালামু আলাইকুম ফয়সাল। ১৮ সেপ্টেম্বর আপনার মেসের বাজার দায়িত্ব। শুভকামনা - শান্তিনগর মেস।',
      status: 'sent' as const,
      provider: 'Alpha SMS Gateway',
      refId: 'SMS-982138',
    },
  ];

  const notifications = [
    {
      id: 'notif-1',
      timestamp: '2026-09-18T09:30:00.000Z',
      title: 'আজকের বাজার আপডেট',
      message: 'ফয়সাল হোসেন আজকের বাজার সম্পন্ন করেছেন। মোট খরচ: ৳১,৮৫০।',
      type: 'success' as const,
      read: false,
      linkTab: 'bazar',
    },
  ];

  const settings = {
    messName: 'শান্তিনগর মেস (Shantinagar Mess)',
    messAddress: 'বাসা নং ১২/এ, শান্তিনগর, পল্টন, ঢাকা-১২১৭',
    currency: '৳',
    defaultLanguage: 'bn' as const,
    timezone: 'Asia/Dhaka',
    fixedSharedExpenseRules: {
      splitRentEqually: true,
      splitGasEqually: true,
      splitElectricityEqually: true,
      splitMaidSalaryEqually: true,
      splitInternetEqually: true,
      splitCleaningEqually: true,
    },
    smsGateway: {
      providerName: 'Alpha SMS Gateway',
      apiUrl: 'https://api.alphasms.com/v1/send',
      senderId: 'SHANTINAGAR',
      apiKeyConfigured: true,
      enabledAutoReminders: true,
      enableCookingReminder: true,
      enableBazarReminder: true,
      enableMonthEndSummary: true,
    },
    smsTemplates: {
      cookingReminder: 'আজ আপনার রান্নার দায়িত্ব। মেসের নির্ধারিত সময় অনুযায়ী রান্নার প্রস্তুতি নিন। মেনু: {menu}',
      bazarReminder: 'আগামীকাল আপনার মেসের বাজার করার দায়িত্ব। প্রয়োজনীয় বাজার তালিকা Bachelor Zone অ্যাপে দেখে নিন।',
      monthEndStatement: '{month} মাসের মেস হিসাব প্রস্তুত হয়েছে। মোট মিল: {meals}, মোট খরচ: ৳{totalCost}, জমা: ৳{paid}, {balanceStatus}: ৳{balance}। বিস্তারিত হিসাব অ্যাপে দেখুন।',
      paymentDueNotice: 'আপনার মেস বকেয়া ৳{dueAmount} টাকা জরুরি ভিত্তিতে ক্যাশিয়ারের কাছে পরিশোধ করার অনুরোধ করা হচ্ছে।',
    },
    mealCutoffSettings: {
      breakfastCutoff: '06:00',
      lunchCutoff: '10:00',
      dinnerCutoff: '16:00',
      timezone: 'Asia/Dhaka',
      enableReminders: true,
      enableSmsNotification: false,
      sendSmsOnStatusChange: true,
    },
  };

  // Generate memberMealSelections
  const memberMealSelections: any[] = [];
  dailyMeals.forEach(dm => {
    Object.entries(dm.records).forEach(([memberId, rec]: [string, any]) => {
      const memberObj = members.find(m => m.id === memberId);
      const memberName = memberObj?.name || 'Member';
      memberMealSelections.push(
        {
          id: `mms-${dm.date}-${memberId}-breakfast`,
          memberId,
          memberName,
          date: dm.date,
          mealType: 'breakfast',
          plannedStatus: rec.breakfast > 0 ? 'ON' : 'OFF',
          actualStatus: rec.breakfast > 0 ? 'attended' : 'missed',
          accountingStatus: rec.breakfast > 0 ? 'billed' : 'exempt',
          updatedBy: memberId,
          updatedByName: memberName,
          updatedAt: `${dm.date}T05:30:00.000Z`,
        },
        {
          id: `mms-${dm.date}-${memberId}-lunch`,
          memberId,
          memberName,
          date: dm.date,
          mealType: 'lunch',
          plannedStatus: rec.lunch > 0 ? 'ON' : 'OFF',
          actualStatus: rec.lunch > 0 ? 'attended' : 'missed',
          accountingStatus: rec.lunch > 0 ? 'billed' : 'exempt',
          updatedBy: memberId,
          updatedByName: memberName,
          updatedAt: `${dm.date}T08:30:00.000Z`,
        },
        {
          id: `mms-${dm.date}-${memberId}-dinner`,
          memberId,
          memberName,
          date: dm.date,
          mealType: 'dinner',
          plannedStatus: rec.dinner > 0 ? 'ON' : 'OFF',
          actualStatus: rec.dinner > 0 ? 'attended' : 'missed',
          accountingStatus: rec.dinner > 0 ? 'billed' : 'exempt',
          updatedBy: memberId,
          updatedByName: memberName,
          updatedAt: `${dm.date}T14:30:00.000Z`,
        }
      );
    });
  });

  // Future dates planning
  ['2026-09-19', '2026-09-20'].forEach(fDate => {
    members.forEach((m, idx) => {
      const bOn = idx % 2 === 0;
      const lOn = true;
      const dOn = idx !== 4;
      memberMealSelections.push(
        {
          id: `mms-${fDate}-${m.id}-breakfast`,
          memberId: m.id,
          memberName: m.name,
          date: fDate,
          mealType: 'breakfast',
          plannedStatus: bOn ? 'ON' : 'OFF',
          accountingStatus: bOn ? 'billed' : 'exempt',
          updatedBy: m.id,
          updatedByName: m.name,
          updatedAt: '2026-09-18T10:00:00.000Z',
        },
        {
          id: `mms-${fDate}-${m.id}-lunch`,
          memberId: m.id,
          memberName: m.name,
          date: fDate,
          mealType: 'lunch',
          plannedStatus: lOn ? 'ON' : 'OFF',
          accountingStatus: lOn ? 'billed' : 'exempt',
          updatedBy: m.id,
          updatedByName: m.name,
          updatedAt: '2026-09-18T10:00:00.000Z',
        },
        {
          id: `mms-${fDate}-${m.id}-dinner`,
          memberId: m.id,
          memberName: m.name,
          date: fDate,
          mealType: 'dinner',
          plannedStatus: dOn ? 'ON' : 'OFF',
          accountingStatus: dOn ? 'billed' : 'exempt',
          updatedBy: m.id,
          updatedByName: m.name,
          updatedAt: '2026-09-18T10:00:00.000Z',
        }
      );
    });
  });

  const mealChangeLogs = [
    {
      id: 'mcl-1',
      memberId: 'm1',
      memberName: 'Rahim Uddin',
      date: '2026-09-18',
      mealType: 'dinner' as const,
      previousStatus: 'ON' as const,
      newStatus: 'OFF' as const,
      changedBy: 'm1',
      changedByName: 'Rahim Uddin',
      changedByRole: 'admin' as const,
      changedAt: '2026-09-18T09:35:00.000Z',
      reason: 'ব্যক্তিগত কাজ থাকার কারণে রাতের মিল অফ করা হয়েছে',
    },
  ];

  return {
    members,
    adminProfile,
    memberCredentials,
    dailyMeals,
    memberMealSelections,
    mealChangeLogs,
    mealMenus,
    cookingDuties,
    bazarDuties,
    bazarRecords,
    marketList,
    expenses,
    payments,
    monthlyAccounts: [augustAccount],
    auditLogs,
    smsLogs,
    notifications,
    settings,
  };
}
