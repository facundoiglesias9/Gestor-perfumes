"use client";

import { Search, Plus, Layers, Trash2, X, Edit2, FlaskConical, Package, Sparkles, ChevronDown, AlertTriangle } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useAppContext, Base, BaseComponent } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function BasesPage() {
    const { bases, setBases, insumos, esencias, categorias, generateProductsFromBase, generos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState<string | null>(null);
    const [generationResult, setGenerationResult] = useState<{ created: number, updated: number } | null>(null);
    const [targetCategory, setTargetCategory] = useState("Perfumería Fina");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [insumoSearch, setInsumoSearch] = useState("");
    const [limpiaPisosSize, setLimpiaPisosSize] = useState<"1L" | "5L">("1L");

    const [formData, setFormData] = useState({
        name: "",
        components: [] as BaseComponent[],
        essenceGender: "Todos",
        essenceGrams: 10
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
            essenceGrams: formData.essenceGrams
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
        setFormData({ name: "", components: [], essenceGender: "Todos", essenceGrams: 10 });
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
            essenceGrams: base.essenceGrams || 10
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
                                    const isLP = base.essenceGender?.toLowerCase() === "limpia pisos";
                                    if (isLP) {
                                        setTargetCategory(base.name.includes("5L") ? "Limpia pisos 5L" : "Limpia pisos 1L");
                                    } else {
                                        setTargetCategory("Perfumería Fina");
                                    }
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{editingId ? "Editar Base" : "Nueva Base de Producto"}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configurá los insumos y esencias que lleva este tipo de producto.</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8">
                            {/* Left: Component List Builder */}
                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                    <div className="lg:col-span-5 space-y-2.5">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">
                                            <Layers className="w-3 h-3" />
                                            Nombre de la Base
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Perfumería Fina Femenina"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="lg:col-span-4 space-y-2.5">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">
                                            <Sparkles className="w-3 h-3" />
                                            Género
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={formData.essenceGender}
                                                onChange={e => setFormData({ ...formData, essenceGender: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-5 pr-10 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-sm"
                                            >
                                                <option value="Todos">Todos</option>
                                                {generos.map((g, i) => <option key={i} value={g}>{g}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="lg:col-span-3 space-y-2.5">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">
                                            <FlaskConical className="w-3 h-3" />
                                            {formData.essenceGender === "Limpia pisos" ? "Mili Litros (ML)" : "Gramos"}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.essenceGrams}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => setFormData({ ...formData, essenceGrams: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-5 pr-10 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-center"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                                                {formData.essenceGender === "Limpia pisos" ? "ml" : "g"}
                                            </span>
                                        </div>
                                    </div>

                                    {formData.essenceGender === "Limpia pisos" && (
                                        <div className="lg:col-span-3 space-y-2.5">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">
                                                <Package className="w-3 h-3" />
                                                Categoría de Esencia
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={limpiaPisosSize}
                                                    onChange={e => setLimpiaPisosSize(e.target.value as "1L" | "5L")}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-5 pr-10 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer text-sm"
                                                >
                                                    <option value="1L">1 Litro</option>
                                                    <option value="5L">5 Litros</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Componentes de la Fórmula</label>
                                    <div className="space-y-3">
                                        {formData.components.length === 0 ? (
                                            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center">
                                                <p className="text-slate-400 font-medium">No hay componentes agregados.</p>
                                            </div>
                                        ) : (
                                            formData.components.map((comp, idx) => {
                                                const exists = comp.type === "Esencia"
                                                    ? esencias.some(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
                                                    : insumos.some(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

                                                return (
                                                    <div key={idx} className={`flex items-center gap-4 ${exists ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"} p-4 rounded-2xl border animate-in slide-in-from-left duration-200`}>
                                                        <div className={`p-2 rounded-xl scale-90 ${comp.type === "Esencia" ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-600"}`}>
                                                            {comp.type === "Esencia" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex-1 flex items-center gap-2">
                                                            <div>
                                                                <p className={`text-sm font-bold ${exists ? "text-slate-900 dark:text-slate-100" : "text-amber-700 dark:text-amber-500"}`}>{comp.name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`text-[10px] font-bold uppercase tracking-tight ${exists ? "text-slate-400" : "text-amber-600/60 dark:text-amber-500/60"}`}>{comp.type}</p>
                                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                                        (Costo: ${calculateComponentCost(comp).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {!exists && <span title="Este componente ya no existe o cambió de nombre." className="ml-1"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>}
                                                        </div>
                                                        <div className="w-24">
                                                            <input
                                                                type="number"
                                                                value={comp.qty}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={e => updateComponentQty(comp.id, parseFloat(e.target.value) || 0)}
                                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-center font-bold text-slate-900 dark:text-white"
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 w-8">{comp.type === "Esencia" ? "g" : "un."}</span>
                                                        <button onClick={() => removeComponentFromForm(comp.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {formData.components.length > 0 && (
                                        <div className="flex justify-between items-center p-4 bg-slate-900 dark:bg-black rounded-2xl mt-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Costo Total Base</span>
                                            <span className="text-xl font-black text-white">
                                                ${totalFormDataCost.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Component Selector */}
                            <div className="w-full md:w-80 space-y-6 shrink-0 border-l border-slate-100 dark:border-slate-800 md:pl-8">
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Seleccionar Insumos</h3>
                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-[10px] font-bold text-blue-600 rounded-md ring-1 ring-blue-500/20">{insumos.length}</span>
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar insumos..."
                                            value={insumoSearch}
                                            onChange={(e) => setInsumoSearch(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {insumos
                                            .filter(i => i.name.toLowerCase().includes(insumoSearch.toLowerCase()))
                                            .map(ins => (
                                                <button
                                                    key={ins.id}
                                                    onClick={() => addComponentToForm(ins, "Insumo")}
                                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-colors">
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{ins.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Insumo</p>
                                                        </div>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                                onClick={handleAddSubmit}
                                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-extrabold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 active:scale-[0.98] transition-all"
                            >
                                {editingId ? "Guardar Cambios" : "Crear Base"}
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
                            <button onClick={() => setIsGeneratingModalOpen(null)} className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {(() => {
                                const activeBase = bases.find(b => b.id === isGeneratingModalOpen);
                                const isLP = activeBase?.essenceGender?.toLowerCase() === "limpia pisos";
                                return isLP ? (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                        <p className="text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                            Categoría destino: <span className="uppercase">{targetCategory}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Categoría Destino</label>
                                        <select
                                            value={targetCategory}
                                            onChange={(e) => setTargetCategory(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-slate-900 dark:text-slate-100 font-bold"
                                        >
                                            {categorias.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
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
                                    if (!isGeneratingModalOpen) return;
                                    const result = await generateProductsFromBase(isGeneratingModalOpen, targetCategory);
                                    setIsGeneratingModalOpen(null);
                                    if (result) setGenerationResult(result);
                                }}
                                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                            >
                                Iniciar Generación Masiva
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
