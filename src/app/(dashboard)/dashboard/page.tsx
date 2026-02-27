"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts";
import { TrendingUp, Package, Users, Filter, Crown, Frown, DollarSign, Sparkles } from "lucide-react";

export default function DashboardPage() {
    const { orders, transacciones } = useAppContext();
    const [salesMonth, setSalesMonth] = useState<string>("Todos");
    const [productsMonth, setProductsMonth] = useState<string>("Todos");
    const [resellersMonth, setResellersMonth] = useState<string>("Todos");

    // Helper to get month-year from date strings like "24/2/2026" or "2026-02-24T..."
    const getMonthYear = (dateStr: string) => {
        if (!dateStr) return "Desconocido";
        try {
            let date: Date;
            if (dateStr.includes("/")) {
                const [d, m, y] = dateStr.split(/[\/\s-]/);
                date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            } else {
                date = new Date(dateStr);
            }
            if (isNaN(date.getTime())) return "Desconocido";
            const monthName = date.toLocaleString('es-AR', { month: 'long' });
            return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${date.getFullYear()}`;
        } catch {
            return "Desconocido";
        }
    };

    const getDayFormat = (dateStr: string) => {
        if (!dateStr) return "";
        try {
            let date: Date;
            if (dateStr.includes("/")) {
                const [d, m, y] = dateStr.split(/[\/\s-]/);
                date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            } else {
                date = new Date(dateStr);
            }
            if (isNaN(date.getTime())) return "";
            return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
        } catch {
            return "";
        }
    }

    // Generate unique months for the filter dropdown
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        transacciones.forEach(t => {
            if (t.type === "Ingreso") months.add(getMonthYear(t.date));
        });
        orders.forEach(o => months.add(getMonthYear(o.date)));
        return Array.from(months).filter(m => m !== "Desconocido").sort((a, b) => {
            // Sort roughly by date (could be improved)
            return a.localeCompare(b);
        });
    }, [transacciones, orders]);

    // 1. Sales Chart Data
    const salesChartData = useMemo(() => {
        const filteredTransacciones = transacciones.filter(t => t.type === "Ingreso" && (salesMonth === "Todos" || getMonthYear(t.date) === salesMonth));
        const salesMap = new Map<string, number>();
        filteredTransacciones.forEach(t => {
            const key = salesMonth === "Todos" ? getMonthYear(t.date) : getDayFormat(t.date);
            if (key) {
                salesMap.set(key, (salesMap.get(key) || 0) + t.amount);
            }
        });

        let data = Array.from(salesMap.entries()).map(([name, Ingresos]) => ({ name, Ingresos }));
        data.sort((a, b) => a.name.localeCompare(b.name));
        return data;
    }, [transacciones, salesMonth]);

    // 2. Products Sold 
    const { topProducts, worstProducts } = useMemo(() => {
        const filteredOrders = orders.filter(o => productsMonth === "Todos" || getMonthYear(o.date) === productsMonth);
        const productSales = new Map<string, number>();
        filteredOrders.forEach(o => {
            o.items.forEach(item => {
                const pName = item.producto.name;
                productSales.set(pName, (productSales.get(pName) || 0) + item.quantity);
            });
        });

        const sortedProducts = Array.from(productSales.entries())
            .map(([name, cantidad]) => ({ name, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);

        const top = sortedProducts.slice(0, 5);
        const worst = sortedProducts.slice(-5).reverse().filter(p => !top.find(t => t.name === p.name));
        return { topProducts: top, worstProducts: worst };
    }, [orders, productsMonth]);

    // 3. Top Resellers
    const topResellers = useMemo(() => {
        const filteredOrders = orders.filter(o => resellersMonth === "Todos" || getMonthYear(o.date) === resellersMonth);
        const resellerSales = new Map<string, number>();
        filteredOrders.forEach(o => {
            const cName = o.customerName || "Consumidor Final";
            if (cName.trim() === "") return;
            resellerSales.set(cName, (resellerSales.get(cName) || 0) + o.total);
        });

        return Array.from(resellerSales.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [orders, resellersMonth]);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            {/* Header & Filter */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Sparkles className="w-4 h-4" />
                        Visión General
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Métricas de rendimiento de tu negocio en tiempo real.
                    </p>
                </div>
            </header>

            {/* Cuadro de Ventas (Ingresos) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50">Evolución de Ingresos</h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{salesMonth === "Todos" ? "Ventas mensuales históricas" : `Ventas diarias del período`}</p>
                        </div>
                    </div>
                    <div className="relative group shrink-0 w-full sm:w-auto">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <select
                            value={salesMonth}
                            onChange={(e) => setSalesMonth(e.target.value)}
                            className="w-full sm:w-auto appearance-none pl-11 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
                        >
                            <option value="Todos">📅 Todos los períodos</option>
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="h-[350px] w-full">
                    {salesChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800 opacity-50" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs font-bold font-sans" fill="currentColor" />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} className="text-xs font-bold font-sans" fill="currentColor" />
                                <Tooltip
                                    cursor={{ fill: 'currentColor', className: 'text-slate-100 dark:text-slate-800 opacity-20' }}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                    formatter={(value: number | undefined) => [`$${(value || 0).toLocaleString()}`, "Ingresos Generados"]}
                                />
                                <Bar dataKey="Ingresos" radius={[8, 8, 8, 8]}>
                                    {salesChartData.map((_, index) => (
                                        <Cell key={`cell-${index}`} className="fill-indigo-500 dark:fill-indigo-400 hover:fill-indigo-400 dark:hover:fill-indigo-300 transition-colors" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 font-bold">
                            No hay datos de ingresos registrados para este período.
                        </div>
                    )}
                </div>
            </div>

            {/* Rankings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cuadro de Productos */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 leading-tight">Desempeño de Productos</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Lo más y menos vendido</p>
                            </div>
                        </div>
                        <div className="relative group shrink-0 w-full sm:w-auto">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <select
                                value={productsMonth}
                                onChange={(e) => setProductsMonth(e.target.value)}
                                className="w-full sm:w-auto appearance-none pl-11 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-all"
                            >
                                <option value="Todos">📅 Todos los períodos</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">
                                <Crown className="w-4 h-4" /> Los Más Vendidos (Estrellas)
                            </h3>
                            {topProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {topProducts.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                            <span className="font-extrabold text-slate-900 dark:text-slate-50">{i + 1}. {p.name}</span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg text-sm">{p.cantidad} un.</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 font-bold">Sin información suficiente.</p>
                            )}
                        </div>

                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4">
                                <Frown className="w-4 h-4" /> Los Menos Vendidos (A evitar)
                            </h3>
                            {worstProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {worstProducts.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                                            <span className="font-extrabold text-slate-900 dark:text-slate-50">{p.name}</span>
                                            <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 rounded-lg text-sm">{p.cantidad} un.</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 font-bold">Sin información suficiente.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cuadro de Revendedores */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 leading-tight">Top Revendedores</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Mejores generadores de ventas</p>
                            </div>
                        </div>
                        <div className="relative group shrink-0 w-full sm:w-auto">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <select
                                value={resellersMonth}
                                onChange={(e) => setResellersMonth(e.target.value)}
                                className="w-full sm:w-auto appearance-none pl-11 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer transition-all"
                            >
                                <option value="Todos">📅 Todos los períodos</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {topResellers.length > 0 ? (
                        <div className="space-y-4">
                            {topResellers.map((r, i) => (
                                <div key={i} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-all hover:scale-[1.02]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <span className="font-extrabold text-lg text-slate-900 dark:text-slate-50 block">{r.name}</span>
                                            {i === 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5 block flex items-center gap-1"><Crown className="w-3 h-3" /> Líder en ventas</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 flex items-center">
                                            ${r.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 dark:text-slate-500 font-bold text-center gap-2">
                            <Users className="w-12 h-12 opacity-20" />
                            Aún no hay suficientes datos<br />de revendedores.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
