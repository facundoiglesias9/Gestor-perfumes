"use client";

import { Search, Plus, Filter, FlaskConical, Trash2, X, Edit2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Droplet } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import AIExtractModal from "@/components/AIExtractModal";
import { Esencia } from "@/context/AppContext";

export default function EsenciasPage() {
    const { esencias, setEsencias, categorias, proveedores, scraperStatus, runScraper, generos, bases, setBases, productos, setProductos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [priceFilter, setPriceFilter] = useState("Todos");
    const [providerFilter, setProviderFilter] = useState("Todos");
    const [categoryFilter, setCategoryFilter] = useState("Todos");
    const [activeTab, setActiveTab] = useState<"Perfumería" | "Limpia Pisos">("Perfumería");
    const [currentPage, setCurrentPage] = useState(1);
    const [isInitialMount, setIsInitialMount] = useState(true);
    const [isCustomProvider, setIsCustomProvider] = useState(false);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const itemsPerPage = 10;

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
            category: activeTab === "Limpia Pisos" ? "Limpia pisos" : "Perfumería Fina",
            gender: activeTab === "Limpia Pisos" ? "Limpia pisos" : "Femenino",
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
        setIsCustomCategory(!categorias.some(c => c.name === catValue));
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

    const filteredEsencias = useMemo(() => {
        return esencias.filter(e => {
            const isLimpiaPisos = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
            if (activeTab === "Perfumería" && isLimpiaPisos) return false;
            if (activeTab === "Limpia Pisos" && !isLimpiaPisos) return false;

            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (activeTab === "Limpia Pisos") {
                const matchesCategory = categoryFilter === "Todos" || (e.category?.toLowerCase() === categoryFilter.toLowerCase());
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
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-bold tracking-widest uppercase">
                            <FlaskConical className="w-3.5 h-3.5" />
                            Base Líquida
                        </div>

                        <div className="group relative">
                            <div className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${scraperStatus.status === "success" ? "bg-emerald-500 animate-pulse" :
                                scraperStatus.status === "failure" ? "bg-rose-500" :
                                    scraperStatus.status === "loading" ? "bg-amber-500 animate-spin border-dashed" :
                                        "bg-slate-300"
                                }`} />
                            <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50">
                                <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                                    {scraperStatus.status === "success" && `Sincronización Exitosa: ${scraperStatus.lastRun}`}
                                    {scraperStatus.status === "failure" && `Error en Scraping: ${scraperStatus.message || "Fallo desconocido"}`}
                                    {scraperStatus.status === "loading" && "Sincronizando con Van Rossum..."}
                                    {scraperStatus.status === "idle" && "Sin sincronizar todavía"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Materia Prima: Esencias
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Catálogo de componentes olfativos con sincronización diaria de precios.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={runScraper}
                        disabled={scraperStatus.status === "loading"}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${scraperStatus.status === "loading" ? "animate-spin" : ""}`} strokeWidth={2.5} />
                        Sincronizar
                    </button>
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20"
                    >
                        <Search className="w-5 h-5" strokeWidth={2.5} />
                        Escanear PDF / Captura
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/20 active:scale-95 transition-all"
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
                    setEsencias([...newEsencias, ...esencias]);
                    setIsAIModalOpen(false);
                }}
            />

            {/* Tabs Style Apple / Segmented Control */}
            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit mb-8 shadow-inner border border-slate-200/50 dark:border-slate-800">
                <button
                    onClick={() => { setActiveTab("Perfumería"); setCurrentPage(1); }}
                    className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "Perfumería"
                            ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-[0_2px_10px_rgb(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] ring-1 ring-slate-200/50 dark:ring-slate-700 hover:scale-[1.02]"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                >
                    <FlaskConical className={`w-4 h-4 transition-transform duration-300 ${activeTab === "Perfumería" ? "scale-110" : ""}`} />
                    Perfumería Fina
                </button>
                <button
                    onClick={() => { setActiveTab("Limpia Pisos"); setCurrentPage(1); }}
                    className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === "Limpia Pisos"
                            ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_10px_rgb(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgb(0,0,0,0.2)] ring-1 ring-slate-200/50 dark:ring-slate-700 hover:scale-[1.02]"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                >
                    <Droplet className={`w-4 h-4 transition-transform duration-300 ${activeTab === "Limpia Pisos" ? "scale-110" : ""}`} />
                    Limpia Pisos
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-orange-500 dark:group-focus-within:text-orange-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar esencia por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-semibold"
                    />
                </div>

                {activeTab === "Perfumería" ? (
                    <>
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={genderFilter}
                                onChange={(e) => setGenderFilter(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                                <option value="Todos">Género: Todos</option>
                                {generos.map((g, idx) => (
                                    <option key={idx} value={g}>{g}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={providerFilter}
                                onChange={(e) => setProviderFilter(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                                <option value="Todos">Proveedor: Todos</option>
                                {proveedores.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>

                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            >
                                <option value="Todos">Precios: Todos</option>
                                <option value="Consultar">Solo Consultar</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </>
                ) : (
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                            <option value="Todos">Categoría: Todos</option>
                            {categorias.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[1000px]">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest min-w-[250px]">Nombre de Esencia</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Género</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">Categoría</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Proveedor</th>
                            {activeTab === "Perfumería" ? (
                                <>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">30 Gramos</th>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">100 Gramos</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Costo</th>
                                    <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Stock (ml)</th>
                                </>
                            )}
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right pr-12">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedEsencias.map((item, idx) => {
                            const gender = item.gender || (item.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
                            const isFemale = gender === "Femenino";
                            return (
                                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-8 py-6">
                                        <p className="text-slate-900 dark:text-slate-100 font-extrabold text-lg group-hover:text-orange-600 transition-colors">{item.name}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-tight ${gender === 'Femenino' ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-600' :
                                            gender === 'Masculino' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600' :
                                                'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                            }`}>
                                            {gender}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-tighter ${item.category?.toLowerCase() === 'limpia pisos 1l' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' :
                                                item.category?.toLowerCase() === 'limpia pisos 5l' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                                                    'bg-slate-50 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400'
                                                }`}>
                                                {item.category || "Perfumería Fina"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest">{item.provider || "Van Rossum"}</p>
                                    </td>
                                    {activeTab === "Perfumería" ? (
                                        <>
                                            <td className="px-8 py-6 text-center">
                                                <p className={`font-black text-lg ${item.price30g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100"}`}>
                                                    {typeof item.price30g === "number" ? `$${item.price30g.toLocaleString()}` : "Consultar"}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <p className={`font-black text-lg ${item.price100g === "consultar" ? "text-slate-400 italic" : "text-slate-900 dark:text-slate-100"}`}>
                                                    {typeof item.price100g === "number" ? `$${item.price100g.toLocaleString()}` : "Consultar"}
                                                </p>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-8 py-6 text-center">
                                                <p className="font-black text-lg text-slate-900 dark:text-slate-100">
                                                    ${(item.cost || 0).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <p className="font-black text-lg text-slate-900 dark:text-slate-100">
                                                    {(item.qty || 0).toLocaleString()} ml
                                                </p>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-8 py-6 text-right pr-12">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-3 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-2xl transition-all"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(item.id)}
                                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
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
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm mt-6">
                    <p className="text-sm font-bold text-slate-500">
                        Mostrando <span className="text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredEsencias.length)}</span> de <span className="text-slate-900 dark:text-white">{filteredEsencias.length}</span> esencias
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === page
                                                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                                                : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="px-1 text-slate-300">...</span>;
                                }
                                return null;
                            })}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Esencia"
                message="¿Estás seguro de que deseas eliminar esta esencia? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{editingId ? "Editar Esencia" : "Nueva Esencia"}</h2>
                                <p className="text-slate-500 font-medium text-sm mt-1">Configuración manual de materia prima</p>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Género</label>
                                    <select
                                        required
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-slate-900 dark:text-slate-100 font-bold"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {generos.map((g, idx) => (
                                            <option key={idx} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Proveedor</label>
                                    {isCustomProvider ? (
                                        <div className="relative">
                                            <input
                                                required
                                                type="text"
                                                autoFocus
                                                value={formData.provider}
                                                onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-4 pr-12 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                                                placeholder="Ingresar proveedor..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomProvider(false);
                                                    setFormData({ ...formData, provider: proveedores[0]?.name || "" });
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            required
                                            value={proveedores.some(p => p.name === formData.provider) ? formData.provider : (formData.provider && !proveedores.some(p => p.name === formData.provider) ? "__CUSTOM__" : "")}
                                            onChange={e => {
                                                if (e.target.value === "__CUSTOM__") {
                                                    setIsCustomProvider(true);
                                                    setFormData({ ...formData, provider: "" });
                                                } else {
                                                    setFormData({ ...formData, provider: e.target.value });
                                                }
                                            }}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                                        >
                                            <option value="" disabled>-- Seleccionar Proveedor --</option>
                                            {proveedores.map((p, idx) => (
                                                <option key={idx} value={p.name}>{p.name}</option>
                                            ))}
                                            <option value="__CUSTOM__" className="font-extrabold text-orange-600">+ Cargar otro proveedor...</option>
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Categoría</label>
                                {isCustomCategory ? (
                                    <div className="relative">
                                        <input
                                            required
                                            type="text"
                                            autoFocus
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-4 pr-12 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                                            placeholder="Ingresar categoría..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomCategory(false);
                                                setFormData({ ...formData, category: categorias[0]?.name || "" });
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={categorias.some(c => c.name === formData.category) ? formData.category : (formData.category && !categorias.some(c => c.name === formData.category) ? "__CUSTOM__" : "")}
                                        onChange={e => {
                                            if (e.target.value === "__CUSTOM__") {
                                                setIsCustomCategory(true);
                                                setFormData({ ...formData, category: "" });
                                            } else {
                                                setFormData({ ...formData, category: e.target.value });
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                                    >
                                        <option value="" disabled>-- Seleccionar Categoría --</option>
                                        {categorias.map((c, idx) => (
                                            <option key={idx} value={c.name}>{c.name}</option>
                                        ))}
                                        <option value="__CUSTOM__" className="font-extrabold text-orange-600">+ Cargar otra categoría...</option>
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        {formData.gender?.toLowerCase()?.includes("limpia pisos") ? "Costo por litro ($)" : "Costo (30g)"}
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.cost}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        {formData.gender?.toLowerCase()?.includes("limpia pisos") ? "Stock (mililitros)" : "Stock (g)"}
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.qty}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 font-bold text-right"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-xl hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all">
                                Guardar Materia Prima
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
