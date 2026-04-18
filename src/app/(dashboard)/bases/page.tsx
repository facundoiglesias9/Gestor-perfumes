"use client";

import { Search, Plus, Layers, Trash2, X, Edit2, FlaskConical, Package, Sparkles, ChevronDown, AlertTriangle, Loader2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useAppContext, Base, BaseComponent } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function BasesPage() {
    const { bases, setBases, insumos, esencias, categorias, generateProductsFromBase, removeDuplicateProducts, clearAllProductos, generos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState<string | null>(null);
    const [generationResult, setGenerationResult] = useState<{ created: number, updated: number } | null>(null);
    const [targetCategory, setTargetCategory] = useState("Perfumería Fina");
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [insumoSearch, setInsumoSearch] = useState("");
    const [limpiaPisosSize, setLimpiaPisosSize] = useState<"1L" | "5L">("1L");

    const [formData, setFormData] = useState({
        name: "",
        components: [] as BaseComponent[],
        essenceGender: "Todos",
        essenceGrams: 10,
        category: "Perfumería Fina"
    });

    const calculateComponentCost = useCallback((comp: BaseComponent) => {
        let sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase())
            : insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase());

        if (sourceItem) {
            let unitCost = 0;
            if (comp.type === "Esencia") {
                const esc = sourceItem as any;
                const p100 = parseFloat(esc.price100g);
                const p30 = parseFloat(esc.price30g);
                if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                else unitCost = sourceItem.cost / (sourceItem.qty || 1);
            } else {
                unitCost = sourceItem.cost / (sourceItem.qty || 1);
            }
            return unitCost * comp.qty;
        }
        return 0;
    }, [esencias, insumos]);

    const totalFormDataCost = useMemo(() => {
        return formData.components.reduce((acc, comp) => acc + calculateComponentCost(comp), 0);
    }, [formData.components, calculateComponentCost]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalName = formData.name;
        if (formData.essenceGender === "Limpia pisos") {
            finalName = finalName.replace(/\s*(1L|5L)$/, "").trim() + " " + limpiaPisosSize;
        }

        const newBase: Base = {
            id: editingId || getNextId(bases, "B-"),
            name: finalName,
            components: formData.components,
            essenceGender: formData.essenceGender,
            essenceGrams: formData.essenceGrams,
            category: formData.category
        };

        if (editingId) {
            setBases(bases.map(b => b.id === editingId ? newBase : b));
            setEditingId(null);
        } else {
            setBases([newBase, ...bases]);
        }

        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", components: [], essenceGender: "Todos", essenceGrams: 10, category: categorias[0]?.name || "Perfumería Fina" });
    };

    const openEditModal = (base: Base) => {
        setEditingId(base.id);

        let cleanedName = base.name;
        if (base.essenceGender === "Limpia pisos") {
            setLimpiaPisosSize(base.name.includes("5L") ? "5L" : "1L");
            cleanedName = base.name.replace(/\s*(1L|5L)$/, "").trim();
        } else {
            setLimpiaPisosSize("1L");
        }

        setFormData({
            name: cleanedName,
            components: [...base.components],
            essenceGender: base.essenceGender || "Todos",
            essenceGrams: base.essenceGrams || 10,
            category: base.category || categorias[0]?.name || "Perfumería Fina"
        });
        // Esencias válidas: tienen precio 100g numérico (soporta number o string numérico de Supabase)
        const validEsencias = esencias.filter(e => {
            const p = parseFloat(e.price100g as any);
            return !isNaN(p) && p > 0;
        });

        const targetEsencias = base.essenceGender && base.essenceGender !== "Todos"
            ? validEsencias.filter(e => e.gender === base.essenceGender)
            : validEsencias;
        setIsAddModalOpen(true);
    };

    const addComponentToForm = (item: any, type: "Insumo" | "Esencia") => {
        if (formData.components.find(c => c.id === item.id)) return;

        setFormData({
            ...formData,
            components: [...formData.components, {
                id: item.id,
                name: item.name,
                qty: 0,
                type: type
            }]
        });
    };

    const removeComponentFromForm = (id: string) => {
        setFormData({
            ...formData,
            components: formData.components.filter(c => c.id !== id)
        });
    };

    const updateComponentQty = (id: string, qty: number) => {
        setFormData({
            ...formData,
            components: formData.components.map(c => c.id === id ? { ...c, qty } : c)
        });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setBases(bases.filter(b => b.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Layers className="w-3.5 h-3.5" />
                        Fórmulas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Bases de Productos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Definí los componentes y cantidades predeterminadas para cada tipo de producto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={removeDuplicateProducts}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 text-amber-600 border border-slate-200 dark:border-slate-800 font-bold hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-200 transition-all"
                    >
                        <Sparkles className="w-5 h-5" />
                        Limpiar Duplicados
                    </button>
                    <button
                        onClick={clearAllProductos}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white dark:bg-slate-800 text-rose-600 border border-slate-200 dark:border-slate-800 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 transition-all"
                    >
                        <Trash2 className="w-5 h-5" />
                        Vaciar Catálogo
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nueva Base
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bases.map((base) => (
                    <div key={base.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-blue-500/50 transition-all group overflow-hidden relative">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEditModal(base)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors">
                                    <Edit2 className="w-5 h-5" />
                                </button>
                                <button onClick={() => setItemToDelete(base.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">{base.name}</h3>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500 flex items-center gap-2">
                                    <Layers className="w-3 h-3 text-indigo-500" />
                                    Categoría:
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{base.category || "No asignada"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Género Destino:
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{base.essenceGender || "Todos"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-500 flex items-center gap-2">
                                    <FlaskConical className="w-3 h-3 text-orange-500" />
                                    {base.essenceGender === "Limpia pisos" ? "Fragancia:" : "Esencia:"}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{base.essenceGrams || 10}{base.essenceGender === "Limpia pisos" ? "ml" : "g"}</span>
                            </div>
                            {base.components.map((comp, idx) => {
                                const exists = comp.type === "Esencia"
                                    ? esencias.some(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
                                    : insumos.some(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm font-medium">
                                        <span className={`flex items-center gap-2 ${exists ? "text-slate-500 dark:text-slate-400" : "text-amber-500 dark:text-amber-500"}`}>
                                            {comp.type === "Esencia" ? <FlaskConical className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                                            <span className="flex items-center gap-1.5">
                                                {comp.name}
                                                {!exists && <span title="Este componente ya no existe o cambió de nombre."><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
                                            </span>
                                        </span>
                                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                                            {comp.qty} {comp.type === "Esencia" ? (base.essenceGender === "Limpia pisos" ? "ml" : "g") : "un."}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Estimado</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white">
                                    ${base.components.reduce((acc, comp) => {
                                        const sourceItem = comp.type === "Esencia"
                                            ? (esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase()))
                                            : (insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase()));
                                        if (sourceItem) {
                                            let unitCost = 0;
                                            if (comp.type === "Esencia") {
                                                const esc = sourceItem as any;
                                                const p100 = parseFloat(esc.price100g);
                                                const p30 = parseFloat(esc.price30g);
                                                if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                                                else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                                                else unitCost = sourceItem.cost / (sourceItem.qty || 1);
                                            } else {
                                                unitCost = sourceItem.cost / (sourceItem.qty || 1);
                                            }
                                            return acc + (unitCost * comp.qty);
                                        }
                                        return acc;
                                    }, 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsGeneratingModalOpen(base.id);
                                }}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generar Catálogo con esta Base
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-5 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500 max-h-[92vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-500/5 dark:to-violet-500/5">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-indigo-600/20 rotate-3 transition-transform">
                                    <FlaskConical className="w-5.5 h-5.5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {editingId ? "Perfeccionar Fórmula" : "Diseñar Nueva Base"}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 text-xs flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-indigo-500" />
                                        Configurá el ADN de tu producto: insumos, esencias y proporciones.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleCloseModal} 
                                className="group p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300 active:scale-90"
                            >
                                <X className="w-4.5 h-4.5 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            {/* Left Panel: Configuration & Components */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Base Details Section */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-1 h-5 bg-indigo-500 rounded-full"></div>
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Identidad de la Base</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Descriptivo</label>
                                            <div className="relative group">
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Ej: Perfumería Premium V1"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-5 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría de Destino</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-5 pr-10 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="dark:bg-slate-900">Elegir categoría...</option>
                                                    {categorias.map(c => <option key={c.id} value={c.name} className="dark:bg-slate-900">{c.name}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Filtro de Género</label>
                                            <div className="relative">
                                                <select
                                                    value={formData.essenceGender}
                                                    onChange={e => setFormData({ ...formData, essenceGender: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-5 pr-10 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="Todos" className="dark:bg-slate-900">Todos los Géneros</option>
                                                    {generos.map((g, i) => <option key={i} value={g} className="dark:bg-slate-900">{g}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                Concentración de Fragancia ({formData.essenceGender === "Limpia pisos" ? "ml" : "g"})
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={formData.essenceGrams}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => setFormData({ ...formData, essenceGrams: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-5 text-slate-900 dark:text-white font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-center text-lg md:text-xl"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md text-[9px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">
                                                    {formData.essenceGender === "Limpia pisos" ? "ml" : "gramos"}
                                                </div>
                                            </div>
                                        </div>

                                        {formData.essenceGender === "Limpia pisos" && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Escala de Cálculo</label>
                                                <div className="relative">
                                                    <select
                                                        value={limpiaPisosSize}
                                                        onChange={e => setLimpiaPisosSize(e.target.value as "1L" | "5L")}
                                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-5 pr-10 text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="1L" className="dark:bg-slate-900">Base para 1 Litro</option>
                                                        <option value="5L" className="dark:bg-slate-900">Base para 5 Litros</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Components List Builder */}
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-5 bg-violet-500 rounded-full"></div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Arquitectura de Insumos</h3>
                                        </div>
                                        {formData.components.length > 0 && (
                                            <span className="px-2.5 py-0.5 bg-violet-50 dark:bg-violet-500/10 text-[9px] font-black text-violet-600 dark:text-violet-400 rounded-full border border-violet-100 dark:border-violet-500/20">
                                                {formData.components.length} COMPONENTES
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {formData.components.length === 0 ? (
                                            <div className="group p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-center bg-slate-50/50 dark:bg-white/2 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-all">
                                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-[1.25rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                    <Package className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <h4 className="text-lg font-black text-slate-400 dark:text-slate-500 mb-1">Fórmula Vacía</h4>
                                                <p className="text-slate-400 dark:text-slate-600 font-bold text-[11px] max-w-xs mx-auto uppercase tracking-wider">Añadí insumos para empezar.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {formData.components.map((comp, idx) => {
                                                    const exists = comp.type === "Esencia"
                                                        ? esencias.some(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
                                                        : insumos.some(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

                                                    return (
                                                        <div key={idx} className={`relative flex items-center gap-4 ${exists ? "bg-white dark:bg-white/2 border-slate-100 dark:border-white/5" : "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20"} p-4 rounded-2xl border shadow-sm transition-all duration-300 animate-in slide-in-from-left duration-300`}>
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${comp.type === "Esencia" ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"}`}>
                                                                {comp.type === "Esencia" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-sm font-black truncate ${exists ? "text-slate-900 dark:text-white" : "text-amber-700 dark:text-amber-500"}`}>{comp.name}</p>
                                                                    {!exists && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{comp.type}</span>
                                                                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                                                                        $ {calculateComponentCost(comp).toLocaleString("es-AR", { maximumFractionDigits: 1 })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-black/20 p-1.5 rounded-xl border border-slate-100 dark:border-white/5 shrink-0">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={comp.qty}
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={e => updateComponentQty(comp.id, parseFloat(e.target.value) || 0)}
                                                                        className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg py-1 px-2 text-center text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                    />
                                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest w-4">
                                                                        {comp.type === "Esencia" ? "g" : "u."}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => removeComponentFromForm(comp.id)} 
                                                                className="group p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Right Panel: Selector */}
                            <div className="w-full lg:w-[340px] border-l border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 p-8 flex flex-col gap-6 shrink-0">
                                <section className="flex flex-col gap-5 h-full">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Elegir Insumos</h3>
                                        </div>
                                        <div className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-200 dark:border-emerald-500/20 lowercase tracking-wider">
                                            {insumos.length} disponib.
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Search className="w-full h-full" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar insumos..."
                                            value={insumoSearch}
                                            onChange={(e) => setInsumoSearch(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                                        {insumos
                                            .filter(i => i.name.toLowerCase().includes(insumoSearch.toLowerCase()))
                                            .map(ins => {
                                                const isSelected = formData.components.some(c => c.id === ins.id);
                                                return (
                                                    <button
                                                        key={ins.id}
                                                        onClick={() => addComponentToForm(ins, "Insumo")}
                                                        disabled={isSelected}
                                                        className={`w-full group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 text-left ${
                                                            isSelected 
                                                            ? "opacity-50 grayscale bg-slate-100 border-transparent cursor-not-allowed" 
                                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                                                isSelected ? "bg-slate-200" : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500"
                                                            }`}>
                                                                <Package className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight truncate max-w-[160px]">{ins.name}</p>
                                                                <p className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-0.5">{ins.category}</p>
                                                            </div>
                                                        </div>
                                                        {!isSelected && (
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 opacity-0 group-hover:opacity-100 transition-all">
                                                                <Plus className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                    
                                    {/* Cost Summary Footer (Right Panel) */}
                                    <div className="mt-auto p-6 rounded-[1.75rem] bg-slate-900 dark:bg-black shadow-2xl relative overflow-hidden group border border-white/5">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="relative z-10 flex flex-col gap-1.5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                Inversión x Unidad
                                            </span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-white">$</span>
                                                <span className="text-4xl font-black text-white tracking-tighter tabular-nums">
                                                    {totalFormDataCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                                </span>
                                                <span className="text-lg font-black text-indigo-300">.{(totalFormDataCost % 1).toFixed(2).slice(2)}</span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-bold mt-1 leading-relaxed opacity-60">Suma base de insumos y proporciones.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-8 border-t border-slate-100 dark:border-white/5 flex gap-4 shrink-0 bg-white dark:bg-slate-900 z-20">
                            <button
                                onClick={handleCloseModal}
                                className="px-6 py-4 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-black text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 active:scale-95"
                            >
                                DESCARTAR
                            </button>
                            <button
                                onClick={handleAddSubmit}
                                className="flex-1 py-4 rounded-xl bg-indigo-600 text-white font-black text-lg hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-3"
                            >
                                <Sparkles className="w-5 h-5" />
                                {editingId ? "ACTUALIZAR FÓRMULA" : "ESTABLECER ESTA BASE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Base"
                message="¿Estás seguro de que deseas eliminar esta base? No afectará a los productos ya creados, pero no estará disponible para nuevos."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Generation Modal */}
            {isGeneratingModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-indigo-500" />
                                    Generar Productos
                                </h3>
                                <p className="text-slate-500 font-bold mt-1">Se crearán productos para todas las esencias válidas.</p>
                            </div>
                            <button 
                                onClick={() => !isGenerating && setIsGeneratingModalOpen(null)} 
                                disabled={isGenerating}
                                className={`p-2.5 bg-slate-100 dark:bg-white/5 rounded-full ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {(() => {
                                const activeBase = bases.find(b => b.id === isGeneratingModalOpen);
                                return (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                        <p className="text-indigo-700 dark:text-indigo-400 text-xs font-bold leading-relaxed flex flex-col gap-1.5 text-center">
                                            <span className="font-extrabold text-sm mb-1 uppercase tracking-widest text-[#2f39c2] dark:text-indigo-300">
                                                {activeBase?.category || targetCategory || "Perfumería Fina"}
                                            </span>
                                        </p>
                                    </div>
                                );
                            })()}
                            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                                <p className="text-amber-700 dark:text-amber-400 text-xs font-bold leading-relaxed">
                                    Se usarán los ajustes de la base ({bases.find(b => b.id === isGeneratingModalOpen)?.essenceGrams || 10}g de esencias de género {bases.find(b => b.id === isGeneratingModalOpen)?.essenceGender || "Todos"}). Los productos que ya existan serán actualizados con los nuevos costos.
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!isGeneratingModalOpen || isGenerating) return;
                                    setIsGenerating(true);
                                    try {
                                        const activeBase = bases.find(b => b.id === isGeneratingModalOpen);
                                        let cat = activeBase?.category || targetCategory || "Perfumería Fina";
                                        const result = await generateProductsFromBase(isGeneratingModalOpen, cat);
                                        setIsGeneratingModalOpen(null);
                                        if (result) setGenerationResult(result);
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                                disabled={isGenerating}
                                className={`w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-lg shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 ${
                                    isGenerating ? 'opacity-70 cursor-wait' : 'hover:bg-indigo-700 active:scale-95'
                                }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    "Iniciar Generación Masiva"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Success Modal */}
            {generationResult && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
                        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center text-center">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3 w-full">
                                <Sparkles className="w-6 h-6 text-emerald-500" />
                                ¡Generación Exitosa!
                            </h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                                    <p className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{generationResult.created}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700/70 dark:text-emerald-400/70 mt-2">Nuevos</p>
                                </div>
                                <div className="p-6 bg-blue-50 dark:bg-blue-500/10 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-center">
                                    <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">{generationResult.updated}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-700/70 dark:text-blue-400/70 mt-2">Actualizados</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setGenerationResult(null)}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl text-lg hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
