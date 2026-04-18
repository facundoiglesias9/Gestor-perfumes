"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
    Search, Upload, Download, Sparkles, Trash2, Layout,
    X, CheckCircle2, Play, Plus, MousePointer2, Settings2, Palette, Image as ImageIcon,
    RefreshCcw, AlertCircle
} from "lucide-react";
import { useAppContext, Producto } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function StudioPage() {
    const { productos, updateProducto, categorias } = useAppContext();

    // UI State
    const [showSelector, setShowSelector] = useState(false);
    const [selectorSearch, setSelectorSearch] = useState("");
    const [selectorCategory, setSelectorCategory] = useState("Perfumería Fina");
    const [selectorGender, setSelectorGender] = useState("Todos");

    // Design State
    const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>("/images/studio/botella-base.png");
    const [logoImage, setLogoImage] = useState<string | null>("/images/studio/logo-scenta.png");
    const [isApplying, setIsApplying] = useState(false);
    const [applySuccess, setApplySuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<"product" | "assets" | "adjust">("product");

    // Batch Processing State
    const [isBatching, setIsBatching] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotal, setBatchTotal] = useState(0);
    const [showBatchPreview, setShowBatchPreview] = useState(false);
    const [batchItemsToProcess, setBatchItemsToProcess] = useState<Producto[]>([]);
    const [reprocessAll, setReprocessAll] = useState(false);

    // Config de la etiqueta
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
            titleOffsetX: 0,
            titleOffsetY: 10,
            brandOffsetX: 0,
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
                try {
                    const parsed = JSON.parse(saved);
                    return { ...DEFAULT_CONFIG, ...parsed };
                } catch(e) { return DEFAULT_CONFIG; }
            }
        }
        return DEFAULT_CONFIG;
    });

    // LocalStorage Sync
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedBg = localStorage.getItem("scenta_studio_bg");
            const savedLogo = localStorage.getItem("scenta_studio_logo");
            if (savedBg) setBackgroundImage(savedBg);
            if (savedLogo) setLogoImage(savedLogo);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("scenta_studio_config", JSON.stringify(labelConfig));
    }, [labelConfig]);

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

    // Virtual Canvas Scaling
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
        setTimeout(updateScale, 100);
        return () => window.removeEventListener("resize", updateScale);
    }, []);

    const viewScale = useMemo(() => {
        const scaleX = (containerSize.width - 40) / 1000;
        const scaleY = (containerSize.height - 40) / 1000;
        return Math.min(scaleX, scaleY, 0.95);
    }, [containerSize]);

    const studioRef = useRef<HTMLDivElement>(null);

    // Helpers
    const extractDetails = (name: string) => {
        if (!name) return { title: "", brand: "" };
        const raw = name.toUpperCase().trim();
        const KNOWN_BRANDS = ['CAROLINA HERRERA', 'PACO RABANNE', 'CHRISTIAN DIOR', 'DIOR', 'CHANEL', 'CALVIN KLEIN', 'CK', 'GIVENCHY', 'GIORGIO ARMANI', 'ARMANI', 'HUGO BOSS', 'VERSACE', 'LATTAFA', 'GENESIS', 'AL HARAMAIN', 'AQUOLINA', 'VICTORIA SECRET', 'DOLCE & GABBANA', 'D&G', 'GUCCI', 'YVES SAINT LAURENT', 'YSL', 'HERMES', 'BURBERRY', 'BVLGARI', 'THIERRY MUGLER', 'MUGLER', 'KENZO', 'NINA RICCI', 'LANCOME', 'JEAN PAUL GAULTIER', 'JPG', 'RALPH LAUREN'];
        
        for (const brand of KNOWN_BRANDS) {
            if (raw.endsWith(brand) && raw !== brand) {
                return { title: raw.substring(0, raw.length - brand.length).trim(), brand };
            }
        }
        const words = raw.split(/\s+/);
        if (words.length > 1) {
            return { title: words[0], brand: words.slice(1).join(' ') };
        }
        return { title: raw, brand: "" };
    };

    const filteredForSelector = useMemo(() => {
        return productos.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(selectorSearch.toLowerCase()) || p.id.toString().toLowerCase().includes(selectorSearch.toLowerCase());
            const matchesCat = (selectorCategory === "Todas" || p.category === selectorCategory);
            const matchesGender = selectorGender === "Todos" || p.gender === selectorGender;
            return matchesSearch && matchesCat && matchesGender;
        });
    }, [productos, selectorSearch, selectorCategory, selectorGender]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setter(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCapture = async (prod: Producto): Promise<HTMLCanvasElement> => {
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context failed");

        // Helper: Dibujar imagen con 'contain'
        const drawImageContain = (c: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
            const imgRatio = img.width / img.height;
            const targetRatio = w / h;
            let dW, dH, dX, dY;
            if (imgRatio > targetRatio) {
                dW = w; dH = w / imgRatio;
                dX = x; dY = y + (h - dH) / 2;
            } else {
                dH = h; dW = h * imgRatio;
                dX = x + (w - dW) / 2; dY = y;
            }
            c.drawImage(img, dX, dY, dW, dH);
        };

        // Helper: Medir altura de texto envuelto
        const getWrappedInfo = (c: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number) => {
            const words = (text || "").toUpperCase().split(' ');
            let line = '';
            let lines = [];
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = c.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                    lines.push(line.trim());
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line.trim());
            return { lines, height: lines.length * lineHeight };
        };

        // 1. Fondo Blanco
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1000, 1000);

        // 2. Dibujar Botella
        const imgBotella = new Image();
        imgBotella.crossOrigin = "anonymous";
        imgBotella.src = backgroundImage || "";
        await new Promise((res) => { imgBotella.onload = res; imgBotella.onerror = res; });
        drawImageContain(ctx, imgBotella, 0, 0, 1000, 1000);

        // 3. Configuración de la Etiqueta
        const totalTop = (1000 * labelConfig.topOffset) / 100;
        const totalLeft = (1000 * labelConfig.leftOffset) / 100;
        const labelX = totalLeft - (labelConfig.labelWidth / 2);
        const labelY = totalTop - (labelConfig.labelHeight / 2);

        ctx.save();
        ctx.globalAlpha = labelConfig.opacity;
        ctx.shadowColor = `rgba(0,0,0,${labelConfig.shadowIntensity})`;
        ctx.shadowBlur = 30; ctx.shadowOffsetY = 15;
        
        ctx.fillStyle = labelConfig.bgColor;
        const r = labelConfig.borderRadius;
        ctx.beginPath();
        ctx.moveTo(labelX + r, labelY);
        ctx.lineTo(labelX + labelConfig.labelWidth - r, labelY);
        ctx.quadraticCurveTo(labelX + labelConfig.labelWidth, labelY, labelX + labelConfig.labelWidth, labelY + r);
        ctx.lineTo(labelX + labelConfig.labelWidth, labelY + labelConfig.labelHeight - r);
        ctx.quadraticCurveTo(labelX + labelConfig.labelWidth, labelY + labelConfig.labelHeight, labelX + labelConfig.labelWidth - r, labelY + labelConfig.labelHeight);
        ctx.lineTo(labelX + r, labelY + labelConfig.labelHeight);
        ctx.quadraticCurveTo(labelX, labelY + labelConfig.labelHeight, labelX, labelY + labelConfig.labelHeight - r);
        ctx.lineTo(labelX, labelY + r);
        ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
        ctx.closePath();
        ctx.fill();

        if (labelConfig.borderWidth > 0) {
            ctx.strokeStyle = labelConfig.borderColor;
            ctx.lineWidth = labelConfig.borderWidth;
            ctx.stroke();
        }
        ctx.restore();

        // 4. Logo (30% de la altura de la etiqueta)
        const centerX = labelX + labelConfig.labelWidth / 2;
        const logoTargetY = labelY + (labelConfig.labelHeight * 0.28) + labelConfig.logoOffsetY;
        if (logoImage) {
            const imgLogo = new Image();
            imgLogo.crossOrigin = "anonymous";
            imgLogo.src = logoImage;
            await new Promise((res) => { imgLogo.onload = res; imgLogo.onerror = res; });
            const lSize = labelConfig.logoSize;
            ctx.drawImage(imgLogo, centerX - lSize/2 + labelConfig.logoOffsetX, logoTargetY - lSize/2, lSize, lSize);
        }

        // 5. Cálculo Dinámico de Textos
        const details = extractDetails(prod.name);
        const titleStr = (labelConfig.customTitle || details.title).toUpperCase();
        const brandStr = (labelConfig.customBrand || details.brand).toUpperCase();
        const maxWidth = labelConfig.labelWidth * 0.85;

        // Medir alturas
        ctx.font = `900 ${labelConfig.fontSizeTitle}px Inter, sans-serif`;
        const tInfo = getWrappedInfo(ctx, titleStr, maxWidth, labelConfig.fontSizeTitle * 0.9);
        
        ctx.font = `bold ${labelConfig.fontSizeBrand}px Inter, sans-serif`;
        const bInfo = brandStr ? getWrappedInfo(ctx, brandStr, maxWidth, labelConfig.fontSizeBrand * 1.2) : { lines: [], height: 0 };

        // Punto de inicio del Título: 45% de la etiqueta + Offset manual
        const drawYTitleBase = labelY + (labelConfig.labelHeight * 0.45) + labelConfig.titleOffsetY;
        
        // Dibujar Título
        ctx.textAlign = "center";
        ctx.fillStyle = labelConfig.textColor;
        ctx.font = `900 ${labelConfig.fontSizeTitle}px Inter, sans-serif`;
        tInfo.lines.forEach((l, i) => {
            ctx.fillText(l, centerX + labelConfig.titleOffsetX, drawYTitleBase + (i * labelConfig.fontSizeTitle * 0.9));
        });

        // Dibujar Marca (Siempre después del título con un gap de 20px + su offset)
        if (brandStr) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.font = `bold ${labelConfig.fontSizeBrand}px Inter, sans-serif`;
            const drawYBrandBase = drawYTitleBase + tInfo.height + 20 + labelConfig.brandOffsetY;
            bInfo.lines.forEach((l, i) => {
                ctx.fillText(l, centerX + labelConfig.brandOffsetX, drawYBrandBase + (i * labelConfig.fontSizeBrand * 1.2));
            });
            ctx.restore();
        }

        // Badge (Pie de página - Fijo al 92%)
        ctx.font = `bold ${labelConfig.fontSizeBadge}px Inter, sans-serif`;
        const footerY = labelY + labelConfig.labelHeight * 0.92 + labelConfig.badgeOffsetY;
        ctx.fillText(labelConfig.customBadge || `P. FINA • ${prod.gender}`, centerX, footerY);

        return canvas;
    };

    const applyToProduct = async (prodToUse?: Producto) => {
        const prod = prodToUse || selectedProducto;
        if (!prod) return;
        setIsApplying(true);
        try {
            const canvas = await handleCapture(prod);
            // Optimization: Use JPEG with 0.65 quality instead of PNG
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.65));
            if (!blob) throw new Error("Blob error");
            const formData = new FormData();
            formData.append('file', blob, `mockup-${prod.id}.jpg`);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            const { url } = await uploadRes.json();
            await updateProducto({ ...prod, imageUrl: url });
            if (!isBatching) {
                setApplySuccess(true);
                setTimeout(() => setApplySuccess(false), 3000);
            }
        } catch (error) { console.error(error); } finally { if (!isBatching) setIsApplying(false); }
    };

    const prepareBatch = () => {
        if (isBatching || isApplying) return;
        const toProcess = filteredForSelector.filter(p => reprocessAll || !p.imageUrl || p.imageUrl.startsWith('data:image'));
        if (toProcess.length === 0) { alert("Nada que procesar."); return; }
        setBatchItemsToProcess(toProcess);
        setShowBatchPreview(true);
    };

    const startBatch = async () => {
        const toProcess = batchItemsToProcess;
        setShowBatchPreview(false);
        setIsBatching(true);
        setBatchTotal(toProcess.length);
        try {
            for (let i = 0; i < toProcess.length; i++) {
                const prod = toProcess[i];
                setSelectedProducto(prod);
                setBatchProgress(i + 1);
                await new Promise(r => setTimeout(r, 800));
                await applyToProduct(prod);
            }
        } finally { setIsBatching(false); setBatchProgress(0); }
    };

    const downloadMockup = async () => {
        if (!selectedProducto) return;
        const canvas = await handleCapture(selectedProducto);
        const link = document.createElement('a');
        link.download = `mockup-${selectedProducto.name}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.7);
        link.click();
    };

    const renderLabel = (isCapture = false) => {
        if (!selectedProducto) return null;
        const details = extractDetails(selectedProducto.name);
        return (
            <div
                id={isCapture ? "studio-label-mockup-capture" : ""}
                className="absolute flex flex-col items-center overflow-hidden"
                style={{
                    width: `${labelConfig.labelWidth}px`, height: `${labelConfig.labelHeight}px`,
                    backgroundColor: labelConfig.bgColor, borderRadius: `${labelConfig.borderRadius}px`,
                    opacity: labelConfig.opacity, top: `${labelConfig.topOffset}%`, left: `${labelConfig.leftOffset}%`,
                    transform: `translate(-50%, -50%)`, 
                    boxShadow: `0 30px 60px -15px rgba(0,0,0,${labelConfig.shadowIntensity})`,
                    border: labelConfig.borderWidth > 0 ? `${labelConfig.borderWidth}px solid ${labelConfig.borderColor}` : 'none',
                    zIndex: 20
                }}
            >
                {/* Bloque de Textos (Flex Centered Area) */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Logo (Centered at 28%) */}
                    <div style={{ 
                        position: 'absolute',
                        top: '28%', left: '50%',
                        width: `${labelConfig.logoSize}px`, 
                        height: `${labelConfig.logoSize}px`,
                        transform: `translate(calc(-50% + ${labelConfig.logoOffsetX}px), calc(-50% + ${labelConfig.logoOffsetY}px))`
                    }}>
                        <img 
                            src={logoImage || "/logo.png"} 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                            style={{ filter: labelConfig.textColor === "#ffffff" ? "brightness(0) invert(1)" : "none" }}
                        />
                    </div>

                    {/* Título (Starting at 45%) */}
                    <div style={{ 
                        position: 'absolute',
                        top: '45%', left: '50%',
                        width: '90%',
                        transform: `translate(-50%, ${labelConfig.titleOffsetY}px)`,
                        textAlign: 'center'
                    }}>
                        <h2 className="font-black uppercase whitespace-normal break-words leading-[0.9] tracking-tighter" style={{
                            color: labelConfig.textColor, 
                            fontSize: `${labelConfig.fontSizeTitle}px`
                        }}>
                            {labelConfig.customTitle || details.title}
                        </h2>

                        {/* Marca (Following Title) */}
                        {(labelConfig.customBrand || details.brand) && (
                            <div style={{ 
                                marginTop: '20px',
                                transform: `translateY(${labelConfig.brandOffsetY}px)`
                            }}>
                                <p className="font-black uppercase tracking-[0.2em] opacity-70 leading-tight" style={{
                                    color: labelConfig.textColor, 
                                    fontSize: `${labelConfig.fontSizeBrand}px`
                                }}>
                                    {labelConfig.customBrand || details.brand}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Badge */}
                <div className="absolute bottom-[4%] inset-x-0 pointer-events-none flex flex-col items-center px-8" style={{
                     transform: `translateY(${labelConfig.badgeOffsetY}px)`
                }}>
                    <div className="h-px w-full bg-current opacity-20 mb-3" style={{ color: labelConfig.textColor }}></div>
                    <p className="font-black uppercase tracking-[0.2em] text-center" style={{
                        color: labelConfig.textColor, 
                        fontSize: `${labelConfig.fontSizeBadge}px`
                    }}>
                        {labelConfig.customBadge || `P. FINA • ${selectedProducto.gender}`}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 transition-colors">
            {/* Modal de Selección */}
            <AnimatePresence>
                {showSelector && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-[2rem] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <h2 className="text-xl font-black uppercase tracking-tight">Seleccionar Producto</h2>
                                <button onClick={() => setShowSelector(false)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X/></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
                                {filteredForSelector.map(p => (
                                    <button key={p.id} onClick={() => { setSelectedProducto(p); setShowSelector(false); }} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-4 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-all">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-contain" alt="p"/> : <ImageIcon className="w-full h-full opacity-10"/>}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[10px] font-black text-violet-500 mb-0.5 uppercase tracking-widest">{p.gender}</p>
                                            <p className="text-sm font-black uppercase truncate leading-tight">{p.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
                    <div className="space-y-4 flex-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Catalog Studio</h1>
                        
                        <div className="flex flex-wrap gap-3 pt-2">
                            <div className="relative min-w-[280px]">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Buscar..." value={selectorSearch} onChange={(e)=>setSelectorSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-6 text-xs font-bold focus:ring-2 focus:ring-violet-500/20 outline-none transition-all shadow-sm" />
                            </div>
                            <select value={selectorCategory} onChange={(e)=>setSelectorCategory(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-6 text-xs font-bold outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                                <option value="Perfumería Fina">Perfumería Fina</option>
                                {categorias.filter(c => c.name !== "Perfumería Fina").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <select value={selectorGender} onChange={(e)=>setSelectorGender(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-6 text-xs font-bold outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                                <option value="Todos">Géneros</option>
                                <option value="Ambiente">Ambiente</option>
                                <option value="Auto">Auto</option>
                                <option value="Limpia pisos">Limpia pisos</option>
                                <option value="Femenino">Femenino</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Unisex">Unisex</option>
                            </select>
                            <label className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                                <input type="checkbox" checked={reprocessAll} onChange={(e) => setReprocessAll(e.target.checked)} className="w-4 h-4 accent-violet-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reprocesar</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={prepareBatch} className="flex-1 md:flex-none px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg">Lote</button>
                        <button onClick={() => applyToProduct()} disabled={isApplying} className={`flex-[2] md:flex-none px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${applySuccess ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'}`}>
                            {isApplying ? <RefreshCcw className="w-4 h-4 animate-spin"/> : applySuccess ? <CheckCircle2 className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                            {isApplying ? "Guardando..." : applySuccess ? "Hecho" : "Aplicar"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    {/* Control Panel */}
                    <div className="xl:col-span-4 space-y-6">
                        <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                            {[
                                { id: 'product', icon: MousePointer2, label: 'Ficha' },
                                { id: 'assets', icon: ImageIcon, label: 'Botella' },
                                { id: 'adjust', icon: Settings2, label: 'Diseño' },
                            ].map(t => (
                                <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-md border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    <t.icon className="w-3.5 h-3.5" /> {t.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl min-h-[500px] overflow-y-auto custom-scrollbar max-h-[70vh]">
                            {activeTab === 'product' && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                                    {selectedProducto ? (
                                        <div className="space-y-6">
                                            <div className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 p-2 shadow-sm flex items-center justify-center">
                                                    {selectedProducto.imageUrl ? <img src={selectedProducto.imageUrl} className="w-full h-full object-contain" alt="p"/> : <ImageIcon className="opacity-10"/>}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">{selectedProducto.gender}</p>
                                                    <h4 className="text-base font-black uppercase leading-tight truncate">{selectedProducto.name}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedProducto.category}</p>
                                                </div>
                                            </div>
                                            <button onClick={()=>setShowSelector(true)} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-violet-500 hover:border-violet-500/50 transition-all">Cambiar Perfume</button>
                                        </div>
                                    ) : (
                                        <button onClick={()=>setShowSelector(true)} className="w-full aspect-square border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-violet-500 hover:border-violet-500/50 transition-all group">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Search className="w-8 h-8 opacity-20"/></div>
                                            <div className="text-center"><span className="text-[10px] font-black uppercase tracking-widest">Cargar Perfume</span></div>
                                        </button>
                                    )}
                                    <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                                        <p className="text-[9px] font-bold text-amber-600/80 uppercase tracking-widest leading-relaxed">Al guardar, se actualizará definitivamente la imagen en el catálogo.</p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'assets' && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-2">Botella Base</p>
                                        <label className="block w-full p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                                            <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, setBackgroundImage)} />
                                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><Upload className="w-6 h-6 text-violet-500" /></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subir Mockup Base</span>
                                        </label>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-2">Logo PNG</p>
                                        <label className="block w-full p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                                            <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, setLogoImage)} />
                                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm"><Palette className="w-6 h-6 text-violet-500" /></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subir Logo Transparente</span>
                                        </label>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'adjust' && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Fondo</p>
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                <input type="color" value={labelConfig.bgColor} onChange={(e)=>setLabelConfig({...labelConfig, bgColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none" />
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{labelConfig.bgColor.toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Tinta</p>
                                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                <input type="color" value={labelConfig.textColor} onChange={(e)=>setLabelConfig({...labelConfig, textColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none appearance-none" />
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{labelConfig.textColor.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Texto Personalizado</p>
                                            <input type="text" placeholder="Título (Perfume)" value={labelConfig.customTitle} onChange={(e)=>setLabelConfig({...labelConfig, customTitle: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                                            <input type="text" placeholder="Marca (Brand)" value={labelConfig.customBrand} onChange={(e)=>setLabelConfig({...labelConfig, customBrand: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        {[
                                            { label: 'Label Ancho', field: 'labelWidth', min: 100, max: 800, unit: 'px' },
                                            { label: 'Label Alto', field: 'labelHeight', min: 100, max: 800, unit: 'px' },
                                            { label: 'Margen V (Top)', field: 'topOffset', min: 0, max: 100, unit: '%' },
                                            { label: 'Margen H (Left)', field: 'leftOffset', min: 0, max: 100, unit: '%' },
                                            { label: 'Sombra', field: 'shadowIntensity', min: 0, max: 1, step: 0.01, unit: '' },
                                            { label: 'Tamaño Logo', field: 'logoSize', min: 20, max: 500, unit: 'px' },
                                            { label: 'Logo X', field: 'logoOffsetX', min: -200, max: 200, unit: 'px' },
                                            { label: 'Logo Y', field: 'logoOffsetY', min: -200, max: 200, unit: 'px' },
                                            { label: 'Font Title', field: 'fontSizeTitle', min: 10, max: 150, unit: 'px' },
                                            { label: 'Title X', field: 'titleOffsetX', min: -200, max: 200, unit: 'px' },
                                            { label: 'Title Y', field: 'titleOffsetY', min: -200, max: 200, unit: 'px' },
                                            { label: 'Font Brand', field: 'fontSizeBrand', min: 5, max: 100, unit: 'px' },
                                            { label: 'Brand X', field: 'brandOffsetX', min: -200, max: 200, unit: 'px' },
                                            { label: 'Brand Y', field: 'brandOffsetY', min: -200, max: 200, unit: 'px' },
                                            { label: 'Badge Y', field: 'badgeOffsetY', min: -100, max: 100, unit: 'px' },
                                        ].map(s => (
                                            <div key={s.field}>
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-3">
                                                    <span className="text-slate-400">{s.label}</span>
                                                    <span className="text-violet-500">{(labelConfig as any)[s.field]}{s.unit}</span>
                                                </div>
                                                <input type="range" min={s.min} max={s.max} step={s.step || 1} value={(labelConfig as any)[s.field]} onChange={(e)=>setLabelConfig({...labelConfig, [s.field]: parseFloat(e.target.value)})} className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 shadow-sm" />
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="xl:col-span-8 flex flex-col gap-8">
                        <div ref={containerRef} className="bg-white dark:bg-slate-900 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] min-h-[850px] flex items-center justify-center relative shadow-sm overflow-hidden group">
                                <div 
                                    className="relative bg-white shadow-2xl origin-center shrink-0" 
                                    style={{ 
                                        width: '1000px', 
                                        height: '1000px', 
                                        transform: `scale(${viewScale})` 
                                    }}
                                >
                                    {backgroundImage && <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImage})` }}></div>}
                                    {renderLabel()}
                                </div>
                             
                             <div className="absolute bottom-10 right-10 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setLabelConfig({...labelConfig, labelWidth: 420, labelHeight: 520, topOffset: 62, leftOffset: 50})} className="w-14 h-14 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-500 hover:text-violet-500 shadow-xl border border-white/20 transition-all active:scale-95 outline-none"><RefreshCcw className="w-5 h-5"/></button>
                                <button onClick={downloadMockup} className="w-14 h-14 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-500 hover:text-violet-500 shadow-xl border border-white/20 transition-all active:scale-95 outline-none"><Download className="w-5 h-5"/></button>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm">
                                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center shrink-0"><Layout className="w-6 h-6 text-violet-500"/></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-2 text-slate-900 dark:text-white">UHD Render</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Captura nativa 1000x para fidelidad absoluta.</p>
                                </div>
                            </div>
                            <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-sm">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6 text-emerald-500"/></div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-2 text-slate-900 dark:text-white">Direct Sync</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Actualización instantánea en tu catálogo.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Area de Captura (Inivisible) */}
            <div style={{ position: 'fixed', top: '-2500px', left: '-2500px', pointerEvents: 'none' }}>
                <div ref={studioRef} id="studio-capture-clean-area" style={{ width: '1000px', height: '1000px', backgroundColor: '#fff', position: 'relative' }}>
                    {backgroundImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}></div>}
                    {renderLabel(true)}
                </div>
            </div>

            {/* Modal Batch */}
            <AnimatePresence>
                {showBatchPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
                            <div className="p-12 text-center space-y-8">
                                <div className="w-20 h-20 bg-violet-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl"><Play className="w-8 h-8 text-white ml-1"/></div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tight mb-3">Procesar {batchItemsToProcess.length} Items</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed">Se aplicará este diseño a toda la selección. No cierres el navegador mientras procesa.</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <button onClick={startBatch} className="w-full py-5 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20">Iniciar Proceso</button>
                                    <button onClick={()=>setShowBatchPreview(false)} className="w-full py-4 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:text-slate-800 transition-all">Cancelar</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* HUD de Progreso */}
            <AnimatePresence>
                {isBatching && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-3">
                                    <RefreshCcw className="w-4 h-4 text-violet-500 animate-spin"/>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Procesando Lote</span>
                                </div>
                                <span className="text-xs font-mono font-black">{batchProgress} / {batchTotal}</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]" initial={{ width: 0 }} animate={{ width: `${(batchProgress / batchTotal) * 100}%` }} transition={{ duration: 0.3 }} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const studioStyles = `
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
`;
