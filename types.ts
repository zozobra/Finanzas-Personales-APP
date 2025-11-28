
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EXPENSES = 'EXPENSES',
  INVESTMENTS = 'INVESTMENTS',
  SAVINGS = 'SAVINGS'
}

export type Currency = 'ARS' | 'USD';

export interface Transaction {
  id: string;
  date: string;
  concept: string;
  amountARS: number;
  amountUSD: number;
  category?: string;
  type: 'expense' | 'income';
  sentiment?: 'positive' | 'negative' | 'neutral';
  tags?: string[];
  isMonthlyIncome?: boolean;
}

export interface Investment {
  id: string;
  date: string;
  assetName: string;
  investedARS: number;
  investedUSD: number;
  quantity: number;
  currentPriceUSD?: number;
  investmentType: 'traditional' | 'crypto';
}

export interface SavingItem {
  id: string;
  date: string;
  concept: string;
  amountUSD: number;
}

export interface AppData {
  transactions: Transaction[];
  investments: Investment[];
  savings: SavingItem[];
  monthlyIncomeARS: number;
  monthlyIncomeUSD: number;
  lastMepRate: number;
  lastUpdated: string;
}

export interface AiParsedResult {
  type: 'expense' | 'investment' | 'income' | 'saving' | 'unknown';
  concept: string;
  amountARS: number;
  assetName?: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  tags?: string[];
  investmentType?: 'traditional' | 'crypto';
}
