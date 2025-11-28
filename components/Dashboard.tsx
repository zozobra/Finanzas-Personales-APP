
import React, { useState } from 'react';
import { AppData, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DashboardProps {
  data: AppData;
  transactions: Transaction[]; // Filtered for current month
  mepRate: number;
  currentDate: Date;
  onUpdateIncome: (amount: number, currency: 'ARS' | 'USD') => void;
  onMonthChange: (direction: 'prev' | 'next') => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ 
    data, 
    transactions, 
    mepRate, 
    onUpdateIncome,
    currentDate,
    onMonthChange
}) => {
  const [isIncomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

  // Month Formatter
  const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Calculate stats based on FILTERED transactions (this month)
  const totalExpensesUSD = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

  const totalIncomeUSD = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

  // Investments Logic
  const totalInvestedUSD = data.investments.reduce((acc, curr) => acc + (curr.investedUSD || 0), 0);
  const currentInvestmentValueUSD = data.investments.reduce((acc, curr) => {
    const price = curr.currentPriceUSD || (curr.investedUSD / (curr.quantity || 1));
    return acc + (price * (curr.quantity || 0));
  }, 0);
  const investmentGainLossUSD = currentInvestmentValueUSD - totalInvestedUSD;
  const investmentGainLossPercent = totalInvestedUSD > 0 
    ? (investmentGainLossUSD / totalInvestedUSD) * 100 
    : 0;

  // Savings Logic
  const totalSavedUSD = data.savings.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

  // Leftover for the month (Income - Expenses)
  const leftoverUSD = totalIncomeUSD - totalExpensesUSD;

  // --- MONTO TOTAL (PATRIMONIO) CALCULATION ---
  // Sum of: Current Investment Value + Total Savings + Monthly Leftover
  const totalWealthUSD = currentInvestmentValueUSD + totalSavedUSD + leftoverUSD;

  // Data for Charts
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
        const cat = curr.category || 'Otros';
        acc[cat] = (acc[cat] || 0) + (curr.amountUSD || 0);
        return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(expensesByCategory).map(key => ({
      name: key,
      value: parseFloat((expensesByCategory[key] || 0).toFixed(2))
  })).filter(d => d.value > 0);

  const handleIncomeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseFloat(incomeInput);
      if (!isNaN(val)) {
          onUpdateIncome(val, currency);
          setIncomeModalOpen(false);
          setIncomeInput('');
      }
  };

  const openIncomeModal = () => {
      const existingIncome = transactions.find(t => t.isMonthlyIncome);
      if (existingIncome) {
           setIncomeInput(currency === 'ARS' ? existingIncome.amountARS.toString() : existingIncome.amountUSD.toFixed(2));
           setCurrency(existingIncome.amountARS > 0 && existingIncome.amountUSD !== existingIncome.amountARS ? 'ARS' : 'USD');
      } else {
           setIncomeInput('');
      }
      setIncomeModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full relative">
      
      {/* --- FIXED HEADER SECTION --- */}
      <div className="shrink-0 px-4 pt-3 pb-2 bg-slate-50 z-10">
          {/* Month Navigator */}
          <div className="flex justify-between items-center bg-white rounded-xl p-2.5 shadow-sm border border-slate-100">
              <button onClick={() => onMonthChange('prev')} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-icons-round text-sm">arrow_back_ios_new</span>
              </button>
              <div className="text-center">
                  <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-widest">Periodo</span>
                  <span className="text-sm font-bold text-slate-800 capitalize">{monthLabel}</span>
              </div>
              <button onClick={() => onMonthChange('next')} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-icons-round text-sm">arrow_forward_ios</span>
              </button>
          </div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 scrollbar-hide">
        <div className="space-y-3 pt-1">
            
            {/* NEW: MONTO TOTAL (PATRIMONIO) CARD - SOBRIO & BLANCO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Patrimonio Total</p>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                        <span className="text-base align-top text-slate-400 font-medium mr-1">$</span>
                        {totalWealthUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        <span className="text-xs text-slate-400 font-normal ml-1">USD</span>
                    </h2>
                </div>
                <div className="text-right">
                    <span className="material-icons-round text-3xl text-blue-600 bg-blue-50 p-2 rounded-full">account_balance</span>
                </div>
            </div>

            {/* Resto del Mes Card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${leftoverUSD >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Resto del Mes</p>
                <h2 className={`text-2xl font-extrabold ${leftoverUSD >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    <span className="text-base align-top text-slate-400 font-medium mr-1">$</span>
                    {Math.abs(leftoverUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    <span className="text-xs text-slate-400 font-normal ml-1">USD</span>
                </h2>
                {leftoverUSD < 0 && <p className="text-[9px] text-red-500 font-bold mt-1">Has superado tus ingresos</p>}
            </div>

            {/* Income & Expenses Row */}
            <div className="grid grid-cols-2 gap-3">
                <div 
                    className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative group cursor-pointer hover:border-blue-200 transition-all"
                    onClick={openIncomeModal}
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                        <span className="material-icons-round text-xs">edit</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-emerald-50 rounded-md text-emerald-600">
                            <span className="material-icons-round text-xs block">arrow_downward</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Ingresos</p>
                    </div>
                    <p className="text-lg font-bold text-slate-800">${totalIncomeUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-red-50 rounded-md text-red-500">
                            <span className="material-icons-round text-xs block">arrow_upward</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">Gastos</p>
                    </div>
                    <p className="text-lg font-bold text-slate-800">${totalExpensesUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            {/* Expenses Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-bold text-slate-700">Progreso del Mes</h3>
                    <span className="text-[10px] font-medium text-slate-400">
                        {((totalExpensesUSD / (totalIncomeUSD || 1)) * 100).toFixed(0)}% del ingreso
                    </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                        className={`h-1.5 rounded-full transition-all duration-1000 ${
                            (totalExpensesUSD / totalIncomeUSD) > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((totalExpensesUSD / (totalIncomeUSD || 1)) * 100, 100)}%` }}
                    ></div>
                </div>
            </div>

            {/* Charts */}
            {pieData.length > 0 ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 mb-2">Distribución de Gastos</h3>
                    <div className="h-40 w-full"> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => `$${value.toFixed(0)}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    No hay gastos registrados en {monthLabel}.
                </div>
            )}
        </div>
      </div>

      {/* Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-xs p-6 shadow-2xl animate-fade-in relative">
                 <button 
                    onClick={() => setIncomeModalOpen(false)} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <span className="material-icons-round text-xl">close</span>
                </button>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Ingreso Mensual</h3>
                <p className="text-xs text-slate-400 mb-5 capitalize">{monthLabel}</p>
                
                <form onSubmit={handleIncomeSubmit}>
                    
                    {/* Currency Selector */}
                    <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
                        <button
                            type="button"
                            onClick={() => setCurrency('ARS')}
                            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${currency === 'ARS' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            ARS
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrency('USD')}
                            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${currency === 'USD' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            USD
                        </button>
                    </div>

                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 ml-1">
                        Monto en {currency}
                    </label>
                    <div className="relative mb-2">
                        <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                        <input 
                            type="number" 
                            value={incomeInput}
                            onChange={(e) => setIncomeInput(e.target.value)}
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-6 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder={currency === 'ARS' ? "1500000" : "1000"}
                            autoFocus
                        />
                    </div>
                    
                    <div className="text-[10px] text-slate-400 mb-6 h-4 text-right font-medium">
                        {incomeInput && (
                            currency === 'ARS' 
                            ? `~ $${(parseFloat(incomeInput) / mepRate).toFixed(0)} USD`
                            : `~ $${(parseFloat(incomeInput) * mepRate).toLocaleString('es-AR')} ARS`
                        )}
                    </div>

                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-200"
                    >
                        Guardar Ingreso
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};
