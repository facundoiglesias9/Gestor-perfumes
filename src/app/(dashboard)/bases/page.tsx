"use client";

import { Search, Plus, Layers, Trash2, X, Edit2, FlaskConical, Package, Sparkles, ChevronDown, AlertTriangle, Loader2, CheckSquare, Square, Check, Wand2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useAppContext, Base, BaseComponent } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";

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
    const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);

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
        setModalStep(1);
        setFormData({ name: "", components: [], essenceGender: "Todos", essenceGrams: 10, category: categorias[0]?.name || "Frascos de 50 ML" });
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

    const removeComponentFromForm = (id: string) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.filter(c => c.id !== id)
        }));
    };

    const updateComponentQty = (id: string, qty: number) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map(c => c.id === id ? { ...c, qty } : c)
        }));
    };

    const toggleInsumoInForm = (ins: any) => {
        const isSelected = formData.components.some(c => c.id === ins.id);
        if (isSelected) {
            removeComponentFromForm(ins.id);
        } else {
            const defaultQty = ins.name.toLowerCase().includes("alcohol") ? 35 : 1;
            setFormData(prev => ({
                ...prev,
                components: [...prev.components, {
                    id: ins.id,
                    name: ins.name,
                    qty: defaultQty,
                    type: "Insumo"
                }]
            }));
        }
    };

    const applySuggestedInsumosForCategory = (catName: string) => {
        const lowerCat = catName.toLowerCase();
        const suggested: BaseComponent[] = [];

        insumos.forEach(i => {
            const n = i.name.toLowerCase();
            if (n.includes("alcohol")) {
                const grams = lowerCat.includes("50") ? 35 : lowerCat.includes("30") ? 20 : lowerCat.includes("difusor") ? 90 : 5;
                suggested.push({ id: i.id, name: i.name, qty: grams, type: "Insumo" });
            } else if (lowerCat.includes("50") && (n.includes("50") || (n.includes("frasco") && !n.includes("auto") && !n.includes("difusor")))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("30") && (n.includes("30") || (n.includes("frasco") && !n.includes("auto") && !n.includes("difusor")))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("difusor") && (n.includes("difusor") || n.includes("varita") || n.includes("varilla"))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("auto") && n.includes("auto")) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (n.includes("tul") || n.includes("bolsa")) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            }
        });

        if (suggested.length > 0) {
            setFormData(prev => ({
                ...prev,
                components: suggested
            }));
        }
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setBases(bases.filter(b => b.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col items-center text-center gap-6 bg-white dark:bg-[#242723] p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300">
                <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase">
                        <Layers className="w-3.5 h-3.5" />
                        Fórmulas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand">
                        Bases de Productos
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg leading-relaxed font-medium transition-colors">
                        Definí los componentes y cantidades predeterminadas para cada tipo de producto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={removeDuplicateProducts}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition-all"
                    >
                        <Sparkles className="w-5 h-5" />
                        Limpiar Duplicados
                    </button>
                    <button
                        onClick={clearAllProductos}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition-all"
                    >
                        <Trash2 className="w-5 h-5" />
                        Vaciar Catálogo
                    </button>
                    <button
                        onClick={() => {
                            const defaultCat = categorias[0]?.name || "Frascos de 50 ML";
                            setFormData({
                                name: defaultCat,
                                components: [],
                                essenceGender: defaultCat.toLowerCase().includes("difusor") || defaultCat.toLowerCase().includes("auto") ? "Ambiente" : "Todos",
                                essenceGrams: defaultCat.toLowerCase().includes("50") ? 15 : defaultCat.toLowerCase().includes("30") ? 10 : defaultCat.toLowerCase().includes("difusor") ? 35 : 5,
                                category: defaultCat
                            });
                            applySuggestedInsumosForCategory(defaultCat);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nueva Base
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                {bases.map((base) => {
                    const estimatedCost = base.components.reduce((acc, comp) => {
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
                    }, 0);

                    return (
                        <div key={base.id} className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl p-5 shadow-sm hover:border-[#7D9878]/50 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-5 group">
                            {/* 1. Left: Icon, Base Name & Metadata Badges */}
                            <div className="flex items-center gap-4 min-w-[280px]">
                                <div className="p-3.5 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] group-hover:scale-105 transition-transform shrink-0">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand leading-snug">{base.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-bold text-[#7D9878] dark:text-[#A3B69B]">
                                            {base.category || "No asignada"}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                            Género: {base.essenceGender || "Todos"}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#7D9878]/10 border border-[#7D9878]/20 text-[11px] font-black text-[#7D9878] dark:text-[#A3B69B]">
                                            {base.essenceGrams || 10}{base.essenceGender === "Limpia pisos" ? "ml" : "g"} Esencia
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Center: Components Inline Tags */}
                            <div className="flex-1 flex flex-wrap items-center gap-2 py-2 xl:py-0 border-y xl:border-y-0 border-[#E6DFD5] dark:border-[#353B33]">
                                {base.components.map((comp, idx) => {
                                    const exists = comp.type === "Esencia"
                                        ? esencias.some(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
                                        : insumos.some(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

                                    return (
                                        <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${exists ? "bg-[#F9F6F0] dark:bg-[#1B1D1A] border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80" : "bg-[#C9866F]/10 border-[#C9866F]/30 text-[#C9866F]"}`}>
                                            {comp.type === "Esencia" ? <FlaskConical className="w-3.5 h-3.5 text-[#7D9878]" /> : <Package className="w-3.5 h-3.5 text-[#7D9878]" />}
                                            {comp.name} <span className="font-black text-[#2C2C2C] dark:text-[#F4EFEA]">({comp.qty} {comp.type === "Esencia" ? (base.essenceGender === "Limpia pisos" ? "ml" : "g") : "un."})</span>
                                        </span>
                                    );
                                })}
                            </div>

                            {/* 3. Right: Cost & Action Button */}
                            <div className="flex items-center justify-between xl:justify-end gap-5 shrink-0">
                                <div className="text-left xl:text-right">
                                    <p className="text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest">Costo Estimado</p>
                                    <p className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">${estimatedCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                                </div>

                                <button
                                    onClick={() => setIsGeneratingModalOpen(base.id)}
                                    className="px-5 py-3 bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#7D9878]/25 hover:scale-[1.02] active:scale-95 flex items-center gap-2 font-brand whitespace-nowrap"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generar Catálogo
                                </button>

                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => openEditModal(base)} 
                                        className="p-2.5 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#7D9878] dark:hover:text-[#A3B69B] hover:bg-[#7D9878]/10 rounded-xl transition-all"
                                        title="Editar Base"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setItemToDelete(base.id)} 
                                        className="p-2.5 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition-all"
                                        title="Eliminar Base"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Agregar / Editar Base */}
            <Ventana abierta={isAddModalOpen} onCerrar={handleCloseModal} cerrarAlTocarFondo={false}>
            {isAddModalOpen && (
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] flex flex-col max-h-[calc(100vh-8rem)]">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center shrink-0 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#7D9878] rounded-xl flex items-center justify-center shadow-lg shadow-[#7D9878]/20 text-white">
                                    <FlaskConical className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                                        {editingId ? "Editar Base de Producto" : "Diseñar Nueva Base"}
                                    </h2>
                                    <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold">Configurá el frasco, insumos y dosis de esencia.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step Indicator Tabs */}
                        <div className="px-8 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33] flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setModalStep(1)}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                    modalStep === 1
                                        ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/30 font-black"
                                        : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border border-[#E6DFD5] dark:border-[#353B33]"
                                }`}
                            >
                                <span>1. Frasco & Tipo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalStep(2)}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                    modalStep === 2
                                        ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/30 font-black"
                                        : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border border-[#E6DFD5] dark:border-[#353B33]"
                                }`}
                            >
                                <span>2. Insumos (Multiple Choice)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalStep(3)}
                                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                    modalStep === 3
                                        ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/30 font-black"
                                        : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border border-[#E6DFD5] dark:border-[#353B33]"
                                }`}
                            >
                                <span>3. Resumen & Costo</span>
                            </button>
                        </div>

                        {/* Modal Step Content */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            
                            {/* STEP 1: FRASCO & TIPO */}
                            {modalStep === 1 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">
                                            1. Elegí la Presentación / Categoría del Frasco
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[
                                                { id: "Frascos de 50 ML", title: "Frascos de 50 ML", desc: "Perfumería Fina", icon: "🍾", color: "border-[#7D9878] text-[#7D9878]" },
                                                { id: "Frascos de 30 ML", title: "Frascos de 30 ML", desc: "Perfumería Fina", icon: "🧪", color: "border-[#A3B69B] text-[#A3B69B]" },
                                                { id: "Frascos Difusores", title: "Frascos Difusores", desc: "Ambiente / Varillas", icon: "🌸", color: "border-[#C9866F] text-[#C9866F]" },
                                                { id: "Frascos de Auto", title: "Frascos de Auto", desc: "Ambiente / Auto", icon: "🚗", color: "border-[#DAC4AA] text-[#DAC4AA]" }
                                            ].map(item => {
                                                const isSelected = formData.category === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const isAmbiente = item.id.toLowerCase().includes("difusor") || item.id.toLowerCase().includes("auto") || item.id.toLowerCase().includes("ambiente");
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                category: item.id,
                                                                name: prev.name || item.id,
                                                                essenceGender: isAmbiente ? "Ambiente" : (prev.essenceGender === "Ambiente" ? "Todos" : prev.essenceGender),
                                                                essenceGrams: item.id.toLowerCase().includes("50") ? 15 : item.id.toLowerCase().includes("30") ? 10 : item.id.toLowerCase().includes("difusor") ? 35 : 5
                                                            }));
                                                            applySuggestedInsumosForCategory(item.id);
                                                        }}
                                                        className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
                                                            isSelected
                                                                ? `${item.color} bg-[#7D9878]/10 dark:bg-[#7D9878]/20 shadow-lg scale-[1.02]`
                                                                : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"
                                                        }`}
                                                    >
                                                        <div className="text-3xl shrink-0">{item.icon}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-black text-[#2C2C2C] dark:text-[#F4EFEA] text-base">{item.title}</h4>
                                                                {isSelected && <CheckSquare className="w-5 h-5 text-[#7D9878]" />}
                                                            </div>
                                                            <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 mt-0.5">{item.desc}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Nombre de la Base</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Ej: Base Frascos de 50 ML"
                                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Filtro de Género</label>
                                            {formData.category.toLowerCase().includes("difusor") || formData.category.toLowerCase().includes("auto") || formData.category.toLowerCase().includes("ambiente") ? (
                                                <select
                                                    disabled
                                                    value="Ambiente"
                                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-sm font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 cursor-not-allowed opacity-80"
                                                >
                                                    <option value="Ambiente">Ambiente (Exclusivo)</option>
                                                </select>
                                            ) : (
                                                <select
                                                    value={formData.essenceGender === "Ambiente" ? "Todos" : formData.essenceGender}
                                                    onChange={e => setFormData({ ...formData, essenceGender: e.target.value })}
                                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                >
                                                    <option value="Todos">Todos los Géneros (Femenino, Masculino, Unisex)</option>
                                                    {generos
                                                        .filter(g => g.toLowerCase() !== "ambiente")
                                                        .map((g, i) => <option key={i} value={g}>{g}</option>)
                                                    }
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: INSUMOS (MULTIPLE CHOICE) */}
                            {modalStep === 2 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between bg-[#7D9878]/10 p-4 rounded-2xl border border-[#7D9878]/20">
                                        <div>
                                            <label className="text-xs font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest">
                                                Dosis de Esencia por Frasco (gramos)
                                            </label>
                                            <p className="text-[11px] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 font-bold mt-0.5">
                                                Cantidad de esencia requerida por botella para el cálculo posterior.
                                            </p>
                                        </div>
                                        <div className="w-24 shrink-0">
                                            <input
                                                type="number"
                                                value={formData.essenceGrams}
                                                onFocus={e => e.target.select()}
                                                onChange={e => setFormData({ ...formData, essenceGrams: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-white dark:bg-[#1B1D1A] border border-[#7D9878] rounded-xl py-2 px-3 text-center text-lg font-black text-[#2C2C2C] dark:text-[#F4EFEA]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">
                                                2. Marcá los Insumos Fijos que Usará (Multiple Choice)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => applySuggestedInsumosForCategory(formData.category)}
                                                className="text-xs font-bold text-[#7D9878] dark:text-[#A3B69B] bg-[#7D9878]/10 px-3 py-1.5 rounded-xl border border-[#7D9878]/20 hover:scale-105 transition-all flex items-center gap-1.5"
                                            >
                                                <Wand2 className="w-3.5 h-3.5" />
                                                Cargar Insumos Sugeridos
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                            {insumos.map(ins => {
                                                const comp = formData.components.find(c => c.id === ins.id);
                                                const isSelected = !!comp;
                                                return (
                                                    <div
                                                        key={ins.id}
                                                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                                            isSelected
                                                                ? "bg-[#7D9878]/15 border-[#7D9878] shadow-sm"
                                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] border-[#E6DFD5] dark:border-[#353B33]"
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleInsumoInForm(ins)}
                                                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                                        >
                                                            <div className="shrink-0 text-[#7D9878]">
                                                                {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-[#2C2C2C]/30 dark:text-[#F4EFEA]/30" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`text-xs font-black uppercase truncate ${isSelected ? "text-[#7D9878] dark:text-[#A3B69B]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                                                    {ins.name}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">{ins.category || "Insumo"}</p>
                                                            </div>
                                                        </button>

                                                        {isSelected && (
                                                            <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-[#242723] px-2 py-1 rounded-xl border border-[#7D9878]/30">
                                                                <input
                                                                    type="number"
                                                                    value={comp.qty}
                                                                    onFocus={e => e.target.select()}
                                                                    onChange={e => updateComponentQty(comp.id, parseFloat(e.target.value) || 0)}
                                                                    className="w-12 bg-transparent text-center font-black text-xs text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none"
                                                                />
                                                                <span className="text-[9px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase">
                                                                    {ins.name.toLowerCase().includes("alcohol") ? "g" : "un."}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: RESUMEN DE COSTO ESTIMADO */}
                            {modalStep === 3 && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">
                                            3. Resumen de Insumos Fijos de la Base
                                        </h3>

                                        <div className="bg-[#F9F6F0] dark:bg-[#1B1D1A] p-4 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] space-y-2">
                                            {formData.components.length === 0 ? (
                                                <p className="text-xs font-bold text-[#C9866F] p-2">⚠️ No has tildado ningún insumo para esta base todavía.</p>
                                            ) : (
                                                formData.components.map((comp, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-white dark:bg-[#242723] rounded-xl border border-[#E6DFD5] dark:border-[#353B33]">
                                                        <span className="font-bold text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2">
                                                            <Check className="w-4 h-4 text-[#7D9878]" />
                                                            {comp.name}
                                                        </span>
                                                        <span className="font-black text-[#7D9878] dark:text-[#A3B69B]">
                                                            {comp.qty} {comp.type === "Esencia" ? "g" : "un."}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Cost Display Box */}
                                    <div className="p-6 rounded-2xl bg-[#1B1D1A] text-white shadow-xl space-y-2 border border-[#353B33]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3B69B] flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-[#DAC4AA]" />
                                            Costo Estimado de Insumos Fijos
                                        </span>
                                        <div className="text-3xl font-black text-white font-brand">
                                            ${totalFormDataCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                        </div>
                                        <p className="text-xs text-[#F4EFEA]/80 font-medium leading-relaxed">
                                            💡 <strong className="text-white">Aclaración:</strong> Este costo incluye únicamente tus insumos fijos seleccionados. El costo exacto de la esencia ({formData.essenceGrams}g) se sumará automáticamente cuando ejecutes la **generación del catálogo**.
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-6 border-t border-[#E6DFD5] dark:border-[#353B33] flex items-center justify-between gap-4 shrink-0 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            {modalStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setModalStep((modalStep - 1) as 1 | 2)}
                                    className="px-5 py-3 rounded-xl bg-white dark:bg-[#242723] text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-xs border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 transition-all"
                                >
                                    ⬅️ Anterior
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-3 rounded-xl bg-white dark:bg-[#242723] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold text-xs border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 transition-all"
                                >
                                    Cancelar
                                </button>
                            )}

                            {modalStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setModalStep((modalStep + 1) as 2 | 3)}
                                    className="px-6 py-3 rounded-xl bg-[#7D9878] text-white font-black text-xs hover:bg-[#6b8566] shadow-lg shadow-[#7D9878]/20 transition-all flex items-center gap-2"
                                >
                                    <span>Siguiente</span>
                                    <span>➔</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleAddSubmit}
                                    className="px-8 py-3 rounded-xl bg-[#7D9878] text-white font-black text-sm hover:bg-[#6b8566] shadow-xl shadow-[#7D9878]/30 transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <span>✓ Guardar Base de Producto</span>
                                </button>
                            )}
                        </div>
                    </div>
            )}
            </Ventana>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Base"
                message="¿Estás seguro de que deseas eliminar esta base? No afectará a los productos ya creados, pero no estará disponible para nuevos."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Generation Modal */}
            <Ventana abierta={!!isGeneratingModalOpen} onCerrar={() => { if (!isGenerating) setIsGeneratingModalOpen(null); }} z={110}>
            {isGeneratingModalOpen && (
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] max-h-[85vh] flex flex-col">
                        <div className="p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <h3 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-3 font-brand">
                                    <Sparkles className="w-6 h-6 text-[#7D9878]" />
                                    Generar Productos
                                </h3>
                                <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold mt-1 text-xs">Se crearán productos para todas las esencias válidas.</p>
                            </div>
                            <button 
                                onClick={() => !isGenerating && setIsGeneratingModalOpen(null)} 
                                disabled={isGenerating}
                                className={`p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {(() => {
                                const activeBase = bases.find(b => b.id === isGeneratingModalOpen);
                                return (
                                    <div className="p-4 bg-[#7D9878]/10 rounded-2xl border border-[#7D9878]/20">
                                        <p className="text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold leading-relaxed flex flex-col gap-1.5 text-center">
                                            <span className="font-extrabold text-sm mb-1 uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] font-brand">
                                                {activeBase?.category || targetCategory || "Perfumería Fina"}
                                            </span>
                                        </p>
                                    </div>
                                );
                            })()}
                            <div className="p-4 bg-[#DAC4AA]/10 rounded-2xl border border-[#DAC4AA]/20">
                                <p className="text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80 text-xs font-bold leading-relaxed">
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
                                className={`w-full py-4 bg-[#7D9878] text-white font-black rounded-2xl text-lg shadow-xl shadow-[#7D9878]/30 transition-all flex items-center justify-center gap-2 font-brand ${
                                    isGenerating ? 'opacity-70 cursor-wait' : 'hover:bg-[#6b8566] active:scale-95'
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
            )}
            </Ventana>

            {/* Generation Success Modal */}
            <Ventana abierta={!!generationResult} onCerrar={() => setGenerationResult(null)} z={120}>
            {generationResult && (
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] max-h-[85vh] flex flex-col">
                        <div className="p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center text-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <h3 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center justify-center gap-3 w-full font-brand">
                                <Sparkles className="w-6 h-6 text-[#7D9878]" />
                                ¡Generación Exitosa!
                            </h3>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-[#7D9878]/10 rounded-3xl border border-[#7D9878]/20 text-center">
                                    <p className="text-4xl font-extrabold text-[#7D9878] dark:text-[#A3B69B]">{generationResult.created}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] mt-2">Nuevos</p>
                                </div>
                                <div className="p-6 bg-[#DAC4AA]/10 rounded-3xl border border-[#DAC4AA]/20 text-center">
                                    <p className="text-4xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">{generationResult.updated}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 mt-2">Actualizados</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setGenerationResult(null)}
                                className="w-full py-4 bg-[#7D9878] text-white font-black rounded-2xl text-lg hover:bg-[#6b8566] shadow-xl shadow-[#7D9878]/20 active:scale-95 transition-all font-brand"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
            )}
            </Ventana>
        </div>
    );
}
