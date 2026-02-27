"use client";

import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Search, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function CajaPage() {
    const { transacciones, setTransacciones, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        type: "Ingreso" as "Ingreso" | "Egreso",
        amount: "",
        description: ""
    });

    // Cálculos de saldo
    const totalIngresos = transacciones.filter(t => t.type === "Ingreso").reduce((acc, t) => acc + t.amount, 0);
    const totalEgresos = transacciones.filter(t => t.type === "Egreso").reduce((acc, t) => acc + t.amount, 0);
    const saldoActual = totalIngresos - totalEgresos;

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTransacciones([
            {
                id: getNextId(transacciones, "T-"),
                type: formData.type,
                amount: parseFloat(formData.amount),
                description: formData.description,
                date: new Date().toLocaleDateString("es-AR")
            },
            ...transacciones
        ]);
        setFormData({ type: "Ingreso", amount: "", description: "" });
        setIsAddModalOpen(false);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setTransacciones(transacciones.filter(t => t.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        Monetización
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Caja Unificada
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Controlá el saldo, ingresos por ventas manuales y los egresos por compras.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Movimiento Manual
                    </button>
                </div>
            </header>

            {/* Widgets de Saldo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex items-center gap-3 font-semibold text-blue-100">
                        Plata en Caja
                    </div>
                    <div className="relative z-10 mt-4">
                        <span className="text-5xl font-black tracking-tight">${saldoActual.toLocaleString()}</span>
                    </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            Ingresos Totales
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-50">${totalIngresos.toLocaleString()}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            Egresos Totales
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-50">${totalEgresos.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Listado de Transacciones */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Historial de Movimientos
                    </h2>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%]">Fecha</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%]">Tipo</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[40%]">Descripción</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%] text-right">Monto</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transacciones.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                                    <td className="px-8 py-6">
                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">{item.date}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider border ${item.type === "Ingreso"
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                            }`}>
                                            {item.type === "Ingreso" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-slate-900 dark:text-slate-100 font-semibold">{item.description}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className={`font-black text-lg ${item.type === "Ingreso" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
                                            }`}>
                                            {item.type === "Ingreso" ? "+" : "-"}${item.amount.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => setItemToDelete(item.id)}
                                            className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                                            title="Eliminar registro"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {transacciones.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-20 h-20 mb-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                                <Wallet className="w-8 h-8 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">No hay movimientos en la caja. Comenzá a cargar ingresos y compras.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Movimiento"
                message="¿Estás seguro de que deseas eliminar este movimiento? Afectará al saldo disponible."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Modal para movimiento manual */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">Cargar Movimiento</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Registrá un ingreso o gasto externo a los pedidos.</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 rounded-full transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Tipo de Movimiento</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Ingreso" })}
                                            className={`py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${formData.type === "Ingreso"
                                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <ArrowDownLeft className="w-4 h-4" /> Ingreso
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Egreso" })}
                                            className={`py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${formData.type === "Egreso"
                                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                                                : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            <ArrowUpRight className="w-4 h-4" /> Egreso
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Monto (ARS)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.amount}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-10 pr-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>


                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Descripción</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ej: Venta local"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!formData.amount || !formData.description}
                                className="w-full py-4 mt-6 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                            >
                                <Wallet className="w-5 h-5" />
                                Guardar Movimiento
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
