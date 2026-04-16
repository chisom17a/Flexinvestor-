
import { Timestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Timestamp;
  availableBalance: number;
  investedBalance: number;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  totalEarnings: number;
  isSuspended: boolean;
  hasDeposited: boolean; // Tracking if user has at least one deposit
  welcomeBonusClaimed: boolean; // One-time welcome bonus
  bankAccounts?: BankAccount[];
}

export interface InvestmentPlan {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  time: number; // Duration in days
  totalIncome: number;
  cashback: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export type InvestmentStatus = "active" | "completed" | "cancelled";

export interface InvestmentRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  cashback: number;
  startDate: Timestamp;
  endDate: Timestamp;
  lastCollectionAt: Timestamp; // To track daily earnings collection
  status: InvestmentStatus;
}

export type TransactionType = "deposit" | "withdrawal" | "investment" | "referral_bonus" | "daily_earnings" | "welcome_bonus";
export type TransactionStatus = "pending" | "approved" | "rejected";

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: Timestamp;
  reference: string;
  metadata?: Record<string, any>;
}

export interface GlobalSettings {
  minWithdrawal: number;
  minDeposit: number;
  withdrawalFeePercent: number;
  referralPercent: number;
  welcomeBonusAmount: number;
  maintenanceMode: boolean;
  announcement: string;
  allowDeposits: boolean;
  allowWithdrawals: boolean;
  welcomeTitle?: string;
  welcomeMessage?: string;
  welcomeButtons?: Array<{ label: string, url: string }>;
}

export interface AdminLog {
  id: string;
  action: string;
  adminId: string;
  timestamp: Timestamp;
  details: string;
}
