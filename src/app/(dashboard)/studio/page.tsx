"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
    Search, Upload, Download, Sparkles, Trash2, Layout,
    Maximize2, MoveHorizontal, MoveVertical, Type, CheckCircle2,
    X, Plus, MousePointer2, Settings2, Palette, Image as ImageIcon,
    RefreshCcw, AlertCircle
} from "lucide-react";
import { useAppContext, Producto } from "@/context/AppContext";
import html2canvas from "html2canvas";
import { motion, AnimatePresence } from "framer-motion";

export default function StudioPage() {
    const { productos, updateProducto, categorias } = useAppContext();

    // UI State
    const [showSelector, setShowSelector] = useState(false);
    const [selectorSearch, setSelectorSearch] = useState("");
    const [selectorCategory, setSelectorCategory] = useState("Todas");
    const [selectorGender, setSelectorGender] = useState("Todos");

    // Design State
    const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
    // Botella base de Angel fija por defecto
    const [backgroundImage, setBackgroundImage] = useState<string | null>("/images/studio/botella-base.png");
    const [logoImage, setLogoImage] = useState<string | null>("/images/studio/logo-scenta.png");
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<"product" | "assets" | "adjust">("product");

    // Config de la etiqueta (Pro levels) con persistencia y Lienzo Virtual (Base 1000px)
    const [labelConfig, setLabelConfig] = useState(() => {
        const DEFAULT_CONFIG = {
            bgColor: "#b5a499",
            textColor: "#000000",
            labelWidth: 420,
            labelHeight: 520,
            topOffset: 62,
            leftOffset: 50,
            opacity: 1,
            borderRadius: 4,
            fontSizeTitle: 85,
            fontSizeBrand: 28,
            fontSizeBadge: 14,
            logoSize: 180,
            logoOffsetX: 0,
            logoOffsetY: 0,
            titleOffsetY: 10,
            brandOffsetY: 10,
            badgeOffsetY: 0,
            shadowIntensity: 0.35,
            borderWidth: 0,
            borderColor: "#000000",
            customTitle: "",
            customBrand: "",
            customBadge: "",
        };

        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("scenta_studio_config");
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...DEFAULT_CONFIG, ...parsed };
            }
        }
        return DEFAULT_CONFIG;
    });

    // Persistencia de Imágenes Base
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedBg = localStorage.getItem("scenta_studio_bg");
            const savedLogo = localStorage.getItem("scenta_studio_logo");
            if (savedBg) setBackgroundImage(savedBg);
            if (savedLogo) setLogoImage(savedLogo);
        }
    }, []);

    useEffect(() => {
        if (backgroundImage && !backgroundImage.startsWith('/images')) {
            localStorage.setItem("scenta_studio_bg", backgroundImage);
        }
    }, [backgroundImage]);

    useEffect(() => {
        if (logoImage && !logoImage.startsWith('/images')) {
            localStorage.setItem("scenta_studio_logo", logoImage);
        }
    }, [logoImage]);

    // Plantillas State
    const [savedTemplates, setSavedTemplates] = useState<Record<string, any>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("scenta_studio_templates");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });
    const [templateName, setTemplateName] = useState("");

    // Virtual Canvas State
    const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 1000 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 1000, height: 850 });

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };
        window.addEventListener("resize", updateScale);
        updateScale();
        // Un pequeño delay para asegurar que el DOM se haya asentado
        setTimeout(updateScale, 100);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    const viewScale = useMemo(() => {
        // Dejamos un pequeño margen de 40px para que no toque los bordes
        const scaleX = (containerSize.width - 40) / canvasSize.width;
        const scaleY = (containerSize.height - 40) / canvasSize.height;
        return Math.min(scaleX, scaleY, 0.95);
    }, [containerSize, canvasSize]);

    useEffect(() => {
        localStorage.setItem("scenta_studio_config", JSON.stringify(labelConfig));
    }, [labelConfig]);

    useEffect(() => {
        localStorage.setItem("scenta_studio_templates", JSON.stringify(savedTemplates));
    }, [savedTemplates]);

    const studioRef = useRef<HTMLDivElement>(null);

    // Helpers
    const extractDetails = (name: string) => {
        if (!name) return { title: "", brand: "" };
        // Mejorado: Si no tiene paréntesis, intenta separar por espacios (ej: 212 Carolina...)
        if (name.includes('(') && name.includes(')')) {
            const parts = name.split('(');
            return {
                title: parts[0].trim(),
                brand: parts[1].split(')')[0].trim()
            };
        }
        // Fallback: Primeras palabras como título, resto como marca (si hay más de una palabra)
        const words = name.split(' ');
        if (words.length > 1) {
            return { title: words[0], brand: words.slice(1).join(' ') };
        }
        return { title: name, brand: "" };
    };

    const filteredForSelector = productos.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
            p.id.toLowerCase().includes(selectorSearch.toLowerCase());
        const matchesCat = selectorCategory === "Todas" || p.category === selectorCategory;
        const matchesGender = selectorGender === "Todos" || p.gender === selectorGender;
        return matchesSearch && matchesCat && matchesGender;
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setter(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const saveTemplate = () => {
        if (!templateName.trim()) return;
        setSavedTemplates(prev => ({
            ...prev,
            [templateName.trim()]: { ...labelConfig }
        }));
        setTemplateName("");
    };

    const loadTemplate = (name: string) => {
        if (savedTemplates[name]) {
            setLabelConfig(savedTemplates[name]);
        }
    };

    const deleteTemplate = (name: string) => {
        setSavedTemplates(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleCapture = async (element: HTMLElement) => {
        return await html2canvas(element, {
            useCORS: true,
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc) => {
                const captureArea = clonedDoc.getElementById('studio-capture-area');
                if (captureArea) {
                    captureArea.style.transform = 'none';
                    captureArea.style.width = `${canvasSize.width}px`;
                    captureArea.style.height = `${canvasSize.height}px`;
                    captureArea.style.position = 'relative';
                    captureArea.style.display = 'block';
                }

                const all = clonedDoc.getElementsByTagName("*");
                for (let i = 0; i < all.length; i++) {
                    const el = all[i] as HTMLElement;
                    const style = clonedDoc.defaultView?.getComputedStyle(el);
                    if (style) {
                        const props = ['backgroundColor', 'color', 'borderColor', 'boxShadow'] as const;
                        props.forEach(prop => {
                            const val = (style as any)[prop];
                            if (val && (val.includes('lab(') || val.includes('oklch('))) {
                                el.style.setProperty(prop,
                                    prop === 'boxShadow' ? 'none' :
                                        prop === 'backgroundColor' ? '#ffffff' :
                                            prop === 'color' ? '#000000' : 'transparent',
                                    'important'
                                );
                            }
                        });
                    }
                }
            }
        });
    };

    const applyToProduct = async () => {
        if (!studioRef.current || !selectedProducto) return;

        setIsApplying(true);
        try {
            // Esperamos un momento para asegurar renderizado completo
            await new Promise(r => setTimeout(r, 400));
            const canvas = await handleCapture(studioRef.current!);
            const dataUrl = canvas.toDataURL("image/png");

            await updateProducto({
                ...selectedProducto,
                imageUrl: dataUrl
            });

            setApplySuccess(true);
            setTimeout(() => setApplySuccess(false), 3000);
        } catch (error) {
            console.error("Capture Error:", error);
            alert("Error al procesar la imagen. Intentá nuevamente.");
        } finally {
            setIsApplying(false);
        }
    };

    const downloadMockup = async () => {
        if (!studioRef.current) return;
        try {
            const canvas = await handleCapture(studioRef.current);
            const link = document.createElement('a');
            link.download = `mockup-${selectedProducto?.name || "perfume"}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("Error descagando:", err);
            alert("Error al descargar la imagen.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] transition-colors duration-500 pb-12">

            {/* Modal de Selección Visual de Productos */}
            <AnimatePresence>
                {showSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
                        >
                            {/* Header del Buscador */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Seleccionar Producto</h2>
                                        <p className="text-slate-500 font-medium text-sm">Buscá por nombre, marca o categoría para empezar el mockup.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowSelector(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Escribí el nombre del perfume..."
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none transition-all"
                                            value={selectorSearch}
                                            onChange={(e) => setSelectorSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <select
                                        value={selectorCategory}
                                        onChange={(e) => setSelectorCategory(e.target.value)}
                                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                                    >
                                        <option value="Todas">Todas las Categorías</option>
                                        {categorias.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                    </select>
                                    <select
                                        value={selectorGender}
                                        onChange={(e) => setSelectorGender(e.target.value)}
                                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
                                    >
                                        <option value="Todos">Todos los Géneros</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Unisex">Unisex</option>
                                    </select>
                                </div>
                            </div>

                            {/* Grilla de Productos con Información Completa */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20">
                                {filteredForSelector.length === 0 ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                        <Search className="w-12 h-12 opacity-20 mb-4" />
                                        <p className="font-bold">No encontramos productos con ese nombre.</p>
                                    </div>
                                ) : (
                                    filteredForSelector.map(p => (
                                        <motion.button
                                            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                            key={p.id}
                                            onClick={() => { setSelectedProducto(p); setShowSelector(false); }}
                                            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-left transition-all flex items-center gap-4 border-l-4 hover:border-l-violet-500 shadow-sm"
                                        >
                                            {/* Miniatura del Producto */}
                                            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} />
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 text-slate-300" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${p.gender === 'Femenino' ? 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400' :
                                                        p.gender === 'Masculino' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                                            'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                        }`}>
                                                        {p.gender}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400">ID: {p.id}</span>
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-violet-500 transition-colors uppercase">
                                                    {p.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{p.category}</p>
                                                    {extractDetails(p.name).brand && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <p className="text-[10px] font-black text-violet-500/70 dark:text-violet-400/70 uppercase truncate">
                                                                {extractDetails(p.name).brand}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Interface */}
            <div className="max-w-[1600px] mx-auto px-4 lg:px-12 py-12">
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Sparkles className="w-3.5 h-3.5" /> Designer Studio v2.0
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">Catalog Studio</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl">
                            Cargá tus botellas, diseñá etiquetas premium y actualizá tu lista de precios en un solo paso.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={applyToProduct}
                            disabled={!selectedProducto || !backgroundImage || isApplying}
                            className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-lg transition-all shadow-2xl shadow-violet-500/20 ${applySuccess ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
                                } disabled:opacity-50 disabled:grayscale`}
                        >
                            {isApplying ? (
                                <> <RefreshCcw className="w-5 h-5 animate-spin" /> PROCESANDO... </>
                            ) : applySuccess ? (
                                <> <CheckCircle2 className="w-5 h-5" /> ¡APLICADO! </>
                            ) : (
                                <> <Plus className="w-5 h-5" /> APLICAR AL PRODUCTO </>
                            )}
                        </motion.button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">

                    {/* Control Panel (Sticky Sidebar) */}
                    <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-12">

                        {/* Tabs */}
                        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-3xl backdrop-blur-md mb-2">
                            {[
                                { id: 'product', icon: MousePointer2, label: 'Ficha' },
                                { id: 'assets', icon: ImageIcon, label: 'Botella' },
                                { id: 'adjust', icon: Settings2, label: 'Diseño' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Contents */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-8 min-h-[400px]">

                            {activeTab === 'product' && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    {selectedProducto ? (
                                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 relative group overflow-hidden">
                                            <div className="flex items-start gap-5">
                                                {/* Miniatura Actual en la Ficha */}
                                                <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-sm relative">
                                                    {selectedProducto.imageUrl ? (
                                                        <img src={selectedProducto.imageUrl} className="w-full h-full object-cover" alt="current" />
                                                    ) : (
                                                        <ImageIcon className="w-10 h-10 text-slate-100 dark:text-slate-800" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Preview</span>
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${selectedProducto.gender === 'Femenino' ? 'bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400' :
                                                            selectedProducto.gender === 'Masculino' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                                                'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                            }`}>
                                                            {selectedProducto.gender}
                                                        </span>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => setShowSelector(true)} title="Cambiar Producto" className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-violet-500 transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                                                                <RefreshCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={() => setSelectedProducto(null)} title="Deseleccionar" className="p-1.5 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition-all shadow-sm border border-slate-100 dark:border-slate-700">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none line-clamp-2 pr-4 mb-2">
                                                        {selectedProducto.name}
                                                    </h4>

                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            ID: <span className="text-slate-600 dark:text-slate-300">#{selectedProducto.id}</span>
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            CAT: <span className="text-slate-600 dark:text-slate-300">{selectedProducto.category}</span>
                                                        </p>
                                                        {extractDetails(selectedProducto.name).brand && (
                                                            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">
                                                                BRAND: {extractDetails(selectedProducto.name).brand}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowSelector(true)}
                                            className="w-full h-44 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-violet-500 hover:border-violet-500/50 hover:bg-violet-50/10 transition-all group"
                                        >
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                                                <Search className="w-8 h-8 opacity-30" />
                                            </div>
                                            <div className="text-center">
                                                <span className="text-[12px] font-black uppercase tracking-widest block">Seleccionar Perfume</span>
                                                <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest block mt-1">Desde tu lista de precios</span>
                                            </div>
                                        </button>
                                    )}
                                    <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4 items-start">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400/80 leading-relaxed">
                                            Al aplicar, la imagen antigua del catálogo será reemplazada por el diseño que estás viendo.
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'assets' && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">2. Imágenes Base</h3>

                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Foto de la Botella</p>
                                            <div className="flex gap-4">
                                                <label className="flex-1 cursor-pointer flex items-center justify-center gap-3 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-2 border-dashed">
                                                    <Upload className="w-5 h-5 text-violet-500" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setBackgroundImage)} />
                                                    <span className="text-[11px] font-black uppercase tracking-widest">Cargar Mockup</span>
                                                </label>
                                                {backgroundImage && (
                                                    <button onClick={() => setBackgroundImage(null)} className="p-5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                                                )}
                                            </div>
                                            {backgroundImage && (
                                                <div className="h-20 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2">
                                                    <img src={backgroundImage} className="max-w-full max-h-full object-contain" alt="preview" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Logo Marca (Opcional)</p>
                                            <div className="flex gap-4">
                                                <label className="flex-1 cursor-pointer flex items-center justify-center gap-3 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border-2 border-dashed">
                                                    <Palette className="w-5 h-5 text-violet-500" />
                                                    <span className="text-[11px] font-black uppercase tracking-widest">Subir PNG</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, setLogoImage)} />
                                                </label>
                                                {logoImage && (
                                                    <button onClick={() => setLogoImage(null)} className="p-5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'adjust' && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-4 custom-scrollbar max-h-[50vh] pr-2 overflow-y-auto">
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color Fondo</p>
                                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <input type="color" value={labelConfig.bgColor} onChange={(e) => setLabelConfig({ ...labelConfig, bgColor: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                                                    <span className="text-[11px] font-bold text-slate-500 shrink-0">{labelConfig.bgColor.toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color Texto</p>
                                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <input type="color" value={labelConfig.textColor} onChange={(e) => setLabelConfig({ ...labelConfig, textColor: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent" />
                                                    <span className="text-[11px] font-bold text-slate-500 shrink-0">{labelConfig.textColor.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Posición Vertical</span>
                                                    <span className="text-violet-500">{labelConfig.topOffset}%</span>
                                                </div>
                                                <input type="range" min="10" max="90" value={labelConfig.topOffset} onChange={(e) => setLabelConfig({ ...labelConfig, topOffset: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Posición Horizontal</span>
                                                    <span className="text-violet-500">{labelConfig.leftOffset}%</span>
                                                </div>
                                                <input type="range" min="10" max="90" value={labelConfig.leftOffset} onChange={(e) => setLabelConfig({ ...labelConfig, leftOffset: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ancho (virtual px)</p>
                                                    <input type="number" min="50" max="900" value={labelConfig.labelWidth} onChange={(e) => setLabelConfig({ ...labelConfig, labelWidth: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alto (virtual px)</p>
                                                    <input type="number" min="50" max="900" value={labelConfig.labelHeight} onChange={(e) => setLabelConfig({ ...labelConfig, labelHeight: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-bold" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="grid grid-cols-1 gap-4 pt-2">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        <span>Radius de Esquina</span>
                                                        <span className="text-violet-500">{labelConfig.borderRadius}px</span>
                                                    </div>
                                                    <input type="range" min="0" max="200" value={labelConfig.borderRadius} onChange={(e) => setLabelConfig({ ...labelConfig, borderRadius: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <span>Propiedades del Texto</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center px-1">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Size Título</p>
                                                            <span className="text-violet-500">{labelConfig.fontSizeTitle}</span>
                                                        </div>
                                                        <input type="range" min="10" max="150" value={labelConfig.fontSizeTitle} onChange={(e) => setLabelConfig({ ...labelConfig, fontSizeTitle: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center px-1">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Size Marca</p>
                                                            <span className="text-violet-500">{labelConfig.fontSizeBrand}</span>
                                                        </div>
                                                        <input type="range" min="8" max="80" value={labelConfig.fontSizeBrand} onChange={(e) => setLabelConfig({ ...labelConfig, fontSizeBrand: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center px-1">
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Size Badge (Inferior)</p>
                                                            <span className="text-violet-500">{labelConfig.fontSizeBadge}</span>
                                                        </div>
                                                        <input type="range" min="6" max="60" value={labelConfig.fontSizeBadge} onChange={(e) => setLabelConfig({ ...labelConfig, fontSizeBadge: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Altura Nombre</p>
                                                        <input type="range" min="-300" max="300" value={labelConfig.titleOffsetY} onChange={(e) => setLabelConfig({ ...labelConfig, titleOffsetY: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Altura Marca</p>
                                                        <input type="range" min="-300" max="300" value={labelConfig.brandOffsetY} onChange={(e) => setLabelConfig({ ...labelConfig, brandOffsetY: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Tamaño Logo</span>
                                                <span className="text-violet-500">{labelConfig.logoSize}px</span>
                                            </div>
                                            <input type="range" min="30" max="250" value={labelConfig.logoSize} onChange={(e) => setLabelConfig({ ...labelConfig, logoSize: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Opacidad</span>
                                                <span className="text-violet-500">{Math.round(labelConfig.opacity * 100)}%</span>
                                            </div>
                                            <input type="range" min="0.5" max="1" step="0.01" value={labelConfig.opacity} onChange={(e) => setLabelConfig({ ...labelConfig, opacity: parseFloat(e.target.value) })} className="w-full accent-violet-600" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Sombra Pintada</span>
                                                <span className="text-violet-500">{Math.round(labelConfig.shadowIntensity * 100)}%</span>
                                            </div>
                                            <input type="range" min="0" max="0.5" step="0.01" value={labelConfig.shadowIntensity} onChange={(e) => setLabelConfig({ ...labelConfig, shadowIntensity: parseFloat(e.target.value) })} className="w-full accent-violet-600" />
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Contenido de Texto</span>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Título / Nombre</p>
                                                <input type="text" placeholder={selectedProducto ? extractDetails(selectedProducto.name).title : "Nombre"} value={labelConfig.customTitle} onChange={(e) => setLabelConfig({ ...labelConfig, customTitle: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Marca / Subtítulo</p>
                                                <input type="text" placeholder={selectedProducto ? extractDetails(selectedProducto.name).brand : "Marca"} value={labelConfig.customBrand} onChange={(e) => setLabelConfig({ ...labelConfig, customBrand: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Texto Inferior (Badge)</p>
                                                <input type="text" placeholder={selectedProducto ? `P. FINA • ${selectedProducto.gender}` : "P. FINA • GÉNERO"} value={labelConfig.customBadge} onChange={(e) => setLabelConfig({ ...labelConfig, customBadge: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-[10px] font-bold" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Color de Tipografía</p>
                                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <input type="color" value={labelConfig.textColor} onChange={(e) => setLabelConfig({ ...labelConfig, textColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer bg-transparent" />
                                                </div>
                                            </div>

                                            {/* Font Size Sliders */}
                                            <div className="pt-2 grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                        <span>Tamaño Título</span>
                                                        <span className="text-violet-500 font-mono">{labelConfig.fontSizeTitle}px</span>
                                                    </div>
                                                    <input type="range" min="10" max="250" value={labelConfig.fontSizeTitle} onChange={(e) => setLabelConfig({ ...labelConfig, fontSizeTitle: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                                        <span>Tamaño Marca</span>
                                                        <span className="text-violet-500 font-mono">{labelConfig.fontSizeBrand}px</span>
                                                    </div>
                                                    <input type="range" min="5" max="150" value={labelConfig.fontSizeBrand} onChange={(e) => setLabelConfig({ ...labelConfig, fontSizeBrand: parseInt(e.target.value) })} className="w-full accent-violet-600" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Propiedades del Logo</span>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamaño Logo</p>
                                                        <span className="text-[10px] font-black text-violet-500">{labelConfig.logoSize}px</span>
                                                    </div>
                                                    <input type="range" min="30" max="500" value={labelConfig.logoSize} onChange={(e) => setLabelConfig({ ...labelConfig, logoSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Posición X</p>
                                                        <input type="range" min="-500" max="500" value={labelConfig.logoOffsetX} onChange={(e) => setLabelConfig({ ...labelConfig, logoOffsetX: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-violet-500">Posición Y</p>
                                                        <input type="range" min="-500" max="500" value={labelConfig.logoOffsetY} onChange={(e) => setLabelConfig({ ...labelConfig, logoOffsetY: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <span>Borde de Etiqueta</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grosor</p>
                                                    <input type="number" value={labelConfig.borderWidth} onChange={(e) => setLabelConfig({ ...labelConfig, borderWidth: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 text-xs font-bold" />
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color Borde</p>
                                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <input type="color" value={labelConfig.borderColor} onChange={(e) => setLabelConfig({ ...labelConfig, borderColor: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={applyToProduct}
                                            disabled={isApplying || !selectedProducto}
                                            className={`w-full py-4 mt-6 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${applySuccess ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'
                                                }`}
                                        >
                                            {isApplying ? (
                                                <><RefreshCcw className="w-5 h-5 animate-spin" /> PROCESANDO...</>
                                            ) : applySuccess ? (
                                                <><CheckCircle2 className="w-5 h-5 text-white" /> ¡APLICADO CON ÉXITO!</>
                                            ) : (
                                                <><Settings2 className="w-5 h-5" /> GUARDAR EN PRODUCTO</>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Canvas Viewport (Sticky-ish) */}
                    <div className="xl:col-span-8 space-y-8">
                        <div
                            ref={containerRef}
                            className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3.5rem] flex items-center justify-center min-h-[850px] shadow-sm relative overflow-hidden"
                        >
                            {/* THE VIRTUAL CANVAS: Fixed at 1000px, scaled visually for UI */}
                            <div
                                ref={studioRef}
                                id="studio-capture-area"
                                className="relative bg-white overflow-hidden origin-center shrink-0"
                                style={{
                                    width: `${canvasSize.width}px`,
                                    height: `${canvasSize.height}px`,
                                    transform: `scale(${viewScale})`,
                                    transformStyle: 'preserve-3d',
                                    backgroundColor: '#ffffff'
                                }}
                            >
                                {backgroundImage ? (
                                    <motion.img
                                        initial={{ filter: 'blur(10px)', opacity: 0 }}
                                        animate={{ filter: 'blur(0px)', opacity: 1 }}
                                        src={backgroundImage}
                                        onLoad={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight });
                                        }}
                                        className="absolute inset-0 w-full h-full object-contain"
                                        alt="mockup"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-6 opacity-20 scale-150 transition-transform duration-700">
                                        <div className="w-32 h-32 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                            <Layout className="w-16 h-16" />
                                        </div>
                                        <p className="text-2xl font-black uppercase tracking-tighter text-center">Viewport Ready<br /><span className="text-sm font-bold opacity-50 tracking-widest">(Cargá el perfume en Assets)</span></p>
                                    </div>
                                )}

                                {/* Floating Label Mockup - Ultra Real Performance */}
                                {selectedProducto && (
                                    <motion.div
                                        id="studio-label-mockup"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: labelConfig.opacity }}
                                        className="absolute flex flex-col items-center justify-between p-8 overflow-hidden"
                                        style={{
                                            position: 'absolute',
                                            width: `${labelConfig.labelWidth}px`,
                                            height: `${labelConfig.labelHeight}px`,
                                            backgroundColor: labelConfig.bgColor, // Aseguramos HEX sólido
                                            borderRadius: `${labelConfig.borderRadius}px`,
                                            opacity: labelConfig.opacity,
                                            top: `${labelConfig.topOffset}%`,
                                            left: `${labelConfig.leftOffset}%`,
                                            transform: `translate(-50%, -50%)`,
                                            boxShadow: `0 20px 50px -10px rgba(0,0,0,${labelConfig.shadowIntensity + 0.2})`, // Simplified shadow for html2canvas compatibility
                                            border: labelConfig.borderWidth > 0 ? `${labelConfig.borderWidth}px solid ${labelConfig.borderColor}` : 'none',
                                        }}
                                    >
                                        {/* Logo Rendering - NOW INDEPENDENT (ABSOLUTE) */}
                                        {logoImage && (
                                            <div
                                                id="studio-logo-mockup"
                                                className="absolute pointer-events-none"
                                                style={{
                                                    width: `${labelConfig.logoSize}px`,
                                                    height: `${labelConfig.logoSize}px`,
                                                    left: `calc(50% + ${labelConfig.logoOffsetX}px)`,
                                                    top: `calc(35% + ${labelConfig.logoOffsetY}px)`,
                                                    transform: 'translate(-50%, -50%)',
                                                    zIndex: 10
                                                }}
                                            >
                                                <img
                                                    src={logoImage}
                                                    className="w-full h-full object-contain"
                                                    alt="logo"
                                                />
                                            </div>
                                        )}

                                        {/* Dynamic Text Content - STAYS IN PLACE */}
                                        <div className="flex-1 flex flex-col items-center justify-center w-full gap-1 mt-12 transition-all duration-300">
                                            <h2 className="font-black text-center leading-[0.85] tracking-tighter uppercase mb-1"
                                                style={{
                                                    color: labelConfig.textColor,
                                                    fontSize: `${labelConfig.fontSizeTitle}px`,
                                                    maxWidth: '90%',
                                                    letterSpacing: '-0.02em',
                                                    transform: `translateY(${labelConfig.titleOffsetY}px)`
                                                }}
                                            >
                                                {labelConfig.customTitle || (selectedProducto ? extractDetails(selectedProducto.name).title : "NOMBRE")}
                                            </h2>

                                            {(labelConfig.customBrand || (selectedProducto && extractDetails(selectedProducto.name).brand)) && (
                                                <p className="font-black uppercase tracking-[0.25em] text-center opacity-70"
                                                    style={{
                                                        color: labelConfig.textColor,
                                                        fontSize: `${labelConfig.fontSizeBrand}px`,
                                                        transform: `translateY(${labelConfig.brandOffsetY}px)`
                                                    }}
                                                >
                                                    {labelConfig.customBrand || (selectedProducto ? extractDetails(selectedProducto.name).brand : "MARCA")}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bottom Badge Section */}
                                        <div
                                            className="w-full pt-4 border-t flex flex-col items-center gap-2 transition-all duration-300"
                                            style={{
                                                borderColor: `${labelConfig.textColor}15`,
                                                transform: `translateY(${labelConfig.badgeOffsetY}px)`
                                            }}
                                        >
                                            <div className="flex flex-col items-center opacity-60">
                                                <p className="font-black uppercase tracking-[0.25em] text-center"
                                                    style={{ color: labelConfig.textColor, fontSize: `${labelConfig.fontSizeBadge}px` }}
                                                >
                                                    {labelConfig.customBadge || (selectedProducto ? `P. FINA • ${selectedProducto.gender}` : "P. FINA • GÉNERO")}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Canvas Overlays UI */}
                            <div className="absolute bottom-10 right-10 flex gap-3">
                                <button
                                    onClick={() => setLabelConfig({
                                        ...labelConfig,
                                        labelWidth: 250,
                                        labelHeight: 350,
                                        topOffset: 65,
                                        leftOffset: 50,
                                    })}
                                    title="Resetear Diseño"
                                    className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-500 hover:text-violet-500 shadow-xl border border-white/20 transition-all active:scale-95"
                                >
                                    <RefreshCcw className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={downloadMockup}
                                    title="Descargar Mockup"
                                    className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-500 hover:text-violet-500 shadow-xl border border-white/20 transition-all active:scale-95"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Professional Tips Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex gap-4 items-center">
                                <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-6 h-6 text-violet-500" />
                                </div>
                                <div>
                                    <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-white">Fidelity Mode</h5>
                                    <p className="text-[10px] font-bold text-slate-400">Captura en escala 1.5x para optimizar el peso sin perder nitidez.</p>
                                </div>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex gap-4 items-center">
                                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h5 className="text-[11px] font-black uppercase text-slate-800 dark:text-white">Smart Mapping</h5>
                                    <p className="text-[10px] font-bold text-slate-400">Títulos y marcas se extraen automáticamente de tu base de datos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Eliminado motor invisible propenso a errores - Captura directa sobre studioRef activada */}
        </div>
    );
}
