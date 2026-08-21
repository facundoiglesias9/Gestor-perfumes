"use client";

import { useState, useEffect } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { upsertRecords } from "@/lib/db-actions";
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
    const { categorias, categoryMargins, setCategoryMargins, productos, setProductos, esencias, insumos } = useAppContext();
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

    const calculateProductCost = (p: Producto) => {
        return p.components.reduce((acc, comp) => {
            let sourceItem = comp.type === "Esencia"
                ? esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase())
                : insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase());

            if (sourceItem) {
                let unitCost = 0;
                if (comp.type === "Esencia") {
                    const esc = sourceItem as any;
                    const p250 = parseFloat(esc.price250g);
                    const p100 = parseFloat(esc.price100g);
                    const p30 = parseFloat(esc.price30g);
                    if (!isNaN(p250) && p250 > 0) unitCost = p250 / 250;
                    else if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                    else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                    else unitCost = sourceItem.cost / (sourceItem.qty || 1);
                } else {
                    unitCost = sourceItem.cost / (sourceItem.qty || 1);
                }
                return acc + (unitCost * comp.qty);
            }
            return acc;
        }, 0);
    };

    const roundUpTo100 = (num: number) => Math.ceil(num / 100) * 100;

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

        const updatedProducts: Producto[] = targetProducts.map(p => {
            const freshCost = calculateProductCost(p);
            return {
                ...p,
                cost: freshCost,
                price: roundUpTo100(freshCost * multMayorista),
                priceMinorista: roundUpTo100(freshCost * multMinorista),
            }
        });

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

        const { error } = await upsertRecords("productos", dbItems);

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
            <header className="relative overflow-hidden bg-white dark:bg-[#242723] p-10 md:p-14 rounded-[3rem] shadow-sm border border-[#E6DFD5] dark:border-[#353B33] transition-all duration-300 text-center flex flex-col items-center justify-center">
                <div className="relative z-10 space-y-6 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-black tracking-widest uppercase border border-[#7D9878]/20">
                        <TrendingUp className="w-4 h-4" />
                        Finanzas & Estrategia
                    </div>
                    <div className="space-y-3 flex flex-col items-center">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#2C2C2C] dark:text-[#F4EFEA] leading-[1.1] font-brand text-center">
                            Márgenes de <span className="text-[#7D9878] dark:text-[#A3B69B]">Rentabilidad</span>
                        </h1>
                        <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg md:text-xl max-w-2xl leading-relaxed font-semibold text-center">
                            Controlá la rentabilidad de tu negocio ajustando los porcentajes de ganancia por categoría.
                            <span className="hidden md:inline"> El sistema recalcula y redondea automáticamente a múltiplos de $1.000 para mantener una lista de precios limpia y profesional.</span>
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl">
                            <Layers className="w-5 h-5 text-[#7D9878] dark:text-[#A3B69B]" />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Categorías</p>
                                <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-black">{categorias.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl">
                            <Tags className="w-5 h-5 text-[#7D9878] dark:text-[#A3B69B]" />
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Productos Totales</p>
                                <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-black">{productos.length}</p>
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
                            className="relative group flex flex-col bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-[#7D9878]/50 transition-all duration-500"
                        >
                            {/* Decorative Sparkle */}
                            <div className="absolute top-6 right-8 text-[#7D9878]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>

                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-[#7D9878] text-white rounded-[1.25rem] shadow-lg shadow-[#7D9878]/20 group-hover:scale-110 transition-all duration-500">
                                        <Tags className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] capitalize tracking-tight group-hover:translate-x-1 transition-transform font-brand">{cat.name}</h3>
                                        <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#7D9878] animate-pulse"></span>
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
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 pl-1">
                                            Margen Mayorista (%)
                                        </label>
                                        <div className="flex items-center gap-2 bg-[#7D9878]/15 px-3 py-1 rounded-xl">
                                            <Percent className="w-3 h-3 text-[#7D9878]" />
                                            <span className="text-sm font-black text-[#7D9878] dark:text-[#A3B69B]">{params.mayoristaX}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            type="range"
                                            min="0"
                                            max="300"
                                            value={params.mayoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "mayoristaX", parseInt(e.target.value))}
                                            className="w-full h-2 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-lg appearance-none cursor-pointer accent-[#7D9878]"
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={params.mayoristaX}
                                                onChange={(e) => handleUpdateMargin(cat.name, "mayoristaX", parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] rounded-2xl focus:outline-none focus:border-[#7D9878] font-black text-lg transition-all"
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 font-bold">%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Link Divider */}
                                <div className="flex items-center gap-4 py-2 opacity-30">
                                    <div className="flex-1 h-px bg-[#E6DFD5] dark:bg-[#353B33]"></div>
                                    <ArrowRightLeft className="w-4 h-4 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40" />
                                    <div className="flex-1 h-px bg-[#E6DFD5] dark:bg-[#353B33]"></div>
                                </div>

                                {/* Minorista Control */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 pl-1">
                                            Margen Minorista (%)
                                        </label>
                                        <div className="flex items-center gap-2 bg-[#A3B69B]/15 px-3 py-1 rounded-xl">
                                            <TrendingUp className="w-3 h-3 text-[#A3B69B]" />
                                            <span className="text-sm font-black text-[#7D9878] dark:text-[#A3B69B]">{params.minoristaX}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <input 
                                            type="range"
                                            min="0"
                                            max="500"
                                            value={params.minoristaX}
                                            onChange={(e) => handleUpdateMargin(cat.name, "minoristaX", parseInt(e.target.value))}
                                            className="w-full h-2 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-lg appearance-none cursor-pointer accent-[#A3B69B]"
                                        />
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={params.minoristaX}
                                                onChange={(e) => handleUpdateMargin(cat.name, "minoristaX", parseFloat(e.target.value) || 0)}
                                                className="w-full px-5 py-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] rounded-2xl focus:outline-none focus:border-[#7D9878] font-black text-lg transition-all"
                                            />
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 font-bold">%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Note */}
                            <div className="mt-8 p-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] flex items-start gap-4">
                                <div className="p-2 bg-white dark:bg-[#242723] rounded-xl border border-[#E6DFD5] dark:border-[#353B33]">
                                    <Coins className="w-4 h-4 text-[#7D9878]" />
                                </div>
                                <p className="text-[11px] font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 leading-relaxed italic">
                                    Los productos se actualizarán de Costo × {(1 + params.mayoristaX/100).toFixed(2)} (May.) y Costo × {(1 + params.minoristaX/100).toFixed(2)} (Min.) con redondeo a $100.
                                </p>
                            </div>

                            {/* Action Button */}
                            <button
                                disabled={!!isProcessing && !isSaving}
                                onClick={() => handleSaveAndMassUpdate(cat.name)}
                                className={`mt-8 w-full relative overflow-hidden flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black tracking-tight transition-all active:scale-95 shadow-xl font-brand ${
                                    isSaving 
                                        ? "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/40 cursor-not-allowed border border-[#E6DFD5] dark:border-[#353B33]"
                                        : "bg-[#7D9878] text-white hover:bg-[#6b8566]"
                                }`}
                            >
                                <div className="relative z-10 flex items-center gap-3">
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin text-[#7D9878]" />
                                            <span>Actualizando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>Actualizar {prodCount} Productos</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </motion.div>
                    );
                })}

                {categorias.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-[#E6DFD5] dark:border-[#353B33] rounded-[3rem] bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                        <AlertTriangle className="w-12 h-12 text-[#C9866F] mx-auto mb-6" />
                        <h3 className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] mb-2 font-brand">Sin categorías configuradas</h3>
                        <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold max-w-xs mx-auto">Agregá categorías en el panel correspondiente para configurar sus márgenes aquí.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>
        </div>
    );
}
