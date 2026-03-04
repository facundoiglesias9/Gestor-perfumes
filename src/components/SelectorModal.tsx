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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {type === "Esencia" ? <FlaskConical className="w-5 h-5 text-orange-500" /> : <Package className="w-5 h-5 text-indigo-500" />}
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs (only for Esencias) */}
                {type === "Esencia" && (
                    <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 px-5">
                        {(["Perfumería", "Limpia Pisos"] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`pb-3 pt-3 px-4 font-black text-sm transition-colors border-b-2 ${esenciaTab === tab
                                        ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                        : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    }`}
                            >
                                {tab === "Perfumería" ? "Perfumería Fina" : "Limpia Pisos"}
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 shrink-0">
                    <div className="relative group flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Buscar ${type.toLowerCase()}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>

                    {type === "Esencia" && esenciaTab === "Perfumería" && (
                        <>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={genderFilter}
                                    onChange={e => setGenderFilter(e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all text-slate-600 dark:text-slate-400"
                                >
                                    <option value="Todos">Género: Todos</option>
                                    {generos.filter(g => g.toLowerCase() !== "limpia pisos").map((g, idx) => (
                                        <option key={idx} value={g}>{g}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={providerFilter}
                                    onChange={e => setProviderFilter(e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all text-slate-600 dark:text-slate-400"
                                >
                                    <option value="Todos">Proveedor: Todos</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                        </>
                    )}

                    {type === "Esencia" && esenciaTab === "Limpia Pisos" && (
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all text-slate-600 dark:text-slate-400"
                            >
                                <option value="Todos">Categoría: Todos</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
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
                                className="w-full text-left p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isLP ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                                            type === "Esencia" ? "bg-orange-50 text-orange-600" : "bg-indigo-50 text-indigo-600"
                                        }`}>
                                        {type === "Esencia" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.provider && (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.provider}</p>
                                            )}
                                            {item.category && (
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isLP ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    }`}>
                                                    {item.category}
                                                </span>
                                            )}
                                            {gender && !isLP && (
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${gender === "Femenino" ? "bg-rose-50 text-rose-500" :
                                                        gender === "Masculino" ? "bg-indigo-50 text-indigo-500" :
                                                            "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                    }`}>
                                                    {gender}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Plus className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-all shrink-0" />
                            </button>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="py-12 text-center text-slate-400 font-bold text-sm">
                            No se encontraron resultados.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
