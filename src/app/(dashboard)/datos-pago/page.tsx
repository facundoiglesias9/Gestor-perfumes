"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Wallet, Save, CreditCard, Building2, Landmark, CheckCircle2, X, Shield } from "lucide-react";

const Toast = ({ message, onClose, type = "success" }: { message: string, onClose: () => void, type?: "success" | "info" | "error" }) => (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
        <div className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl border ${type === "success"
            ? "bg-emerald-600 border-emerald-500 text-white"
            : type === "error"
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-blue-600 border-blue-500 text-white"
            }`}>
            <div className="p-2 bg-white/20 rounded-xl">
                {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : type === "error" ? <X className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
                <p className="font-black text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export default function DatosPagoPage() {
    const { paymentInfo, setPaymentInfo, currentUser } = useAppContext();
    const [info, setInfo] = useState(paymentInfo);
    const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                    <X className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Acceso Denegado</h2>
                <p className="text-slate-500 font-medium max-w-sm mt-2">Solo los administradores pueden modificar los datos de pago globales.</p>
            </div>
        );
    }

    const handleSave = () => {
        setPaymentInfo(info);
        setToast({ message: "Datos de pago actualizados correctamente.", type: "success" });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        Configuración de Pagos
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Datos de Pago
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Modificá el Alias, CBU y Banco que verán tus clientes al seleccionar transferencia. Solo accesible para administradores.
                    </p>
                </div>
            </header>

            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm">
                <div className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Alias de la Cuenta</label>
                        <div className="relative group">
                            <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={info.alias}
                                onChange={e => setInfo({ ...info, alias: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
                                placeholder="EJ: SCENTA.PERFUMES"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">CBU / CVU</label>
                        <div className="relative group">
                            <Landmark className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={info.cbu}
                                onChange={e => setInfo({ ...info, cbu: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
                                placeholder="0000003100012345678901"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Banco / Billetera Virtual</label>
                        <div className="relative group">
                            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={info.banco}
                                onChange={e => setInfo({ ...info, banco: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all"
                                placeholder="Galicia / Mercado Pago"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mercado Pago Access Token</label>
                        <div className="relative group">
                            <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                value={info.mpAccessToken}
                                onChange={e => setInfo({ ...info, mpAccessToken: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
                                placeholder="APP_USR-..."
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium px-1">Este token es necesario para generar el QR dinámico con el monto exacto.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white transition-all active:scale-95 group"
                    >
                        <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Guardar Cambios
                    </button>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
