
import React, { useState } from 'react';
import { Transaction } from '../types';

interface ExpensesProps {
  transactions: Transaction[]; 
  mepRate: number;
  currentDate: Date;
  onMonthChange: (direction: 'prev' | 'next') => void;
  onOpenVoice: () => void;
  onAddManual: (t: { concept: string; amountARS: number; category: string }) => void;
  onDelete: (id: string) => void;
}

export const Expenses: React.FC<ExpensesProps> = ({ 
    transactions, 
    mepRate, 
    currentDate, 
    onMonthChange,
    onOpenVoice,
    onAddManual,
    onDelete
}) => {
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ concept: '', amount: '', category: 'General' });

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals for the summary
  const totalIncomeUSD = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

  const totalExpensesUSD = expenses.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);
  const monthlyBalanceUSD = totalIncomeUSD - totalExpensesUSD;

  const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  const getSentimentIcon = (sentiment?: string) => {
      switch(sentiment) {
          case 'positive': return '😊';
          case 'negative': return '😟';
          case 'neutral': return '😐';
          default: return null;
      }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualForm.concept || !manualForm.amount) return;
      onAddManual({
          concept: manualForm.concept,
          amountARS: parseFloat(manualForm.amount),
          category: manualForm.category
      });
      setManualModalOpen(false);
      setManualForm({ concept: '', amount: '', category: 'General' });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Fixed Header Section */}
      <div className="shrink-0 px-3 pt-3 bg-slate-50 z-10">
          {/* Month Navigator & Actions */}
          <div className="flex items-center justify-between mb-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
             <div className="flex gap-2">
                <button 
                    onClick={() => setManualModalOpen(true)}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    <span className="material-icons-round text-sm">keyboard</span>
                    Manual
                </button>
                <button 
                    onClick={onOpenVoice}
                    className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    <span className="material-icons-round text-sm">mic</span>
                    Voz
                </button>
             </div>
             
             <div className="flex items-center">
                <button onClick={() => onMonthChange('prev')} className="text-slate-400 hover:text-slate-600 p-1">
                    <span className="material-icons-round text-sm">chevron_left</span>
                </button>
                <span className="text-[10px] font-bold text-slate-600 capitalize w-20 text-center truncate">
                    {monthLabel}
                </span>
                <button onClick={() => onMonthChange('next')} className="text-slate-400 hover:text-slate-600 p-1">
                    <span className="material-icons-round text-sm">chevron_right</span>
                </button>
             </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-3 grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
              <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Ingresos</p>
                  <p className="text-sm font-bold text-emerald-600">${totalIncomeUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Gastos</p>
                  <p className="text-sm font-bold text-red-500">${totalExpensesUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Balance</p>
                  <p className={`text-sm font-bold ${monthlyBalanceUSD >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                    {monthlyBalanceUSD >= 0 ? '' : '-'}${Math.abs(monthlyBalanceUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
              </div>
          </div>
      </div>
      
      {/* Scrollable Expenses List */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 scrollbar-hide">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[100px]">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Detalle de Gastos</h3>
            </div>
            <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100">
                    {expenses.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-400 text-xs">
                                <span className="material-icons-round text-3xl mb-2 text-slate-200">receipt_long</span>
                                <p>No hay gastos registrados en {monthLabel}.</p>
                            </td>
                        </tr>
                    ) : (
                        expenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 pl-4">
                                    <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                                        {exp.concept}
                                        {exp.sentiment && (
                                            <span title={`Sentimiento: ${exp.sentiment}`} className="text-xs opacity-80 scale-75">
                                                {getSentimentIcon(exp.sentiment)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                            {exp.category}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    {exp.tags && exp.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {exp.tags.map(tag => (
                                                <span key={tag} className="text-[9px] text-blue-500 opacity-80">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex flex-col items-end">
                                        <div className="font-bold text-slate-800 text-sm">
                                            ${exp.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            ${exp.amountARS.toLocaleString('es-AR')} ARS
                                        </div>
                                    </div>
                                </td>
                                <td className="w-8 pr-3 text-right">
                                     <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(exp.id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        title="Eliminar gasto"
                                    >
                                        <span className="material-icons-round text-lg">delete_outline</span>
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* Manual Expense Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl animate-fade-in relative">
                <button 
                    onClick={() => setManualModalOpen(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                >
                    <span className="material-icons-round text-lg">close</span>
                </button>
                <h3 className="text-base font-bold text-slate-800 mb-4">Agregar Gasto Manual</h3>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Concepto</label>
                        <input 
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ej: Supermercado"
                            value={manualForm.concept}
                            onChange={e => setManualForm({...manualForm, concept: e.target.value})}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Monto (ARS)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                            <input 
                                type="number"
                                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                placeholder="0.00"
                                value={manualForm.amount}
                                onChange={e => setManualForm({...manualForm, amount: e.target.value})}
                            />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right mt-1">
                            ~${(parseFloat(manualForm.amount || '0') / mepRate).toFixed(2)} USD
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Categoría</label>
                        <select 
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={manualForm.category}
                            onChange={e => setManualForm({...manualForm, category: e.target.value})}
                        >
                            <option value="General">General</option>
                            <option value="Alquiler">Alquiler</option>
                            <option value="Expensas">Expensas</option>
                            <option value="Alimentos">Alimentos</option>
                            <option value="Servicios">Servicios</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Ocio">Ocio</option>
                            <option value="Salud">Salud</option>
                            <option value="Educación">Educación</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                        Guardar Gasto
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
