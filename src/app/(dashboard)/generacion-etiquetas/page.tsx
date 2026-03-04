"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { Printer, Type, Grid3X3, Layers, Plus, Trash2, Search, X, Save, Move, CheckCircle2 } from "lucide-react";

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
    const [labelHeight, setLabelHeight] = useState(65); // mm
    const [gap, setGap] = useState(5); // mm
    const [padding, setPadding] = useState(2); // mm
    const [fontSizeName, setFontSizeName] = useState(14.5); // pt
    const [fontSizeBrand, setFontSizeBrand] = useState(7); // pt
    const [fontSizeId, setFontSizeId] = useState(14); // pt
    const [fontSizeCategory, setFontSizeCategory] = useState(6.5); // pt
    const [fontSizeHeader, setFontSizeHeader] = useState(5); // pt

    const [showBrand, setShowBrand] = useState(true);
    const [showCategory, setShowCategory] = useState(true);
    const [showHeader, setShowHeader] = useState(true);
    const [showLogo, setShowLogo] = useState(true);
    const [showTitle, setShowTitle] = useState(true);
    const [showId, setShowId] = useState(true);
    const [customTitle, setCustomTitle] = useState("Scenta");
    const [logoSize, setLogoSize] = useState(20); // mm
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setCustomLogo(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Layout Manual
    const [useManualLayout, setUseManualLayout] = useState(false);
    const [logoOffset, setLogoOffset] = useState({ x: 0, y: 0 });
    const [titleOffset, setTitleOffset] = useState({ x: 0, y: 0 });
    const [brandOffset, setBrandOffset] = useState({ x: 0, y: 0 });
    const [idOffset, setIdOffset] = useState({ x: 0, y: 0 });
    const [categoryOffset, setCategoryOffset] = useState({ x: 0, y: 0 });

    // Colores
    const [labelBgColor, setLabelBgColor] = useState("#ffffff");
    const [titleColor, setTitleColor] = useState("#0f172a");
    const [brandColor, setBrandColor] = useState("#475569");
    const [idBoxColor, setIdBoxColor] = useState("#000000");
    const [idTextColor, setIdTextColor] = useState("#ffffff");
    const [categoryColor, setCategoryColor] = useState("#64748b");

    const [saveSuccess, setSaveSuccess] = useState(false);

    const saveAsDefault = () => {
        const config = {
            labelWidth, labelHeight, gap, padding, fontSizeName, fontSizeBrand,
            fontSizeId, fontSizeCategory, fontSizeHeader, showBrand, showCategory,
            showHeader, showLogo, showTitle, showId, customTitle, logoSize,
            useManualLayout, logoOffset, titleOffset, brandOffset, idOffset, categoryOffset,
            labelBgColor, titleColor, brandColor, idBoxColor, idTextColor, categoryColor
        };
        localStorage.setItem('labelConfigV3', JSON.stringify(config));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    // Persistencia de configuración
    useEffect(() => {
        const saved = localStorage.getItem('labelConfigV3');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.labelWidth) setLabelWidth(config.labelWidth);
                if (config.labelHeight) setLabelHeight(config.labelHeight);
                if (config.gap !== undefined) setGap(config.gap);
                if (config.padding !== undefined) setPadding(config.padding);
                if (config.fontSizeName) setFontSizeName(config.fontSizeName);
                if (config.fontSizeBrand) setFontSizeBrand(config.fontSizeBrand);
                if (config.fontSizeId) setFontSizeId(config.fontSizeId);
                if (config.fontSizeCategory) setFontSizeCategory(config.fontSizeCategory);
                if (config.fontSizeHeader) setFontSizeHeader(config.fontSizeHeader);
                if (config.showBrand !== undefined) setShowBrand(config.showBrand);
                if (config.showCategory !== undefined) setShowCategory(config.showCategory);
                if (config.showHeader !== undefined) setShowHeader(config.showHeader);
                if (config.showLogo !== undefined) setShowLogo(config.showLogo);
                if (config.showTitle !== undefined) setShowTitle(config.showTitle);
                if (config.showId !== undefined) setShowId(config.showId);
                if (config.customTitle) setCustomTitle(config.customTitle);
                if (config.logoSize) setLogoSize(config.logoSize);

                if (config.useManualLayout !== undefined) setUseManualLayout(config.useManualLayout);
                if (config.logoOffset) setLogoOffset(config.logoOffset);
                if (config.titleOffset) setTitleOffset(config.titleOffset);
                if (config.brandOffset) setBrandOffset(config.brandOffset);
                if (config.idOffset) setIdOffset(config.idOffset);
                if (config.categoryOffset) setCategoryOffset(config.categoryOffset);

                if (config.labelBgColor) setLabelBgColor(config.labelBgColor);
                if (config.titleColor) setTitleColor(config.titleColor);
                if (config.brandColor) setBrandColor(config.brandColor);
                if (config.idBoxColor) setIdBoxColor(config.idBoxColor);
                if (config.idTextColor) setIdTextColor(config.idTextColor);
                if (config.categoryColor) setCategoryColor(config.categoryColor);
            } catch (e) {
                console.error("Error loading label config", e);
            }
        }
    }, []);

    // Auto-draft (optional, user asked for button, so let's keep button as primary)
    // useEffect(() => { ... }, [...]) // Removed auto-save to favor manual "Save as Default"

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
                    className="border border-slate-300 flex flex-col items-center justify-center text-center overflow-hidden relative box-border"
                    style={{
                        width: `${labelWidth}mm`,
                        height: `${labelHeight}mm`,
                        padding: `${padding}mm`,
                        backgroundColor: labelBgColor,
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid'
                    }}
                >
                    {showHeader && !showLogo && customTitle && (
                        <div className="absolute top-1 w-full text-center opacity-60 font-black tracking-widest text-slate-400" style={{ fontSize: `${fontSizeHeader}pt` }}>
                            {customTitle}
                        </div>
                    )}

                    <div className={`flex flex-col items-center justify-center w-full h-full relative ${useManualLayout ? '' : 'pt-2'}`}>
                        {showLogo && (
                            <div
                                className="mb-1 flex items-center justify-center rounded-full overflow-hidden border border-slate-100"
                                style={{
                                    width: `${logoSize}mm`,
                                    height: `${logoSize}mm`,
                                    position: useManualLayout ? 'absolute' : 'relative',
                                    left: useManualLayout ? `calc(50% + ${logoOffset.x}mm)` : 'auto',
                                    top: useManualLayout ? `calc(50% + ${logoOffset.y}mm)` : 'auto',
                                    transform: useManualLayout ? 'translate(-50%, -50%)' : 'none'
                                }}
                            >
                                <img
                                    src={customLogo || "/logo-scenta.png"}
                                    alt="Logo"
                                    className={`w-full h-full ${customLogo ? 'object-contain' : 'object-cover scale-[1.6]'}`}
                                />
                            </div>
                        )}

                        {showTitle && (
                            <span
                                className="font-black leading-tight"
                                style={{
                                    color: titleColor,
                                    fontSize: `${fontSizeName}pt`,
                                    position: useManualLayout ? 'absolute' : 'relative',
                                    left: useManualLayout ? `calc(50% + ${titleOffset.x}mm)` : 'auto',
                                    top: useManualLayout ? `calc(50% + ${titleOffset.y}mm)` : 'auto',
                                    transform: useManualLayout ? 'translate(-50%, -50%)' : 'none',
                                    width: useManualLayout ? '100%' : 'auto'
                                }}
                            >
                                {title}
                            </span>
                        )}

                        {showBrand && brand && (
                            <span
                                className="font-bold mt-0.5 leading-tight"
                                style={{
                                    color: brandColor,
                                    fontSize: `${fontSizeBrand}pt`,
                                    position: useManualLayout ? 'absolute' : 'relative',
                                    left: useManualLayout ? `calc(50% + ${brandOffset.x}mm)` : 'auto',
                                    top: useManualLayout ? `calc(50% + ${brandOffset.y}mm)` : 'auto',
                                    transform: useManualLayout ? 'translate(-50%, -50%)' : 'none',
                                    width: useManualLayout ? '100%' : 'auto'
                                }}
                            >
                                {brand}
                            </span>
                        )}

                        {showId && (
                            <div
                                className="font-black mt-1 px-2 py-0.5 rounded-sm inline-block"
                                style={{
                                    backgroundColor: idBoxColor,
                                    color: idTextColor,
                                    fontSize: `${fontSizeId}pt`,
                                    lineHeight: 1,
                                    position: useManualLayout ? 'absolute' : 'relative',
                                    left: useManualLayout ? `calc(50% + ${idOffset.x}mm)` : 'auto',
                                    top: useManualLayout ? `calc(50% + ${idOffset.y}mm)` : 'auto',
                                    transform: useManualLayout ? 'translate(-50%, -50%)' : 'none'
                                }}
                            >
                                COD. {prod.id}
                            </div>
                        )}

                        {showCategory && (
                            <div
                                className="font-bold mt-1 flex items-center justify-center gap-1 uppercase tracking-wider w-full"
                                style={{
                                    color: categoryColor,
                                    fontSize: `${fontSizeCategory}pt`,
                                    position: useManualLayout ? 'absolute' : 'relative',
                                    left: useManualLayout ? `calc(50% + ${categoryOffset.x}mm)` : 'auto',
                                    top: useManualLayout ? `calc(50% + ${categoryOffset.y}mm)` : 'auto',
                                    transform: useManualLayout ? 'translate(-50%, -50%)' : 'none'
                                }}
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
        <div id="print-root" className="pb-12 animate-in fade-in duration-700 bg-transparent">
            {/* CSS Exclusivo para asegurar impresión perfecta, ocultando todo layout que pueda generar bordes o márgenes */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A3 portrait;
                        margin: 0;
                    }
                    /* Ocultar TODO lo que no sea la zona de impresión */
                    nav, aside, header, footer,
                    .no-print, .print\\:hidden {
                        display: none !important;
                    }
                    html, body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .print-area {
                        display: block !important;
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 297mm !important;
                        min-height: 420mm !important;
                        padding: 10mm !important;
                        background: white !important;
                        z-index: 99999 !important;
                        margin: 0 !important;
                    }
                }
                
                @media screen {
                    .screen-preview-sheet {
                        transform: scale(0.6);
                        transform-origin: top center;
                        margin-bottom: -40%;
                    }
                    @media (min-width: 1280px) {
                        .screen-preview-sheet {
                            transform: scale(0.85);
                            margin-bottom: -15%;
                        }
                    }
                }
            `}} />

            {/* VISTA DE PANTALLA PRINCIPAL (Oculta al imprimir) */}
            <div className="no-print space-y-4">
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
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Márgenes Internos (Padding)</label>
                                        <input
                                            type="range" min="0" max="15" step="0.5"
                                            value={padding}
                                            onChange={e => setPadding(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                        <div className="text-right text-xs font-bold text-slate-400 mt-1">{padding} mm</div>
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
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Categoría / Género ({fontSizeCategory}pt)</label>
                                        <input
                                            type="range" min="3" max="16" step="0.5"
                                            value={fontSizeCategory}
                                            onChange={e => setFontSizeCategory(Number(e.target.value))}
                                            className="w-full accent-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Encabezado ({fontSizeHeader}pt)</label>
                                        <input
                                            type="range" min="3" max="16" step="0.5"
                                            value={fontSizeHeader}
                                            onChange={e => setFontSizeHeader(Number(e.target.value))}
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
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Texto del Encabezado</label>
                                        <input
                                            type="text"
                                            value={customTitle}
                                            onChange={e => setCustomTitle(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                                            placeholder="Ej: Scenta"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showHeader}
                                            onChange={e => setShowHeader(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Encabezado</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showLogo}
                                            onChange={e => setShowLogo(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Añadir Logo Scenta</span>
                                    </label>
                                    {showLogo && (
                                        <div className="pl-8 pt-1 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Tamaño del Logo ({logoSize}mm)</label>
                                                <input
                                                    type="range" min="5" max="25" step="1"
                                                    value={logoSize}
                                                    onChange={e => setLogoSize(Number(e.target.value))}
                                                    className="w-full accent-indigo-500"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
                                                    <Plus className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Subir Logo PNG</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                                {customLogo && (
                                                    <button onClick={() => setCustomLogo(null)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showTitle}
                                            onChange={e => setShowTitle(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Título Principal</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showBrand}
                                            onChange={e => setShowBrand(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Marca Auxiliar</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showId}
                                            onChange={e => setShowId(e.target.checked)}
                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Mostrar Código ID</span>
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

                            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                            {/* 4. Ajustes de Movimiento / "Jugar" */}
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Move className="w-4 h-4 text-indigo-500" />
                                    Ajustes de Posición
                                </h3>
                                <label className="flex items-center gap-3 cursor-pointer mb-4 p-2 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                                    <input
                                        type="checkbox"
                                        checked={useManualLayout}
                                        onChange={e => setUseManualLayout(e.target.checked)}
                                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                    />
                                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">ACTIVAR LAYOUT MANUAL</span>
                                </label>

                                {useManualLayout && (
                                    <div className="space-y-6">
                                        {[
                                            { label: 'Logo', state: logoOffset, setter: setLogoOffset },
                                            { label: 'Título', state: titleOffset, setter: setTitleOffset },
                                            { label: 'Marca', state: brandOffset, setter: setBrandOffset },
                                            { label: 'ID/Cód', state: idOffset, setter: setIdOffset },
                                            { label: 'Cat/Gén', state: categoryOffset, setter: setCategoryOffset },
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-500 block">Eje X: {item.state.x}mm</label>
                                                        <input
                                                            type="range" min="-30" max="30" step="0.5"
                                                            value={item.state.x}
                                                            onChange={e => item.setter(prev => ({ ...prev, x: Number(e.target.value) }))}
                                                            className="w-full h-1.5 accent-slate-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-500 block">Eje Y: {item.state.y}mm</label>
                                                        <input
                                                            type="range" min="-30" max="30" step="0.5"
                                                            value={item.state.y}
                                                            onChange={e => item.setter(prev => ({ ...prev, y: Number(e.target.value) }))}
                                                            className="w-full h-1.5 accent-slate-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={saveAsDefault}
                                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-lg ${saveSuccess
                                        ? 'bg-emerald-500 text-white animate-pulse'
                                        : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600 active:scale-[0.98]'
                                        }`}
                                >
                                    {saveSuccess ? (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" />
                                            Guardado
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Guardar como Default
                                        </>
                                    )}
                                </button>
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



            {/* APARTADO DE "JUEGO" / PLAYGROUND (Novedad) */}
            <div className="mt-12 p-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] text-white print:hidden shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                    <Move className="w-64 h-64" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight mb-2">Editor de Diseño Libre</h2>
                            <p className="text-indigo-100 font-medium text-lg max-w-xl">
                                Usá este espacio para jugar con las posiciones exactas de cada elemento. Una vez que encuentres el diseño perfecto, guardalo como predeterminado.
                            </p>
                        </div>
                        <button
                            onClick={saveAsDefault}
                            className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black tracking-widest uppercase hover:bg-indigo-50 active:scale-95 transition-all shadow-xl flex items-center gap-3 shrink-0"
                        >
                            <Save className="w-5 h-5" />
                            Fijar este diseño
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        <div className="bg-white/10 backdrop-blur-md p-8 rounded-[2rem] border border-white/20 space-y-8">
                            <div>
                                <h4 className="flex items-center gap-2 font-black uppercase tracking-widest text-xs opacity-70 mb-4">
                                    <div className="w-4 h-4 rounded-full border border-white/20 bg-gradient-to-r from-red-200 via-green-200 to-blue-200"></div>
                                    Fondo de Etiqueta (Pastel)
                                </h4>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        '#ffffff', '#ffe4e6', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1', '#dbeafe', '#e0e7ff', '#ede9fe', '#fae8ff', '#f1f5f9'
                                    ].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setLabelBgColor(color)}
                                            className={`w-12 h-12 rounded-2xl border-4 transition-all duration-300 ${labelBgColor === color ? 'border-indigo-400 scale-110 shadow-xl' : 'border-white/20 hover:border-white/50'}`}
                                            style={{ backgroundColor: color }}
                                            title={`Seleccionar color: ${color}`}
                                        />
                                    ))}
                                    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 border border-white/20">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Personalizado:</span>
                                        <input
                                            type="color"
                                            value={labelBgColor}
                                            onChange={e => setLabelBgColor(e.target.value)}
                                            className="w-8 h-8 bg-transparent cursor-pointer rounded-lg overflow-hidden border-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-white/10 w-full"></div>

                            <div className="flex flex-col sm:flex-row justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 gap-4">
                                <div className="space-y-1">
                                    <h4 className="flex items-center gap-2 font-black uppercase tracking-widest text-[10px] text-indigo-100">
                                        <Layers className="w-3.5 h-3.5" />
                                        Modo de Layout
                                    </h4>
                                    <p className="text-[10px] opacity-60">Si activás el Modo Libre, las etiquetas de arriba usarán tus posiciones personalizadas.</p>
                                </div>
                                <button
                                    onClick={() => setUseManualLayout(!useManualLayout)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${useManualLayout ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/10 text-white/50 border border-white/10 hover:bg-white/20'}`}
                                >
                                    {useManualLayout ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Diseño Libre Activado
                                        </>
                                    ) : 'Usar Diseño Fijo'}
                                </button>
                            </div>

                            <div className="h-px bg-white/10 w-full"></div>

                            <h4 className="flex items-center gap-2 font-black uppercase tracking-widest text-xs opacity-70">
                                <Layers className="w-4 h-4" />
                                Controles de Precisión
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {[
                                    { label: 'Logo', state: logoOffset, setter: setLogoOffset, show: showLogo, setShow: setShowLogo, size: logoSize, setSize: setLogoSize, sizeLabel: 'Tamaño (mm)', min: 5, max: 50 },
                                    {
                                        label: 'Nombre Fragancia', state: titleOffset, setter: setTitleOffset, show: showTitle, setShow: setShowTitle, size: fontSizeName, setSize: setFontSizeName, sizeLabel: 'Fuente (pt)', min: 6, max: 36,
                                        color: titleColor, setColor: setTitleColor
                                    },
                                    {
                                        label: 'Marca / Subtítulo', state: brandOffset, setter: setBrandOffset, show: showBrand, setShow: setShowBrand, size: fontSizeBrand, setSize: setFontSizeBrand, sizeLabel: 'Fuente (pt)', min: 4, max: 24,
                                        color: brandColor, setColor: setBrandColor
                                    },
                                    {
                                        label: 'Cód. Identificador', state: idOffset, setter: setIdOffset, show: showId, setShow: setShowId, size: fontSizeId, setSize: setFontSizeId, sizeLabel: 'Fuente (pt)', min: 4, max: 24,
                                        color: idTextColor, setColor: setIdTextColor, hasBox: true, boxColor: idBoxColor, setBoxColor: setIdBoxColor
                                    },
                                    {
                                        label: 'Info Categoría', state: categoryOffset, setter: setCategoryOffset, show: showCategory, setShow: setShowCategory, size: fontSizeCategory, setSize: setFontSizeCategory, sizeLabel: 'Fuente (pt)', min: 4, max: 18,
                                        color: categoryColor, setColor: setCategoryColor
                                    },
                                ].map((item, idx) => (
                                    <div key={idx} className={`space-y-4 p-6 rounded-[1.5rem] border transition-all duration-300 ${item.show ? 'bg-white/5 border-white/10 shadow-inner' : 'bg-black/20 border-white/5 opacity-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200">{item.label}</p>
                                            <button
                                                onClick={() => item.setShow(!item.show)}
                                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.show ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}
                                            >
                                                {item.show ? 'Visible' : 'Oculto'}
                                            </button>
                                        </div>

                                        {item.show && (
                                            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                                {/* Control de Tamaño */}
                                                <div className="space-y-2 pb-4 border-b border-white/5">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] font-black opacity-60 uppercase text-indigo-100">{item.sizeLabel}</span>
                                                        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5 border border-white/10">
                                                            <input
                                                                type="number" step="0.5"
                                                                value={item.size}
                                                                onChange={e => item.setSize(Number(e.target.value))}
                                                                className="bg-transparent w-10 text-right text-xs font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range" min={item.min} max={item.max} step="0.5"
                                                        value={item.size}
                                                        onChange={e => item.setSize(Number(e.target.value))}
                                                        className="w-full accent-emerald-400 h-1.5 cursor-pointer"
                                                    />
                                                </div>

                                                {/* Colores (Excepto Logo) */}
                                                {(item.setColor || item.setBoxColor) && (
                                                    <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                                                        {item.setColor && (
                                                            <div className="flex-1 space-y-1">
                                                                <span className="text-[9px] font-black opacity-50 uppercase block">Color Texto</span>
                                                                <input
                                                                    type="color"
                                                                    value={item.color}
                                                                    onChange={e => item.setColor(e.target.value)}
                                                                    className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden"
                                                                />
                                                            </div>
                                                        )}
                                                        {item.setBoxColor && (
                                                            <div className="flex-1 space-y-1">
                                                                <span className="text-[9px] font-black opacity-50 uppercase block">Color Caja</span>
                                                                <input
                                                                    type="color"
                                                                    value={item.boxColor}
                                                                    onChange={e => item.setBoxColor(e.target.value)}
                                                                    className="w-full h-8 bg-transparent cursor-pointer rounded overflow-hidden"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] font-black opacity-60 uppercase">Eje Horizontal (X)</span>
                                                        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5 border border-white/10">
                                                            <input
                                                                type="number" step="0.5"
                                                                value={item.state.x}
                                                                onChange={e => item.setter(prev => ({ ...prev, x: Number(e.target.value) }))}
                                                                className="bg-transparent w-10 text-right text-xs font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-[10px] opacity-40 font-bold">mm</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range" min="-40" max="40" step="0.1"
                                                        value={item.state.x}
                                                        onChange={e => item.setter(prev => ({ ...prev, x: Number(e.target.value) }))}
                                                        className="w-full accent-white h-1.5 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[10px] font-black opacity-60 uppercase">Eje Vertical (Y)</span>
                                                        <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5 border border-white/10">
                                                            <input
                                                                type="number" step="0.5"
                                                                value={item.state.y}
                                                                onChange={e => item.setter(prev => ({ ...prev, y: Number(e.target.value) }))}
                                                                className="bg-transparent w-10 text-right text-xs font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                            <span className="text-[10px] opacity-40 font-bold">mm</span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range" min="-40" max="40" step="0.1"
                                                        value={item.state.y}
                                                        onChange={e => item.setter(prev => ({ ...prev, y: Number(e.target.value) }))}
                                                        className="w-full accent-white h-1.5 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-6">
                            <h4 className="font-black uppercase tracking-widest text-xs opacity-70">Vista en Tiempo Real</h4>
                            <div className="bg-white p-1 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300">
                                <div
                                    className="border border-slate-200 flex flex-col items-center justify-center text-center overflow-hidden relative box-border"
                                    style={{
                                        width: `${labelWidth}mm`,
                                        height: `${labelHeight}mm`,
                                        padding: `${padding}mm`,
                                        backgroundColor: labelBgColor
                                    }}
                                >
                                    <div className="flex flex-col items-center justify-center w-full h-full relative">
                                        {showLogo && (
                                            <div
                                                className="flex items-center justify-center rounded-full overflow-hidden border border-slate-100"
                                                style={{
                                                    width: `${logoSize}mm`,
                                                    height: `${logoSize}mm`,
                                                    position: 'absolute',
                                                    left: `calc(50% + ${logoOffset.x}mm)`,
                                                    top: `calc(50% + ${logoOffset.y}mm)`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            >
                                                <img src="/logo-scenta.png" alt="" className="w-full h-full object-cover scale-[1.6]" />
                                            </div>
                                        )}
                                        {showTitle && (
                                            <span
                                                className="font-black leading-tight"
                                                style={{
                                                    color: titleColor,
                                                    fontSize: `${fontSizeName}pt`,
                                                    position: 'absolute',
                                                    left: `calc(50% + ${titleOffset.x}mm)`,
                                                    top: `calc(50% + ${titleOffset.y}mm)`,
                                                    transform: 'translate(-50%, -50%)',
                                                    width: '100%'
                                                }}
                                            >
                                                EJEMPLO
                                            </span>
                                        )}
                                        {showBrand && (
                                            <span
                                                className="font-bold leading-tight"
                                                style={{
                                                    color: brandColor,
                                                    fontSize: `${fontSizeBrand}pt`,
                                                    position: 'absolute',
                                                    left: `calc(50% + ${brandOffset.x}mm)`,
                                                    top: `calc(50% + ${brandOffset.y}mm)`,
                                                    transform: 'translate(-50%, -50%)',
                                                    width: '100%'
                                                }}
                                            >
                                                MARCA / SUB
                                            </span>
                                        )}
                                        {showId && (
                                            <div
                                                className="font-black px-2 py-0.5 rounded-sm inline-block"
                                                style={{
                                                    backgroundColor: idBoxColor,
                                                    color: idTextColor,
                                                    fontSize: `${fontSizeId}pt`,
                                                    position: 'absolute',
                                                    left: `calc(50% + ${idOffset.x}mm)`,
                                                    top: `calc(50% + ${idOffset.y}mm)`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            >
                                                COD. 000
                                            </div>
                                        )}
                                        {showCategory && (
                                            <div
                                                className="font-bold flex items-center justify-center gap-1 uppercase tracking-wider w-full"
                                                style={{
                                                    color: categoryColor,
                                                    fontSize: `${fontSizeCategory}pt`,
                                                    position: 'absolute',
                                                    left: `calc(50% + ${categoryOffset.x}mm)`,
                                                    top: `calc(50% + ${categoryOffset.y}mm)`,
                                                    transform: 'translate(-50%, -50%)'
                                                }}
                                            >
                                                <span>INFO</span>
                                                <span>•</span>
                                                <span>CAT</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold opacity-50 uppercase tracking-[0.3em]">Vista Previa de una sola etiqueta</p>
                        </div>
                    </div>
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

            {/* VISTA EXPLÍCITA EXCLUSIVA PARA IMPRESIÓN */}
            <div className="print-area hidden">
                <div className="flex flex-wrap" style={{ gap: `${gap}mm` }}>
                    {renderEtiquetas()}
                </div>
            </div>
        </div>
    );
}
