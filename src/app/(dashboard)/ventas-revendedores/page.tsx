"use client";

import { ShoppingBag, TrendingUp, Calendar, User, Search, Trophy, ArrowRight, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

export default function VentasRevendedoresPage() {
    const { orders, usuarios } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear, currentYear - 1];
    }, []);

    const resellerStats = useMemo(() => {
        // Only show Mayoristas as requested
        const resellers = usuarios.filter(u => u.role === "mayorista");

        const stats = resellers.map(reseller => {
            const resellerOrders = orders.filter(order => {
                const orderDate = new Date(order.date);
                const isMyOrder = order.customerName.toLowerCase() === reseller.username.toLowerCase();
                const isInPeriod = orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear;
                return isMyOrder && isInPeriod;
            });

            const totalSalesValue = resellerOrders.reduce((acc, o) => acc + o.total, 0);
            const totalOrdersCount = resellerOrders.length;

            return {
                id: reseller.id,
                username: reseller.username,
                role: reseller.role,
                salesValue: totalSalesValue,
                ordersCount: totalOrdersCount,
                lastOrder: resellerOrders.length > 0 ? resellerOrders[0].date : "-"
            };
        });

        return stats
            .filter(s => s.username.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.salesValue - a.salesValue);
    }, [usuarios, orders, selectedMonth, selectedYear, searchTerm]);

    const topProducts = useMemo(() => {
        const productMap: Record<string, { name: string, qty: number, total: number }> = {};

        orders.forEach(order => {
            const orderDate = new Date(order.date);
            if (orderDate.getMonth() !== selectedMonth || orderDate.getFullYear() !== selectedYear) return;

            order.items.forEach(item => {
                const key = item.producto.name;
                const price = item.priceType === "mayorista" ? item.producto.price : item.producto.priceMinorista;
                if (!productMap[key]) {
                    productMap[key] = { name: key, qty: 0, total: 0 };
                }
                productMap[key].qty += item.quantity;
                productMap[key].total += price * item.quantity;
            });
        });

        return Object.values(productMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);
    }, [orders, selectedMonth, selectedYear]);

    const globalStats = useMemo(() => {
        const totalValue = resellerStats.reduce((acc, s) => acc + s.salesValue, 0);
        const totalOrders = resellerStats.reduce((acc, s) => acc + s.ordersCount, 0);
        const topReseller = resellerStats.length > 0 && resellerStats[0].salesValue > 0 ? resellerStats[0] : null;

        return { totalValue, totalOrders, topReseller };
    }, [resellerStats]);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header section with month filter */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Monetización & Análisis
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                        Ventas Mayoristas
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium">
                        Rendimiento exclusivo de usuarios con cuenta de Mayorista.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 flex gap-1">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 px-4 py-2 focus:outline-none"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i} className="bg-white dark:bg-slate-900">{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 px-4 py-2 focus:outline-none"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="bg-white dark:bg-slate-900">{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Global stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl w-fit">
                        <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Monto Mayorista Mes</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-1">${globalStats.totalValue.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl w-fit">
                        <ShoppingBag className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Pedidos Procesados</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-1">{globalStats.totalOrders}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-indigo-200 dark:border-indigo-500/30 shadow-[0_10px_40px_rgba(99,102,241,0.05)] space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Trophy className="w-24 h-24 text-indigo-600" />
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl w-fit">
                        <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Top Mayorista</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 mt-1 truncate">
                            {globalStats.topReseller ? globalStats.topReseller.username : "Sin ventas"}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Ranking list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                        Ránking Mayoristas
                    </h2>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar mayorista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-bold placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mayorista</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pedidos</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto Facturado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {resellerStats.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold">
                                        No hay usuarios Mayoristas registrados.
                                    </td>
                                </tr>
                            ) : (
                                resellerStats.map((stat, index) => (
                                    <tr key={stat.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                        <td className="px-8 py-6">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${stat.salesValue > 0 && index === 0 ? "bg-amber-100 text-amber-600 shadow-sm" :
                                                    stat.salesValue > 0 && index === 1 ? "bg-slate-200 text-slate-600" :
                                                        stat.salesValue > 0 && index === 2 ? "bg-orange-100 text-orange-600" :
                                                            "text-slate-400"
                                                }`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400">
                                                    {stat.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="font-bold text-slate-900 dark:text-slate-100">{stat.username}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <p className="font-black text-slate-700 dark:text-slate-300">{stat.ordersCount}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-lg font-black text-slate-900 dark:text-slate-50">
                                                ${stat.salesValue.toLocaleString()}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                        <h2 className="text-2xl font-black">Reporte de Crecimiento</h2>
                        <p className="text-indigo-100 font-medium leading-relaxed">
                            Los datos que ves son reales y provienen directamente de las órdenes procesadas en el sistema.
                            Usá los selectores de mes para auditar cierres de caja históricos.
                        </p>
                    </div>
                    <ShoppingBag className="absolute -bottom-10 -right-10 w-64 h-64 text-indigo-500 opacity-20 group-hover:scale-110 transition-all duration-700 p-10" />
                </div>

                <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-slate-800 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-black text-xl">Top Productos Movidos (Mayoristas)</h2>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>

                    <div className="space-y-6">
                        {topProducts.length === 0 ? (
                            <p className="text-slate-500 font-bold text-center py-4">Sin datos de ventas para este mes.</p>
                        ) : (
                            topProducts.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-10 bg-indigo-500 rounded-full group-hover:scale-y-125 transition-transform"></div>
                                        <div>
                                            <p className="text-white font-bold">{prod.name}</p>
                                            <p className="text-slate-500 text-[10px] font-black uppercase">{prod.qty} UNIDADES</p>
                                        </div>
                                    </div>
                                    <p className="text-indigo-400 font-black">${prod.total.toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
