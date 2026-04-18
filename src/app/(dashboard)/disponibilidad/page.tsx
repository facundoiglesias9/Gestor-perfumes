"use client";

import { useState, useMemo, memo } from "react";
import { useAppContext } from "@/context/AppContext";
import { 
    Search, 
    Filter, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ChevronDown, 
    Save,
    Package,
    Truck,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { upsertRecords } from "@/lib/db-actions";
import { toast } from "sonner";

// Memoized Row for Performance
const ProductRow = memo(({ prod, isSelected, localChange, onSelect, onStatusChange, onDaysChange }: any) => {
    const state = localChange || { 
        status: prod.availabilityStatus || "disponible", 
        days: prod.deliveryDays || 0 
    };

    return (
        <tr className={`group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}>
            <td className="px-8 py-6 text-center">
                <div 
                    onClick={() => onSelect(prod.id)}
                    className={`w-5 h-5 mx-auto rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${
                        isSelected 
                        ? 'bg-indigo-600 border-indigo-600' 
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                >
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in-50 duration-300" />}
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <Package className="w-6 h-6 text-slate-400" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">{prod.category}</p>
                        <p className="font-extrabold text-slate-900 dark:text-slate-50">{prod.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">ID: {prod.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6 text-center">
                <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
                    <button
                        onClick={() => onStatusChange(prod.id, "disponible")}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                            state.status === "disponible" 
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        En Mano
                    </button>
                    <button
                        onClick={() => onStatusChange(prod.id, "demora")}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                            state.status === "demora" 
                            ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                        <Clock className="w-3 h-3" />
                        Demora
                    </button>
                    <button
                        onClick={() => onStatusChange(prod.id, "no-disponible")}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                            state.status === "no-disponible" 
                            ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" 
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                        <XCircle className="w-3 h-3" />
                        Faltante
                    </button>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center justify-center">
                    <div className="relative max-w-[100px]">
                        <input
                            type="number"
                            value={state.days}
                            onChange={(e) => onDaysChange(prod.id, parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-center font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 sm:text-sm transition-all"
                            min="0"
                        />
                        <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    </div>
                </div>
            </td>
        </tr>
    );
});

ProductRow.displayName = "ProductRow";

export default function DisponibilidadPage() {
    const { productos, setProductos, categorias, isLoading } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Todas");
    const [isSaving, setIsSaving] = useState(false);

    // List of states that have pending changes
    const [localChanges, setLocalChanges] = useState<Record<string, { status: any, days: number }>>({});
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    const filteredProductos = useMemo(() => {
        return productos.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "Todas" || 
                (p.category || "").trim().toLowerCase() === categoryFilter.trim().toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [productos, searchTerm, categoryFilter]);

    const paginatedProductos = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProductos.slice(start, start + itemsPerPage);
    }, [filteredProductos, currentPage]);

    const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProductos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProductos.map(p => p.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBatchUpdate = (status: any, days?: number) => {
        const updates: Record<string, { status: any, days: number }> = {};
        selectedIds.forEach(id => {
            const prod = productos.find(p => p.id === id);
            if (!prod) return;
            updates[id] = {
                status: status || (localChanges[id]?.status ?? prod.availabilityStatus ?? "disponible"),
                days: days !== undefined ? days : (localChanges[id]?.days ?? prod.deliveryDays ?? 0)
            };
        });
        setLocalChanges(prev => ({ ...prev, ...updates }));
        toast.info(`${selectedIds.length} productos marcados para actualizar`);
    };

    const handleStatusChange = (id: string, status: any) => {
        const prod = productos.find(p => p.id === id);
        if (!prod) return;
        
        setLocalChanges(prev => ({
            ...prev,
            [id]: {
                status,
                days: prev[id]?.days ?? prod.deliveryDays ?? 0
            }
        }));
    };

    const handleDaysChange = (id: string, days: number) => {
        const prod = productos.find(p => p.id === id);
        if (!prod) return;

        setLocalChanges(prev => ({
            ...prev,
            [id]: {
                status: prev[id]?.status ?? prod.availabilityStatus ?? "disponible",
                days
            }
        }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        const changedIds = Object.keys(localChanges);
        if (changedIds.length === 0) {
            setIsSaving(false);
            return;
        }

        const updatedProducts = productos.map(p => {
            if (localChanges[p.id]) {
                const availabilityStatus = localChanges[p.id].status;
                const deliveryDays = localChanges[p.id].days;
                return {
                    ...p,
                    availabilityStatus,
                    deliveryDays
                };
            }
            return p;
        });

        try {
            const recordsToUpdate = changedIds.map(id => {
                const p = updatedProducts.find(prod => prod.id === id)!;
                return {
                    id: p.id,
                    availability_status: p.availabilityStatus,
                    delivery_days: p.deliveryDays
                };
            });

            const { error } = await upsertRecords("productos", recordsToUpdate);
            if (error) throw new Error(error);

            setProductos(updatedProducts);
            setLocalChanges({});
            toast.success("Disponibilidad actualizada correctamente");
        } catch (err: any) {
            toast.error("Error al guardar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Truck className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Logística & Stock</p>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
                        Disponibilidad <span className="text-indigo-500">de Entrega</span>
                    </h1>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving || Object.keys(localChanges).length === 0}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                            Object.keys(localChanges).length > 0 
                            ? "bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-indigo-500/25" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                        {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios ({Object.keys(localChanges).length})
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o ID..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold"
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-6 pr-10 text-slate-700 dark:text-slate-300 font-bold appearance-none cursor-pointer focus:outline-none"
                    >
                        <option value="Todas">Todas las Categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">
                                    <div 
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 mx-auto rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${
                                            selectedIds.length > 0 && selectedIds.length === filteredProductos.length 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                                        }`}
                                    >
                                        {(selectedIds.length > 0 && selectedIds.length === filteredProductos.length) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        {(selectedIds.length > 0 && selectedIds.length < filteredProductos.length) && <div className="w-2 h-0.5 bg-slate-400 rounded-full" />}
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Producto</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Demora (Días)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {paginatedProductos.map(prod => (
                                <ProductRow 
                                    key={prod.id}
                                    prod={prod}
                                    isSelected={selectedIds.includes(prod.id)}
                                    localChange={localChanges[prod.id]}
                                    onSelect={toggleSelect}
                                    onStatusChange={handleStatusChange}
                                    onDaysChange={handleDaysChange}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProductos.length === 0 && (
                    <div className="p-20 text-center space-y-3">
                        <Package className="w-12 h-12 text-slate-200 mx-auto" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron productos</p>
                    </div>
                )}
            </div>

            {/* Floating Batch Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-8 py-6 rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-800 pr-8">
                            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-black text-white">
                                {selectedIds.length}
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest">Seleccionados</p>
                                <p className="text-[10px] font-bold opacity-60">Edición Masiva</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => handleBatchUpdate("disponible")}
                                className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Marcar En Mano
                            </button>
                            <button 
                                onClick={() => handleBatchUpdate("demora")}
                                className="px-4 py-2 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-violet-600/30"
                            >
                                Marcar con Demora
                            </button>
                            <button 
                                onClick={() => handleBatchUpdate("no-disponible")}
                                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-rose-500/20"
                            >
                                Marcar Faltante
                            </button>
                        </div>

                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Días:</span>
                                <input 
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 text-xs font-black focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                                    onBlur={(e) => handleBatchUpdate(null, parseInt((e.target as HTMLInputElement).value) || 0)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleBatchUpdate(null, parseInt((e.target as HTMLInputElement).value) || 0);
                                        }
                                    }}
                                />
                            </div>
                            
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 ml-2"
                            >
                                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Todo
                            </button>

                            <button 
                                onClick={() => setSelectedIds([])}
                                className="text-slate-400 hover:text-indigo-600 transition-colors ml-4"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination UI */}
            <div className="flex items-center justify-center gap-4 py-10">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-500 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">Página {currentPage}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">de {totalPages}</span>
                </div>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:border-indigo-500 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
