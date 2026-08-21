"use client";

import { X, Search, FlaskConical, Package, Plus, Filter, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

interface SelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    type: "Esencia" | "Insumo";
    onSelect: (item: any) => void;
}

export default function SelectorModal({ isOpen, onClose, title, items, type, onSelect }: SelectorModalProps) {
    const { generos, proveedores, categorias } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [esenciaTab, setEsenciaTab] = useState<"Perfumería" | "Limpia Pisos">("Perfumería");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [providerFilter, setProviderFilter] = useState("Todos");
    const [categoryFilter, setCategoryFilter] = useState("Todos");

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (type !== "Esencia") return matchesSearch;

            const isLP = item.gender?.toLowerCase() === "limpia pisos" || item.category?.toLowerCase()?.includes("limpia pisos");
            if (esenciaTab === "Perfumería" && isLP) return false;
            if (esenciaTab === "Limpia Pisos" && !isLP) return false;

            if (esenciaTab === "Limpia Pisos") {
                const matchesCat = categoryFilter === "Todos" || item.category?.toLowerCase() === categoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
            }

            const matchesGender = genderFilter === "Todos" || item.gender === genderFilter;
            const matchesProvider = providerFilter === "Todos" || item.provider === providerFilter;
            return matchesSearch && matchesGender && matchesProvider;
        });
    }, [items, searchTerm, type, esenciaTab, genderFilter, providerFilter, categoryFilter]);

    if (!isOpen) return null;

    const handleTabChange = (tab: "Perfumería" | "Limpia Pisos") => {
        setEsenciaTab(tab);
        setGenderFilter("Todos");
        setProviderFilter("Todos");
        setCategoryFilter("Todos");
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 my-auto">
                {/* Header */}
                <div className="p-5 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center shrink-0 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                    <h2 className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-2 font-brand">
                        {type === "Esencia" ? <FlaskConical className="w-5 h-5 text-[#7D9878]" /> : <Package className="w-5 h-5 text-[#7D9878]" />}
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer" title="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs (only for Esencias) */}
                {type === "Esencia" && (
                    <div className="flex border-b border-[#E6DFD5] dark:border-[#353B33] shrink-0 px-5 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                        {(["Perfumería", "Limpia Pisos"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`pb-3 pt-3 px-4 font-black text-sm transition-colors border-b-2 ${esenciaTab === tab
                                        ? "border-[#7D9878] text-[#7D9878] dark:text-[#A3B69B]"
                                        : "border-transparent text-[#2C2C2C]/50 hover:text-[#7D9878]"
                                    }`}
                            >
                                {tab === "Perfumería" ? "Perfumería Fina" : "Limpia Pisos"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="p-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33] flex flex-wrap gap-2 shrink-0">
                    <div className="relative group flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/40 group-focus-within:text-[#7D9878] transition-colors" />
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Buscar ${type.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2 pl-9 pr-4 text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878] transition-all"
                        />
                    </div>

                    {type === "Esencia" && esenciaTab === "Perfumería" && (
                        <>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2C2C2C]/40" />
                                <select
                                    value={genderFilter}
                                    onChange={e => setGenderFilter(e.target.value)}
                                    className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-[#7D9878] transition-all text-[#2C2C2C] dark:text-[#F4EFEA]"
                                >
                                    <option value="Todos">Género: Todos</option>
                                    {generos.filter(g => g.toLowerCase() !== "limpia pisos").map((g, idx) => (
                                        <option key={idx} value={g}>{g}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#2C2C2C]/40 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2C2C2C]/40" />
                                <select
                                    value={providerFilter}
                                    onChange={e => setProviderFilter(e.target.value)}
                                    className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-[#7D9878] transition-all text-[#2C2C2C] dark:text-[#F4EFEA]"
                                >
                                    <option value="Todos">Proveedor: Todos</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#2C2C2C]/40 pointer-events-none" />
                            </div>
                        </>
                    )}

                    {type === "Esencia" && esenciaTab === "Limpia Pisos" && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2C2C2C]/40" />
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-[#7D9878] transition-all text-[#2C2C2C] dark:text-[#F4EFEA]"
                            >
                                <option value="Todos">Categoría: Todos</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#2C2C2C]/40 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                    {filteredItems.map(item => {
                        const isLP = type === "Esencia" && (item.gender?.toLowerCase() === "limpia pisos" || item.category?.toLowerCase()?.includes("limpia pisos"));
                        const gender = item.gender;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className="w-full text-left p-4 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878] hover:bg-[#7D9878]/10 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B]">
                                        {type === "Esencia" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#2C2C2C] dark:text-[#F4EFEA] line-clamp-1">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.provider && (
                                                <p className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest">{item.provider}</p>
                                            )}
                                            {item.category && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] border border-[#E6DFD5] dark:border-[#353B33]">
                                                    {item.category}
                                                </span>
                                            )}
                                            {gender && !isLP && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border border-[#E6DFD5] dark:border-[#353B33]">
                                                    {gender}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Plus className="w-5 h-5 text-[#2C2C2C]/40 group-hover:text-[#7D9878] transition-all shrink-0" />
                            </button>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="py-12 text-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-bold text-sm">
                            No se encontraron resultados.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
