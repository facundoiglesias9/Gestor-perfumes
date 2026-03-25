"use client";

import { useState, useEffect } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { 
    Percent, 
    Save, 
    Tags, 
    AlertTriangle, 
    CheckCircle2, 
    X, 
    TrendingUp, 
    Coins, 
    Layers,
    ArrowRightLeft,
    Sparkles,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Toast = ({ message, onClose, type = "success" }: { message: string, onClose: () => void, type?: "success" | "info" | "error" }) => (
    <motion.div 
        initial={{ opacity: 0, y: 50, x: 50 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-8 right-8 z-[100]"
    >
        <div className={`flex items-center gap-4 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border backdrop-blur-xl ${
            type === "success"
                ? "bg-emerald-500/90 border-emerald-400/50 text-white"
                : type === "error"
                    ? "bg-rose-500/90 border-rose-400/50 text-white"
                    : "bg-indigo-500/90 border-indigo-400/50 text-white"
        }`}>
            <div className="p-2 bg-white/20 rounded-xl shadow-inner">
                {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : type === "error" ? <X className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-[200px]">
                <p className="font-black text-sm tracking-tight">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    </motion.div>
);

export default function PorcentajeGananciaPage() {
    const { categorias, categoryMargins, setCategoryMargins, productos, setProductos } = useAppContext();
    const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);
    const [updatingParams, setUpdatingParams] = useState<Record<string, { mayoristaX: number, minoristaX: number }>>({});
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Initialize inputs based on the global state
    useEffect(() => {
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
        setIsProcessing(catName);
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

        // 2. Filter all products of this category
        const targetProducts = productos.filter(p => p.category === catName);
        if (targetProducts.length === 0) {
            setToast({ message: `No hay productos en ${catName} para actualizar.`, type: "info" });
            setIsProcessing(null);
            return;
        }

        const updatedProducts: Producto[] = targetProducts.map(p => ({
            ...p,
            price: roundUpTo1000(p.cost * multMayorista),
            priceMinorista: roundUpTo1000(p.cost * multMinorista),
        }));

        // 3. Update React State explicitly
        setProductos(prev => prev.map(p => {
            const matched = updatedProducts.find(up => up.id === p.id);
            return matched ? matched : p;
        }));

        // 4. Fire an upsert to Supabase
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
            setToast({ message: `¡Éxito! ${updatedProducts.length} productos de ${catName} actualizados.`, type: "success" });
        }
        setIsProcessing(null);
    };

    const getProductCount = (catName: string) => {
        const normalizedCat = catName.trim().toLowerCase();
        return productos.filter(p => 
            p.category?.trim().toLowerCase() === normalizedCat
        ).length;
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Elegant Header Section */}
            <header className="relative overflow-hidden bg-slate-900 dark:bg-slate-950 p-10 md:p-14 rounded-[3rem] shadow-2xl border border-slate-800 transition-all duration-300">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent blur-3xl rounded-full translate-x-1/2 opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl rounded-full -translate-x-1/2 opacity-50 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-indigo-400 text-xs font-black tracking-widest uppercase shadow-inner">
                        <TrendingUp className="w-4 h-4" />
                        Finanzas & Estrategia
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[1.1]">
                            Márgenes de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">Rentabilidad</span>
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed font-semibold">
                            Controlá la rentabilidad de tu negocio ajustando los porcentajes de ganancia por categoría.
                            <span className="hidden md:inline"> El sistema recalcula y redondea automáticamente a múltiplos de $1.000 para mantener una lista de precios limpia y profesional.</span>
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 pt-4">
                        <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                            <Layers className="w-5 h-5 text-indigo-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categorías</p>
                                <p className="text-white font-black">{categorias.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                            <Tags className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Productos Totales</p>
                                <p className="text-white font-black">{productos.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {categorias.map((cat, idx) => {
                    const params = updatingParams[cat.name] || { mayoristaX: 50, minoristaX: 100 };
                    const prodCount = getProductCount(cat.name);
                    const isSaving = isProcessing === cat.name;

                    return (
                        <motion.div 
                            key={cat.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="relative group flex flex-col bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-500"
                        >
                            {/* Decorative Sparkle */}
                            <div className="absolute top-6 right-8 text-slate-200 dark:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>

                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[1.25rem] shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        <Tags className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight group-hover:translate-x-1 transition-transform">{cat.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {prodCount} productos activos
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Control Sliders & Inputs */}
                            <div className="space-y-8 flex-1">
                                {/* Mayorista Control */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                            Margen Mayorista (%)
                                        </label>
                                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-xl">
                                            <Percent className="w-3 h-3 text-indigo-500" />
                                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{params.mayoristaX}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            type="range"
                                            min="0"
                                            max="300"
                                            value={params.mayoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "mayoristaX", parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={params.mayoristaX}
                                                onChange={(e) => handleUpdateMargin(cat.name, "mayoristaX", parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-black text-lg transition-all"
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Link Divider */}
                                <div className="flex items-center gap-4 py-2 opacity-30">
                                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></div>
                                    <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"></div>
                                </div>

                                {/* Minorista Control */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                            Margen Minorista (%)
                                        </label>
                                        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl">
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{params.minoristaX}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            type="range"
                                            min="0"
                                            max="500"
                                            value={params.minoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "minoristaX", parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={params.minoristaX}
                                                onChange={(e) => handleUpdateMargin(cat.name, "minoristaX", parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-lg transition-all"
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Note */}
                            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-start gap-4">
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                                    <Coins className="w-4 h-4 text-slate-400" />
                                </div>
                                <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                                    Los productos se actualizarán de Costo × {(1 + params.mayoristaX/100).toFixed(2)} (May.) y Costo × {(1 + params.minoristaX/100).toFixed(2)} (Min.) con redondeo a $1.000.
                                </p>
                            </div>

                            {/* Action Button */}
                            <button
                                disabled={!!isProcessing && !isSaving}
                                onClick={() => handleSaveAndMassUpdate(cat.name)}
                                className={`mt-8 w-full group/btn relative overflow-hidden flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black tracking-tight transition-all active:scale-95 shadow-xl ${
                                    isSaving 
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-indigo-500/20"
                                }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                                
                                <div className="relative z-10 flex items-center gap-3 group-hover/btn:text-white transition-colors">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Actualizando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                                            <span>Actualizar {prodCount} Productos</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </motion.div>
                    );
                })}

                {categorias.length === 0 && (
                    <div className="col-span-full py-24 text-center border-3 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-transparent">
                        <AlertTriangle className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-400 mb-2">Sin categorías configuradas</h3>
                        <p className="text-slate-400 font-bold max-w-xs mx-auto">Agregá categorías en el panel correspondiente para configurar sus márgenes aquí.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
}
