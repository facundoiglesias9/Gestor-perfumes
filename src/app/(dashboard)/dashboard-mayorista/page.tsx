"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { PieChart, TrendingUp, Trophy, Star, Medal, Award } from "lucide-react";

type SaleRecord = {
    id: string;
    itemKey: string;
    productName: string;
    date: string;
    qty: number;
    sellPrice: number;
    costPerUnit: number;
};

export default function DashboardMayoristaPage() {
    const { currentUser } = useAppContext();
    const [salesLog, setSalesLog] = useState<SaleRecord[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initialize local storage logic
    useEffect(() => {
        if (!currentUser) return;
        const key = `reseller_sales_log_${currentUser.username}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                setSalesLog(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Error loading sales history");
        }
        setIsLoaded(true);
    }, [currentUser]);

    // Calculate aggregated sales performance
    const topPerfumes = useMemo(() => {
        const productSales: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};

        salesLog.forEach(sale => {
            if (!productSales[sale.productName]) {
                productSales[sale.productName] = { name: sale.productName, qty: 0, revenue: 0, profit: 0 };
            }
            productSales[sale.productName].qty += sale.qty;
            productSales[sale.productName].revenue += (sale.qty * sale.sellPrice);
            productSales[sale.productName].profit += (sale.qty * (sale.sellPrice - sale.costPerUnit));
        });

        // Convert to array and sort by quantity descending
        const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty);
        return sorted.slice(0, 5); // Return top 5
    }, [salesLog]);

    const globalTotals = useMemo(() => {
        return topPerfumes.reduce((acc, curr) => {
            return {
                totalQty: acc.totalQty + curr.qty,
                totalProfit: acc.totalProfit + curr.profit
            }
        }, { totalQty: 0, totalProfit: 0 });
    }, [topPerfumes]);

    const getTrophyIcon = (index: number) => {
        if (index === 0) return <Trophy className="w-8 h-8 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />;
        if (index === 1) return <Medal className="w-8 h-8 text-slate-400 drop-shadow-[0_0_15px_rgba(148,163,184,0.5)]" />;
        if (index === 2) return <Award className="w-8 h-8 text-amber-700 drop-shadow-[0_0_15px_rgba(180,83,9,0.5)]" />;
        return <Star className="w-6 h-6 text-indigo-400 opacity-50" />;
    };

    if (!isLoaded) return null;

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 flex flex-col items-center">

            <header className="w-full flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <PieChart className="w-3.5 h-3.5" />
                        Métricas y Rendimiento
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Dashboard Global
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Revisá un gráfico en vivo de tus perfumes líderes de mercado. Averiguá cuál es el que más unidades te está dejando vender.
                    </p>
                </div>
            </header>

            {topPerfumes.length === 0 ? (
                <div className="w-full max-w-2xl py-24 text-center flex flex-col items-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] mt-8 bg-white/50 dark:bg-slate-900/50">
                    <TrendingUp className="w-20 h-20 text-slate-200 dark:text-slate-800 mb-6 drop-shadow-sm" />
                    <h3 className="text-2xl font-black text-slate-400">Sin estadísticas todavía</h3>
                    <p className="text-slate-500 font-medium max-w-md mt-2">
                        Necesitas confirmar al menos una venta en tu panel de <span className="text-indigo-500 font-black">Historial de Compras</span> para empezar a generar estrellas en el ranking.
                    </p>
                </div>
            ) : (
                <div className="w-full max-w-6xl mt-8">
                    {/* The Hero #1 Perfume Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[3rem] p-1 shadow-2xl mb-8 group">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-colors duration-700"></div>

                        <div className="relative bg-slate-900/40 backdrop-blur-xl border border-white/10 p-10 md:p-14 rounded-[2.8rem] flex flex-col md:flex-row items-center gap-10 md:gap-16 text-center md:text-left">

                            <div className="shrink-0 flex items-center justify-center w-32 h-32 md:w-40 md:h-40 rounded-full bg-indigo-500/20 border-4 border-indigo-400/30 shadow-[0_0_60px_rgba(99,102,241,0.3)]">
                                <Trophy className="w-16 h-16 md:w-20 md:h-20 text-indigo-400 drop-shadow-lg" />
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-black tracking-widest uppercase border border-indigo-500/30">
                                    <Star className="w-3.5 h-3.5 fill-indigo-400" />
                                    Perfume Más Vendido (Top #1)
                                </div>
                                <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-md">
                                    {topPerfumes[0].name}
                                </h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6 opacity-90">
                                    <div className="bg-black/30 rounded-2xl px-6 py-4 border border-white/5">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300/70 mb-1">Unidades Vendidas</p>
                                        <p className="text-4xl font-black text-white">{topPerfumes[0].qty}</p>
                                    </div>
                                    <div className="bg-black/30 rounded-2xl px-6 py-4 border border-white/5">
                                        <p className="text-[10px] uppercase font-black tracking-widest text-emerald-400/70 mb-1">Ganancia Pura Generada</p>
                                        <p className="text-4xl font-black text-emerald-400">+${topPerfumes[0].profit.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Top 2 to 5 List */}
                    {topPerfumes.length > 1 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden p-8 md:p-10">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <Medal className="w-6 h-6 text-indigo-500" />
                                Resto del Top 5 de Ventas
                            </h3>

                            <div className="space-y-4">
                                {topPerfumes.slice(1).map((perfume, idx) => (
                                    <div
                                        key={perfume.name}
                                        className="flex items-center gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors group"
                                    >
                                        <div className="w-14 items-center justify-center flex shrink-0 font-black text-2xl text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors">
                                            #{idx + 2}
                                        </div>

                                        <div className="w-16 h-16 shrink-0 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                            {getTrophyIcon(idx + 1)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white truncate">
                                                {perfume.name}
                                            </h4>

                                            {/* Bar graph visualizer */}
                                            <div className="mt-3 flex items-center gap-3">
                                                <div className="h-2 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${(perfume.qty / topPerfumes[0].qty) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-black text-slate-500 whitespace-nowrap hidden sm:block">
                                                    {Math.round((perfume.qty / globalTotals.totalQty) * 100)}% de tus ventas totales
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right space-y-1">
                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{perfume.qty} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest hidden sm:inline">unid.</span></p>
                                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 opacity-80">+${perfume.profit.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
