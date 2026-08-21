"use client";

import { Search, Filter, Plus, Archive, MoveUpRight, AlertCircle, Trash2, X, FlaskConical, ChevronDown, Edit2, ListTree, Sparkles, Layers, Package } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function InventarioPage() {
    const { inventario, esencias, insumos, productos, categorias, getNextId, addInventarioItem, deleteInventarioItem, updateInventarioItem, clearAllInventario } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editQty, setEditQty] = useState("");

    const [typeFilter, setTypeFilter] = useState("Todos");

    const [formData, setFormData] = useState({
        type: "Esencia" as "Esencia" | "Insumo" | "Perfume Hecho",
        item_id: "",
        custom_name: "",
        category: "Frascos de 50 ML",
        gender: "Femenino",
        qty: ""
    });

    const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({});
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [editingAlertItem, setEditingAlertItem] = useState<string | null>(null);
    const [tempThreshold, setTempThreshold] = useState("");

    const getColorClass = (str: string, isBadge: boolean) => {
        if (!str) return isBadge ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 'bg-slate-300 dark:bg-slate-600';

        const colorsMap = {
            blue: { bg: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
            emerald: { bg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
            amber: { bg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
            violet: { bg: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' },
            indigo: { bg: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
            rose: { bg: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
            cyan: { bg: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' },
            lime: { bg: 'bg-lime-500', badge: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/20' },
            fuchsia: { bg: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20' },
            orange: { bg: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' },
            teal: { bg: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' }
        };
        const colorList = Object.values(colorsMap);

        let colorObj;
        const s = str.toLowerCase();

        if (s === 'esencia') colorObj = colorsMap.orange;
        else if (s === 'insumo') colorObj = colorsMap.blue;
        else if (s === 'perfume hecho' || s.includes('perfume')) colorObj = colorsMap.fuchsia;
        else if (s.includes('perfumer')) colorObj = colorsMap.violet;
        else if (s.includes('limpia pisos 1l') || s.includes('limpia pisos 1 l')) colorObj = colorsMap.indigo;
        else if (s.includes('limpia pisos 5l') || s.includes('limpia pisos 5 l')) colorObj = colorsMap.amber;
        else if (s.includes('limpia') || s.includes('piso')) colorObj = colorsMap.cyan;
        else if (s.includes('aromatizante') || s.includes('auto')) colorObj = colorsMap.orange;
        else if (s.includes('difusor')) colorObj = colorsMap.rose;
        else if (s.includes('textil')) colorObj = colorsMap.emerald;
        else if (s.includes('esencia')) colorObj = colorsMap.fuchsia;
        else if (s === 'femenino' || s === 'femenina') colorObj = colorsMap.rose;
        else if (s === 'masculino') colorObj = colorsMap.blue;
        else if (s === 'unisex') colorObj = colorsMap.teal;
        else {
            let hash = 0;
            for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
            colorObj = colorList[Math.abs(hash) % colorList.length];
        }
        return isBadge ? colorObj.badge : colorObj.bg;
    };

    useEffect(() => {
        try {
            const saved = localStorage.getItem('inventario_alert_thresholds');
            if (saved) {
                setAlertThresholds(JSON.parse(saved));
            }
        } catch { }
    }, []);

    const saveAlertThreshold = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAlertItem) return;

        const num = parseInt(tempThreshold, 10);
        const newThresholds = { ...alertThresholds };

        if (!isNaN(num) && num > 0) {
            newThresholds[editingAlertItem] = num;
        } else {
            delete newThresholds[editingAlertItem]; // Remove if set to 0 or invalid
        }

        setAlertThresholds(newThresholds);
        localStorage.setItem('inventario_alert_thresholds', JSON.stringify(newThresholds));
        setIsAlertModalOpen(false);
        setEditingAlertItem(null);
    };

    const [searchTerm, setSearchTerm] = useState("");
    const [isEsenciaSearchOpen, setIsEsenciaSearchOpen] = useState(false);
    const [esenciaSearch, setEsenciaSearch] = useState("");
    const [esenciaGenderFilter, setEsenciaGenderFilter] = useState("Todos");

    const filteredEsencias = useMemo(() => {
        return esencias.filter(e => {
            const matchesSearch = e.name.toLowerCase().includes(esenciaSearch.toLowerCase());
            const genderValue = e.gender || (e.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
            const matchesGender = esenciaGenderFilter === "Todos" || genderValue === esenciaGenderFilter;
            return matchesSearch && matchesGender;
        });
    }, [esencias, esenciaSearch, esenciaGenderFilter]);

    const filteredInventario = useMemo(() => {
        return inventario.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.type.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === "Todos" || item.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [inventario, searchTerm, typeFilter]);

    const getSelectedItemDetails = () => {
        if (formData.type === "Esencia") {
            return esencias.find(e => e.id === formData.item_id);
        } else if (formData.type === "Insumo") {
            return insumos.find(i => i.id === formData.item_id);
        } else if (formData.type === "Perfume Hecho") {
            const prod = productos.find(p => p.id === formData.item_id);
            if (prod) {
                return {
                    name: prod.name,
                    category: prod.category,
                    gender: prod.gender || "Unisex",
                    unit: "u."
                };
            }
            return {
                name: formData.custom_name.trim() || "Perfume Final",
                category: formData.category,
                gender: formData.gender,
                unit: "u."
            };
        }
        return null;
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const details = getSelectedItemDetails();

        if (!details) return;

        addInventarioItem({
            id: getNextId(inventario, "INV-"),
            name: details.name,
            type: formData.type,
            category: details.category || "Frascos de 50 ML",
            qty: parseFloat(formData.qty),
            lastUpdate: new Date().toLocaleDateString("es-AR"),
            unit: formData.type === "Esencia" ? "g" : (formData.type === "Perfume Hecho" ? "u." : (details as any).unit || "un."),
            gender: (details as any).gender || (formData.type === "Esencia" ? ((details as any).gender || (details.category?.toLowerCase().includes("femenina") ? "Femenino" : "Masculino")) : undefined)
        });

        setFormData({ type: "Esencia", item_id: "", custom_name: "", category: "Frascos de 50 ML", gender: "Femenino", qty: "" });
        setIsAddModalOpen(false);
    };

    const handleSelectEsencia = (esencia: any) => {
        setFormData({ ...formData, item_id: esencia.id, type: "Esencia" });
        setIsEsenciaSearchOpen(false);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            deleteInventarioItem(itemToDelete);
            setItemToDelete(null);
        }
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem && editQty) {
            updateInventarioItem(editingItem.id, parseFloat(editQty));
            setIsEditModalOpen(false);
            setEditingItem(null);
            setEditQty("");
        }
    };

    const totalItems = inventario.length;
    const alertCount = inventario.filter(item => {
        const threshold = alertThresholds[item.name];
        return threshold !== undefined && item.qty <= threshold;
    }).length;

    // Calcular Valorizado Real
    const valorizadoTotal = useMemo(() => {
        return inventario.reduce((acc, item) => {
            let itemCost = 0;
            if (item.type === "Esencia") {
                const esc = esencias.find(e => e.name === item.name);
                if (esc) itemCost = esc.cost * item.qty;
            } else {
                const ins = insumos.find(i => i.name === item.name);
                if (ins) itemCost = ins.cost * item.qty;
            }
            return acc + itemCost;
        }, 0);
    }, [inventario, esencias, insumos]);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col items-center text-center gap-6 bg-white dark:bg-[#242723] p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300">
                <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase">
                        <span className="w-2 h-2 rounded-full bg-[#7D9878] animate-pulse"></span>
                        Stock Al Día
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand">
                        Inventario Físico
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg leading-relaxed font-medium transition-colors">
                        Sincronizá el stock de esencias e insumos para mantener tu producción bajo control.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={clearAllInventario}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition-all"
                    >
                        <Trash2 className="w-5 h-5" />
                        Vaciar Inventario
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Ingresar Stock
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Productos */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center gap-5 hover:border-[#7D9878] transition-all group overflow-hidden relative">
                    <div className="p-4 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] ring-4 ring-[#7D9878]/5 transition-all group-hover:scale-110">
                        <ListTree className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mb-1">Ítems Totales</p>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums font-brand">{totalItems}</p>
                    </div>
                </div>

                {/* Valorizado (Real) */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center gap-5 hover:border-[#7D9878] transition-all group overflow-hidden relative">
                    <div className="p-4 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] ring-4 ring-[#7D9878]/5 transition-all group-hover:scale-110">
                        <MoveUpRight className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mb-1">Valorizado Total</p>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums font-brand">${valorizadoTotal.toLocaleString()}</p>
                    </div>
                </div>

                {/* Alertas */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center justify-between gap-5 transition-all group overflow-hidden relative" style={{ borderColor: alertCount > 0 ? "rgba(201, 134, 111, 0.4)" : undefined }}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-4 rounded-2xl ring-4 transition-all group-hover:scale-110 ${alertCount > 0 ? "bg-[#C9866F]/10 text-[#C9866F] ring-[#C9866F]/10" : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/40 ring-[#353B33]/20"}`}>
                            <AlertCircle className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest leading-tight mb-1">
                                Stock Crítico
                            </p>
                            <p className={`text-3xl font-black tabular-nums flex items-baseline gap-2 font-brand ${alertCount > 0 ? "text-[#C9866F]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                {alertCount}
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${alertCount > 0 ? "text-[#C9866F]" : "text-[#2C2C2C]/40"}`}>ítems bajo límite</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-sm overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <div className="flex items-center gap-1.5 bg-[#F9F6F0] dark:bg-[#1B1D1A] p-1.5 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] w-full lg:w-auto overflow-x-auto">
                        <button
                            onClick={() => setTypeFilter("Todos")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                typeFilter === "Todos"
                                    ? "bg-[#7D9878] text-white shadow-sm scale-105"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            Todos
                        </button>

                        <button
                            onClick={() => setTypeFilter("Esencia")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                typeFilter === "Esencia"
                                    ? "bg-[#7D9878] text-white shadow-sm scale-105"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                        >
                            <FlaskConical className="w-3.5 h-3.5" />
                            Esencias
                        </button>

                        <button
                            onClick={() => setTypeFilter("Insumo")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                typeFilter === "Insumo"
                                    ? "bg-[#7D9878] text-white shadow-sm scale-105"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                        >
                            <Package className="w-3.5 h-3.5" />
                            Insumos
                        </button>

                        <button
                            onClick={() => setTypeFilter("Perfume Hecho")}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                                typeFilter === "Perfume Hecho"
                                    ? "bg-[#7D9878] text-white shadow-sm scale-105"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Perfumes Hechos
                        </button>
                    </div>

                    <div className="relative flex-1 group w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 group-focus-within:text-[#7D9878] transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, categoría o tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3 pl-14 pr-6 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/60 focus:outline-none focus:border-[#7D9878] transition-all font-semibold text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest min-w-[120px]">Tipo</th>
                                <th className="px-6 py-6 text-left text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest min-w-[250px]">Nombre del Ítem</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Categoría</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Cantidad</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Fecha Act.</th>
                                <th className="px-6 py-6 text-right text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pr-12">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                            {inventario.map((item, idx) => {
                                const threshold = alertThresholds[item.name];
                                const isAlert = threshold !== undefined && item.qty <= threshold;
                                return (
                                    <tr key={idx} className={`group hover:bg-[#7D9878]/5 transition-colors relative ${isAlert ? "bg-[#C9866F]/10" : ""}`}>
                                        <td className="px-6 py-6 text-center relative overflow-hidden">
                                            {isAlert && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9866F]" title="¡Stock crítico!" />}
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(item.type, true)}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-left">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-extrabold text-lg group-hover:text-[#7D9878] transition-colors line-clamp-2">
                                                    {item.name}
                                                </p>
                                                {item.gender && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest border whitespace-nowrap ${getColorClass(item.gender, true)}`}>
                                                        {item.gender === 'Femenino' ? 'FEM' : item.gender === 'Masculino' ? 'MASC' : item.gender}
                                                    </span>
                                                )}
                                                {isAlert && <span title={`Límite: ${threshold}`} className="flex shrink-0 animate-pulse"><AlertCircle className="w-5 h-5 text-[#C9866F] drop-shadow-sm" /></span>}
                                                {threshold !== undefined && !isAlert && <span className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 whitespace-nowrap uppercase tracking-widest ml-1 bg-[#F9F6F0] dark:bg-[#1B1D1A] px-2.5 py-1 rounded-lg border border-[#E6DFD5] dark:border-[#353B33]">Límite: {threshold}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(item.category, true)}`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <p className={`font-black text-xl tabular-nums drop-shadow-sm ${isAlert ? "text-[#C9866F]" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                                    {item.qty.toLocaleString()}
                                                </p>
                                                <span className={`text-xs uppercase font-black tracking-widest ${isAlert ? "text-[#C9866F]" : "text-[#2C2C2C]/50"}`}>{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 font-bold text-[11px] uppercase tracking-widest bg-[#F9F6F0] dark:bg-[#1B1D1A] px-3 py-1.5 rounded-full border border-[#E6DFD5] dark:border-[#353B33]">
                                                {item.lastUpdate}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-right pr-12">
                                            <div className="flex items-center justify-end gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingAlertItem(item.name);
                                                        setTempThreshold(alertThresholds[item.name]?.toString() || "");
                                                        setIsAlertModalOpen(true);
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-colors ${threshold !== undefined ? "text-[#7D9878] bg-[#7D9878]/10 border border-[#7D9878]/20" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#7D9878] hover:bg-[#7D9878]/10"}`}
                                                    title="Configurar Alerta"
                                                >
                                                    <AlertCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setEditQty(item.qty.toString());
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2.5 text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#7D9878] hover:bg-[#7D9878]/10 rounded-xl transition-colors"
                                                    title="Editar Stock"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setItemToDelete(item.id)}
                                                    className="p-2.5 text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Movimiento"
                message="¿Estás seguro de que deseas eliminar este registro de inventario?"
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Modal Editar Alerta */}
            {isAlertModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 my-auto">
                        <div className="p-6 pb-4 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <h2 className="text-lg font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2 font-brand">
                                    <AlertCircle className="w-5 h-5 text-[#C9866F]" />
                                    Alerta para: <span className="text-[#7D9878] dark:text-[#A3B69B]">{editingAlertItem}</span>
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsAlertModalOpen(false)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={saveAlertThreshold} className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest block text-center">
                                    Avisarme cuando este stock baje o iguale a:
                                    <br /><span className="text-[10px] font-normal lowercase opacity-70">(Dejá vacío o en 0 para no recibir alertas)</span>
                                </label>
                                <div className="flex justify-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(e.target.value)}
                                        className="w-32 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 px-4 text-center text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#C9866F]/30 focus:border-[#C9866F] transition-all custom-number-input"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl font-bold bg-[#C9866F] text-white hover:bg-[#b5735c] transition-colors shadow-lg shadow-[#C9866F]/20 flex items-center justify-center gap-2 font-brand"
                            >
                                Guardar Configuración
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] my-auto">
                        <div className="p-6 pb-4 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <h2 className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Ingresar Stock</h2>
                                <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold mt-0.5">Sincronizá el stock físico real.</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Seleccionar Tipo</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Esencia", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-1.5 ${formData.type === "Esencia"
                                                ? "bg-[#7D9878]/15 text-[#7D9878] dark:text-[#A3B69B] border-[#7D9878]"
                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 border-[#E6DFD5] dark:border-[#353B33]"
                                                }`}
                                        >
                                            <FlaskConical className="w-3.5 h-3.5 text-[#7D9878]" />
                                            Esencia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Insumo", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-1.5 ${formData.type === "Insumo"
                                                ? "bg-[#7D9878]/15 text-[#7D9878] dark:text-[#A3B69B] border-[#7D9878]"
                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 border-[#E6DFD5] dark:border-[#353B33]"
                                                }`}
                                        >
                                            <Package className="w-3.5 h-3.5 text-[#7D9878]" />
                                            Insumo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Perfume Hecho", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-xs transition-all border-2 flex items-center justify-center gap-1.5 ${formData.type === "Perfume Hecho"
                                                ? "bg-[#A3B69B]/15 text-[#7D9878] dark:text-[#A3B69B] border-[#A3B69B]"
                                                : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 border-[#E6DFD5] dark:border-[#353B33]"
                                                }`}
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-[#A3B69B]" />
                                            Perfume Hecho
                                        </button>
                                    </div>
                                </div>

                                {formData.type === "Esencia" ? (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Esencia</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsEsenciaSearchOpen(true)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border-2 transition-all ${formData.item_id ? 'border-[#7D9878] text-[#7D9878]' : 'border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/50 hover:border-[#7D9878]/50'
                                                }`}
                                        >
                                            <span className="font-bold text-sm truncate pr-2 text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                {formData.item_id ? esencias.find(e => e.id === formData.item_id)?.name : "Buscar Esencia..."}
                                            </span>
                                            <Search className="w-4 h-4 flex-shrink-0 text-[#2C2C2C]/40" />
                                        </button>
                                    </div>
                                ) : formData.type === "Insumo" ? (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Seleccionar Insumo</label>
                                        <select
                                            required
                                            value={formData.item_id}
                                            onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-sm focus:outline-none focus:border-[#7D9878] transition-all appearance-none"
                                        >
                                            <option value="" disabled>Elegí un ítem</option>
                                            {insumos.map(i => (
                                                <option key={i.id} value={i.id}>{i.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-top-1">
                                        {productos.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Seleccionar de Lista de Precios</label>
                                                <select
                                                    value={formData.item_id}
                                                    onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-sm focus:outline-none focus:border-[#7D9878] transition-all appearance-none"
                                                >
                                                    <option value="">-- O escribir nombre manual --</option>
                                                    {productos.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {!formData.item_id && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Nombre del Perfume Hecho</label>
                                                <input
                                                    type="text"
                                                    value={formData.custom_name}
                                                    onChange={e => setFormData({ ...formData, custom_name: e.target.value })}
                                                    placeholder="Ej: CAROLINA HERRERA 50 ML"
                                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-sm focus:outline-none focus:border-[#7D9878] transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Categoría / Frasco</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-3 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-xs focus:outline-none focus:border-[#7D9878] transition-all appearance-none"
                                        >
                                            <option value="Todas">Todas las Categorías</option>
                                            <option value="Frascos de 50 ML">Frascos de 50 ML</option>
                                            <option value="Frascos de 30 ML">Frascos de 30 ML</option>
                                            <option value="Frascos Difusores">Frascos Difusores</option>
                                            <option value="Frascos de Auto">Frascos de Auto</option>
                                            <option value="Insumos">Insumos General</option>
                                            <option value="Esencias">Esencias General</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Género / Variante</label>
                                        <select
                                            value={formData.gender}
                                            onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-3 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-xs focus:outline-none focus:border-[#7D9878] transition-all appearance-none"
                                        >
                                            <option value="Femenino">Femenino</option>
                                            <option value="Masculino">Masculino</option>
                                            <option value="Unisex">Unisex</option>
                                            <option value="Ambiente">Ambiente</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Cantidad</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            value={formData.qty}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border-2 border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-3 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878] transition-all font-black text-lg"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 font-black text-sm pointer-events-none">
                                            {formData.type === "Esencia" ? "g" : (getSelectedItemDetails() as any)?.unit || "un."}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={(!formData.item_id && !formData.custom_name) || !formData.qty}
                                className="w-full py-3.5 rounded-xl bg-[#7D9878] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-[#6b8566] active:scale-[0.98] disabled:opacity-50 transition-all mt-2 font-brand"
                            >
                                <Archive className="w-4 h-4" />
                                Confirmar Ingreso
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Búsqueda de Esencias (Igual que en Pedidos) */}
            {isEsenciaSearchOpen && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] my-auto">
                        <div className="p-6 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <h2 className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2 font-brand">
                                    <FlaskConical className="w-5 h-5 text-[#7D9878]" />
                                    Buscar Esencia
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsEsenciaSearchOpen(false)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] flex gap-3 border-b border-[#E6DFD5] dark:border-[#353B33]">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/40" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Escribí para buscar..."
                                    value={esenciaSearch}
                                    onChange={e => setEsenciaSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-[#7D9878] transition-all"
                                />
                            </div>
                            <select
                                value={esenciaGenderFilter}
                                onChange={e => setEsenciaGenderFilter(e.target.value)}
                                className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] rounded-xl px-4 py-2 text-xs font-black focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Masculino">Masculino</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                            {filteredEsencias.slice(0, 40).map(e => {
                                const gender = e.gender || (e.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
                                const isFemale = gender === "Femenino";
                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => handleSelectEsencia(e)}
                                        className="w-full text-left bg-white dark:bg-[#1B1D1A] p-4 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878] transition-all flex flex-col gap-1 group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isFemale ? 'bg-[#C9866F]/10 text-[#C9866F]' : 'bg-[#7D9878]/10 text-[#7D9878]'
                                                }`}>
                                                {isFemale ? 'F' : 'M'}
                                            </span>
                                            <span className="text-[9px] text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-bold uppercase tracking-widest">Perfumería Fina</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{e.name}</h4>
                                    </button>
                                );
                            })}
                            {filteredEsencias.length > 40 && (
                                <p className="text-center text-[10px] text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 font-bold py-2">
                                    Mostrando los primeros 40 de {filteredEsencias.length} resultados. Refiná la búsqueda para ver más.
                                </p>
                            )}
                            {filteredEsencias.length === 0 && (
                                <div className="py-10 text-center text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 text-sm font-bold">
                                    No se encontraron resultados.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Cantidad (Lápiz) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] my-auto">
                        <div className="p-6 pb-4 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <h2 className="text-lg font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Ajustar Stock</h2>
                                <p className="text-[10px] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold uppercase tracking-widest">{editingItem?.name}</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest block text-center">
                                    Cantidad actual en stock ({editingItem?.unit}):
                                </label>
                                <div className="flex justify-center">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editQty}
                                        onChange={(e) => setEditQty(e.target.value)}
                                        className="w-40 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 px-4 text-center text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 focus:border-[#7D9878] transition-all"
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl font-bold bg-[#7D9878] text-white hover:bg-[#6b8566] transition-colors shadow-lg shadow-[#7D9878]/20 flex items-center justify-center gap-2 font-brand"
                            >
                                Actualizar Stock
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
