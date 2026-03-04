"use client";

import { Search, Plus, Sparkles, Layers, Trash2, X, FlaskConical, Package, Calculator, Save, Percent, DollarSign, ImagePlus, Loader2, Link as LinkIcon } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext, Base, BaseComponent, Producto, Esencia, Insumo } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import SelectorModal from "@/components/SelectorModal";
import { supabase } from "@/lib/supabase";

export default function CrearProductoPage() {
    const { bases, insumos, esencias, categorias, productos, setProductos, generos } = useAppContext();
    const router = useRouter();

    const [selectedBaseId, setSelectedBaseId] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [gender, setGender] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);

    // Pricing state
    const [priceMayorista, setPriceMayorista] = useState("");
    const [priceMinorista, setPriceMinorista] = useState("");
    const [marginTypeMayor, setMarginTypeMayor] = useState<"monto" | "porcentaje">("porcentaje");
    const [marginTypeMinor, setMarginTypeMinor] = useState<"monto" | "porcentaje">("porcentaje");
    const [marginMayor, setMarginMayor] = useState("50");
    const [marginMinor, setMarginMinor] = useState("100");

    // Components from base
    const [currentComponents, setCurrentComponents] = useState<BaseComponent[]>([]);

    // Modal states
    const [isEssenceModalOpen, setIsEssenceModalOpen] = useState(false);
    const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);

    const getComponentCostInfo = (comp: BaseComponent) => {
        const sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id)
            : insumos.find(i => i.id === comp.id);

        if (!sourceItem) return { unitCost: 0, total: 0 };

        let unitCost = 0;
        if (comp.type === "Esencia") {
            const esc = sourceItem as any;
            const p100 = parseFloat(esc.price100g);
            const p30 = parseFloat(esc.price30g);
            if (!isNaN(p100) && p100 > 0) {
                unitCost = p100 / 100;
            } else if (!isNaN(p30) && p30 > 0) {
                unitCost = p30 / 30;
            } else {
                unitCost = (sourceItem as Esencia).cost / ((sourceItem as Esencia).qty || 1);
            }
        } else {
            unitCost = (sourceItem as Insumo).cost / ((sourceItem as Insumo).qty || 1);
        }

        return {
            unitCost,
            total: unitCost * comp.qty
        };
    };

    const totalCost = useMemo(() => {
        return currentComponents.reduce((acc, comp) => {
            const { total } = getComponentCostInfo(comp);
            return acc + total;
        }, 0);
    }, [currentComponents, esencias, insumos]);

    const roundUpTo1000 = (num: number) => {
        return Math.ceil(num / 1000) * 1000;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("El archivo no puede pesar más de 10MB");
            return;
        }

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al subir la imagen");
            }

            setImageUrl(data.url);
        } catch (error: any) {
            console.error("Error al subir imagen:", error);
            alert("Error al subir la imagen. Asegurate de que el archivo sea correcto.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteImage = async () => {
        if (!imageUrl) return;

        if (imageUrl.includes('supabase.co')) {
            try {
                // Extract filename from URL
                const urlParts = imageUrl.split('/');
                const fileName = urlParts[urlParts.length - 1];

                await fetch('/api/upload', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName })
                });
            } catch (error) {
                console.error("Error al eliminar imagen:", error);
            }
        }

        setImageUrl("");
    };

    // Update derived values when cost changes
    useEffect(() => {
        if (totalCost > 0) {
            // Update Mayorista Price if in percentage mode
            if (marginTypeMayor === "porcentaje") {
                const p = roundUpTo1000(totalCost * (1 + (parseFloat(marginMayor) || 0) / 100));
                setPriceMayorista(p.toString());
            } else {
                const p = totalCost + (parseFloat(marginMayor) || 0);
                setPriceMayorista(p.toFixed(0));
            }

            // Update Minorista Price if in percentage mode
            if (marginTypeMinor === "porcentaje") {
                const p = roundUpTo1000(totalCost * (1 + (parseFloat(marginMinor) || 0) / 100));
                setPriceMinorista(p.toString());
            } else {
                const p = totalCost + (parseFloat(marginMinor) || 0);
                setPriceMinorista(p.toFixed(0));
            }
        }
    }, [totalCost]);

    const handleBaseChange = (baseId: string) => {
        setSelectedBaseId(baseId);
        const base = bases.find(b => b.id === baseId);
        if (base) {
            setCurrentComponents([...base.components]);
            if (!name) setName(base.name);
            // Default margins as requested
            setMarginMayor("50");
            setMarginMinor("100");
            setMarginTypeMayor("porcentaje");
            setMarginTypeMinor("porcentaje");
        }
    };

    const handleMarginMayoristaChange = (val: string) => {
        setMarginMayor(val);
        const numVal = parseFloat(val) || 0;
        if (marginTypeMayor === "porcentaje") {
            const p = roundUpTo1000(totalCost * (1 + numVal / 100));
            setPriceMayorista(p.toString());
        } else {
            setPriceMayorista((totalCost + numVal).toFixed(0));
        }
    };

    const handleMarginMinoristaChange = (val: string) => {
        setMarginMinor(val);
        const numVal = parseFloat(val) || 0;
        if (marginTypeMinor === "porcentaje") {
            const p = roundUpTo1000(totalCost * (1 + numVal / 100));
            setPriceMinorista(p.toString());
        } else {
            setPriceMinorista((totalCost + numVal).toFixed(0));
        }
    };

    const handlePriceMayoristaChange = (val: string) => {
        setPriceMayorista(val);
        const numVal = parseFloat(val) || 0;
        if (totalCost > 0) {
            if (marginTypeMayor === "monto") {
                setMarginMayor((numVal - totalCost).toFixed(0));
            } else {
                setMarginMayor(Math.round(((numVal - totalCost) / totalCost) * 100).toString());
            }
        }
    };

    const handlePriceMinoristaChange = (val: string) => {
        setPriceMinorista(val);
        const numVal = parseFloat(val) || 0;
        if (totalCost > 0) {
            if (marginTypeMinor === "monto") {
                setMarginMinor((numVal - totalCost).toFixed(0));
            } else {
                setMarginMinor(Math.round(((numVal - totalCost) / totalCost) * 100).toString());
            }
        }
    };

    const handleMarginMayoristaModeChange = (newType: "monto" | "porcentaje") => {
        if (newType === marginTypeMayor) return;
        const currentPrice = parseFloat(priceMayorista) || 0;
        if (totalCost > 0) {
            if (newType === "porcentaje") {
                const m = Math.round(((currentPrice - totalCost) / totalCost) * 100);
                setMarginMayor(m.toString());
            } else {
                setMarginMayor((currentPrice - totalCost).toFixed(0));
            }
        }
        setMarginTypeMayor(newType);
    };

    const handleMarginMinoristaModeChange = (newType: "monto" | "porcentaje") => {
        if (newType === marginTypeMinor) return;
        const currentPrice = parseFloat(priceMinorista) || 0;
        if (totalCost > 0) {
            if (newType === "porcentaje") {
                const m = Math.round(((currentPrice - totalCost) / totalCost) * 100);
                setMarginMinor(m.toString());
            } else {
                setMarginMinor((currentPrice - totalCost).toFixed(0));
            }
        }
        setMarginTypeMinor(newType);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Generate sequential ID: 001, 002, etc.
        const numericIds = productos
            .map(p => parseInt(p.id))
            .filter(n => !isNaN(n) && n < 10000); // Focus on 001-9999 range

        const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
        const nextId = (maxId + 1).toString().padStart(3, "0");

        const newProduct: Producto = {
            id: nextId,
            name,
            category,
            gender,
            baseId: selectedBaseId,
            components: currentComponents,
            cost: totalCost,
            price: parseFloat(priceMayorista) || 0,
            priceMinorista: parseFloat(priceMinorista) || 0,
            stock: 0,
            description,
            imageUrl
        };
        setProductos([newProduct, ...productos]);
        router.push("/");
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Lanzamientos
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Crear Producto
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Convertí tus bases en productos finales listos para la venta.
                    </p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600">
                                <Plus className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Información del Producto</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Base (Opcional)</label>
                                <select
                                    value={selectedBaseId}
                                    onChange={(e) => handleBaseChange(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                                >
                                    <option value="">-- Sin Base (Carga Manual) --</option>
                                    {bases.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">URL de la Imagen (Opcional)</label>

                                {imageUrl ? (
                                    <div className="relative aspect-square w-32 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 group">
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <button
                                                type="button"
                                                onClick={handleDeleteImage}
                                                className="p-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                                title="Eliminar imagen"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 flex items-center">
                                            <div className="absolute left-4 text-slate-400">
                                                <LinkIcon className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="url"
                                                placeholder="https://... o tocar botón de cámara"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                                            />
                                        </div>
                                        <div className="relative flex-shrink-0">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploadingImage}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                                title="Subir archivo de imagen"
                                            />
                                            <button
                                                type="button"
                                                disabled={uploadingImage}
                                                className="h-[52px] px-5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors shadow-sm"
                                            >
                                                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Categoría</label>
                                <select
                                    required
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                                >
                                    <option value="">-- Seleccionar Categoría --</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Género</label>
                                <select
                                    required
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                                >
                                    <option value="">-- Seleccionar Género --</option>
                                    {generos.map((g, idx) => (
                                        <option key={idx} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nombre Comercial del Producto</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ej: Floral Mystery 100ml"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Fórmula del Producto</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEssenceModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-orange-500/20 transition-all"
                                    >
                                        <FlaskConical className="w-3.5 h-3.5" /> + Esencia
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsInsumoModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-500/20 transition-all"
                                    >
                                        <Package className="w-3.5 h-3.5" /> + Insumo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {currentComponents.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-center text-slate-400 font-medium font-bold">
                                        No hay componentes cargados. Usá una base o agregá items manualmente.
                                    </div>
                                ) : (
                                    currentComponents.map((comp, idx) => {
                                        const { total } = getComponentCostInfo(comp);
                                        return (
                                            <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 group hover:border-indigo-500/50 transition-all font-bold">
                                                <div className={`p-2 rounded-xl scale-90 ${comp.type === "Esencia" ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"}`}>
                                                    {comp.type === "Esencia" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{comp.name}</p>
                                                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-tight">
                                                        Sumando: ${total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                                    </p>
                                                </div>
                                                <div className="w-24">
                                                    <input
                                                        type="number"
                                                        value={comp.qty}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={e => {
                                                            const newVal = parseFloat(e.target.value) || 0;
                                                            setCurrentComponents(currentComponents.map(c => c.id === comp.id ? { ...c, qty: newVal } : c));
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-center font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 w-8">{comp.type === "Esencia" ? (gender === "Limpia pisos" ? "ml" : "g") : "un."}</span>
                                                <button type="button" onClick={() => setCurrentComponents(currentComponents.filter(c => c.id !== comp.id))} className="p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 sticky top-8 animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-bold">Cálculo de Precios</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-900 dark:bg-black rounded-3xl border border-slate-800 shadow-inner text-center">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Costo de Elaboración</p>
                                <p className="text-3xl font-black text-white">${totalCost.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>

                            {/* Mayorista Section */}
                            <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Venta Mayorista</h3>
                                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMayoristaModeChange("porcentaje")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMayor === "porcentaje" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        >
                                            <Percent className="w-3 h-3" /> %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMayoristaModeChange("monto")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMayor === "monto" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        >
                                            <DollarSign className="w-3 h-3" /> $
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{marginTypeMayor === "porcentaje" ? "Margen (%)" : "Ganancia ($)"}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={marginMayor}
                                                onFocus={(e) => e.target.select()}
                                                disabled={marginTypeMayor === "monto"}
                                                readOnly={marginTypeMayor === "monto"}
                                                onChange={e => handleMarginMayoristaChange(e.target.value)}
                                                className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${marginTypeMayor === "monto" ? "opacity-50" : ""}`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">{marginTypeMayor === "porcentaje" ? "%" : "$"}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Precio Final</label>
                                        <input
                                            type="number"
                                            value={priceMayorista}
                                            onFocus={(e) => e.target.select()}
                                            disabled={marginTypeMayor === "porcentaje"}
                                            readOnly={marginTypeMayor === "porcentaje"}
                                            onChange={e => handlePriceMayoristaChange(e.target.value)}
                                            className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-slate-50 font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${marginTypeMayor === "porcentaje" ? "opacity-50" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Minorista Section */}
                            <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Venta Minorista</h3>
                                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMinoristaModeChange("porcentaje")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMinor === "porcentaje" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        >
                                            <Percent className="w-3 h-3" /> %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMinoristaModeChange("monto")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMinor === "monto" ? "bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                                        >
                                            <DollarSign className="w-3 h-3" /> $
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{marginTypeMinor === "porcentaje" ? "Margen (%)" : "Ganancia ($)"}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={marginMinor}
                                                onFocus={(e) => e.target.select()}
                                                disabled={marginTypeMinor === "monto"}
                                                readOnly={marginTypeMinor === "monto"}
                                                onChange={e => handleMarginMinoristaChange(e.target.value)}
                                                className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-slate-50 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${marginTypeMinor === "monto" ? "opacity-50" : ""}`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">{marginTypeMinor === "porcentaje" ? "%" : "$"}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Precio Final</label>
                                        <input
                                            type="number"
                                            value={priceMinorista}
                                            onFocus={(e) => e.target.select()}
                                            disabled={marginTypeMinor === "porcentaje"}
                                            readOnly={marginTypeMinor === "porcentaje"}
                                            onChange={e => handlePriceMinoristaChange(e.target.value)}
                                            className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-slate-900 dark:text-slate-50 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${marginTypeMinor === "porcentaje" ? "opacity-50" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!name || !category || !gender || currentComponents.length === 0}
                            className="w-full py-5 rounded-2xl bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black text-xl hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 group"
                        >
                            <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Lanzar Producto
                        </button>
                    </section>
                </div>
            </form>

            <SelectorModal
                isOpen={isEssenceModalOpen}
                onClose={() => setIsEssenceModalOpen(false)}
                title="Seleccionar Esencia"
                type="Esencia"
                items={esencias}
                onSelect={(item) => {
                    if (!currentComponents.find(c => c.id === item.id)) {
                        setCurrentComponents([...currentComponents, { id: item.id, name: item.name, qty: 0, type: "Esencia" }]);

                        // Priority to essence name: Always update name when adding an essence
                        const cleanedName = item.name
                            .replace(/\s+X\s+KG/gi, "")
                            .replace(/\s*\([F|M]\)/gi, "")
                            .trim();
                        setName(cleanedName);

                        // Auto-fill gender if essence has it and gender field is empty
                        if (!gender && item.gender) {
                            setGender(item.gender);
                        }
                    }
                    setIsEssenceModalOpen(false);
                }}
            />

            <SelectorModal
                isOpen={isInsumoModalOpen}
                onClose={() => setIsInsumoModalOpen(false)}
                title="Seleccionar Insumo"
                type="Insumo"
                items={insumos}
                onSelect={(item) => {
                    if (!currentComponents.find(c => c.id === item.id)) {
                        setCurrentComponents([...currentComponents, { id: item.id, name: item.name, qty: 0, type: "Insumo" }]);
                    }
                    setIsInsumoModalOpen(false);
                }}
            />
        </div>
    );
}
