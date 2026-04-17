"use client";

import { Search, Filter, Plus, Archive, MoveUpRight, AlertCircle, Trash2, X, FlaskConical, ChevronDown, Edit2, ListTree } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function InventarioPage() {
    const { inventario, esencias, insumos, getNextId, addInventarioItem, deleteInventarioItem, updateInventarioItem } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editQty, setEditQty] = useState("");

    const [formData, setFormData] = useState({
        type: "Esencia" as "Esencia" | "Insumo",
        item_id: "",
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
            return matchesSearch;
        });
    }, [inventario, searchTerm]);

    const getSelectedItemDetails = () => {
        if (formData.type === "Esencia") {
            return esencias.find(e => e.id === formData.item_id);
        } else if (formData.type === "Insumo") {
            return insumos.find(i => i.id === formData.item_id);
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
            category: details.category || "Perfumería Fina",
            qty: parseFloat(formData.qty),
            lastUpdate: new Date().toLocaleDateString("es-AR"),
            unit: formData.type === "Esencia" ? "g" : (details as any).unit || "un.",
            gender: formData.type === "Esencia" ? ((details as any).gender || (details.category?.toLowerCase().includes("femenina") ? "Femenino" : "Masculino")) : undefined
        });

        setFormData({ type: "Esencia", item_id: "", qty: "" });
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
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Stock Al Día
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Inventario Físico
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Sincronizá el stock de esencias e insumos para mantener tu producción bajo control.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Ingresar Stock
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Productos */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group overflow-hidden relative">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50/50 dark:ring-indigo-500/5 transition-all group-hover:scale-110">
                        <ListTree className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Ítems Totales</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tabular-nums">{totalItems}</p>
                    </div>
                </div>

                {/* Valorizado (Real) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all group overflow-hidden relative">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50/50 dark:ring-emerald-500/5 transition-all group-hover:scale-110">
                        <MoveUpRight className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Valorizado Total</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tabular-nums">${valorizadoTotal.toLocaleString()}</p>
                    </div>
                </div>

                {/* Alertas */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-between gap-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all group overflow-hidden relative" style={{ borderColor: alertCount > 0 ? "rgba(225, 29, 72, 0.2)" : undefined }}>
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-colors ${alertCount > 0 ? "bg-rose-100 dark:bg-rose-500/10" : "bg-slate-50 dark:bg-slate-500/5"}`}></div>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-4 rounded-2xl ring-4 transition-all group-hover:scale-110 ${alertCount > 0 ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-50/50 dark:ring-rose-500/5" : "bg-slate-50 dark:bg-slate-800 text-slate-400 ring-slate-50/50 dark:ring-slate-800/50"}`}>
                            <AlertCircle className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight mb-1">
                                Stock Crítico
                            </p>
                            <p className={`text-3xl font-black tabular-nums flex items-baseline gap-2 ${alertCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50"}`}>
                                {alertCount}
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${alertCount > 0 ? "text-rose-400" : "text-slate-400"}`}>ítems bajo límite</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, categoría o tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest min-w-[120px]">Tipo</th>
                                <th className="px-6 py-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest min-w-[250px]">Nombre del Ítem</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Categoría</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Cantidad</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha Act.</th>
                                <th className="px-6 py-6 text-right text-xs font-bold text-slate-400 uppercase tracking-widest pr-12">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {inventario.map((item, idx) => {
                                const threshold = alertThresholds[item.name];
                                const isAlert = threshold !== undefined && item.qty <= threshold;
                                return (
                                    <tr key={idx} className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors relative ${isAlert ? "bg-rose-50/10 dark:bg-rose-500/5" : ""}`}>
                                        <td className="px-6 py-6 text-center relative overflow-hidden">
                                            {isAlert && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.8)]" title="¡Stock crítico!" />}
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(item.type, true)}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-left">
                                            <div className="flex items-center gap-3">
                                                <p className="text-slate-900 dark:text-slate-100 font-extrabold text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                                                    {item.name}
                                                </p>
                                                {item.gender && (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-widest border whitespace-nowrap ${getColorClass(item.gender, true)}`}>
                                                        {item.gender === 'Femenino' ? 'FEM' : item.gender === 'Masculino' ? 'MASC' : item.gender}
                                                    </span>
                                                )}
                                                {isAlert && <span title={`Límite: ${threshold}`} className="flex shrink-0 animate-pulse"><AlertCircle className="w-5 h-5 text-rose-500 drop-shadow-sm" /></span>}
                                                {threshold !== undefined && !isAlert && <span className="text-[10px] font-bold text-slate-400/80 dark:text-slate-500 whitespace-nowrap uppercase tracking-widest ml-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">Límite: {threshold}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(item.category, true)}`}>
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <p className={`font-black text-xl tabular-nums drop-shadow-sm ${isAlert ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                                                    {item.qty.toLocaleString()}
                                                </p>
                                                <span className={`text-xs uppercase font-black tracking-widest ${isAlert ? "text-rose-400" : "text-slate-400"}`}>{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
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
                                                    className={`p-2.5 rounded-xl transition-colors ${threshold !== undefined ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20" : "text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"}`}
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
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors"
                                                    title="Editar Stock"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setItemToDelete(item.id)}
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                    Alerta para: <span className="text-indigo-600 dark:text-indigo-400">{editingAlertItem}</span>
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsAlertModalOpen(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={saveAlertThreshold} className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">
                                    Avisarme cuando este stock baje o iguale a:
                                    <br /><span className="text-[10px] font-normal lowercase opacity-70">(Dejá vacío o en 0 para no recibir alertas)</span>
                                </label>
                                <div className="flex justify-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(e.target.value)}
                                        className="w-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-center text-3xl font-black text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-500 transition-all custom-number-input"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                            >
                                Guardar Configuración
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">Ingresar Stock</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Sincronizá el stock físico real.</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Tipo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Esencia", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${formData.type === "Esencia"
                                                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-500"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent text-slate-600 dark:text-slate-400 font-bold"
                                                }`}
                                        >
                                            Esencia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Insumo", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${formData.type === "Insumo"
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-500"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent text-slate-600 dark:text-slate-400 font-bold"
                                                }`}
                                        >
                                            Insumo
                                        </button>
                                    </div>
                                </div>

                                {formData.type === "Esencia" ? (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Producto</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsEsenciaSearchOpen(true)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 transition-all ${formData.item_id ? 'border-emerald-500/50 text-emerald-600' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-emerald-400/30'
                                                }`}
                                        >
                                            <span className="font-bold text-sm truncate pr-2">
                                                {formData.item_id ? esencias.find(e => e.id === formData.item_id)?.name : "Buscar Esencia..."}
                                            </span>
                                            <Search className="w-4 h-4 flex-shrink-0" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Insumo</label>
                                        <select
                                            required
                                            value={formData.item_id}
                                            onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-slate-900 dark:text-slate-50 font-bold text-sm focus:outline-none focus:border-emerald-500 transition-all appearance-none"
                                        >
                                            <option value="" disabled>Elegí un ítem</option>
                                            {insumos.map(i => (
                                                <option key={i.id} value={i.id}>{i.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1.5 relative">
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Cantidad</label>
                                    <div className="relative">
                                        <input
                                            required
                                            type="number"
                                            value={formData.qty}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl py-3 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-emerald-500 transition-all font-black text-lg"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm pointer-events-none">
                                            {formData.type === "Esencia" ? "g" : (getSelectedItemDetails() as any)?.unit || "un."}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!formData.item_id || !formData.qty}
                                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all mt-2"
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <FlaskConical className="w-5 h-5 text-orange-500" />
                                    Buscar Esencia
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsEsenciaSearchOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Escribí para buscar..."
                                    value={esenciaSearch}
                                    onChange={e => setEsenciaSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>
                            <select
                                value={esenciaGenderFilter}
                                onChange={e => setEsenciaGenderFilter(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-black focus:outline-none appearance-none cursor-pointer"
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
                                        className="w-full text-left bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col gap-1 group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isFemale ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'
                                                }`}>
                                                {isFemale ? 'F' : 'M'}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Perfumería Fina</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">{e.name}</h4>
                                    </button>
                                );
                            })}
                            {filteredEsencias.length > 40 && (
                                <p className="text-center text-[10px] text-slate-400 font-bold py-2">
                                    Mostrando los primeros 40 de {filteredEsencias.length} resultados. Refiná la búsqueda para ver más.
                                </p>
                            )}
                            {filteredEsencias.length === 0 && (
                                <div className="py-10 text-center text-slate-400 text-sm font-bold">
                                    No se encontraron resultados.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Editar Cantidad (Lápiz) */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">Ajustar Stock</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{editingItem?.name}</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">
                                    Cantidad actual en stock ({editingItem?.unit}):
                                </label>
                                <div className="flex justify-center">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editQty}
                                        onChange={(e) => setEditQty(e.target.value)}
                                        className="w-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-center text-3xl font-black text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
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
