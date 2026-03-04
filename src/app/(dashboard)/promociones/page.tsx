"use client";

import { useState } from "react";
import { useAppContext, Promotion } from "@/context/AppContext";
import { Sparkles, Package, Percent, Save, Power, Search, ShoppingBag, Trash2, Calendar, Plus } from "lucide-react";

export default function PromocionesPage() {
    const { productos, promotions, addPromotion, deletePromotion } = useAppContext();
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [discount, setDiscount] = useState<number>(10);
    const [isActive, setIsActive] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [durationDays, setDurationDays] = useState<number | "">("");
    const [isSaving, setIsSaving] = useState(false);

    const filteredProducts = productos.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    const selectedProduct = productos.find(p => p.id === selectedProductId);
    const finalPrice = selectedProduct ? Math.round(selectedProduct.priceMinorista * (1 - discount / 100)) : 0;

    const handleSave = async () => {
        if (!selectedProductId) return;
        setIsSaving(true);

        let endDate = undefined;
        if (durationDays && typeof durationDays === 'number' && durationDays > 0) {
            const date = new Date();
            date.setDate(date.getDate() + durationDays);
            endDate = date.toISOString(); // e.g. "2023-11-20T..."
        }

        const newPromo: Promotion = {
            id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            productId: selectedProductId,
            discountPercentage: discount,
            isActive: isActive,
            endDate
        };
        await addPromotion(newPromo);

        // Reset form
        setSelectedProductId("");
        setDiscount(10);
        setDurationDays("");
        setIsSaving(false);
    };

    const isPromoValid = (promo: Promotion) => {
        if (!promo.endDate) return true;
        return new Date(promo.endDate) >= new Date();
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Sparkles className="w-4 h-4" />
                        Marketing & Ofertas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Promociones Múltiples
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Configurá múltiples ofertas destacadas y dales una fecha de caducidad.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <Plus className="w-6 h-6 text-indigo-500" />
                            Nueva Promoción
                        </h2>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                        >
                            <Power className="w-4 h-4" />
                            {isActive ? "Activa" : "Inactiva"}
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Product Search */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Producto</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-2 mt-4 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                                {filteredProducts.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProductId(p.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedProductId === p.id
                                            ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-400 shadow-sm"
                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                                            }`}
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 opacity-50" />
                                                <span className="text-sm font-bold">{p.name}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black tracking-widest ${p.gender === 'Femenino' ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' :
                                                p.gender === 'Masculino' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400' :
                                                    p.gender === 'Unisex' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                {p.gender}
                                            </span>
                                        </div>
                                        <span className="text-[10px] uppercase font-black opacity-40">Cód. {p.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Discount Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Porcentaje de Descuento (%)</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseInt(e.target.value))}
                                    className="flex-1 accent-indigo-500"
                                />
                                <div className="w-20 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl py-2 text-center font-black text-lg">
                                    {discount}%
                                </div>
                            </div>
                        </div>

                        {/* Duration Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Duración (Días)</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Dejar vacío para oferta indefinida"
                                    value={durationDays}
                                    onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : "")}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || !selectedProductId}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98]"
                        >
                            <Save className="w-5 h-5" />
                            {isSaving ? "Guardando..." : "Agregar Promoción"}
                        </button>
                    </div>
                </div>

                {/* List of Active Promos Card */}
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-sm space-y-8 flex flex-col h-full">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 relative z-10 shrink-0">
                        <Percent className="w-6 h-6 text-violet-500" />
                        Promociones Creadas
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {promotions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 mt-8 opacity-50">
                                <Package className="w-16 h-16" />
                                <p className="font-bold">No hay promociones creadas</p>
                            </div>
                        ) : (
                            promotions.map(promo => {
                                const prod = productos.find(p => p.id === promo.productId);
                                const valid = isPromoValid(promo);
                                const statusClass = !valid || !promo.isActive ? 'opacity-50 grayscale' : '';

                                return (
                                    <div key={promo.id} className={`bg-white dark:bg-slate-900 border ${promo.isActive && valid ? 'border-violet-100 dark:border-violet-500/30' : 'border-slate-200 dark:border-slate-800'} rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm transition-all ${statusClass}`}>
                                        <div className="flex-1 truncate space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded ${promo.isActive && valid ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {promo.discountPercentage}% OFF
                                                </span>
                                                {prod && (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest ${prod.gender === 'Femenino' ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' :
                                                        prod.gender === 'Masculino' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400' :
                                                            prod.gender === 'Unisex' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                                'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                        }`}>
                                                        {prod.gender}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                                    {promo.endDate ? `Hasta ${new Date(promo.endDate).toLocaleDateString()}` : 'Indefinida'}
                                                </span>
                                            </div>
                                            <p className="font-black text-slate-900 dark:text-white truncate">
                                                {prod ? prod.name : "Producto Desconocido"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deletePromotion(promo.id)}
                                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                            title="Eliminar Promoción"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
