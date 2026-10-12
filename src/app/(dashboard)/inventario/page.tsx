"use client";

import { Search, Plus, MoveUpRight, AlertCircle, Trash2, FlaskConical, Edit2, ListTree, Sparkles, Layers, Package, Check } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext, buscarPerfumeHecho } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, ETIQUETA_CAMPO, AYUDA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import IngresarStock from "@/components/IngresarStock";

export default function InventarioPage() {
    const { inventario, esencias, insumos, productos, deleteInventarioItem, updateInventarioItem, clearAllInventario } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editQty, setEditQty] = useState("");

    const [typeFilter, setTypeFilter] = useState("Todos");

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
    const filteredInventario = useMemo(() => {
        // Sin importar tildes ni mayúsculas, y cada palabra por separado: "212 vip masculino"
        const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
        const palabras = normalizar(searchTerm).split(/\s+/).filter(Boolean);
        return inventario.filter(item => {
            const texto = normalizar(`${item.name} ${item.category} ${item.type} ${item.gender ?? ""}`);
            const matchesSearch = palabras.every(p => texto.includes(p));
            const matchesType = typeFilter === "Todos" || item.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [inventario, searchTerm, typeFilter]);

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
            } else if (item.type === "Perfume Hecho") {
                const prod = productos.find(p => buscarPerfumeHecho([item], p));
                if (prod) itemCost = prod.cost * item.qty;
            } else {
                const ins = insumos.find(i => i.name === item.name);
                if (ins) itemCost = ins.cost * item.qty;
            }
            return acc + itemCost;
        }, 0);
    }, [inventario, esencias, insumos, productos]);

    return (
        <div className="space-y-8 pb-12 anim-entrada relative">
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
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition"
                    >
                        <Trash2 className="w-5 h-5" />
                        Vaciar Inventario
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Ingresar Stock
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Productos */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center gap-5 hover:border-[#7D9878] transition group overflow-hidden relative">
                    <div className="p-4 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] ring-4 ring-[#7D9878]/5 transition">
                        <ListTree className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mb-1">Ítems Totales</p>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums font-brand">{totalItems}</p>
                    </div>
                </div>

                {/* Valorizado (Real) */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center gap-5 hover:border-[#7D9878] transition group overflow-hidden relative">
                    <div className="p-4 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] ring-4 ring-[#7D9878]/5 transition">
                        <MoveUpRight className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest mb-1">Valorizado Total</p>
                        <p className="text-3xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums font-brand">${Math.round(valorizadoTotal).toLocaleString("es-AR")}</p>
                    </div>
                </div>

                {/* Alertas */}
                <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-6 rounded-[2rem] shadow-sm flex items-center justify-between gap-5 transition group overflow-hidden relative" style={{ borderColor: alertCount > 0 ? "rgba(201, 134, 111, 0.4)" : undefined }}>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`p-4 rounded-2xl ring-4 transition ${alertCount > 0 ? "bg-[#C9866F]/10 text-[#C9866F] ring-[#C9866F]/10" : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/40 ring-[#353B33]/20"}`}>
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
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
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
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
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
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
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
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
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
                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3 pl-14 pr-6 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/60 focus:outline-none focus:border-[#7D9878] transition font-semibold text-sm"
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
                            {filteredInventario.map((item) => {
                                const threshold = alertThresholds[item.name];
                                const isAlert = threshold !== undefined && item.qty <= threshold;
                                return (
                                    <tr key={item.id} className={`group hover:bg-[#7D9878]/5 transition-colors relative ${isAlert ? "bg-[#C9866F]/10" : ""}`}>
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
                    {filteredInventario.length === 0 && (
                        <div className="px-6 py-16 text-center">
                            <p className="text-sm font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                {inventario.length === 0 ? "Todavía no cargaste stock." : "No hay nada que coincida con la búsqueda."}
                            </p>
                            {inventario.length === 0 ? (
                                <button onClick={() => setIsAddModalOpen(true)} className="mt-3 text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline">
                                    Ingresar stock
                                </button>
                            ) : (
                                <button onClick={() => { setSearchTerm(""); setTypeFilter("Todos"); }} className="mt-3 text-sm font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:underline">
                                    Ver todo
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Movimiento"
                message="¿Estás seguro de que deseas eliminar este registro de inventario?"
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Aviso de stock bajo */}
            <Ventana abierta={isAlertModalOpen} onCerrar={() => setIsAlertModalOpen(false)} etiqueta="Aviso de stock bajo">
            {isAlertModalOpen && (
                    <PanelVentana ancho="sm">
                        <CabeceraVentana
                            etiqueta="Aviso de stock bajo"
                            titulo={editingAlertItem}
                            icono={AlertCircle}
                            tono="terracota"
                            onCerrar={() => setIsAlertModalOpen(false)}
                        />
                        <form onSubmit={saveAlertThreshold} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana>
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Avisarme cuando queden</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(e.target.value)}
                                        className={`${CAMPO.replace("h-11", "h-14").replace("text-sm", "text-2xl")} font-semibold tabular-nums`}
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <span className={`block ${AYUDA_CAMPO}`}>Avisa cuando el stock baja a esta cantidad o menos. Dejalo en 0 para no recibir avisos.</span>
                                </label>
                            </CuerpoVentana>
                            <PieVentana>
                                <button type="button" onClick={() => setIsAlertModalOpen(false)} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    Guardar aviso
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
            )}
            </Ventana>

            <IngresarStock abierta={isAddModalOpen} onCerrar={() => setIsAddModalOpen(false)} />

            {/* Ajustar stock (lápiz) */}
            <Ventana abierta={isEditModalOpen} onCerrar={() => setIsEditModalOpen(false)} cerrarAlTocarFondo={false} etiqueta="Ajustar stock">
            {isEditModalOpen && (
                    <PanelVentana ancho="sm">
                        <CabeceraVentana
                            etiqueta="Ajustar stock"
                            titulo={editingItem?.name}
                            icono={Edit2}
                            onCerrar={() => setIsEditModalOpen(false)}
                        />
                        <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana>
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Cantidad que hay ahora</span>
                                    <span className="relative block">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editQty}
                                            onChange={(e) => setEditQty(e.target.value)}
                                            className={`${CAMPO.replace("h-11", "h-14").replace("text-sm", "text-2xl")} pr-14 font-semibold tabular-nums`}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">
                                            {editingItem?.unit}
                                        </span>
                                    </span>
                                    <span className={`block ${AYUDA_CAMPO}`}>Reemplaza la cantidad anterior por esta.</span>
                                </label>
                            </CuerpoVentana>
                            <PieVentana>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    Guardar
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
            )}
            </Ventana>
        </div>
    );
}
