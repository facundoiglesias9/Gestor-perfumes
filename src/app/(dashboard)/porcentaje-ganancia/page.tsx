"use client";

import { useState, useMemo } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Percent, Save, Tags, AlertTriangle, CheckCircle2, X } from "lucide-react";

const Toast = ({ message, onClose, type = "success" }: { message: string, onClose: () => void, type?: "success" | "info" | "error" }) => (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
        <div className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl border ${type === "success"
            ? "bg-emerald-600 border-emerald-500 text-white"
            : type === "error"
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-blue-600 border-blue-500 text-white"
            }`}>
            <div className="p-2 bg-white/20 rounded-xl">
                {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : type === "error" ? <X className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
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

export default function PorcentajeGananciaPage() {
    const { categorias, categoryMargins, setCategoryMargins, productos, setProductos } = useAppContext();
    const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);
    const [updatingParams, setUpdatingParams] = useState<Record<string, { mayoristaX: number, minoristaX: number }>>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialize inputs based on the global state
    useMemo(() => {
        const initialParams: Record<string, { mayoristaX: number, minoristaX: number }> = {};
        categorias.forEach(cat => {
            const margin = categoryMargins[cat.name] || { mayorista: 1.5, minorista: 2.0 };
            initialParams[cat.name] = {
                mayoristaX: Math.round((margin.mayorista - 1) * 100),
                minoristaX: Math.round((margin.minorista - 1) * 100)
            };
        });
        setUpdatingParams(initialParams);
    }, [categorias, categoryMargins]);

    const handleUpdateMargin = (catName: string, field: "mayoristaX" | "minoristaX", val: number) => {
        setUpdatingParams(prev => ({
            ...prev,
            [catName]: {
                ...prev[catName],
                [field]: val
            }
        }));
    };

    const roundUpTo1000 = (num: number) => Math.ceil(num / 1000) * 1000;

    const handleSaveAndMassUpdate = async (catName: string) => {
        setIsProcessing(true);
        const margins = updatingParams[catName];

        const multMayorista = 1 + (margins.mayoristaX / 100);
        const multMinorista = 1 + (margins.minoristaX / 100);

        // 1. Update the global preferences logic
        const newCategoryMarginsState = {
            ...categoryMargins,
            [catName]: {
                mayorista: multMayorista,
                minorista: multMinorista
            }
        };
        setCategoryMargins(newCategoryMarginsState);

        // 2. Filter all products of this category and calculate their new rounded prices based on their individual cost
        const targetProducts = productos.filter(p => p.category === catName);
        if (targetProducts.length === 0) {
            setToast({ message: `No hay productos en ${catName} para actualizar.`, type: "info" });
            setIsProcessing(false);
            return;
        }

        const updatedProducts: Producto[] = targetProducts.map(p => ({
            ...p,
            price: roundUpTo1000(p.cost * multMayorista),
            priceMinorista: roundUpTo1000(p.cost * multMinorista),
        }));

        // 3. Update React State explicitly for these items
        setProductos(prev => prev.map(p => {
            const matched = updatedProducts.find(up => up.id === p.id);
            return matched ? matched : p;
        }));

        // 4. Fire an upsert to Supabase with the batched products
        const dbItems = updatedProducts.map(updated => ({
            id: updated.id,
            name: updated.name,
            category: updated.category,
            base_id: updated.baseId,
            components: updated.components,
            cost: updated.cost,
            price: updated.price,
            price_minorista: updated.priceMinorista,
            stock: updated.stock,
            description: updated.description,
            gender: updated.gender,
            last_update: updated.lastUpdate,
        }));

        const { error } = await supabase.from("productos").upsert(dbItems);

        if (error) {
            setToast({ message: "Ocurrió un error sincronizando con la base de datos.", type: "error" });
        } else {
            setToast({ message: `Actualizados ${updatedProducts.length} productos de ${catName} con éxito.`, type: "success" });
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Percent className="w-3.5 h-3.5" />
                        Finanzas de la Tienda
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Porcentaje de Ganancia
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Ajustá qué porcentaje de ganancia querés aplicar sobre el costo de base de cada categoría. Al guardarlo, el sistema calculará "Costo + Ganancia %" y lo redondeará automáticamente usando tu regla de los 1.000 de forma masiva en todos los productos.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorias.map(cat => {
                    const params = updatingParams[cat.name] || { mayoristaX: 50, minoristaX: 100 };

                    return (
                        <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm hover:border-indigo-500/30 transition-all flex flex-col group">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                                    <Tags className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white capitalize">{cat.name}</h3>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                        Margen Mayorista (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={params.mayoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "mayoristaX", parseFloat(e.target.value) || 0)}
                                            className="w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                        Margen Minorista (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={params.minoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "minoristaX", parseFloat(e.target.value) || 0)}
                                            className="w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={isProcessing}
                                onClick={() => handleSaveAndMassUpdate(cat.name)}
                                className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-slate-900 dark:bg-white hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white dark:text-slate-900 hover:text-white rounded-2xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                            >
                                <Save className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                Actualizar Masivamente
                            </button>
                        </div>
                    );
                })}

                {categorias.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                        <p className="text-slate-400 font-bold">No hay categorías configuradas en la aplicación todavía.</p>
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
