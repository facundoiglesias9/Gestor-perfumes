"use client";

import { X, Check, FileSpreadsheet, FileText, Filter, CheckCircle2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Producto } from "@/context/AppContext";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (filteredData: Producto[], format: "excel" | "pdf") => void;
    productos: Producto[];
    categorias: { id: string; name: string }[];
    generos: string[];
    initialFilters: {
        category?: string;
        gender?: string;
        showOutOfStock?: boolean;
    };
    type: "excel" | "pdf";
}

export default function ExportModal({ 
    isOpen, 
    onClose, 
    onExport, 
    productos, 
    categorias, 
    generos,
    initialFilters,
    type
}: ExportModalProps) {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
    const [includeOutOfStock, setIncludeOutOfStock] = useState(false);

    // Initialize with current page filters
    useEffect(() => {
        if (isOpen) {
            if (initialFilters.category && initialFilters.category !== "Todas") {
                setSelectedCategories([initialFilters.category]);
            } else {
                setSelectedCategories(categorias.map(c => c.name));
            }

            if (initialFilters.gender && initialFilters.gender !== "Todos") {
                setSelectedGenders([initialFilters.gender]);
            } else {
                setSelectedGenders(generos);
            }

            setIncludeOutOfStock(initialFilters.showOutOfStock || false);
        }
    }, [isOpen, initialFilters, categorias, generos]);

    const filteredData = useMemo(() => {
        return productos.filter(p => {
            const productCat = (p.category || "").trim().toUpperCase();
            const productGender = (p.gender || "UNISEX").trim().toUpperCase();
            
            // Normalize selected arrays for safe comparison
            const selectedCatsUpper = selectedCategories.map(c => c.trim().toUpperCase());
            const selectedGendersUpper = selectedGenders.map(g => g.trim().toUpperCase());

            const matchesCat = selectedCatsUpper.includes(productCat);
            
            // Intelligence: If it's an ambient category, it usually only has "Unisex" or no gender.
            // We should allow it if the category is selected, even if the gender filter is active for perfumes.
            const isAmbient = productCat.includes("DIFUSOR") || 
                             productCat.includes("AUTO") || 
                             productCat.includes("LIMPIA") || 
                             productCat.includes("AMBIENTE");

            let matchesGender = selectedGendersUpper.includes(productGender);
            
            // If it's ambient and "Unisex", we include it if the user has at least one gender selected (logic: they want products)
            // or if the category is specifically selected.
            if (isAmbient && productGender === "UNISEX" && selectedGendersUpper.length > 0) {
                matchesGender = true;
            }

            const matchesStock = includeOutOfStock ? true : p.availabilityStatus !== "no-disponible";
            
            return matchesCat && matchesGender && matchesStock;
        });
    }, [productos, selectedCategories, selectedGenders, includeOutOfStock]);

    if (!isOpen) return null;

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const toggleGender = (gen: string) => {
        setSelectedGenders(prev => 
            prev.includes(gen) ? prev.filter(g => g !== gen) : [...prev, gen]
        );
    };

    const selectAllCats = () => setSelectedCategories(categorias.map(c => c.name));
    const deselectAllCats = () => setSelectedCategories([]);
    const selectAllGenders = () => setSelectedGenders(generos);
    const deselectAllGenders = () => setSelectedGenders([]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            {type === "excel" ? <FileSpreadsheet className="text-emerald-500" /> : <FileText className="text-rose-500" />}
                            Exportar catálogo
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">Configura qué productos incluir en el archivo.</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Categories */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                Categorías
                            </h4>
                            <div className="flex gap-4">
                                <button onClick={selectAllCats} className="text-[10px] font-black text-slate-400 hover:text-indigo-500 transition-colors">TODO</button>
                                <button onClick={deselectAllCats} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors">NADA</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {categorias.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.name)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                        selectedCategories.includes(cat.name)
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold'
                                        : 'border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                        selectedCategories.includes(cat.name)
                                        ? 'bg-indigo-500 border-indigo-500'
                                        : 'border-slate-300 dark:border-slate-700'
                                    }`}>
                                        {selectedCategories.includes(cat.name) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-[11px] truncate">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Genres */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                Géneros
                            </h4>
                            <div className="flex gap-4">
                                <button onClick={selectAllGenders} className="text-[10px] font-black text-slate-400 hover:text-indigo-500 transition-colors">TODO</button>
                                <button onClick={deselectAllGenders} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors">NADA</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {generos.map(gen => (
                                <button
                                    key={gen}
                                    onClick={() => toggleGender(gen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                                        selectedGenders.includes(gen)
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold'
                                        : 'border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <span className="text-[11px]">{gen}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Stock Toggle */}
                    <section className="pt-4 border-t border-slate-100 dark:border-white/5">
                        <button 
                            onClick={() => setIncludeOutOfStock(!includeOutOfStock)}
                            className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl w-full border border-slate-100 dark:border-white/5 hover:border-indigo-200 transition-all group"
                        >
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                                includeOutOfStock 
                                ? 'bg-indigo-600 border-indigo-600' 
                                : 'border-slate-300 dark:border-slate-700'
                            }`}>
                                {includeOutOfStock && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Incluir productos sin stock</span>
                        </button>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 dark:bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-slate-900 dark:text-white font-black text-2xl">{filteredData.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Productos seleccionados</p>
                    </div>
                    
                    <button
                        onClick={() => onExport(filteredData, type)}
                        disabled={filteredData.length === 0}
                        className={`w-full sm:w-auto px-10 py-4 font-black rounded-2xl text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                            filteredData.length === 0
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                            : type === 'excel'
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 active:scale-95'
                                : 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20 active:scale-95'
                        }`}
                    >
                        {type === 'excel' ? <FileSpreadsheet className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        {type === 'excel' ? 'Exportar Excel' : 'Exportar PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
