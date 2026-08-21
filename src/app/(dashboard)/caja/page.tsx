"use client";

import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Search, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { formatCurrency } from "@/lib/format-utils";
import ConfirmModal from "@/components/ConfirmModal";
import { upsertRecord } from "@/lib/db-actions";

export default function CajaPage() {
    const { transacciones, setTransacciones, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        type: "Ingreso" as "Ingreso" | "Egreso",
        amount: "",
        description: ""
    });

    const formatARS = (amount: number) => {
        return formatCurrency(amount, true);
    };

    // Cálculos de saldo - Aseguramos que sean números
    const totalIngresos = transacciones
        .filter(t => t.type === "Ingreso")
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
        
    const totalEgresos = transacciones
        .filter(t => t.type === "Egreso")
        .reduce((acc, t) => acc + Number(t.amount || 0), 0);
        
    const saldoActual = totalIngresos - totalEgresos;

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newId = getNextId(transacciones, "T-");
        const newTransaction = {
            id: newId,
            type: formData.type,
            amount: parseFloat(formData.amount),
            description: formData.description,
            date: new Date().toLocaleDateString("es-AR")
        };
        
        setTransacciones([newTransaction, ...transacciones]);
        
        // Persist to Xata
        await upsertRecord("transacciones", {
            id: newTransaction.id,
            type: newTransaction.type,
            amount: newTransaction.amount,
            description: newTransaction.description,
            date: newTransaction.date
        });

        setFormData({ type: "Ingreso", amount: "", description: "" });
        setIsAddModalOpen(false);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setTransacciones(transacciones.filter(t => t.id !== itemToDelete));
            // Also delete from DB
            const { deleteRecord } = require("@/lib/db-actions");
            deleteRecord("transacciones", itemToDelete);
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase mb-1 border border-[#7D9878]/20">
                        <Wallet className="w-3.5 h-3.5" />
                        Monetización
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand text-center">
                        Caja Unificada
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg max-w-xl leading-relaxed font-medium transition-colors text-center">
                        Controlá el saldo, ingresos por ventas manuales y los egresos por compras.
                    </p>
                </div>

                <div className="mt-6 md:mt-0 md:absolute md:right-10 md:top-1/2 md:-translate-y-1/2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] text-white font-bold hover:bg-[#6b8566] hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition-all font-brand"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Movimiento Manual
                    </button>
                </div>
            </header>

            {/* Widgets de Saldo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gradient-to-br from-[#7D9878] to-[#5a7356] dark:from-[#353B33] dark:to-[#242723] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#7D9878]/20 relative overflow-hidden flex flex-col justify-between min-h-[220px] border border-[#7D9878]/30">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex items-center gap-3 font-semibold text-white/90">
                        Plata en Caja
                    </div>
                    <div className="relative z-10 mt-4">
                        <span className="text-5xl font-black tracking-tight">{formatARS(saldoActual)}</span>
                    </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-[#7D9878] dark:text-[#A3B69B] font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-[#7D9878]/10 rounded-lg">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            Ingresos Totales
                        </div>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA]">{formatARS(totalIngresos)}</p>
                    </div>

                    <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-4">
                        <div className="flex items-center gap-3 text-[#C9866F] font-bold uppercase tracking-wider text-xs">
                            <div className="p-2 bg-[#C9866F]/10 rounded-lg">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            Egresos Totales
                        </div>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA]">{formatARS(totalEgresos)}</p>
                    </div>
                </div>
            </div>

            {/* Listado de Transacciones */}
            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-sm overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2">
                        Historial de Movimientos
                    </h2>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[15%]">Fecha</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[15%]">Tipo</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[40%]">Descripción</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[20%] text-right">Monto</th>
                                <th className="px-8 py-6 text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                            {transacciones.map((item, idx) => (
                                <tr key={idx} className="group hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10 transition-colors cursor-pointer">
                                    <td className="px-8 py-6">
                                        <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 font-medium text-sm">{item.date}</p>
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
                                            {item.type === "Ingreso" ? "+" : "-"}{formatARS(item.amount)}
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 my-auto flex flex-col max-h-[calc(100vh-8rem)]">
                        <div className="p-6 sm:p-8 pb-6 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A] shrink-0">
                            <div>
                                <h2 className="text-2xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Cargar Movimiento</h2>
                                <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-medium mt-1">Registrá un ingreso o gasto externo a los pedidos.</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-widest pl-1">Tipo de Movimiento</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Ingreso" })}
                                            className={`py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${formData.type === "Ingreso"
                                                ? "bg-[#7D9878]/15 text-[#7D9878] dark:text-[#A3B69B] border-[#7D9878]"
                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"
                                                }`}
                                        >
                                            <ArrowDownLeft className="w-4 h-4 text-[#7D9878]" /> Ingreso
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Egreso" })}
                                            className={`py-3 rounded-2xl font-bold transition-all border flex items-center justify-center gap-2 ${formData.type === "Egreso"
                                                ? "bg-[#C9866F]/15 text-[#C9866F] dark:text-[#C9866F] border-[#C9866F]"
                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#C9866F]"
                                                }`}
                                        >
                                            <ArrowUpRight className="w-4 h-4 text-[#C9866F]" /> Egreso
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-widest pl-1">Monto (ARS)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]/70 dark:text-[#F4EFEA]/80 font-bold text-base">$</span>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.amount}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 pl-10 pr-4 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/50 focus:outline-none focus:border-[#7D9878] transition-all font-bold"
                                        />
                                    </div>
                                </div>


                                <div className="space-y-2 relative">
                                    <label className="text-xs font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-widest pl-1">Descripción</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ej: Venta local"
                                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/50 focus:outline-none focus:border-[#7D9878] transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!formData.amount || !formData.description}
                                className="w-full py-4 mt-6 rounded-2xl bg-[#7D9878] text-white font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-[#6b8566] hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all font-brand"
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
