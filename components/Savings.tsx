
import React, { useState } from 'react';
import { SavingItem } from '../types';

interface SavingsProps {
  savings: SavingItem[];
  onOpenVoice: () => void;
  onAddManual: (s: { concept: string; amountUSD: number }) => void;
  onDelete: (id: string) => void;
}

export const Savings: React.FC<SavingsProps> = ({ 
    savings, 
    onOpenVoice,
    onAddManual,
    onDelete
}) => {
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ concept: '', amountUSD: '' });

  const sortedSavings = [...savings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalSaved = savings.reduce((acc, curr) => acc + curr.amountUSD, 0);

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualForm.concept || !manualForm.amountUSD) return;
      onAddManual({
          concept: manualForm.concept,
          amountUSD: parseFloat(manualForm.amountUSD)
      });
      setManualModalOpen(false);
      setManualForm({ concept: '', amountUSD: '' });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="shrink-0 px-3 pt-3 bg-slate-50 z-10">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex gap-2">
                <button 
                    onClick={() => setManualModalOpen(true)}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    <span className="material-icons-round text-sm">add</span>
                    Ahorro Manual
                </button>
                <button 
                    onClick={onOpenVoice}
                    className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    <span className="material-icons-round text-sm">mic</span>
                    Voz
                </button>
            </div>
            <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Acumulado</span>
                <div className="text-sm font-bold text-emerald-600">${totalSaved.toLocaleString()} USD</div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-20 scrollbar-hide">
         <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[100px]">
            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Historial de Ahorros</h3>
            </div>
            
            {sortedSavings.length === 0 ? (
                <div className="text-center py-10">
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-icons-round text-slate-300">savings</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Sin ahorros registrados</p>
                    <p className="text-slate-400 text-xs mt-1">Agrega tu primer ahorro manualmente o por voz.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                        {sortedSavings.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 pl-4">
                                    <div className="font-medium text-slate-800 text-sm">{item.concept}</div>
                                    <div className="text-[10px] text-slate-400">
                                        {new Date(item.date).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-bold text-emerald-600 text-sm">
                                        +${item.amountUSD.toLocaleString()} USD
                                    </span>
                                </td>
                                <td className="w-8 pr-3 text-right">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                        title="Eliminar ahorro"
                                    >
                                        <span className="material-icons-round text-lg">delete_outline</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
         </div>
      </div>

       {/* Manual Savings Modal */}
       {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl animate-fade-in relative">
                <button 
                    onClick={() => setManualModalOpen(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                >
                    <span className="material-icons-round text-lg">close</span>
                </button>
                <h3 className="text-base font-bold text-slate-800 mb-4">Agregar Ahorro</h3>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Concepto</label>
                        <input 
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Compra de Dólares, Plazo Fijo"
                            value={manualForm.concept}
                            onChange={e => setManualForm({...manualForm, concept: e.target.value})}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Monto (USD)</label>
                        <input 
                            type="number"
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="100.00"
                            value={manualForm.amountUSD}
                            onChange={e => setManualForm({...manualForm, amountUSD: e.target.value})}
                        />
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm mt-2 shadow-lg shadow-emerald-200">
                        Guardar Ahorro
                    </button>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};
