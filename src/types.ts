export type UserRole = 'admin' | 'treasurer' | 'member';
export type MemberRole = UserRole;

export type MemberStatus = 'active' | 'inactive' | 'left';

export interface Member {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  email?: string;
  roomNo?: string;
  role: UserRole;
  status: MemberStatus;
  joiningDate: string;
  leavingDate?: string;
  notes?: string;
  avatarColor: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type MealStatus = 'ON' | 'OFF';
export type MealLockStatus = 'ON' | 'OFF' | 'LOCKED';

export interface MemberMealSelection {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  plannedStatus: MealStatus; // 'ON' | 'OFF'
  actualStatus?: 'attended' | 'missed' | 'unspecified';
  accountingStatus?: 'billed' | 'exempt';
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
  isLockedOverride?: boolean;
}

export interface MealChangeLog {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  mealType: MealType;
  previousStatus: MealStatus;
  newStatus: MealStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: UserRole;
  changedAt: string;
  isOverride?: boolean;
  reason?: string;
}

export interface MealCutoffSettings {
  breakfastCutoff: string; // "06:00" (HH:MM 24h format in Asia/Dhaka)
  lunchCutoff: string;     // "10:00" (10:00 AM)
  dinnerCutoff: string;    // "16:00" (04:00 PM)
  timezone: string;        // "Asia/Dhaka"
  enableReminders: boolean;
  enableSmsNotification: boolean;
  sendSmsOnStatusChange?: boolean;
}

export interface MealRecord {
  memberId: string;
  breakfast: number; // e.g. 0, 0.5, 1
  lunch: number;     // e.g. 0, 1, 2
  dinner: number;    // e.g. 0, 1, 2
  guestMeals?: number;
  total: number;
}

export interface DailyMealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  records: Record<string, MealRecord>; // memberId -> MealRecord
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
  totalMeals: number;
  notes?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface MealMenu {
  id: string;
  date: string; // YYYY-MM-DD
  breakfast: string;
  lunch: string;
  dinner: string;
  specialEvent?: string;
  updatedBy: string;
}

export interface CookingDuty {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: 'all_day' | 'breakfast' | 'lunch' | 'dinner';
  memberId: string;
  memberName: string;
  status: 'scheduled' | 'completed' | 'swapped';
  notes?: string;
}

export interface BazarItem {
  id: string;
  name: string;
  itemName?: string;
  quantity: number;
  unit: string; // kg, gm, litre, piece, hali, etc.
  price: number;
  subtotal: number;
}

export type BazarLineItem = BazarItem;

export interface BazarRecord {
  id: string;
  date: string; // YYYY-MM-DD
  bazarPersonId: string;
  bazarPersonName: string;
  location?: string;
  items: BazarItem[];
  totalAmount: number;
  notes?: string;
  receiptUrl?: string; // base64 or photo URL
  createdBy: string;
  createdAt: string;
}

export interface BazarDuty {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  memberName: string;
  status: 'pending' | 'completed';
  notes?: string;
  expectedBudget?: number;
}

export interface MarketListItem {
  id: string;
  name: string;
  quantity: string;
  estimatedQuantity?: string;
  priority: 'low' | 'medium' | 'urgent';
  status: 'needed' | 'purchased' | 'cancelled';
  addedBy: string;
  addedAt: string;
  notes?: string;
}

export type MarketItem = MarketListItem;

export type ExpenseCategory =
  | 'bazar'
  | 'gas'
  | 'electricity'
  | 'water'
  | 'internet'
  | 'cleaning'
  | 'rent'
  | 'maid_salary'
  | 'other';

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  paidById: string; // memberId or 'mess_fund'
  paidByName: string;
  paidBy?: string;
  description: string;
  distributionRule?: string;
  receiptUrl?: string;
  createdBy: string;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bKash' | 'Nagad' | 'bank' | 'other';

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  receivedBy: string;
  notes?: string;
  status: 'verified' | 'pending';
  createdAt: string;
}

export interface MemberMonthlyStatement {
  memberId: string;
  memberName: string;
  roomNo?: string;
  totalMeals: number;
  mealRate: number;
  mealCost: number;
  sharedCostsShare: number;
  individualCosts: number;
  totalCost: number;
  totalPaid: number;
  netBalance: number; // positive = Due, negative = Advance/Refund
  breakdown: {
    rentShare: number;
    gasShare: number;
    electricityShare: number;
    maidSalaryShare: number;
    internetShare: number;
    cleaningShare: number;
    otherShared: number;
  };
}

export interface MonthlyAccount {
  id: string;
  month: string; // YYYY-MM e.g. "2026-09"
  monthName: string;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  totalMeals: number;
  totalBazarExpense: number;
  mealRate: number; // totalBazarExpense / totalMeals
  totalSharedExpenses: number;
  totalMessExpense: number; // totalBazarExpense + totalSharedExpenses
  totalCollected: number;
  totalDue: number;
  totalAdvance: number;
  statements: Record<string, MemberMonthlyStatement>;
  formulaNote: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  action: string;
  recordType?: string;
  recordId?: string;
  module: 'meals' | 'bazar' | 'expenses' | 'payments' | 'members' | 'monthly' | 'settings';
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
}

export type SmsType =
  | 'cooking_reminder'
  | 'bazar_reminder'
  | 'menu_announcement'
  | 'payment_reminder'
  | 'monthly_account'
  | 'meal_cutoff_reminder'
  | 'meal_status'
  | 'reminder'
  | 'custom';

export interface SmsLog {
  id: string;
  timestamp: string;
  recipientId: string;
  recipientName: string;
  phone: string;
  type: SmsType;
  message: string;
  status: 'sent' | 'failed' | 'queued';
  provider: string;
  refId: string;
  errorMessage?: string;
}

export interface InAppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  linkTab?: string;
}

export interface MessSettings {
  messName: string;
  messAddress: string;
  currency: string;
  defaultLanguage: 'bn' | 'en';
  timezone: string;
  fixedSharedExpenseRules: {
    splitRentEqually: boolean;
    splitGasEqually: boolean;
    splitElectricityEqually: boolean;
    splitMaidSalaryEqually: boolean;
    splitInternetEqually: boolean;
    splitCleaningEqually: boolean;
  };
  smsGateway: {
    providerName: string; // 'Mock SMS Gateway (Test Mode)', 'Onnorokom SMS', 'Greenweb BD', 'BulkSMS BD'
    apiUrl: string;
    senderId: string;
    apiKeyConfigured: boolean;
    enabledAutoReminders: boolean;
    enableCookingReminder?: boolean;
    enableBazarReminder?: boolean;
    enableMonthEndSummary?: boolean;
  };
  smsTemplates: {
    cookingReminder: string;
    bazarReminder: string;
    monthEndStatement: string;
    paymentDueNotice: string;
  };
  treasurerPermissions?: {
    canEditExpenses: boolean;
    canEditPayments: boolean;
    canEditBazar: boolean;
  };
  mealCutoffSettings: MealCutoffSettings;
}

export interface MessDatabaseState {
  members: Member[];
  dailyMeals: DailyMealEntry[];
  memberMealSelections?: MemberMealSelection[];
  mealChangeLogs?: MealChangeLog[];
  mealMenus: MealMenu[];
  cookingDuties: CookingDuty[];
  bazarDuties: BazarDuty[];
  bazarRecords: BazarRecord[];
  marketList: MarketListItem[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  monthlyAccounts: MonthlyAccount[];
  currentMonthCalculation?: MonthlyAccount;
  auditLogs: AuditLog[];
  smsLogs: SmsLog[];
  notifications: InAppNotification[];
  settings: MessSettings;
}
