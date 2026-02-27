"use client";

import { useState, useMemo } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { Printer, Type, Grid3X3, Layers, Plus, Trash2, Search, X } from "lucide-react";

const extractBrand = (name: string) => {
    if (name.includes('(') && name.includes(')')) {
        const parts = name.split('(');
        return {
            title: parts[0].trim(),
            brand: parts[1].split(')')[0].trim()
        };
    }

    const KNOWN_BRANDS = [
        "CAROLINA HERRERA", "C. HERRERA", "PACO RABANNE", "DIOR", "CHANEL",
        "CALVIN KLEIN", "ARMANI", "GIORGIO ARMANI", "NINA RICCI", "KENZO",
        "VERSACE", "GIVENCHY", "HUGO BOSS", "RALPH LAUREN", "JEAN PAUL GAULTIER",
        "YVES SAINT LAURENT", "YSL", "DOLCE & GABBANA", "ISSEY MIYAKE", "GUERLAIN",
        "BVLGARI", "LANCOME", "THIERRY MUGLER", "MUGLER", "ANTONIO BANDERAS", "CHER",
        "TOM FORD", "VICTORIA SECRET", "VICTORIA'S SECRET", "POLO", "TOMMY HILFIGER",
        "LACOSTE", "MOSCHINO", "BURBERRY", "AZZARO", "GUCCI", "BENSE"
    ];

    const upperName = name.toUpperCase();
    for (const brand of KNOWN_BRANDS) {
        if (upperName.includes(brand)) {
            const regex = new RegExp(`\\s*${brand}\\s*`, "i");
            let title = name.replace(regex, " ").trim();
            if (title.endsWith('-')) title = title.slice(0, -1).trim();
            return { title, brand };
        }
    }

    return { title: name, brand: null };
};

type EtiquetaConfig = {
    producto: Producto;
    count: number;
};

export default function GeneracionEtiquetasPage() {
    const { productos } = useAppContext();

    // Parámetros de la etiqueta
    const [labelWidth, setLabelWidth] = useState(50); // mm
    const [labelHeight, setLabelHeight] = useState(30); // mm
    const [gap, setGap] = useState(5); // mm
    const [fontSizeName, setFontSizeName] = useState(10); // pt
    const [fontSizeBrand, setFontSizeBrand] = useState(7); // pt
    const [fontSizeId, setFontSizeId] = useState(14); // pt

    const [showBrand, setShowBrand] = useState(true);
    const [showCategory, setShowCategory] = useState(true);
    const [customTitle, setCustomTitle] = useState("EssencePro");

    // Selección de productos a imprimir
    const [etiquetasList, setEtiquetasList] = useState<EtiquetaConfig[]>([]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalSearch, setModalSearch] = useState("");
    const [modalCategory, setModalCategory] = useState("");
    const [modalGender, setModalGender] = useState("");

    const categories = useMemo(() => Array.from(new Set(productos.map(p => p.category))).filter(Boolean), [productos]);
    const genders = useMemo(() => Array.from(new Set(productos.map(p => p.gender))).filter(Boolean), [productos]);

    const filteredModalProducts = useMemo(() => {
        return productos.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(modalSearch.toLowerCase()) || p.id.toLowerCase().includes(modalSearch.toLowerCase());
            const matchCategory = modalCategory ? p.category === modalCategory : true;
            const matchGender = modalGender ? p.gender === modalGender : true;
            return matchSearch && matchCategory && matchGender;
        });
    }, [productos, modalSearch, modalCategory, modalGender]);

    const getProductosToPrint = () => {
        return etiquetasList.flatMap(config =>
            Array.from({ length: config.count }, () => config.producto)
        );
    };
    const flattenedProducts = getProductosToPrint();

    const handlePrint = () => {
        if (flattenedProducts.length === 0) {
            alert("Añadí al menos un producto a la lista para imprimir.");
            return;
        }
        window.print();
    };



    const addProductToLabels = (prod: Producto) => {
        setEtiquetasList(prev => {
            const existing = prev.find(p => p.producto.id === prod.id);
            if (existing) {
                return prev.map(p => p.producto.id === prod.id ? { ...p, count: p.count + 1 } : p);
            } else {
                return [...prev, { producto: prod, count: 1 }];
            }
        });
    };

    const updateProductCount = (id: string, count: number) => {
        if (count < 1) return;
        setEtiquetasList(prev => prev.map(p => p.producto.id === id ? { ...p, count } : p));
    };

    const removeProduct = (id: string) => {
        setEtiquetasList(prev => prev.filter(p => p.producto.id !== id));
    };

    const renderEtiquetas = () => {
        return flattenedProducts.map((prod, idx) => {
            const { title, brand } = extractBrand(prod.name);
            return (
                <div
                    key={`${prod.id}-${idx}`}
                    className="border border-slate-300 flex flex-col items-center justify-center p-1 text-center bg-white overflow-hidden relative box-border"
                    style={{
                        width: `${labelWidth}mm`,
                        height: `${labelHeight}mm`,
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                    }}
                >
                    {customTitle && (
                        <div className="absolute top-1 w-full text-center opacity-60 font-black tracking-widest" style={{ fontSize: '5pt' }}>
                            {customTitle}
                        </div>
                    )}

                    <div className="flex flex-col items-center justify-center w-full h-full pt-2">
                        <span
                            className="font-black leading-tight text-slate-900"
                            style={{ fontSize: `${fontSizeName}pt` }}
                        >
                            {title}
                        </span>

                        {showBrand && brand && (
                            <span
                                className="font-bold text-slate-600 mt-0.5 leading-tight"
                                style={{ fontSize: `${fontSizeBrand}pt` }}
                            >
                                {brand}
                            </span>
                        )}

                        <div
                            className="font-black mt-1 bg-black text-white px-2 py-0.5 rounded-sm inline-block"
                            style={{ fontSize: `${fontSizeId}pt`, lineHeight: 1 }}
                        >
                            COD. {prod.id}
                        </div>

                        {showCategory && (
                            <div
                                className="font-bold opacity-70 mt-1 flex items-center gap-1 uppercase tracking-wider"
                                style={{ fontSize: '4.5pt' }}
                            >
                                <span>{prod.category}</span>
                                <span>•</span>
                                <span>{prod.gender}</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="pb-12 animate-in fade-in duration-700 bg-transparent">
            {/* CSS Exclusivo para asegurar impresión perfecta, ocultando todo layout que pueda generar bordes o márgenes */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A3 portrait;
                        margin: 0;
                    }
                    html, body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    nav, aside, header {
                        display: none !important;
                    }
                }
                
                @media screen {
                    .screen-preview-sheet {
                        transform: scale(0.6);
                        transform-origin: top center;
                        margin-bottom: -40%; /* Compensate for scaling down */
                    }
                    @media (min-width: 1280px) {
                        .screen-preview-sheet {
                            transform: scale(0.85);
                            margin-bottom: -15%;
                        }
                    }
                }
            `}</style>

            {/* VISTA DE PANTALLA PRINCIPAL (Oculta al imprimir) */}
            <div className="space-y-4 print:hidden">
                <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                            <Printer className="w-3.5 h-3.5" />
                            Configuración
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                            Generación de Etiquetas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                            Cargá los productos que necesitas, elegí la cantidad y exportá a PDF en A3.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="relative flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                        >
                            <Printer className="w-5 h-5" strokeWidth={2.5} />
                            Imprimir {flattenedProducts.length > 0 ? `(${flattenedProducts.length})` : ''}
                        </button>
                    </div>
                </header>

                <div className="flex flex-col xl:flex-row gap-8 mt-8">

                    {/* PANEL LATERAL DE CONFIGURACIÓN Y SELECCIÓN */}
                    <div className="w-full xl:w-[350px] space-y-6 shrink-0">

                        {/* 1. Selección de Productos */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-2">
                                <Plus className="w-4 h-4 text-indigo-500" />
                                Lista a Imprimir
                            </h3>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-full bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold py-3.5 px-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-500/20 active:scale-[0.98]"
                            >
                                <Search className="w-5 h-5" />
                                Abrir Buscador de Productos
                            </button>

                            {/* Lista actual */}
                            <div className="space-y-2 mt-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                {etiquetasList.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm font-bold opacity-60">
                                        No hay productos seleccionados
                                    </div>
                                ) : (
                                    etiquetasList.map(item => (
                                        <div key={item.producto.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{extractBrand(item.producto.name).title}</p>
                                                <p className="text-[10px] font-black tracking-widest text-slate-400">COD: {item.producto.id}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.count}
                                                    onChange={e => updateProductCount(item.producto.id, Number(e.target.value))}
                                                    className="w-12 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => removeProduct(item.producto.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 2. Ajustes visuales */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Grid3X3 className="w-4 h-4 text-indigo-500" />
                                    Dimensiones (mm)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Ancho</label>
                                        <input
                                            type="number"
                                            value={labelWidth}
                                            onChange={e => setLabelWidth(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Alto</label>
                                        <input
                                            type="number"
                                            value={labelHeight}
                                            onChange={e => setLabelHeight(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Separación (Gap)</label>
                                        <input
                                            type="range" min="0" max="20" step="1"
                                            value={gap}
                                            onChange={e => setGap(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                        <div className="text-right text-xs font-bold text-slate-400 mt-1">{gap} mm</div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Type className="w-4 h-4 text-indigo-500" />
                                    Tipografía (pt)
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Título Principal ({fontSizeName}pt)</label>
                                        <input
                                            type="range" min="6" max="24" step="0.5"
                                            value={fontSizeName}
                                            onChange={e => setFontSizeName(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Marca / Sub ({fontSizeBrand}pt)</label>
                                        <input
                                            type="range" min="5" max="18" step="0.5"
                                            value={fontSizeBrand}
                                            onChange={e => setFontSizeBrand(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Cód. ID ({fontSizeId}pt)</label>
                                        <input
                                            type="range" min="8" max="36" step="1"
                                            value={fontSizeId}
                                            onChange={e => setFontSizeId(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Layers className="w-4 h-4 text-indigo-500" />
                                    Contenido
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Encabezado</label>
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={e => setCustomTitle(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                            placeholder="Ej: EssencePro"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showBrand}
                                            onChange={e => setShowBrand(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Marca</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showCategory}
                                            onChange={e => setShowCategory(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Categoría y Género</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PREVISUALIZACIÓN DE PANTALLA */}
                    <div className="flex-1 overflow-x-auto bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-[2.5rem] flex justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 border-opacity-50 min-h-[500px]">

                        {flattenedProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-slate-400 my-auto">
                                <Search className="w-16 h-16 opacity-20 mb-4" />
                                <p className="font-bold text-lg">Hoja de etiquetas vacía</p>
                                <p className="text-sm font-medium">Buscá y añadí código de productos para visualizar etiquetas</p>
                            </div>
                        ) : (
                            <div
                                className="bg-white text-black shadow-2xl relative screen-preview-sheet"
                                style={{
                                    width: '297mm',
                                    minHeight: '420mm',
                                    padding: '10mm',
                                }}
                            >
                                <div className="flex flex-wrap" style={{ gap: `${gap}mm` }}>
                                    {renderEtiquetas()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* VISTA EXPLÍCITA EXCLUSIVA PARA IMPRESIÓN */}
            <div className="hidden print:block w-[297mm] min-h-[420mm] bg-white m-0 p-[10mm]" style={{ boxSizing: 'border-box' }}>
                <div className="flex flex-wrap" style={{ gap: `${gap}mm` }}>
                    {renderEtiquetas()}
                </div>
            </div>

            {/* MODAL DE BUSQUEDA AVANZADA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Search className="w-6 h-6 text-indigo-500" />
                                Buscador Avanzado
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                            <input
                                type="text"
                                placeholder="Buscar por nombre o ID..."
                                value={modalSearch}
                                onChange={e => setModalSearch(e.target.value)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none w-full shadow-sm"
                            />
                            <select
                                value={modalCategory}
                                onChange={e => setModalCategory(e.target.value)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none w-full shadow-sm"
                            >
                                <option value="">Todas las Categorías</option>
                                {categories.map(c => <option key={c} value={c as string}>{c as string}</option>)}
                            </select>
                            <select
                                value={modalGender}
                                onChange={e => setModalGender(e.target.value)}
                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none w-full shadow-sm"
                            >
                                <option value="">Todos los Géneros</option>
                                {genders.map(g => <option key={g} value={g as string}>{g as string}</option>)}
                            </select>
                        </div>

                        {/* Results Table */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                            <div className="grid grid-cols-1 gap-3">
                                {filteredModalProducts.map(p => (
                                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors gap-4 shadow-sm">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">{p.name}</h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-400">COD. {p.id}</span>
                                                <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-bold text-indigo-700 dark:text-indigo-400">{p.category}</span>
                                                <span className="px-2.5 py-1 rounded-md bg-pink-50 dark:bg-pink-500/10 text-xs font-bold text-pink-700 dark:text-pink-400">{p.gender}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addProductToLabels(p)}
                                            className="shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-indigo-500/20 w-full sm:w-auto"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Añadir a Lista
                                        </button>
                                    </div>
                                ))}
                                {filteredModalProducts.length === 0 && (
                                    <div className="text-center py-20 text-slate-500 dark:text-slate-400 space-y-3">
                                        <Search className="w-12 h-12 mx-auto opacity-20" />
                                        <p className="font-medium text-lg">Ningún producto coincide con los filtros.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
