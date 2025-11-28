
import React, { useEffect, useState } from 'react';
import { Investment } from '../types';
import { fetchAssetPrice } from '../services/geminiService';

interface InvestmentsProps {
  investments: Investment[];
  onOpenVoice: () => void;
  onAddManual: (t: { assetName: string; amount: number; quantity: number; type: 'traditional' | 'crypto'; manualCurrentPrice?: number; currency?: 'ARS' | 'USD' }) => void;
  onDelete: (id: string) => void;
}

const CRYPTO_TICKERS = ['BTC', 'ETH', 'SOL', 'AVAX'];

export const Investments: React.FC<InvestmentsProps> = ({ 
    investments, 
    onOpenVoice,
    onAddManual,
    onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'traditional' | 'crypto'>('traditional');
  const [enrichedInvestments, setEnrichedInvestments] = useState<Investment[]>(investments);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  
  // Unified form state
  const [manualForm, setManualForm] = useState({ 
      ticker: '', 
      amount: '', 
      quantity: '', 
      currentPrice: '', 
      type: 'traditional' as 'traditional' | 'crypto',
      currency: 'ARS' as 'ARS' | 'USD' // Added currency state
  });

  // Update effect to handle sorting and ensure type exists
  useEffect(() => {
    const processInvestments = async () => {
        setLoading(true);
        // Basic mapping to ensure defaults
        const processed = investments.map(inv => ({
            ...inv,
            investmentType: inv.investmentType || 'traditional', // Default for legacy data
            currentPriceUSD: inv.currentPriceUSD || (inv.investedUSD / (inv.quantity || 1))
        }));

        setEnrichedInvestments(processed);
        setLoading(false);
    };
    processInvestments();
  }, [investments]);

  // Effect to update asset prices
  useEffect(() => {
    const updatePrices = async () => {
        if (enrichedInvestments.length === 0 && activeTab === 'traditional') return;
        
        // Update Portfolio Prices
        const updated = await Promise.all(enrichedInvestments.map(async (inv) => {
             const currentPrice = await fetchAssetPrice(inv.assetName);
             return {
                 ...inv,
                 currentPriceUSD: currentPrice > 0 ? currentPrice : inv.currentPriceUSD
             };
        }));
        setEnrichedInvestments(updated);

        // Update Crypto Ticker
        if (activeTab === 'crypto') {
            const prices: Record<string, number> = {};
            await Promise.all(CRYPTO_TICKERS.map(async (ticker) => {
                const p = await fetchAssetPrice(ticker);
                prices[ticker] = p;
            }));
            setCryptoPrices(prices);
        }
    };
    
    updatePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, investments.length]); 


  const filteredInvestments = enrichedInvestments.filter(inv => inv.investmentType === activeTab);

  const totalInvested = enrichedInvestments.reduce((acc, curr) => acc + curr.investedUSD, 0);
  const totalValue = enrichedInvestments.reduce((acc, curr) => acc + (curr.quantity * (curr.currentPriceUSD || 0)), 0);
  const totalGain = totalValue - totalInvested;

  // Tab specific totals
  const tabInvested = filteredInvestments.reduce((acc, curr) => acc + curr.investedUSD, 0);
  const tabValue = filteredInvestments.reduce((acc, curr) => acc + (curr.quantity * (curr.currentPriceUSD || 0)), 0);
  const tabGain = tabValue - tabInvested;

  const toggleExpand = (id: string) => {
      setExpandedId(prev => prev === id ? null : id);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualForm.ticker || !manualForm.amount) return;
      
      onAddManual({
          assetName: manualForm.ticker.toUpperCase(),
          amount: parseFloat(manualForm.amount),
          quantity: parseFloat(manualForm.quantity || '0'),
          type: manualForm.type,
          manualCurrentPrice: manualForm.currentPrice ? parseFloat(manualForm.currentPrice) : undefined,
          currency: manualForm.type === 'crypto' ? 'USD' : manualForm.currency
      });
      setManualModalOpen(false);
      setManualForm({ ticker: '', amount: '', quantity: '', currentPrice: '', type: 'traditional', currency: 'ARS' });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="shrink-0 px-3 pt-3 bg-slate-50 z-10">
        {/* Header Actions */}
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
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-3">
            <button 
                onClick={() => setActiveTab('traditional')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'traditional' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
            >
                Tradicional
            </button>
            <button 
                onClick={() => setActiveTab('crypto')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'crypto' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
                Criptomonedas
            </button>
        </div>

        {/* Crypto Ticker - CLEAN DESIGN */}
        {activeTab === 'crypto' && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                {CRYPTO_TICKERS.map(ticker => (
                    <div key={ticker} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg flex flex-col min-w-[80px] text-center shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400">{ticker}</span>
                        <span className="text-xs font-bold text-slate-800">
                            {cryptoPrices[ticker] ? `$${cryptoPrices[ticker].toLocaleString()}` : '...'}
                        </span>
                    </div>
                ))}
            </div>
        )}

        {/* Portfolio Summary Card - CLEAN & SOBER DESIGN */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">Valor {activeTab === 'crypto' ? 'Cripto' : 'Tradicional'} (USD)</p>
                    <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">${tabValue.toFixed(2)}</h3>
                </div>
                <div className={`text-right ${tabGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">Rendimiento</p>
                    <p className="text-base font-bold">{tabGain > 0 ? '+' : ''}{tabGain.toFixed(2)}</p>
                    <p className="text-[10px] opacity-80">{tabInvested > 0 ? ((tabGain/tabInvested)*100).toFixed(2) : 0}%</p>
                </div>
            </div>
            {/* Global Total Hint */}
            <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between text-[9px] text-slate-400">
                <span>Total Global: ${totalValue.toFixed(2)}</span>
                <span>Rendimiento Global: ${(totalValue - totalInvested).toFixed(2)}</span>
            </div>
        </div>
      </div>

      {/* Scrollable Investment List */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 scrollbar-hide">
        <div className="space-y-2">
            {filteredInvestments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-100">
                    No tienes inversiones {activeTab === 'crypto' ? 'cripto' : 'tradicionales'}.
                </div>
            ) : (
                filteredInvestments.map(inv => {
                    const currentVal = inv.quantity * (inv.currentPriceUSD || 0);
                    const gain = currentVal - inv.investedUSD;
                    const gainPercent = inv.investedUSD > 0 ? (gain / inv.investedUSD) * 100 : 0;
                    const isExpanded = expandedId === inv.id;
                    
                    return (
                        <div 
                            key={inv.id} 
                            onClick={() => toggleExpand(inv.id)}
                            className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all relative group"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 text-sm">{inv.assetName}</span>
                                        {isExpanded && (
                                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500 uppercase">
                                                {inv.investmentType}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {inv.quantity.toFixed(6)} u. • ${currentVal.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-right mr-6">
                                    <div className={`text-xs font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {gain > 0 ? '+' : ''}{gain.toFixed(2)}
                                    </div>
                                    <div className={`text-[9px] ${gain >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                        {gainPercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            
                            {/* Delete Button (Top Right) */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(inv.id);
                                }}
                                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1 transition-colors"
                            >
                                <span className="material-icons-round text-lg">delete_outline</span>
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-y-2 text-[10px] text-slate-600 animate-fade-in">
                                    <div>
                                        <span className="block text-slate-400">Inversión Inicial</span>
                                        <span className="font-medium">
                                            {inv.investedUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                        </span>
                                        <span className="block text-[8px] text-slate-400">
                                            ({inv.investedARS.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })})
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-slate-400">Precio Actual</span>
                                        <span className="font-medium">${(inv.currentPriceUSD || 0).toFixed(2)} USD</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-400">Fecha</span>
                                        <span className="font-medium">{new Date(inv.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* Manual Investment Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl animate-fade-in relative">
                <button 
                    onClick={() => setManualModalOpen(false)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                >
                    <span className="material-icons-round text-lg">close</span>
                </button>
                <h3 className="text-base font-bold text-slate-800 mb-4">Agregar Inversión</h3>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setManualForm({...manualForm, type: 'traditional', ticker: '', amount: '', quantity: '', currentPrice: '', currency: 'ARS'})}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${manualForm.type === 'traditional' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                        >
                            Tradicional
                        </button>
                        <button
                            type="button"
                            onClick={() => setManualForm({...manualForm, type: 'crypto', ticker: '', amount: '', quantity: '', currentPrice: '', currency: 'USD'})}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${manualForm.type === 'crypto' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                        >
                            Cripto
                        </button>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Ticker / Activo</label>
                        <input 
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                            placeholder={manualForm.type === 'crypto' ? "Ej: BTC, ETH" : "Ej: AAPL, SPY"}
                            value={manualForm.ticker}
                            onChange={e => setManualForm({...manualForm, ticker: e.target.value})}
                            autoFocus
                        />
                    </div>
                    
                    {/* Amount Field */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">
                                MONTO INVERTIDO
                            </label>
                            
                            {/* Currency Toggle for Traditional */}
                            {manualForm.type === 'traditional' && (
                                <div className="flex bg-slate-100 rounded-md p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setManualForm({...manualForm, currency: 'ARS'})}
                                        className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${manualForm.currency === 'ARS' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                                    >
                                        ARS
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualForm({...manualForm, currency: 'USD'})}
                                        className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${manualForm.currency === 'USD' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}
                                    >
                                        USD
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">
                                {manualForm.type === 'crypto' ? '$' : (manualForm.currency === 'ARS' ? '$' : 'u$d')}
                            </span>
                            <input 
                                type="number"
                                className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg pl-8 pr-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                placeholder="0.00"
                                value={manualForm.amount}
                                onChange={e => setManualForm({...manualForm, amount: e.target.value})}
                            />
                        </div>
                        {manualForm.type === 'crypto' && <p className="text-[9px] text-slate-400 text-right mt-0.5">Siempre en USD</p>}
                    </div>

                    {/* Optional Price Field for BOTH (USD MANUAL) */}
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">
                            PRECIO ACTUAL DEL ACTIVO (USD) <span className="text-[8px] font-normal text-slate-400 lowercase">(opcional)</span>
                        </label>
                        <input 
                            type="number"
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="Ej: 150.50"
                            value={manualForm.currentPrice}
                            onChange={e => setManualForm({...manualForm, currentPrice: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold">Cantidad</label>
                        <input 
                            type="number"
                            step="any"
                            className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                            placeholder="Ej: 0.0025"
                            value={manualForm.quantity}
                            onChange={e => setManualForm({...manualForm, quantity: e.target.value})}
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Si dejas en 0 se calculará automáticamente.</p>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm mt-2">
                        Guardar Inversión
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
