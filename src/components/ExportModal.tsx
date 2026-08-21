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

    const availableCategories = useMemo(() => {
        const catMap = new Map<string, string>();
        
        const addCat = (c: string) => {
            const trimmed = c.trim();
            if (!trimmed) return;
            const lower = trimmed.toLowerCase();
            // Conservar la versión que tenga mayúsculas si ya existe una todo en minúsculas
            if (!catMap.has(lower) || (trimmed !== lower && catMap.get(lower) === lower)) {
                catMap.set(lower, trimmed);
            }
        };

        productos.forEach(p => {
            if (p.category) addCat(p.category);
        });
        categorias.forEach(c => addCat(c.name));
        
        return Array.from(catMap.values()).sort();
    }, [productos, categorias]);

    const availableGenders = useMemo(() => {
        return generos.filter(g => {
            // Siempre mantener los estándares
            if (["Femenino", "Masculino", "Unisex", "Ambiente"].includes(g)) return true;
            
            // Filtrar si es redundante con alguna categoría (ej: "Limpia pisos" vs "Limpia pisos 5L", "Auto" vs "Auto")
            const gLower = g.toLowerCase();
            const isRedundant = availableCategories.some(c => 
                c.toLowerCase().includes(gLower) || gLower.includes(c.toLowerCase())
            );
            return !isRedundant;
        });
    }, [generos, availableCategories]);

    // Initialize with current page filters
    useEffect(() => {
        if (isOpen) {
            if (initialFilters.category && initialFilters.category !== "Todas") {
                setSelectedCategories([initialFilters.category]);
            } else {
                setSelectedCategories(availableCategories);
            }

            if (initialFilters.gender && initialFilters.gender !== "Todos") {
                setSelectedGenders([initialFilters.gender]);
            } else {
                setSelectedGenders(availableGenders);
            }

            setIncludeOutOfStock(initialFilters.showOutOfStock || false);
        }
    }, [isOpen, initialFilters, availableCategories, availableGenders]);

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
            
            if (isAmbient) {
                // Si seleccionó la categoría explícitamente, ignoramos el género (que suele estar mal cargado como 'Auto' o 'Muestrario')
                if (matchesCat) {
                    matchesGender = true;
                }
                // Si seleccionó el filtro general de "AMBIENTE", incluimos todos los ambientales
                else if (selectedGendersUpper.includes("AMBIENTE")) {
                    matchesGender = true;
                }
                // Si el producto es Unisex y hay *algún* género seleccionado, lo dejamos pasar por defecto
                else if (productGender === "UNISEX" && selectedGendersUpper.length > 0) {
                    matchesGender = true;
                }
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

    const selectAllCats = () => setSelectedCategories(availableCategories);
    const deselectAllCats = () => setSelectedCategories([]);
    const selectAllGenders = () => setSelectedGenders(availableGenders);
    const deselectAllGenders = () => setSelectedGenders([]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-500 my-auto flex flex-col max-h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                    <div>
                        <h3 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-3 font-brand">
                            {type === "excel" ? <FileSpreadsheet className="text-[#7D9878]" /> : <FileText className="text-[#C9866F]" />}
                            Exportar catálogo
                        </h3>
                        <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold text-sm mt-1">Configura qué productos incluir en el archivo.</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer" title="Cerrar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Categories */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                Categorías
                            </h4>
                            <div className="flex gap-4">
                                <button onClick={selectAllCats} className="text-[10px] font-black text-[#2C2C2C]/50 hover:text-[#7D9878] transition-colors">TODO</button>
                                <button onClick={deselectAllCats} className="text-[10px] font-black text-[#2C2C2C]/50 hover:text-[#C9866F] transition-colors">NADA</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {availableCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                                        selectedCategories.includes(cat)
                                        ? 'bg-[#7D9878]/15 border-[#7D9878] text-[#7D9878] dark:text-[#A3B69B] font-bold'
                                        : 'border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:bg-[#7D9878]/5'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                        selectedCategories.includes(cat)
                                        ? 'bg-[#7D9878] border-[#7D9878]'
                                        : 'border-[#E6DFD5] dark:border-[#353B33]'
                                    }`}>
                                        {selectedCategories.includes(cat) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-[11px] truncate">{cat}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Genres */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h4 className="text-xs font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                Géneros
                            </h4>
                            <div className="flex gap-4">
                                <button onClick={selectAllGenders} className="text-[10px] font-black text-[#2C2C2C]/50 hover:text-[#7D9878] transition-colors">TODO</button>
                                <button onClick={deselectAllGenders} className="text-[10px] font-black text-[#2C2C2C]/50 hover:text-[#C9866F] transition-colors">NADA</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableGenders.map(gen => (
                                <button
                                    key={gen}
                                    onClick={() => toggleGender(gen)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                                        selectedGenders.includes(gen)
                                        ? 'bg-[#7D9878]/15 border-[#7D9878] text-[#7D9878] dark:text-[#A3B69B] font-bold'
                                        : 'border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:bg-[#7D9878]/5'
                                    }`}
                                >
                                    <span className="text-[11px]">{gen}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Stock Toggle */}
                    <section className="pt-4 border-t border-[#E6DFD5] dark:border-[#353B33]">
                        <button 
                            onClick={() => setIncludeOutOfStock(!includeOutOfStock)}
                            className="flex items-center gap-3 p-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-2xl w-full border border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878] transition-all group"
                        >
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                                includeOutOfStock 
                                ? 'bg-[#7D9878] border-[#7D9878]' 
                                : 'border-[#E6DFD5] dark:border-[#353B33]'
                            }`}>
                                {includeOutOfStock && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-xs font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-widest">Incluir productos sin stock</span>
                        </button>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-8 bg-[#F9F6F0] dark:bg-[#1B1D1A] flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-[#E6DFD5] dark:border-[#353B33]">
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-black text-2xl font-brand">{filteredData.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Productos seleccionados</p>
                    </div>
                    
                    <button
                        onClick={() => onExport(filteredData, type)}
                        disabled={filteredData.length === 0}
                        className={`w-full sm:w-auto px-10 py-4 font-black rounded-2xl text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                            filteredData.length === 0
                            ? 'bg-[#E6DFD5] dark:bg-[#353B33] text-[#2C2C2C]/40 cursor-not-allowed shadow-none'
                            : type === 'excel'
                                ? 'bg-[#7D9878] text-white hover:bg-[#6b8566] shadow-[#7D9878]/20 active:scale-95'
                                : 'bg-[#C9866F] text-white hover:bg-[#b06f59] shadow-[#C9866F]/20 active:scale-95'
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
