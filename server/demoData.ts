import { MessDatabaseState } from '../src/types.js';

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
      notes: 'মেস ম্যানেজার / পরিচালক',
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
      name: 'Arifur Rahman',
      nickname: 'আরিফ',
      phone: '+8801719012345',
      roomNo: '105',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-07-01',
      notes: 'সদস্য',
      avatarColor: 'bg-orange-600',
    },
    {
      id: 'm10',
      name: 'Nabil Chowdhury',
      nickname: 'নাবিল',
      phone: '+8801620123456',
      roomNo: '105',
      role: 'member' as const,
      status: 'active' as const,
      joiningDate: '2026-08-01',
      notes: 'সদস্য',
      avatarColor: 'bg-violet-600',
    }
  ];

  // Daily meals for September 1 to September 18, 2026
  const dailyMeals = [];
  for (let day = 1; day <= 18; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = `2026-09-${dayStr}`;
    const records: Record<string, any> = {};
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;

    members.forEach((m, idx) => {
      // realistic meal patterns: some eat breakfast at mess, most eat lunch and dinner
      const breakfast = (day % 3 === 0 || idx % 2 === 0) ? 1 : 0;
      const lunch = (day % 7 === 5 && idx > 6) ? 0 : 1;
      const dinner = 1;
      const total = breakfast + lunch + dinner;

      records[m.id] = {
        memberId: m.id,
        breakfast,
        lunch,
        dinner,
        total,
      };

      totalBreakfast += breakfast;
      totalLunch += lunch;
      totalDinner += dinner;
    });

    dailyMeals.push({
      id: `dm-${date}`,
      date,
      records,
      totalBreakfast,
      totalLunch,
      totalDinner,
      totalMeals: totalBreakfast + totalLunch + totalDinner,
      updatedBy: 'Rahim Uddin',
      updatedAt: `${date}T22:30:00.000Z`,
    });
  }

  // Meal Menus for September
  const mealMenus = [
    {
      id: 'menu-1',
      date: '2026-09-17',
      breakfast: 'ডিম ভুনা + পাতলা ডাল + পরোটা',
      lunch: 'সাদা ভাত + রুই মাছ ভুনা + ডাল + সালাদ',
      dinner: 'সাদা ভাত + মুরগির মাংসের ঝোল + আলুভর্তা + ঘন ডাল',
      specialEvent: '',
      updatedBy: 'Rahim Uddin',
    },
    {
      id: 'menu-2',
      date: '2026-09-18',
      breakfast: 'খিচুড়ি + ডিম ভাজা + আচার',
      lunch: 'সাদা ভাত + গরুর মাংস ভুনা + মসুর ডাল + লেবু',
      dinner: 'সাদা ভাত + পাঙ্গাস মাছ ফ্রাই + লাল শাক ভাজি + পাতলা ডাল',
      specialEvent: 'শুক্রবার স্পেশাল জুম্মা মেনু',
      updatedBy: 'Rahim Uddin',
    },
    {
      id: 'menu-3',
      date: '2026-09-19',
      breakfast: 'রুটি + মিক্সড সবজি ভাজি + ডিম পোচ',
      lunch: 'সাদা ভাত + ব্রয়লার চিকেন কারি + বেগুন ভাজা + ডাল',
      dinner: 'সাদা ভাত + ছোট মাছের চচ্চড়ি + পেঁপে ভাজি + ডাল',
      updatedBy: 'Karimul Haque',
    },
    {
      id: 'menu-4',
      date: '2026-09-20',
      breakfast: 'পরোটা + সুজির হালুয়া + ডিম',
      lunch: 'সাদা ভাত + তেলাপিয়া মাছ ভুনা + আলু পটোল তরকারি + ডাল',
      dinner: 'সাদা ভাত + ডিমের ডালনা + মিষ্টি কুমড়া ভাজি + ডাল',
      updatedBy: 'Rahim Uddin',
    }
  ];

  // Cooking Duties
  const cookingDuties = [
    {
      id: 'cook-1',
      date: '2026-09-16',
      mealType: 'all_day' as const,
      memberId: 'm3',
      memberName: 'Hasan Mahmud',
      status: 'completed' as const,
      notes: 'সফলভাবে সম্পন্ন হয়েছে',
    },
    {
      id: 'cook-2',
      date: '2026-09-17',
      mealType: 'all_day' as const,
      memberId: 'm1',
      memberName: 'Rahim Uddin',
      status: 'completed' as const,
      notes: 'আজকের রান্নার দায়িত্ব',
    },
    {
      id: 'cook-3',
      date: '2026-09-18',
      mealType: 'all_day' as const,
      memberId: 'm4',
      memberName: 'Sakib Al Amin',
      status: 'scheduled' as const,
      notes: 'শুক্রবার জুম্মার স্পেশাল রান্না',
    },
    {
      id: 'cook-4',
      date: '2026-09-19',
      mealType: 'all_day' as const,
      memberId: 'm5',
      memberName: 'Tanvir Ahmed',
      status: 'scheduled' as const,
      notes: 'শনিবার',
    },
    {
      id: 'cook-5',
      date: '2026-09-20',
      mealType: 'all_day' as const,
      memberId: 'm6',
      memberName: 'Mehedi Hasan',
      status: 'scheduled' as const,
      notes: 'রবিবার',
    }
  ];

  // Bazar Duties
  const bazarDuties = [
    {
      id: 'bd-1',
      date: '2026-09-16',
      memberId: 'm2',
      memberName: 'Karimul Haque',
      status: 'completed' as const,
      notes: 'কাওরান বাজার থেকে বাজার সম্পন্ন',
    },
    {
      id: 'bd-2',
      date: '2026-09-17',
      memberId: 'm7',
      memberName: 'Faisal Hossain',
      status: 'completed' as const,
      notes: 'আজকের তাজা সবজি ও মাছ বাজার',
    },
    {
      id: 'bd-3',
      date: '2026-09-18',
      memberId: 'm8',
      memberName: 'Tariqul Islam',
      status: 'pending' as const,
      notes: 'জুম্মার দিনের বড় বাজার',
    },
    {
      id: 'bd-4',
      date: '2026-09-20',
      memberId: 'm9',
      memberName: 'Arifur Rahman',
      status: 'pending' as const,
      notes: 'সাপ্তাহিক বাজার',
    }
  ];

  // Bazar Records for September 2026
  const bazarRecords = [
    {
      id: 'bazar-1',
      date: '2026-09-02',
      bazarPersonId: 'm1',
      bazarPersonName: 'Rahim Uddin',
      location: 'ফার্মগেট কাঁচাবাজার',
      items: [
        { id: 'bi-1', name: 'মিনিকেট চাল', quantity: 25, unit: 'কেজি', price: 72, subtotal: 1800 },
        { id: 'bi-2', name: 'সয়াবিন তেল', quantity: 5, unit: 'লিটার', price: 185, subtotal: 925 },
        { id: 'bi-3', name: 'মসুর ডাল', quantity: 3, unit: 'কেজি', price: 130, subtotal: 390 },
        { id: 'bi-4', name: 'পেঁয়াজ ও রসুন', quantity: 4, unit: 'কেজি', price: 110, subtotal: 440 },
        { id: 'bi-5', name: 'লবণ ও মসলা সামগ্রী', quantity: 1, unit: 'প্যাকেট', price: 280, subtotal: 280 },
      ],
      totalAmount: 3835,
      notes: 'মাসের শুরুর শুকনো বাজার',
      createdBy: 'Rahim Uddin',
      createdAt: '2026-09-02T10:30:00Z',
    },
    {
      id: 'bazar-2',
      date: '2026-09-06',
      bazarPersonId: 'm3',
      bazarPersonName: 'Hasan Mahmud',
      location: 'কাওরান বাজার',
      items: [
        { id: 'bi-6', name: 'ব্রয়লার মুরগি', quantity: 6, unit: 'কেজি', price: 180, subtotal: 1080 },
        { id: 'bi-7', name: 'আলু', quantity: 5, unit: 'কেজি', price: 55, subtotal: 275 },
        { id: 'bi-8', name: 'কাঁচামরিচ ও ধনেপাতা', quantity: 1, unit: 'প্যাকেট', price: 120, subtotal: 120 },
        { id: 'bi-9', name: 'ডিম (লাল)', quantity: 3, unit: 'ডজন', price: 155, subtotal: 465 },
      ],
      totalAmount: 1940,
      notes: 'মুরগি ও ডিমের সাপ্তাহিক স্টক',
      createdBy: 'Hasan Mahmud',
      createdAt: '2026-09-06T09:15:00Z',
    },
    {
      id: 'bazar-3',
      date: '2026-09-10',
      bazarPersonId: 'm5',
      bazarPersonName: 'Tanvir Ahmed',
      location: 'মহাখালী কাঁচাবাজার',
      items: [
        { id: 'bi-10', name: 'রুই মাছ', quantity: 4, unit: 'কেজি', price: 340, subtotal: 1360 },
        { id: 'bi-11', name: 'তাজা সবজি (পটল, পেঁপে, মিষ্টি কুমড়া)', quantity: 6, unit: 'কেজি', price: 50, subtotal: 300 },
        { id: 'bi-12', name: 'আদা ও বাটা মসলা', quantity: 1, unit: 'কেজি', price: 220, subtotal: 220 },
      ],
      totalAmount: 1880,
      notes: 'মাছ ও কাঁচা তরকারি',
      createdBy: 'Tanvir Ahmed',
      createdAt: '2026-09-10T11:00:00Z',
    },
    {
      id: 'bazar-4',
      date: '2026-09-14',
      bazarPersonId: 'm4',
      bazarPersonName: 'Sakib Al Amin',
      location: 'কাওরান বাজার',
      items: [
        { id: 'bi-13', name: 'সোনালী মুরগি', quantity: 5, unit: 'কেজি', price: 310, subtotal: 1550 },
        { id: 'bi-14', name: 'ডিম', quantity: 4, unit: 'ডজন', price: 150, subtotal: 600 },
        { id: 'bi-15', name: 'টমেটো ও শসা', quantity: 3, unit: 'কেজি', price: 90, subtotal: 270 },
        { id: 'bi-16', name: 'ডাল ও গুঁড়া মসলা', quantity: 2, unit: 'কেজি', price: 140, subtotal: 280 },
      ],
      totalAmount: 2700,
      notes: 'চিকেন ও ডিমের বাজার',
      createdBy: 'Sakib Al Amin',
      createdAt: '2026-09-14T08:45:00Z',
    },
    {
      id: 'bazar-5',
      date: '2026-09-17',
      bazarPersonId: 'm7',
      bazarPersonName: 'Faisal Hossain',
      location: 'ফার্মগেট বাজার',
      items: [
        { id: 'bi-17', name: 'গরুর মাংস', quantity: 3, unit: 'কেজি', price: 780, subtotal: 2340 },
        { id: 'bi-18', name: 'পোলাও চাল / সুগন্ধি চাল', quantity: 3, unit: 'কেজি', price: 135, subtotal: 405 },
        { id: 'bi-19', name: 'সালাদ ও লেবু সামগ্রী', quantity: 1, unit: 'আইটেম', price: 120, subtotal: 120 },
        { id: 'bi-20', name: 'ভোজ্য তেল', quantity: 2, unit: 'লিটার', price: 185, subtotal: 370 },
      ],
      totalAmount: 3235,
      notes: 'শুক্রবার জুম্মার স্পেশাল খাবারের সামগ্রী',
      createdBy: 'Faisal Hossain',
      createdAt: '2026-09-17T17:30:00Z',
    }
  ];

  // Market List Items
  const marketList = [
    { id: 'ml-1', name: 'মিনিকেট চাল (২৫ কেজি)', quantity: '1 বস্তা', priority: 'urgent' as const, status: 'needed' as const, addedBy: 'Rahim Uddin', addedAt: '2026-09-17 14:00' },
    { id: 'ml-2', name: 'রসুন ও শুকনো মরিচ', quantity: '1 কেজি', priority: 'medium' as const, status: 'needed' as const, addedBy: 'Hasan Mahmud', addedAt: '2026-09-17 18:20' },
    { id: 'ml-3', name: 'থালাবাসন ধোয়ার ভিম বার / লিকুইড', quantity: '2 টি', priority: 'medium' as const, status: 'needed' as const, addedBy: 'Karimul Haque', addedAt: '2026-09-16 20:00' },
    { id: 'ml-4', name: 'সয়াবিন তেল ৫ লিটার বোতল', quantity: '1 ক্যান', priority: 'urgent' as const, status: 'purchased' as const, addedBy: 'Rahim Uddin', addedAt: '2026-09-15 09:30' },
    { id: 'ml-5', name: 'মৌসুমি ফল (কলা / পেয়ারা)', quantity: '২ ডজন', priority: 'low' as const, status: 'needed' as const, addedBy: 'Sakib Al Amin', addedAt: '2026-09-17 19:10' },
  ];

  // Expenses for September 2026 (Shared / Fixed costs)
  const expenses = [
    {
      id: 'exp-1',
      date: '2026-09-01',
      category: 'rent' as const,
      amount: 25000,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড (ক্যাশিয়ার)',
      description: 'সেপ্টেম্বর মাসের মেসের বাসা ভাড়া প্রদান',
      createdBy: 'Karimul Haque',
      createdAt: '2026-09-01T11:00:00Z',
    },
    {
      id: 'exp-2',
      date: '2026-09-05',
      category: 'gas' as const,
      amount: 1080,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড',
      description: 'তিতাস গ্যাস বিল (সেপ্টেম্বর)',
      createdBy: 'Karimul Haque',
      createdAt: '2026-09-05T14:30:00Z',
    },
    {
      id: 'exp-3',
      date: '2026-09-08',
      category: 'internet' as const,
      amount: 1200,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড',
      description: 'ব্রডব্যান্ড ওয়াইফাই ইন্টারনেট বিল (৫০ এমবিপিএস)',
      createdBy: 'Rahim Uddin',
      createdAt: '2026-09-08T16:00:00Z',
    },
    {
      id: 'exp-4',
      date: '2026-09-10',
      category: 'maid_salary' as const,
      amount: 4000,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড',
      description: 'খালা / রান্নার সাহায্যকারী বেতন অগ্রিম',
      createdBy: 'Karimul Haque',
      createdAt: '2026-09-10T12:00:00Z',
    },
    {
      id: 'exp-5',
      date: '2026-09-12',
      category: 'cleaning' as const,
      amount: 650,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড',
      description: 'হারপিক, ফ্লোর ক্লিনার ও ডাস্টবিন ব্যাগ ক্রয়',
      createdBy: 'Rahim Uddin',
      createdAt: '2026-09-12T19:00:00Z',
    },
    {
      id: 'exp-6',
      date: '2026-09-15',
      category: 'electricity' as const,
      amount: 2450,
      paidById: 'mess_fund',
      paidByName: 'মেস ফান্ড',
      description: 'ডিপিডিসি প্রিপেইড মিটার রিচার্জ',
      createdBy: 'Karimul Haque',
      createdAt: '2026-09-15T10:15:00Z',
    }
  ];

  // Payments / Deposits by members for September 2026
  const payments = [
    { id: 'pay-1', memberId: 'm1', memberName: 'Rahim Uddin', date: '2026-09-01', amount: 5500, paymentMethod: 'bKash' as const, transactionRef: 'BK9A77201X', receivedBy: 'Karimul Haque', notes: 'মাসের অগ্রিম জমা', status: 'verified' as const, createdAt: '2026-09-01T12:00:00Z' },
    { id: 'pay-2', memberId: 'm2', memberName: 'Karimul Haque', date: '2026-09-01', amount: 5500, paymentMethod: 'cash' as const, transactionRef: 'CASH-001', receivedBy: 'Karimul Haque', notes: 'নিজ জমা', status: 'verified' as const, createdAt: '2026-09-01T12:05:00Z' },
    { id: 'pay-3', memberId: 'm3', memberName: 'Hasan Mahmud', date: '2026-09-02', amount: 5000, paymentMethod: 'Nagad' as const, transactionRef: 'NGD884102', receivedBy: 'Karimul Haque', notes: 'অগ্রিম মেস বিল', status: 'verified' as const, createdAt: '2026-09-02T15:30:00Z' },
    { id: 'pay-4', memberId: 'm4', memberName: 'Sakib Al Amin', date: '2026-09-02', amount: 5000, paymentMethod: 'bKash' as const, transactionRef: 'BK7781290Y', receivedBy: 'Karimul Haque', notes: 'সেপ্টেম্বর ডিপোজিট', status: 'verified' as const, createdAt: '2026-09-02T17:00:00Z' },
    { id: 'pay-5', memberId: 'm5', memberName: 'Tanvir Ahmed', date: '2026-09-03', amount: 5500, paymentMethod: 'bank' as const, transactionRef: 'EBL-TR-991', receivedBy: 'Karimul Haque', notes: 'ইস্টার্ন ব্যাংক ট্রান্সফার', status: 'verified' as const, createdAt: '2026-09-03T11:45:00Z' },
    { id: 'pay-6', memberId: 'm6', memberName: 'Mehedi Hasan', date: '2026-09-03', amount: 4500, paymentMethod: 'bKash' as const, transactionRef: 'BK5510293', receivedBy: 'Karimul Haque', notes: 'আংশিক জমা', status: 'verified' as const, createdAt: '2026-09-03T18:20:00Z' },
    { id: 'pay-7', memberId: 'm7', memberName: 'Faisal Hossain', date: '2026-09-04', amount: 5000, paymentMethod: 'cash' as const, transactionRef: 'CASH-002', receivedBy: 'Karimul Haque', notes: 'নগদ জমা', status: 'verified' as const, createdAt: '2026-09-04T20:10:00Z' },
    { id: 'pay-8', memberId: 'm8', memberName: 'Tariqul Islam', date: '2026-09-04', amount: 4000, paymentMethod: 'Nagad' as const, transactionRef: 'NGD44391', receivedBy: 'Karimul Haque', notes: 'জমা', status: 'verified' as const, createdAt: '2026-09-04T21:00:00Z' },
    { id: 'pay-9', memberId: 'm9', memberName: 'Arifur Rahman', date: '2026-09-05', amount: 4800, paymentMethod: 'bKash' as const, transactionRef: 'BK332019', receivedBy: 'Karimul Haque', notes: 'বিকাশ পেমেন্ট', status: 'verified' as const, createdAt: '2026-09-05T13:40:00Z' },
    { id: 'pay-10', memberId: 'm10', memberName: 'Nabil Chowdhury', date: '2026-09-05', amount: 4500, paymentMethod: 'cash' as const, transactionRef: 'CASH-003', receivedBy: 'Karimul Haque', notes: 'নগদ জমা', status: 'verified' as const, createdAt: '2026-09-05T19:30:00Z' },
  ];

  // Previous closed month (August 2026) for history archive
  const augustStatements: Record<string, any> = {};
  const augMealRate = 42.5;
  const augRentPerMember = 2500;
  const augSharedPerMember = 950; // gas + elec + maid + internet + cleaning

  members.forEach((m, idx) => {
    const meals = 65 + (idx * 3);
    const mealCost = Math.round(meals * augMealRate);
    const sharedCosts = augRentPerMember + augSharedPerMember;
    const totalCost = mealCost + sharedCosts;
    const paid = 6800;
    const balance = totalCost - paid; // positive = due

    augustStatements[m.id] = {
      memberId: m.id,
      memberName: m.name,
      roomNo: m.roomNo,
      totalMeals: meals,
      mealRate: augMealRate,
      mealCost,
      sharedCostsShare: sharedCosts,
      individualCosts: 0,
      totalCost,
      totalPaid: paid,
      netBalance: balance,
      breakdown: {
        rentShare: augRentPerMember,
        gasShare: 110,
        electricityShare: 260,
        maidSalaryShare: 400,
        internetShare: 120,
        cleaningShare: 60,
        otherShared: 0,
      }
    };
  });

  const augustAccount = {
    id: 'month-2026-08',
    month: '2026-08',
    monthName: 'আগস্ট ২০২৬ (August 2026)',
    status: 'closed' as const,
    closedAt: '2026-08-31T23:59:59Z',
    closedBy: 'Rahim Uddin (Admin)',
    totalMeals: 785,
    totalBazarExpense: 33362.5,
    mealRate: 42.5,
    totalSharedExpenses: 34500,
    totalMessExpense: 67862.5,
    totalCollected: 68000,
    totalDue: 1250,
    totalAdvance: 1387.5,
    statements: augustStatements,
    formulaNote: 'মিল রেট = মোট বাজার খরচ (৳৩৩,৩৬২.৫) ÷ মোট মিল (৭৮৫) = ৳৪২.৫০। বাসা ভাড়া ও ইউটিলিটি সমান ১০ ভাগে বণ্টন।',
  };

  const auditLogs = [
    {
      id: 'audit-1',
      timestamp: '2026-09-01T09:00:00Z',
      userName: 'Rahim Uddin',
      module: 'monthly' as const,
      action: 'CLOSE_MONTH',
      details: 'আগস্ট ২০২৬ মাসের মেস হিসাব চূড়ান্ত ও বন্ধ ঘোষণা করা হয়েছে।',
      newValue: 'Status: Closed, Meal Rate: ৳42.50',
    },
    {
      id: 'audit-2',
      timestamp: '2026-09-14T09:00:00Z',
      userName: 'Karimul Haque',
      module: 'bazar' as const,
      action: 'UPDATE_BAZAR',
      details: 'সাকিব কর্তৃক বাজার খরচ এন্ট্রি যাচাই ও অনুমোদন করা হয়েছে।',
      previousValue: '৳2,650',
      newValue: '৳2,700',
    },
    {
      id: 'audit-3',
      timestamp: '2026-09-15T11:20:00Z',
      userName: 'Karimul Haque',
      module: 'payments' as const,
      action: 'VERIFY_PAYMENT',
      details: 'তানভীর আহমেদের ৫,৫০০ টাকা ব্যাংক ট্রানজেকশন অনুমোদন করা হলো।',
      newValue: 'Verified (Ref: EBL-TR-991)',
    }
  ];

  const smsLogs = [
    {
      id: 'sms-1',
      timestamp: '2026-09-17T07:00:00Z',
      recipientId: 'm1',
      recipientName: 'Rahim Uddin',
      phone: '+8801711234567',
      type: 'cooking_reminder' as const,
      message: 'আজ আপনার মেসের রান্নার দায়িত্ব। নির্ধারিত সময় অনুযায়ী রান্নার প্রস্তুতি নিন। - মেস ম্যানেজার',
      status: 'sent' as const,
      provider: 'Mock SMS Gateway (Test Mode)',
      refId: 'MOCK-SMS-99214',
    },
    {
      id: 'sms-2',
      timestamp: '2026-09-17T07:15:00Z',
      recipientId: 'm7',
      recipientName: 'Faisal Hossain',
      phone: '+8801817890123',
      type: 'bazar_reminder' as const,
      message: 'আজ আপনার মেসের বাজার করার দায়িত্ব। প্রয়োজনীয় বাজার তালিকা মেস ম্যানেজার অ্যাপে দেখে নিন।',
      status: 'sent' as const,
      provider: 'Mock SMS Gateway (Test Mode)',
      refId: 'MOCK-SMS-99215',
    },
    {
      id: 'sms-3',
      timestamp: '2026-09-01T10:00:00Z',
      recipientId: 'm3',
      recipientName: 'Hasan Mahmud',
      phone: '+8801913456789',
      type: 'monthly_account' as const,
      message: 'August মাসের মেস হিসাব প্রস্তুত হয়েছে। মোট মিল: ৭১, মিল খরচ: ৳৩,০১৭, শেয়ার: ৳৩,৪৫০, জমা: ৳৬,৮০০, পাওনা/উদ্বৃত্ত: ৳৩৩৩।',
      status: 'sent' as const,
      provider: 'Mock SMS Gateway (Test Mode)',
      refId: 'MOCK-SMS-98102',
    }
  ];

  const notifications = [
    {
      id: 'notif-1',
      timestamp: '2026-09-17T07:00:00Z',
      title: 'আজকের রান্নার দায়িত্ব',
      message: 'আজ ১৭ সেপ্টেম্বর রহিম উদ্দিন এর রান্নার দায়িত্ব রয়েছে।',
      type: 'info' as const,
      read: false,
      linkTab: 'cooking',
    },
    {
      id: 'notif-2',
      timestamp: '2026-09-17T08:00:00Z',
      title: 'বাজার শিডিউল এলার্ট',
      message: 'আজকের তাজা বাজার ফয়সাল হোসেন সফলভাবে মেস ফান্ডে জমা দিয়েছেন।',
      type: 'success' as const,
      read: false,
      linkTab: 'bazar',
    },
    {
      id: 'notif-3',
      timestamp: '2026-09-17T15:30:00Z',
      title: 'আগামীকাল শুক্রবারের স্পেশাল মেনু',
      message: '১৮ সেপ্টেম্বর জুম্মা স্পেশাল: খিচুড়ি + ডিম ও গরুর মাংস ভুনা রাখা হয়েছে।',
      type: 'info' as const,
      read: true,
      linkTab: 'menu',
    }
  ];

  const settings = {
    messName: 'শান্তিনগর ব্যাচেলর মেস (Shantinagar Bachelor Mess)',
    messAddress: 'বাসা নং ৪২/এ, রোড ৩, শান্তিনগর, ঢাকা-১২১৭',
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
      providerName: 'Mock SMS Gateway (Test Mode)',
      apiUrl: 'https://api.mocksms.bd/v2/send',
      senderId: 'MESSMGR',
      apiKeyConfigured: true,
      enabledAutoReminders: true,
    },
    smsTemplates: {
      cookingReminder: 'আজ আপনার রান্নার দায়িত্ব। মেসের নির্ধারিত সময় অনুযায়ী রান্নার প্রস্তুতি নিন। মেনু: {menu}',
      bazarReminder: 'আগামীকাল আপনার মেসের বাজার করার দায়িত্ব। প্রয়োজনীয় বাজার তালিকা Mess Manager অ্যাপে দেখে নিন।',
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
    }
  };

  // Generate memberMealSelections corresponding to daily meals + future dates
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

  // Also pre-plan 19 Sep (Tomorrow) and 20 Sep (Day after)
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
    {
      id: 'mcl-2',
      memberId: 'm2',
      memberName: 'Karimul Haque',
      date: '2026-09-18',
      mealType: 'lunch' as const,
      previousStatus: 'ON' as const,
      newStatus: 'OFF' as const,
      changedBy: 'm2',
      changedByName: 'Karimul Haque',
      changedByRole: 'treasurer' as const,
      changedAt: '2026-09-18T08:15:00.000Z',
      reason: 'অফিসের লাঞ্চ প্রোগ্রাম',
    },
    {
      id: 'mcl-3',
      memberId: 'm3',
      memberName: 'Hasan Mahmud',
      date: '2026-09-19',
      mealType: 'breakfast' as const,
      previousStatus: 'OFF' as const,
      newStatus: 'ON' as const,
      changedBy: 'm3',
      changedByName: 'Hasan Mahmud',
      changedByRole: 'member' as const,
      changedAt: '2026-09-18T11:20:00.000Z',
      reason: 'সকালে মেসে নাস্তা করব',
    },
  ];

  return {
    members,
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
