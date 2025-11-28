
import React, { useState, useEffect, useRef } from 'react';
import { AppData, ViewState, Transaction, Investment, SavingItem, AiParsedResult } from './types';
import { Dashboard } from './components/Dashboard';
import { Expenses } from './components/Expenses';
import { Investments } from './components/Investments';
import { Savings } from './components/Savings';
import { VoiceModal } from './components/VoiceModal';
import { fetchDolarMep } from './services/geminiService';

const initialData: AppData = {
  transactions: [],
  investments: [],
  savings: [],
  monthlyIncomeARS: 0,
  monthlyIncomeUSD: 0,
  lastMepRate: 1180, 
  lastUpdated: new Date().toISOString()
};

function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal States
  const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isConfirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [isDataModalOpen, setDataModalOpen] = useState(false); // Database Modal
  
  // Pending Transaction State for Confirmation
  const [pendingTransaction, setPendingTransaction] = useState<AiParsedResult | null>(null);

  // File Input Ref for Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe initialization of data from local storage
  const [data, setData] = useState<AppData>(() => {
    try {
        const saved = localStorage.getItem('finanzas_data');
        if (saved && saved !== "undefined" && saved !== "null") {
            const parsed = JSON.parse(saved);
            
            if (parsed && typeof parsed === 'object') {
                return {
                    ...initialData,
                    ...parsed,
                    transactions: Array.isArray(parsed.transactions) 
                        ? parsed.transactions.map((t: any) => ({
                            ...t,
                            amountUSD: Number(t.amountUSD) || 0,
                            amountARS: Number(t.amountARS) || 0,
                            date: t.date || new Date().toISOString()
                        }))
                        : [],
                    investments: Array.isArray(parsed.investments) 
                        ? parsed.investments.map((i: any) => ({
                            ...i,
                            investedARS: Number(i.investedARS) || 0,
                            investedUSD: Number(i.investedUSD) || 0,
                            quantity: Number(i.quantity) || 0,
                            currentPriceUSD: Number(i.currentPriceUSD) || 0,
                            investmentType: i.investmentType || 'traditional'
                        }))
                        : [],
                    savings: Array.isArray(parsed.savings) ? parsed.savings : [], 
                    monthlyIncomeARS: Number(parsed.monthlyIncomeARS) || 0,
                    monthlyIncomeUSD: Number(parsed.monthlyIncomeUSD) || 0,
                    lastMepRate: Number(parsed.lastMepRate) || 1180,
                };
            }
        }
    } catch (e) {
        console.error("Failed to parse local storage", e);
    }
    return initialData;
  });

  // Persist data
  useEffect(() => {
    localStorage.setItem('finanzas_data', JSON.stringify(data));
  }, [data]);

  // Update MEP on mount
  useEffect(() => {
    const updateRates = async () => {
      const mep = await fetchDolarMep();
      if (mep && mep > 0) {
        setData(prev => ({ ...prev, lastMepRate: mep }));
      }
    };
    updateRates();
  }, []);

  // --- DATA MANAGEMENT FUNCTIONS ---

  const handleDownloadBackup = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `finanzas_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setDataModalOpen(false);
  };

  const handleExportCSV = () => {
      // Export transactions to CSV
      const headers = ["Fecha", "Tipo", "Concepto", "Categoría", "Monto ARS", "Monto USD"];
      const rows = data.transactions.map(t => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          t.concept,
          t.category || '-',
          t.amountARS.toFixed(2),
          t.amountUSD.toFixed(2)
      ]);

      let csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `finanzas_reporte_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDataModalOpen(false);
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileObj = event.target.files && event.target.files[0];
      if (!fileObj) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const text = e.target?.result;
              if (typeof text === 'string') {
                  const parsed = JSON.parse(text);
                  // Basic validation
                  if (parsed.transactions || parsed.investments) {
                      if (window.confirm("¿Estás seguro de restaurar este backup? Se reemplazarán los datos actuales.")) {
                          setData(parsed);
                          setDataModalOpen(false);
                          alert("Datos restaurados correctamente.");
                      }
                  } else {
                      alert("El archivo no parece ser un backup válido.");
                  }
              }
          } catch (error) {
              console.error("Error parsing file", error);
              alert("Error al leer el archivo.");
          }
      };
      reader.readAsText(fileObj);
      // Reset input
      event.target.value = '';
  };

  // --- END DATA MANAGEMENT ---

  // Filter transactions by month
  const getFilteredTransactions = () => {
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      return data.transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
      setCurrentDate(prev => {
          const newDate = new Date(prev);
          newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
          return newDate;
      });
  };

  const handleUpdateIncome = (amount: number, currency: 'ARS' | 'USD') => {
    const amountUSD = currency === 'ARS' ? amount / data.lastMepRate : amount;
    const amountARS = currency === 'ARS' ? amount : amount * data.lastMepRate;
    
    // Check if there is already an income set for this month
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Remove existing monthly income for this specific month to replace it
    const filteredTrans = data.transactions.filter(t => {
        if (!t.isMonthlyIncome) return true;
        const d = new Date(t.date);
        return !(d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    });

    const newIncomeTransaction: Transaction = {
        id: crypto.randomUUID(),
        date: currentDate.toISOString(), // Use currently selected month's date
        concept: 'Ingreso Mensual',
        amountARS: amountARS,
        amountUSD: amountUSD,
        type: 'income',
        category: 'Salario',
        isMonthlyIncome: true
    };

    setData(prev => ({
        ...prev,
        transactions: [...filteredTrans, newIncomeTransaction]
    }));
  };

  const handleAddManualTransaction = (t: { concept: string; amountARS: number; category: string }) => {
      const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          date: currentDate.toISOString(), // Use selected month context
          concept: t.concept,
          amountARS: t.amountARS,
          amountUSD: t.amountARS / data.lastMepRate,
          category: t.category,
          type: 'expense'
      };
      
      setData(prev => ({
          ...prev,
          transactions: [...prev.transactions, newTransaction]
      }));
  };

  const handleAddManualInvestment = (inv: { assetName: string; amount: number; quantity: number; type: 'traditional' | 'crypto'; manualCurrentPrice?: number; currency?: 'ARS' | 'USD' }) => {
      const isCrypto = inv.type === 'crypto';
      
      let investedUSD = 0;
      let investedARS = 0;

      if (isCrypto) {
          // Crypto is strictly USD input
          investedUSD = inv.amount;
          investedARS = inv.amount * data.lastMepRate;
      } else {
          // Traditional can be ARS or USD input
          if (inv.currency === 'USD') {
              investedUSD = inv.amount;
              investedARS = inv.amount * data.lastMepRate;
          } else {
              // Default to ARS
              investedARS = inv.amount;
              investedUSD = inv.amount / data.lastMepRate;
          }
      }
      
      // Calculate quantity if 0 
      let finalQuantity = inv.quantity;
      if (finalQuantity === 0) {
          finalQuantity = 1; 
      }

      // Determine current price for tracking
      let finalCurrentPriceUSD = 0;
      
      // If user provided a manual current price (Always USD override for both Crypto and Traditional now)
      if (inv.manualCurrentPrice) {
          finalCurrentPriceUSD = inv.manualCurrentPrice; // Assumes input is USD
      }

      const newInvestment: Investment = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          assetName: inv.assetName,
          investedARS: investedARS,
          investedUSD: investedUSD,
          quantity: finalQuantity,
          investmentType: inv.type,
          currentPriceUSD: finalCurrentPriceUSD || undefined 
      };

      setData(prev => ({
          ...prev,
          investments: [...prev.investments, newInvestment]
      }));
  };

  const handleAddManualSaving = (s: { concept: string; amountUSD: number }) => {
      const newSaving: SavingItem = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          concept: s.concept,
          amountUSD: s.amountUSD
      };

      setData(prev => ({
          ...prev,
          savings: [...prev.savings, newSaving]
      }));
  };

  // --- DELETE FUNCTIONS (NO WINDOW.CONFIRM) ---
  const handleDeleteTransaction = (id: string) => {
      setData(prev => ({
          ...prev,
          transactions: prev.transactions.filter(t => t.id !== id)
      }));
  };

  const handleDeleteInvestment = (id: string) => {
      setData(prev => ({
          ...prev,
          investments: prev.investments.filter(i => i.id !== id)
      }));
  };

  const handleDeleteSaving = (id: string) => {
      setData(prev => ({
          ...prev,
          savings: prev.savings.filter(s => s.id !== id)
      }));
  };
  // --- END DELETE FUNCTIONS ---

  const handleAiResult = (result: AiParsedResult) => {
    setPendingTransaction(result);
    setConfirmationModalOpen(true);
  };

  const handleConfirmTransaction = (finalData: AiParsedResult) => {
      setConfirmationModalOpen(false);
      setPendingTransaction(null);

      // Routing logic based on type
      if (finalData.type === 'expense') {
          const newTransaction: Transaction = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              concept: finalData.concept,
              amountARS: finalData.amountARS,
              amountUSD: finalData.amountARS / data.lastMepRate,
              category: finalData.category || 'Varios',
              type: 'expense',
              sentiment: finalData.sentiment,
              tags: finalData.tags
          };
          setData(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
      } 
      else if (finalData.type === 'income') {
          const newTransaction: Transaction = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              concept: finalData.concept,
              amountARS: finalData.amountARS,
              amountUSD: finalData.amountARS / data.lastMepRate,
              category: 'Ingreso',
              type: 'income'
          };
          setData(prev => ({ ...prev, transactions: [...prev.transactions, newTransaction] }));
      }
      else if (finalData.type === 'investment') {
          const investedUSD = finalData.amountARS / data.lastMepRate; // AI returns ARS usually, unless specified
          
          const quantity = 0; // Will prompt user or need edit
          
          const newInvestment: Investment = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              assetName: finalData.assetName || 'Activo',
              investedARS: finalData.amountARS,
              investedUSD: investedUSD,
              quantity: quantity, 
              investmentType: finalData.investmentType || 'traditional'
          };
           setData(prev => ({ ...prev, investments: [...prev.investments, newInvestment] }));
      }
      else if (finalData.type === 'saving') {
          const newSaving: SavingItem = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              concept: finalData.concept,
              amountUSD: finalData.amountARS / data.lastMepRate // AI returns ARS usually
          };
          setData(prev => ({ ...prev, savings: [...prev.savings, newSaving] }));
      }
  };

  return (
    <main className="h-[100dvh] w-full max-w-md mx-auto bg-slate-50 flex flex-col shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="shrink-0 bg-white p-4 pb-2 flex justify-between items-center z-20 shadow-sm relative">
        <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <span className="material-icons-round text-white text-lg">attach_money</span>
            </div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">Finanzas AI</h1>
        </div>
        
        <div className="flex items-center gap-2">
            {/* Database Button */}
            <button 
                onClick={() => setDataModalOpen(true)}
                className="bg-slate-100 p-1.5 rounded-full hover:bg-slate-200 transition-colors text-slate-500"
                title="Base de Datos"
            >
                <span className="material-icons-round text-lg">storage</span>
            </button>

            <div className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                 <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">MEP:</span>
                 <span className="text-xs font-bold text-slate-700">${Math.floor(data.lastMepRate)}</span>
            </div>
        </div>
      </header>

      {/* Main Content Area - Scroll handled inside components */}
      <div className="flex-1 overflow-hidden relative">
        {view === ViewState.DASHBOARD && (
             <div className="h-full overflow-y-auto px-4 pt-2 scrollbar-hide">
                <Dashboard 
                    data={data} 
                    transactions={getFilteredTransactions()}
                    mepRate={data.lastMepRate} 
                    onUpdateIncome={handleUpdateIncome}
                    currentDate={currentDate}
                    onMonthChange={handleMonthChange}
                />
             </div>
        )}
        {view === ViewState.EXPENSES && (
             <Expenses 
                transactions={getFilteredTransactions()} 
                mepRate={data.lastMepRate} 
                currentDate={currentDate}
                onMonthChange={handleMonthChange}
                onOpenVoice={() => setVoiceModalOpen(true)}
                onAddManual={handleAddManualTransaction}
                onDelete={handleDeleteTransaction}
             />
        )}
        {view === ViewState.INVESTMENTS && (
             <Investments 
                investments={data.investments}
                onOpenVoice={() => setVoiceModalOpen(true)}
                onAddManual={handleAddManualInvestment}
                onDelete={handleDeleteInvestment}
             />
        )}
        {view === ViewState.SAVINGS && (
             <Savings 
                savings={data.savings}
                onOpenVoice={() => setVoiceModalOpen(true)}
                onAddManual={handleAddManualSaving}
                onDelete={handleDeleteSaving}
             />
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-white border-t border-slate-100 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="flex justify-between items-center pb-2">
            <button 
                onClick={() => setView(ViewState.DASHBOARD)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === ViewState.DASHBOARD ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <span className="material-icons-round text-2xl">analytics</span>
                <span className="text-[10px] font-bold">General</span>
            </button>
            <button 
                onClick={() => setView(ViewState.EXPENSES)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === ViewState.EXPENSES ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <span className="material-icons-round text-2xl">receipt_long</span>
                <span className="text-[10px] font-bold">Gastos</span>
            </button>
            <button 
                onClick={() => setView(ViewState.INVESTMENTS)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === ViewState.INVESTMENTS ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <span className="material-icons-round text-2xl">trending_up</span>
                <span className="text-[10px] font-bold">Inversiones</span>
            </button>
            <button 
                 onClick={() => setView(ViewState.SAVINGS)}
                 className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === ViewState.SAVINGS ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <span className="material-icons-round text-2xl">savings</span>
                <span className="text-[10px] font-bold">Ahorro</span>
            </button>
        </div>
      </nav>

      {/* Global Modals */}
      <VoiceModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setVoiceModalOpen(false)}
        mepRate={data.lastMepRate}
        onResult={handleAiResult}
      />

      {/* Data Management Modal */}
      {isDataModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl animate-fade-in relative">
                <button 
                    onClick={() => setDataModalOpen(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                >
                    <span className="material-icons-round text-lg">close</span>
                </button>
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-slate-500">storage</span>
                    Base de Datos
                </h3>
                
                <div className="space-y-3">
                    <button 
                        onClick={handleDownloadBackup}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center gap-3 transition-colors text-sm"
                    >
                        <span className="material-icons-round">download</span>
                        Descargar Backup (JSON)
                    </button>
                    
                    <button 
                        onClick={handleRestoreClick}
                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center gap-3 transition-colors text-sm"
                    >
                        <span className="material-icons-round">upload</span>
                        Restaurar Backup
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json"
                        onChange={handleFileChange}
                    />

                    <button 
                        onClick={handleExportCSV}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center gap-3 transition-colors text-sm"
                    >
                        <span className="material-icons-round">table_view</span>
                        Exportar a Excel (CSV)
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 text-center">
                    Guarda el archivo JSON en un lugar seguro (Drive/Email) para recuperar tus datos más tarde.
                </p>
              </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && pendingTransaction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <span className="material-icons-round text-blue-500">check_circle</span>
                       Confirmar Datos
                   </h3>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Concepto</label>
                           <input 
                               className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                               value={pendingTransaction.concept}
                               onChange={(e) => setPendingTransaction({...pendingTransaction, concept: e.target.value})}
                           />
                       </div>
                       
                       <div>
                           <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Monto (ARS)</label>
                           <input 
                               type="number"
                               className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                               value={pendingTransaction.amountARS}
                               onChange={(e) => setPendingTransaction({...pendingTransaction, amountARS: parseFloat(e.target.value)})}
                           />
                           <p className="text-[10px] text-right text-slate-400 mt-1">~${(pendingTransaction.amountARS / data.lastMepRate).toFixed(2)} USD</p>
                       </div>

                       <div>
                           <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Tipo</label>
                           <select 
                               className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none capitalize"
                               value={pendingTransaction.type}
                               onChange={(e) => setPendingTransaction({...pendingTransaction, type: e.target.value as any})}
                           >
                               <option value="expense">Gasto</option>
                               <option value="income">Ingreso</option>
                               <option value="investment">Inversión</option>
                               <option value="saving">Ahorro</option>
                           </select>
                       </div>

                       {pendingTransaction.type === 'expense' && (
                           <div>
                               <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Categoría</label>
                               <input 
                                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={pendingTransaction.category || ''}
                                    onChange={(e) => setPendingTransaction({...pendingTransaction, category: e.target.value})}
                               />
                           </div>
                       )}

                       {pendingTransaction.type === 'investment' && (
                           <div>
                               <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Activo / Ticker</label>
                               <input 
                                    className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    value={pendingTransaction.assetName || ''}
                                    onChange={(e) => setPendingTransaction({...pendingTransaction, assetName: e.target.value})}
                               />
                           </div>
                       )}
                   </div>

                   <div className="flex gap-3 mt-8">
                       <button 
                           onClick={() => setConfirmationModalOpen(false)}
                           className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors text-sm"
                       >
                           Cancelar
                       </button>
                       <button 
                           onClick={() => handleConfirmTransaction(pendingTransaction)}
                           className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-lg shadow-blue-200"
                       >
                           Guardar
                       </button>
                   </div>
              </div>
          </div>
      )}

    </main>
  );
}

export default App;
