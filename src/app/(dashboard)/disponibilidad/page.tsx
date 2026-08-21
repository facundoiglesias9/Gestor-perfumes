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
    ChevronRight,
    Sparkles
} from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import { upsertRecords } from "@/lib/db-actions";
import { toast } from "sonner";

// Memoized Row for Performance
const ProductRow = memo(({ prod, isSelected, localChange, onSelect, onStatusChange, onDaysChange }: any) => {
    const state = localChange || { 
        status: prod.availabilityStatus || "disponible", 
        days: prod.deliveryDays || 0 
    };

    return (
        <tr className={`group hover:bg-[#7D9878]/5 transition-colors ${isSelected ? 'bg-[#7D9878]/10' : ''}`}>
            <td className="px-8 py-6 text-center">
                <div 
                    onClick={() => onSelect(prod.id)}
                    className={`w-5 h-5 mx-auto rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${
                        isSelected 
                        ? 'bg-[#7D9878] border-[#7D9878]' 
                        : 'border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]'
                    }`}
                >
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in-50 duration-300" />}
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-xl flex items-center justify-center shrink-0 border border-[#E6DFD5] dark:border-[#353B33]">
                        {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <Package className="w-6 h-6 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest mb-0.5">{prod.category}</p>
                        <p className="font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">{prod.name}</p>
                        <p className="text-[10px] font-bold text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40">ID: {prod.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6 text-center">
                <div className="inline-flex items-center p-1 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-xl border border-[#E6DFD5] dark:border-[#353B33] gap-1">
                    <button
                        onClick={() => onStatusChange(prod.id, "disponible")}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                            state.status === "disponible" 
                            ? "bg-[#7D9878] text-white shadow-md shadow-[#7D9878]/20" 
                            : "text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"
                        }`}
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        En Mano
                    </button>
                    <button
                        onClick={() => onStatusChange(prod.id, "demora")}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all ${
                            state.status === "demora" 
                            ? "bg-[#C9866F] text-white shadow-md shadow-[#C9866F]/20" 
                            : "text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D9878]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <div className="inline-flex items-center gap-3 bg-[#7D9878]/10 px-4 py-1.5 rounded-full border border-[#7D9878]/20">
                        <Truck className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                        <p className="text-[10px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-[0.2em]">Logística & Stock</p>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand text-center">
                        Disponibilidad <span className="text-[#7D9878] dark:text-[#A3B69B]">de Entrega</span>
                    </h1>
                </div>

                <div className="mt-6 md:mt-0 md:absolute md:right-10 md:top-1/2 md:-translate-y-1/2">
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving || Object.keys(localChanges).length === 0}
                        className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                            Object.keys(localChanges).length > 0 
                            ? "bg-[#7D9878] text-white hover:bg-[#6b8566] hover:scale-105 active:scale-95 shadow-[#7D9878]/25" 
                            : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 border border-[#E6DFD5] dark:border-[#353B33] cursor-not-allowed"
                        }`}
                    >
                        {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Cambios ({Object.keys(localChanges).length})
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o ID..."
                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-14 pr-6 text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/60 focus:outline-none focus:border-[#7D9878] transition-all font-semibold"
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 pointer-events-none" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-6 pr-10 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold appearance-none cursor-pointer focus:outline-none"
                    >
                        <option value="Todas">Todas las Categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th className="px-8 py-5 text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest text-center w-12">
                                    <div 
                                        onClick={toggleSelectAll}
                                        className={`w-5 h-5 mx-auto rounded-md border-2 transition-all cursor-pointer flex items-center justify-center ${
                                            selectedIds.length > 0 && selectedIds.length === filteredProductos.length 
                                            ? 'bg-[#7D9878] border-[#7D9878]' 
                                            : 'border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]'
                                        }`}
                                    >
                                        {(selectedIds.length > 0 && selectedIds.length === filteredProductos.length) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        {(selectedIds.length > 0 && selectedIds.length < filteredProductos.length) && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                    </div>
                                </th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Producto</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest text-center">Demora (Días)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
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
                        <Package className="w-12 h-12 text-[#7D9878] mx-auto" />
                        <p className="text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-bold uppercase tracking-widest text-xs">No se encontraron productos</p>
                    </div>
                )}
            </div>

            {/* Floating Batch Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="bg-white dark:bg-[#242723] text-[#2C2C2C] dark:text-[#F4EFEA] px-8 py-6 rounded-[2.5rem] shadow-2xl border border-[#E6DFD5] dark:border-[#353B33] flex flex-col md:flex-row items-center gap-8">
                        <div className="flex items-center gap-4 border-r border-[#E6DFD5] dark:border-[#353B33] pr-8">
                            <div className="w-10 h-10 bg-[#7D9878] rounded-full flex items-center justify-center font-black text-white">
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
                                className="px-4 py-2 bg-[#7D9878] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#7D9878]/20"
                            >
                                Marcar En Mano
                            </button>
                            <button 
                                onClick={() => handleBatchUpdate("demora")}
                                className="px-4 py-2 bg-[#A3B69B] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#A3B69B]/30"
                            >
                                Marcar con Demora
                            </button>
                            <button 
                                onClick={() => handleBatchUpdate("no-disponible")}
                                className="px-4 py-2 bg-[#C9866F] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#C9866F]/20"
                            >
                                Marcar Faltante
                            </button>
                        </div>

                        <div className="flex items-center gap-4 pl-4 border-l border-[#E6DFD5] dark:border-[#353B33]">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase">Días:</span>
                                <input 
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-16 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-lg py-2 px-3 text-xs font-black focus:ring-2 focus:ring-[#7D9878] transition-all text-center"
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
                                className="flex items-center gap-2 px-6 py-2 bg-[#7D9878] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#7D9878]/30 ml-2"
                            >
                                {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Todo
                            </button>

                            <button 
                                onClick={() => setSelectedIds([])}
                                className="text-[#2C2C2C]/40 hover:text-[#7D9878] transition-colors ml-4"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination UI */}
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
            />
        </div>
    );
}
