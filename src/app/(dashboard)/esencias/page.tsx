"use client";

import { Search, Plus, Filter, FlaskConical, Trash2, X, Edit2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Droplet, Wind, Check, Download, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import AIExtractModal from "@/components/AIExtractModal";
import { Esencia } from "@/context/AppContext";
import { exportMultiSheetExcel } from "@/lib/export-utils";
import PaginationControls from "@/components/PaginationControls";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TituloGrupo, opcion, ETIQUETA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { Selector } from "@/components/Desplegable";
import Buscador from "@/components/Buscador";

export default function EsenciasPage() {
    const { esencias, setEsencias, insumos, categorias, proveedores, scraperStatus, runScraper, generos, bases, setBases, productos, setProductos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [priceFilter, setPriceFilter] = useState("Todos");
    const [providerFilter, setProviderFilter] = useState("Todos");
    const [categoryFilter, setCategoryFilter] = useState("Todos");
    const [activeTab, setActiveTab] = useState<"Perfumería" | "Ambiente">("Perfumería");
    const [currentPage, setCurrentPage] = useState(1);
    const [isInitialMount, setIsInitialMount] = useState(true);
    const [isCustomProvider, setIsCustomProvider] = useState(false);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const itemsPerPage = 10;
    const [hasRanMassUpdate, setHasRanMassUpdate] = useState(false);

    // Massive update for "Ambiente" essences to have both "Esencia de Ambiente" and "Difusor"
    useEffect(() => {
        if (!hasRanMassUpdate && esencias.length > 0) {
            let updated = false;
            const newEsencias = esencias.map(e => {
                if (e.gender === "Ambiente") {
                    const currentCats = e.category ? e.category.split(", ").map(c => c.trim()) : [];
                    let modified = false;
                    if (!currentCats.includes("Difusor")) { currentCats.push("Difusor"); modified = true; }
                    if (!currentCats.includes("Auto")) { currentCats.push("Auto"); modified = true; }
                    
                    if (modified) {
                        updated = true;
                        return { ...e, category: currentCats.filter(c => c !== "Esencia de Ambiente" && c !== "").join(", ") };
                    }
                }
                return e;
            });

            if (updated) {
                setEsencias(newEsencias);
            }
            setHasRanMassUpdate(true);
        }
    }, [esencias, hasRanMassUpdate, setEsencias]);

    // Load page from localStorage on mount
    useEffect(() => {
        const savedPage = localStorage.getItem('esencias_page');
        if (savedPage) {
            const pageNum = parseInt(savedPage);
            if (!isNaN(pageNum)) setCurrentPage(pageNum);
        }
        setIsInitialMount(false);
    }, []);

    // Save page to localStorage on change
    useEffect(() => {
        if (!isInitialMount) {
            localStorage.setItem('esencias_page', currentPage.toString());
        }
    }, [currentPage, isInitialMount]);

    // Reset pagination on filter change (only after initial mount)
    useEffect(() => {
        if (!isInitialMount) {
            setCurrentPage(1);
        }
    }, [searchTerm, genderFilter, priceFilter, providerFilter, isInitialMount]);

    const [formData, setFormData] = useState({
        name: "",
        category: "Perfumería Fina",
        gender: "Femenino",
        provider: "Van Rossum",
        cost: "",
        qty: ""
    });

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

        // Asignaciones fijas para categorías y proveedores conocidos
        if (s.includes('perfumer')) colorObj = colorsMap.violet;
        else if (s.includes('limpia pisos 1l') || s.includes('limpia pisos 1 l')) colorObj = colorsMap.indigo;
        else if (s.includes('limpia pisos 5l') || s.includes('limpia pisos 5 l')) colorObj = colorsMap.amber;
        else if (s.includes('limpia') || s.includes('piso')) colorObj = colorsMap.cyan;
        else if (s.includes('aromatizante') || s.includes('auto')) colorObj = colorsMap.orange;
        else if (s.includes('difusor')) colorObj = colorsMap.rose;
        else if (s.includes('textil')) colorObj = colorsMap.emerald;
        else if (s.includes('esencia')) colorObj = colorsMap.fuchsia;
        else if (s === 'ambiente') colorObj = colorsMap.indigo;
        else if (s === 'femenino' || s === 'femenina') colorObj = colorsMap.rose;
        else if (s === 'masculino') colorObj = colorsMap.blue;
        else if (s === 'unisex') colorObj = colorsMap.teal;
        else if (s.includes('mercado libre') || s.includes('ml')) colorObj = colorsMap.blue;
        else if (s.includes('multi-envase') || s.includes('multienvase')) colorObj = colorsMap.lime;
        else if (s.includes('ezentie')) colorObj = colorsMap.teal;
        else if (s.includes('pura vida')) colorObj = colorsMap.fuchsia;
        else if (s.includes('van rossum')) colorObj = colorsMap.orange;
        else {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            hash = Math.abs(hash);
            colorObj = colorList[hash % colorList.length];
        }

        return isBadge ? colorObj.badge : colorObj.bg;
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const oldEsencia = esencias.find(e => e.id === editingId);
            const nameChanged = oldEsencia && oldEsencia.name !== formData.name;

            setEsencias(esencias.map(e_item => e_item.id === editingId ? {
                ...e_item,
                name: formData.name,
                category: formData.category,
                gender: formData.gender,
                provider: formData.provider,
                cost: parseFloat(formData.cost),
                qty: parseFloat(formData.qty)
            } : e_item));

            if (nameChanged) {
                const updatedBases = bases.map(base => {
                    const hasComponent = base.components.some(c => c.type === "Esencia" && c.id === editingId);
                    if (!hasComponent) return base;
                    return {
                        ...base,
                        components: base.components.map(c =>
                            c.type === "Esencia" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setBases(updatedBases);

                const updatedProductos = productos.map(prod => {
                    const hasComponent = prod.components.some(c => c.type === "Esencia" && c.id === editingId);
                    if (!hasComponent) return prod;
                    return {
                        ...prod,
                        components: prod.components.map(c =>
                            c.type === "Esencia" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setProductos(updatedProductos);
            }

            setEditingId(null);
        } else {
            setEsencias([
                {
                    id: getNextId(esencias, "E-"),
                    name: formData.name,
                    category: formData.category,
                    gender: formData.gender,
                    provider: formData.provider,
                    cost: parseFloat(formData.cost),
                    qty: parseFloat(formData.qty),
                    source: "manual"
                },
                ...esencias
            ]);
        }

        setFormData({ name: "", category: "Perfumería Fina", gender: "Femenino", provider: "Van Rossum", cost: "", qty: "" });
        setIsAddModalOpen(false);
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            name: "",
            category: activeTab === "Ambiente" ? "Esencia de Ambiente" : "Perfumería Fina",
            gender: activeTab === "Ambiente" ? "Ambiente" : "Femenino",
            provider: "Van Rossum",
            cost: "",
            qty: ""
        });
        setIsCustomProvider(false);
        setIsCustomCategory(false);
        setIsAddModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setEditingId(item.id);
        const catValue = item.category || "Perfumería Fina";
        const provValue = item.provider || "Van Rossum";
        setFormData({
            name: item.name,
            category: catValue,
            gender: item.gender || (item.category?.toLowerCase().includes("femenina") ? "Femenino" : "Masculino"),
            provider: provValue,
            cost: item.cost.toString(),
            qty: item.qty.toString()
        });
        setIsCustomCategory(false);
        setIsCustomProvider(!proveedores.some(p => p.name === provValue));
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", category: "Perfumería Fina", gender: "Femenino", provider: "Van Rossum", cost: "", qty: "" });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setEsencias(esencias.filter(e => e.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    const handleExportEsencias = () => {
        const perfumeriaData = esencias.filter(e => {
            const isLimpiaPisos = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
            const isAmbiente = e.gender?.toLowerCase() === "ambiente" || e.category?.toLowerCase()?.includes("ambiente");
            return !isLimpiaPisos && !isAmbiente;
        }).map(e => ({
            "Nombre": e.name,
            "Género": e.gender,
            "Categoría": e.category,
            "Proveedor": e.provider,
            "Precio 30g": typeof e.price30g === "number" ? `$${e.price30g.toLocaleString('es-AR')}` : "Consultar",
            "Precio 100g": typeof e.price100g === "number" ? `$${e.price100g.toLocaleString('es-AR')}` : "Consultar"
        }));

        const limpiaPisosData = esencias.filter(e => {
            return e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
        }).map(e => ({
            "Nombre": e.name,
            "Género": e.gender,
            "Categoría": e.category,
            "Proveedor": e.provider,
            "Costo": typeof e.cost === "number" ? `$${e.cost.toLocaleString('es-AR')}` : "-",
            "Stock (ml)": `${e.qty || 0} ml`
        }));

        const ambienteData = esencias.filter(e => {
            return e.gender?.toLowerCase() === "ambiente" || e.category?.toLowerCase()?.includes("ambiente");
        }).map(e => ({
            "Nombre": e.name,
            "Género": e.gender,
            "Categoría": e.category,
            "Proveedor": e.provider,
            "Precio 100g": typeof e.price100g === "number" ? `$${e.price100g.toLocaleString('es-AR')} ${e.price100gUsd ? `(u$s ${e.price100gUsd})` : ''}` : "Consultar",
            "Precio 250g": typeof e.price250g === "number" ? `$${e.price250g.toLocaleString('es-AR')} ${e.price250gUsd ? `(u$s ${e.price250gUsd})` : ''}` : "Consultar"
        }));

        const sheets = [
            { sheetName: "Perfumería Fina", title: "Scenta - Esencias: Perfumería Fina", data: perfumeriaData },
            { sheetName: "Limpia Pisos", title: "Scenta - Esencias: Limpia Pisos", data: limpiaPisosData },
            { sheetName: "Ambiente", title: "Scenta - Esencias: Ambiente", data: ambienteData }
        ];

        exportMultiSheetExcel(sheets, "Esencias_Scenta");
    };

    const filteredEsencias = useMemo(() => {
        return esencias.filter(e => {
            const isAmbiente = e.gender?.toLowerCase() === "ambiente" || e.category?.toLowerCase()?.includes("ambiente");
            const isPerfumeria = !isAmbiente;

            if (activeTab === "Perfumería" && !isPerfumeria) return false;
            if (activeTab === "Ambiente" && !isAmbiente) return false;

            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (activeTab === "Ambiente") {
                const matchesCategory = categoryFilter === "Todos" || (e.category?.toLowerCase()?.includes(categoryFilter.toLowerCase()));
                return matchesSearch && matchesCategory;
            }

            const genderValue = e.gender || (e.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
            const matchesGender = genderFilter === "Todos" || genderValue === genderFilter;

            const isConsultar = e.price30g === "consultar" || e.price100g === "consultar";
            const matchesPrice = priceFilter === "Todos" || (priceFilter === "Consultar" && isConsultar);

            const matchesProvider = providerFilter === "Todos" || (e.provider === providerFilter);

            return matchesSearch && matchesGender && matchesPrice && matchesProvider;
        });
    }, [esencias, searchTerm, genderFilter, priceFilter, providerFilter, categoryFilter, activeTab]);

    const totalPages = Math.ceil(filteredEsencias.length / itemsPerPage);
    const paginatedEsencias = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEsencias.slice(start, start + itemsPerPage);
    }, [filteredEsencias, currentPage]);

    return (
        <div className="space-y-8 pb-12 anim-entrada relative">
            <header className="flex flex-col items-center text-center gap-6 bg-white dark:bg-[#242723] p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300">
                <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Base Líquida
                        </div>

                        {activeTab === "Perfumería" && (
                            <div className="group relative">
                                <div className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#242723] shadow-sm ${scraperStatus.status === "success" ? "bg-[#7D9878] animate-pulse" :
                                    scraperStatus.status === "failure" ? "bg-[#C9866F]" :
                                        scraperStatus.status === "loading" ? "bg-[#DAC4AA] animate-spin border-dashed" :
                                            "bg-[#353B33]"
                                    }`} />
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50">
                                    <div className="bg-[#1B1D1A] text-[#F4EFEA] text-[10px] font-bold px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-[#353B33]">
                                        {scraperStatus.status === "success" && `Sincronización Exitosa: ${scraperStatus.lastRun}`}
                                        {scraperStatus.status === "failure" && `Error en Scraping: ${scraperStatus.message || "Fallo desconocido"}`}
                                        {scraperStatus.status === "loading" && "Sincronizando con Van Rossum..."}
                                        {scraperStatus.status === "idle" && "Sin sincronizar todavía"}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand">
                        Materia Prima: Esencias
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg leading-relaxed font-medium transition-colors">
                        Catálogo de componentes olfativos con sincronización diaria de precios.
                    </p>
                    <div className="pt-1">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 font-black text-xs uppercase tracking-widest">
                            <Sparkles className="w-3.5 h-3.5" />
                            {filteredEsencias.length} Esencias Encontradas
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={handleExportEsencias}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] font-bold hover:bg-[#7D9878]/10 shadow-sm border border-[#E6DFD5] dark:border-[#353B33] active:scale-95 transition"
                    >
                        <Download className="w-5 h-5" strokeWidth={2.5} />
                        Exportar Excel
                    </button>
                    {activeTab === "Perfumería" && (
                        <button
                            onClick={runScraper}
                            disabled={scraperStatus.status === "loading"}
                            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#7D9878]/10 transition disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${scraperStatus.status === "loading" ? "animate-spin" : ""}`} strokeWidth={2.5} />
                            Sincronizar
                        </button>
                    )}
                    {activeTab === "Ambiente" && (
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] font-bold hover:bg-[#7D9878]/20 transition border border-[#7D9878]/20"
                        >
                            <Search className="w-5 h-5" strokeWidth={2.5} />
                            Escanear PDF / Captura
                        </button>
                    )}
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Agregar Esencia
                    </button>
                </div>
            </header>

            <AIExtractModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                onConfirm={(newEsencias: Esencia[]) => {
                    setEsencias(prev => {
                        const merged = [...prev];

                        const normalize = (val: string) => {
                            return val?.trim().toLowerCase().replace(/\s+/g, ' ') || "";
                        };

                        newEsencias.forEach(newE => {
                            // Si es ambiente, auto-asignamos categorías requeridas si no las tiene
                            if (newE.gender === "Ambiente") {
                                const currentCats = newE.category ? newE.category.split(", ").map(c => c.trim()) : [];
                                if (!currentCats.includes("Difusor")) currentCats.push("Difusor");
                                if (!currentCats.includes("Auto")) currentCats.push("Auto");
                                newE.category = currentCats.filter(c => c !== "Esencia de Ambiente").join(", ");
                            }

                            const newNorm = normalize(newE.name);
                            // Rastrear TODOS los clones viejos que encuentre bajo el mismo nombre
                            const matchingIndices = merged
                                .map((e, idx) =>
                                    normalize(e.name) === newNorm &&
                                        (e.category?.includes("Ambiente") || e.category === newE.category || e.gender === "Ambiente")
                                        ? idx : -1
                                )
                                .filter(idx => idx !== -1);

                            if (matchingIndices.length > 0) {
                                // Actualizar el primer match y conservar su ID original
                                const firstIdx = matchingIndices[0];
                                merged[firstIdx] = { ...merged[firstIdx], ...newE, id: merged[firstIdx].id };

                                // Si hay más de un clon antiguo de este producto, marcar los sobrantes para eliminarlos
                                if (matchingIndices.length > 1) {
                                    for (let i = 1; i < matchingIndices.length; i++) {
                                        (merged[matchingIndices[i]] as any)._toBeDeleted = true;
                                    }
                                }
                            } else {
                                merged.push({
                                    ...newE,
                                    id: getNextId(merged, "E-")
                                });
                            }
                        });

                        // Eliminar definitivamente los sobrantes del array, esto forzará un delete en Supabase
                        return merged.filter(e => !(e as any)._toBeDeleted);
                    });
                    setIsAIModalOpen(false);
                }}
            />

            {/* Tabs Style Apple / Segmented Control Centered */}
            <div className="flex justify-center my-6">
                <div className="flex bg-[#F9F6F0] dark:bg-[#1B1D1A] p-1.5 rounded-2xl w-fit shadow-inner border border-[#E6DFD5] dark:border-[#353B33]">
                    <button
                        onClick={() => { setActiveTab("Perfumería"); setCurrentPage(1); }}
                        className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition duration-200 ${activeTab === "Perfumería"
                            ? "bg-[#7D9878] text-white shadow-md font-black hover:scale-[1.02]"
                            : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                    >
                        <FlaskConical className={`w-4 h-4 transition-transform duration-300 ${activeTab === "Perfumería" ? "scale-110" : ""}`} />
                        Perfumería Fina
                    </button>
                    <button
                        onClick={() => { setActiveTab("Ambiente"); setCurrentPage(1); }}
                        className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition duration-200 ${activeTab === "Ambiente"
                            ? "bg-[#7D9878] text-white shadow-md font-black hover:scale-[1.02]"
                            : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:text-[#7D9878]"
                            }`}
                    >
                        <Wind className={`w-4 h-4 transition-transform duration-300 ${activeTab === "Ambiente" ? "scale-110" : ""}`} />
                        Esencia de Ambiente
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <Buscador
                    valor={searchTerm}
                    onCambiar={v => setSearchTerm(v)}
                    placeholder="Buscar esencia por nombre..."
                    alto="lg"
                    fondo="crema"
                    className="flex-1"
                />

                {activeTab === "Perfumería" ? (
                    <>
                        <div className="relative min-w-[200px]">
                            <Selector
                                icono={<Filter className="w-4 h-4" />}
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value)}
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-11 pr-10 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-[#7D9878] transition"
                            >
                                <option value="Todos">Género: Todos</option>
                                {generos.map((g, idx) => (
                                    <option key={idx} value={g}>{g}</option>
                                ))}
                            </Selector>
                        </div>

                        <div className="relative min-w-[200px]">
                            <Selector
                                icono={<Filter className="w-4 h-4" />}
                                value={providerFilter}
                                onChange={(e) => setProviderFilter(e.target.value)}
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-11 pr-10 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-[#7D9878] transition"
                            >
                                <option value="Todos">Proveedor: Todos</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </Selector>
                        </div>

                        <div className="relative min-w-[200px]">
                            <Selector
                                icono={<Filter className="w-4 h-4" />}
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-11 pr-10 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-[#7D9878] transition"
                            >
                                <option value="Todos">Precios: Todos</option>
                                <option value="Consultar">Solo Consultar</option>
                            </Selector>
                        </div>
                    </>
                ) : (
                    <div className="relative min-w-[200px]">
                        <Selector
                            icono={<Filter className="w-4 h-4" />}
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-4 pl-11 pr-10 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-[#7D9878] transition"
                        >
                            <option value="Todos">Categoría: Todos</option>
                            {categorias.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </Selector>
                    </div>
                )}
            </div>

            {/* Contador Resultante de Esencias */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-1">
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                    <FlaskConical className="w-4 h-4 text-[#7D9878]" />
                    <span>Total esencias encontradas: <strong className="text-[#7D9878] dark:text-[#A3B69B] text-sm font-black">{filteredEsencias.length}</strong></span>
                </div>
                <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-medium">
                    {searchTerm ? `Resultados para "${searchTerm}"` : `Mostrando catálogo de ${activeTab}`}
                </span>
            </div>

            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1000px]">
                    <thead>
                        <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                            <th className="px-6 py-6 text-left text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest min-w-[250px]">Nombre de Esencia</th>
                            <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Género</th>
                            <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Categoría</th>
                            <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">Proveedor</th>
                            {activeTab === "Perfumería" && (
                                <>
                                    <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">30 Gramos</th>
                                    <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">100 Gramos</th>
                                </>
                            )}
                            {activeTab === "Ambiente" && (
                                <>
                                    <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">100 Gramos</th>
                                    <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest">250 Gramos</th>
                                </>
                            )}
                            <th className="px-6 py-6 text-right text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pr-12">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                        {paginatedEsencias.map((item, idx) => {
                            const gender = item.gender || (item.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
                            const isFemale = gender === "Femenino";
                            return (
                                <tr key={idx} className="group hover:bg-[#7D9878]/5 transition-colors">
                                    <td className="px-6 py-6 text-left">
                                        <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-extrabold text-lg group-hover:text-[#7D9878] transition-colors line-clamp-2">{item.name}</p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(gender, true)}`}>
                                            {gender}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex flex-col items-center gap-1.5 min-w-[140px] mx-auto">
                                            {(item.category || "Perfumería Fina")
                                                .split(", ")
                                                .filter(cat => 
                                                    cat === "Perfumería Fina" || 
                                                    categorias.some(c => c.name.trim().toLowerCase() === cat.trim().toLowerCase())
                                                )
                                                .map((cat, cIdx) => (
                                                    <span key={cIdx} className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest border whitespace-nowrap shadow-sm ${getColorClass(cat, true)}`}>
                                                        {cat}
                                                    </span>
                                                ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                                            <span className={`w-2 h-2 rounded-full ${getColorClass(item.provider || "Van Rossum", false)} shadow-sm`}></span>
                                            <span className="text-slate-700 dark:text-slate-300 font-bold text-sm whitespace-nowrap">{item.provider || "Van Rossum"}</span>
                                        </div>
                                    </td>
                                    {activeTab === "Perfumería" && (
                                        <>
                                            <td className="px-6 py-6 text-center">
                                                <p className={`font-black text-lg ${item.price30g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100 drop-shadow-sm"}`}>
                                                    {typeof item.price30g === "number" ? `$${item.price30g.toLocaleString()}` : "Consultar"}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <p className={`font-black text-lg ${item.price100g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100 drop-shadow-sm"}`}>
                                                    {typeof item.price100g === "number" ? `$${item.price100g.toLocaleString()}` : "Consultar"}
                                                </p>
                                            </td>
                                        </>
                                    )}
                                    {activeTab === "Ambiente" && (
                                        <>
                                            <td className="px-6 py-6 text-center">
                                                {item.price100gUsd ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tabular-nums drop-shadow-sm">
                                                            ${(item.price100g || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                                                            (u$s {item.price100gUsd.toLocaleString()})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className={`font-black text-lg ${item.price100g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100 tabular-nums drop-shadow-sm"}`}>
                                                        {typeof item.price100g === "number" ? `$${item.price100g.toLocaleString()}` : "Consultar"}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                {item.price250gUsd ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tabular-nums drop-shadow-sm">
                                                            ${(item.price250g || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                                                            (u$s {item.price250gUsd.toLocaleString()})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <p className={`font-black text-lg ${item.price250g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100 tabular-nums drop-shadow-sm"}`}>
                                                        {typeof item.price250g === "number" ? `$${item.price250g.toLocaleString()}` : "Consultar"}
                                                    </p>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-6 text-right pr-12">
                                        <div className="flex items-center justify-end gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(item.id)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredEsencias.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                    No se encontraron esencias con estos filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI */}
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
            />

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Esencia"
                message="¿Estás seguro de que deseas eliminar esta esencia? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            <Ventana abierta={isAddModalOpen} onCerrar={handleCloseModal} cerrarAlTocarFondo={false} etiqueta={editingId ? "Editar esencia" : "Nueva esencia"}>
            {isAddModalOpen && (() => {
                    const esLiquido = formData.gender?.toLowerCase()?.includes("limpia") || formData.gender?.toLowerCase()?.includes("ambiente");
                    const categoriasElegidas = formData.category ? formData.category.split(", ").filter(c => c !== "") : [];
                    const alternarCategoria = (nombre: string) => {
                        const nuevas = categoriasElegidas.includes(nombre)
                            ? categoriasElegidas.filter(c => c !== nombre)
                            : [...categoriasElegidas, nombre];
                        setFormData({ ...formData, category: nuevas.join(", ") });
                    };
                    return (
                    <PanelVentana ancho="md">
                        <CabeceraVentana
                            etiqueta={editingId ? "Editar esencia" : "Nueva esencia"}
                            titulo={formData.name.trim() || "Sin nombre"}
                            descripcion="Materia prima: género, proveedor, costo y stock."
                            icono={FlaskConical}
                            onCerrar={handleCloseModal}
                        />

                        <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana className="space-y-6">
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Nombre</span>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Lavanda Premium"
                                        className={CAMPO}
                                    />
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Género o uso</span>
                                        <span className="relative block">
                                            <Selector
                                                required
                                                value={formData.gender}
                                                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                                className={`${CAMPO} pr-9 appearance-none cursor-pointer`}
                                            >
                                                <option value="">Elegí uno</option>
                                                {generos.map((g, idx) => (
                                                    <option key={idx} value={g}>{g}</option>
                                                ))}
                                            </Selector>
                                        </span>
                                    </label>

                                    <div>
                                        <span className={ETIQUETA_CAMPO}>Proveedor</span>
                                        {isCustomProvider ? (
                                            <span className="relative block">
                                                <input
                                                    required
                                                    type="text"
                                                    autoFocus
                                                    aria-label="Nombre del proveedor nuevo"
                                                    value={formData.provider}
                                                    onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                                    className={`${CAMPO} pr-11`}
                                                    placeholder="Nombre del proveedor"
                                                />
                                                <button
                                                    type="button"
                                                    title="Volver a la lista"
                                                    aria-label="Volver a la lista de proveedores"
                                                    onClick={() => {
                                                        setIsCustomProvider(false);
                                                        setFormData({ ...formData, provider: proveedores[0]?.name || "" });
                                                    }}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/10 transition-colors duration-150"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="relative block">
                                                <Selector
                                                    required
                                                    aria-label="Proveedor"
                                                    value={proveedores.some(p => p.name === formData.provider) ? formData.provider : (formData.provider && !proveedores.some(p => p.name === formData.provider) ? "__CUSTOM__" : "")}
                                                    onChange={e => {
                                                        if (e.target.value === "__CUSTOM__") {
                                                            setIsCustomProvider(true);
                                                            setFormData({ ...formData, provider: "" });
                                                        } else {
                                                            setFormData({ ...formData, provider: e.target.value });
                                                        }
                                                    }}
                                                    className={`${CAMPO} pr-9 appearance-none cursor-pointer`}
                                                >
                                                    <option value="" disabled>Elegí uno</option>
                                                    {proveedores.map((p, idx) => (
                                                        <option key={idx} value={p.name}>{p.name}</option>
                                                    ))}
                                                    <option value="__CUSTOM__">+ Otro proveedor…</option>
                                                </Selector>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <section>
                                    <TituloGrupo>Presentaciones donde se usa</TituloGrupo>
                                    <div className="flex flex-wrap gap-2">
                                        {categorias.map(cat => {
                                            const elegida = categoriasElegidas.includes(cat.name);
                                            return (
                                                <button key={cat.id} type="button" aria-pressed={elegida} onClick={() => alternarCategoria(cat.name)} className={opcion(elegida)}>
                                                    {elegida && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                    {cat.name}
                                                </button>
                                            );
                                        })}
                                        {/* Categorías escritas a mano que no están en la lista */}
                                        {categoriasElegidas.filter(c => !categorias.some(cat => cat.name === c)).map(c => (
                                            <button key={c} type="button" aria-pressed onClick={() => alternarCategoria(c)} className={opcion(true)}>
                                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                {c}
                                            </button>
                                        ))}
                                        {!isCustomCategory && (
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomCategory(true)}
                                                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-dashed border-[#2C2C2C]/20 dark:border-[#F4EFEA]/20 text-sm font-medium text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#5A7356] dark:hover:text-[#A3B69B] hover:border-[#7D9878] transition-colors duration-150"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Otra
                                            </button>
                                        )}
                                    </div>
                                    {isCustomCategory && (
                                        <div className="mt-3 flex gap-2 anim-entrada">
                                            <input
                                                type="text"
                                                placeholder="Nombre de la presentación y Enter"
                                                aria-label="Nueva presentación"
                                                autoFocus
                                                className={CAMPO}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        const val = (e.target as HTMLInputElement).value.trim();
                                                        if (val) {
                                                            if (!categoriasElegidas.includes(val)) {
                                                                setFormData({ ...formData, category: [...categoriasElegidas, val].join(", ") });
                                                            }
                                                            (e.target as HTMLInputElement).value = "";
                                                            setIsCustomCategory(false);
                                                        }
                                                    } else if (e.key === "Escape") {
                                                        e.stopPropagation();
                                                        setIsCustomCategory(false);
                                                    }
                                                }}
                                            />
                                            <button type="button" onClick={() => setIsCustomCategory(false)} className={BOTON_SECUNDARIO}>
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </section>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>{esLiquido ? "Costo por litro" : "Costo de 30 g"}</span>
                                        <span className="relative block">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">$</span>
                                            <input
                                                required
                                                type="number"
                                                value={formData.cost}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                                className={`${CAMPO} pl-8 tabular-nums`}
                                            />
                                        </span>
                                    </label>
                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Stock actual</span>
                                        <span className="relative block">
                                            <input
                                                required
                                                type="number"
                                                value={formData.qty}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                                className={`${CAMPO} pr-10 text-right tabular-nums`}
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">
                                                {esLiquido ? "ml" : "g"}
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </CuerpoVentana>

                            <PieVentana>
                                <button type="button" onClick={handleCloseModal} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    {editingId ? "Guardar cambios" : "Crear esencia"}
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
                    );
            })()}
            </Ventana>
        </div>
    );
}
