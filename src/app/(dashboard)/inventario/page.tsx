"use client";

import { Search, Filter, Plus, Archive, MoveUpRight, AlertCircle, Trash2, X, FlaskConical, ChevronDown, Edit2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

export default function InventarioPage() {
    const { inventario, setInventario, esencias, insumos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        type: "Esencia" as "Esencia" | "Insumo",
        item_id: "",
        qty: ""
    });

    const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({});
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [editingAlertItem, setEditingAlertItem] = useState<string | null>(null);
    const [tempThreshold, setTempThreshold] = useState("");

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

        setInventario([
            {
                id: getNextId(inventario, "INV-"),
                name: details.name,
                type: formData.type,
                category: details.category || "Perfumería Fina",
                qty: parseFloat(formData.qty),
                lastUpdate: new Date().toLocaleDateString("es-AR"),
                unit: formData.type === "Esencia" ? "g" : (details as any).unit || "un."
            },
            ...inventario
        ]);

        setFormData({ type: "Esencia", item_id: "", qty: "" });
        setIsAddModalOpen(false);
    };

    const handleSelectEsencia = (esencia: any) => {
        setFormData({ ...formData, item_id: esencia.id, type: "Esencia" });
        setIsEsenciaSearchOpen(false);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setInventario(inventario.filter(i => i.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    const totalUnidades = inventario.reduce((acc, item) => acc + item.qty, 0);
    const alertCount = inventario.filter(item => {
        const threshold = alertThresholds[item.name];
        return threshold !== undefined && item.qty <= threshold;
    }).length;

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
                        Controlá el stock real de tus materias primas e insumos para evitar quiebres.
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
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400">
                        <Archive className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unidades/Gramos</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-slate-50">{totalUnidades}</p>
                    </div>
                </div>
                {/* Placeholder stats */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl opacity-50 flex items-center gap-5">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                        <MoveUpRight className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider tracking-widest">Valorizado</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-slate-50">$0</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex items-center justify-between gap-5 relative overflow-hidden transition-all">
                    <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${alertCount > 0 ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                Alertas
                                <span className="block text-[10px] font-medium opacity-80 mt-0.5 lowercase text-slate-400/80 dark:text-slate-500">ítems bajo el límite</span>
                            </p>
                            <p className={`text-2xl font-black ${alertCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-50"}`}>
                                {alertCount}
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
                            placeholder="Buscar en inventario..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all font-semibold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%]">Tipo</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[30%]">Item</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%]">Categoría</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] text-center">Cantidad</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%]">Fecha</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {inventario.map((item, idx) => {
                                const threshold = alertThresholds[item.name];
                                const isAlert = threshold !== undefined && item.qty <= threshold;
                                return (
                                    <tr key={idx} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                                        <td className="px-8 py-6 relative">
                                            {isAlert && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-rose-500 rounded-r-full" title="¡Stock bajo!" />}
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border ${item.type === 'Esencia'
                                                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20'
                                                : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-extrabold text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                                                {item.name}
                                                {isAlert && <span title={`Límite: ${threshold}`}><AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /></span>}
                                                {threshold !== undefined && !isAlert && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">(Aviso a los {threshold})</span>}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 w-fit">
                                                {item.category}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <p className={`font-black text-xl ${isAlert ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>
                                                {item.qty.toLocaleString()} <span className={`text-xs font-bold ${isAlert ? "text-rose-400" : "text-slate-400"}`}>{item.unit}</span>
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase">{item.lastUpdate}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingAlertItem(item.name);
                                                        setTempThreshold(alertThresholds[item.name]?.toString() || "");
                                                        setIsAlertModalOpen(true);
                                                    }}
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                                                    title="Configurar Alerta"
                                                >
                                                    {threshold !== undefined ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <AlertCircle className="w-5 h-5" />}
                                                </button>
                                                <button
                                                    onClick={() => setItemToDelete(item.id)}
                                                    className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
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
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">¿Qué ingresa?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Esencia", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${formData.type === "Esencia"
                                                ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 border-orange-500"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent"
                                                }`}
                                        >
                                            Esencia
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: "Insumo", item_id: "" })}
                                            className={`py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${formData.type === "Insumo"
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-500"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent"
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
        </div>
    );
}
