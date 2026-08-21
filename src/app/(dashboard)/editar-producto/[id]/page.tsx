"use client";

import { Search, Plus, Sparkles, Layers, Trash2, X, FlaskConical, Package, Calculator, Save, Percent, DollarSign, ArrowLeft, ImagePlus, Loader2, Link as LinkIcon } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAppContext, BaseComponent, Producto } from "@/context/AppContext";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditarProductoPage() {
    const { bases, insumos, esencias, categorias, updateProducto, productos, generos } = useAppContext();
    const router = useRouter();
    const { id } = useParams();

    const existingProduct = useMemo(() => productos.find(p => p.id === id), [productos, id]);

    const [selectedBaseId, setSelectedBaseId] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [gender, setGender] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<any>("disponible");
    const [deliveryDays, setDeliveryDays] = useState("0");

    // Pricing state
    const [priceMayorista, setPriceMayorista] = useState("");
    const [priceMinorista, setPriceMinorista] = useState("");
    const [marginTypeMayor, setMarginTypeMayor] = useState<"monto" | "porcentaje">("porcentaje");
    const [marginTypeMinor, setMarginTypeMinor] = useState<"monto" | "porcentaje">("porcentaje");
    const [marginMayor, setMarginMayor] = useState("50");
    const [marginMinor, setMarginMinor] = useState("100");

    // Components
    const [currentComponents, setCurrentComponents] = useState<BaseComponent[]>([]);

    useEffect(() => {
        if (existingProduct) {
            setName(existingProduct.name);
            // Helper function to normalize strings (remove accents, to lowercase)
            const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

            // Match category case-insensitively and regardless of accents
            const matchedCategory = categorias.find(c => normalize(c.name) === normalize(existingProduct.category));
            setCategory(matchedCategory ? matchedCategory.name : (existingProduct.category || ""));

            setSelectedBaseId(existingProduct.baseId);
            setCurrentComponents(existingProduct.components);
            setPriceMayorista(existingProduct.price.toString());
            setPriceMinorista(existingProduct.priceMinorista.toString());
            setDescription(existingProduct.description || "");

            const matchedGender = generos.find(g => normalize(g) === normalize(existingProduct.gender));
            setGender(matchedGender ? matchedGender : (existingProduct.gender || ""));

            setImageUrl(existingProduct.imageUrl || "");
            setAvailabilityStatus(existingProduct.availabilityStatus || "disponible");
            setDeliveryDays(existingProduct.deliveryDays?.toString() || "0");

            // Calculate initial margins
            if (existingProduct.cost > 0) {
                const mM = Math.round(((existingProduct.price - existingProduct.cost) / existingProduct.cost) * 100);
                setMarginMayor(mM.toString());
                const mMi = Math.round(((existingProduct.priceMinorista - existingProduct.cost) / existingProduct.cost) * 100);
                setMarginMinor(mMi.toString());
            }
        }
    }, [existingProduct, categorias]);

    const calculateComponentCost = useCallback((comp: BaseComponent) => {
        let sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase())
            : insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase());

        if (sourceItem) {
            let unitCost = 0;
            if (comp.type === "Esencia") {
                const esc = sourceItem as any;
                const p250 = parseFloat(esc.price250g);
                const p100 = parseFloat(esc.price100g);
                const p30 = parseFloat(esc.price30g);
                if (!isNaN(p250) && p250 > 0) unitCost = p250 / 250;
                else if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                else unitCost = sourceItem.cost / (sourceItem.qty || 1);
            } else {
                // Insumo: cost is total cost of the lot, qty is units in lot
                unitCost = sourceItem.cost / (sourceItem.qty || 1);
            }
            return unitCost * comp.qty;
        }
        return 0;
    }, [esencias, insumos]);

    const totalCost = useMemo(() => {
        return currentComponents.reduce((acc, comp) => acc + calculateComponentCost(comp), 0);
    }, [currentComponents, calculateComponentCost]);

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
        setImageUrl("");
    };

    const roundUpTo100 = (num: number) => {
        return Math.ceil(num / 100) * 100;
    };

    const handleMarginMayoristaChange = (val: string) => {
        setMarginMayor(val);
        const numVal = parseFloat(val) || 0;
        if (marginTypeMayor === "porcentaje") {
            const p = roundUpTo100(totalCost * (1 + numVal / 100));
            setPriceMayorista(p.toString());
        } else {
            setPriceMayorista((totalCost + numVal).toFixed(0));
        }
    };

    const handleMarginMinoristaChange = (val: string) => {
        setMarginMinor(val);
        const numVal = parseFloat(val) || 0;
        if (marginTypeMinor === "porcentaje") {
            const p = roundUpTo100(totalCost * (1 + numVal / 100));
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
        if (!existingProduct) return;

        const updatedProduct: Producto = {
            ...existingProduct,
            name,
            category,
            baseId: selectedBaseId,
            components: currentComponents,
            cost: totalCost,
            price: parseFloat(priceMayorista) || 0,
            priceMinorista: parseFloat(priceMinorista) || 0,
            gender,
            description,
            imageUrl,
            availabilityStatus,
            deliveryDays: parseInt(deliveryDays) || 0
        };
        updateProducto(updatedProduct);
        router.push("/lista-mayorista");
    };

    if (!existingProduct) return <div className="p-20 text-center font-bold">Cargando producto...</div>;

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <Link href="/lista-mayorista" className="inline-flex items-center gap-2 text-[#7D9878] font-bold text-sm mb-2 hover:gap-3 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Volver a la lista
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand text-center">
                        Editar Producto <span className="text-[#7D9878]/60 dark:text-[#A3B69B]/60">#{existingProduct.id}</span>
                    </h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white dark:bg-[#242723] rounded-[2.5rem] p-8 border border-[#E6DFD5] dark:border-[#353B33] shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-[#7D9878]/15 rounded-xl text-[#7D9878]">
                                <Package className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Información del Producto</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest pl-1">Seleccionar Base (Opcional)</label>
                                <select
                                    value={selectedBaseId}
                                    onChange={(e) => {
                                        const newBaseId = e.target.value;
                                        setSelectedBaseId(newBaseId);
                                        if (newBaseId) {
                                            const confirmLoad = window.confirm("¿Deseas reemplazar la fórmula actual por los componentes de esta nueva base?\n\nLa esencia deberás agregarla manualmente.");
                                            if (confirmLoad) {
                                                const base = bases.find(b => b.id === newBaseId);
                                                if (base) {
                                                    setCurrentComponents([...base.components]);
                                                }
                                            }
                                        }
                                    }}
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:border-[#7D9878] transition-all font-semibold"
                                >
                                    <option value="">-- Sin Base (Carga Manual) --</option>
                                    {bases.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
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
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Estado de Disponibilidad</label>
                                <select
                                    value={availabilityStatus}
                                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                >
                                    <option value="disponible">En Mano / Inmediata</option>
                                    <option value="demora">Con Demora (X Días)</option>
                                    <option value="no-disponible">Faltante / Consultar</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Días de Demora</label>
                                <input
                                    type="number"
                                    disabled={availabilityStatus !== "demora"}
                                    value={deliveryDays}
                                    onChange={e => setDeliveryDays(e.target.value)}
                                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${availabilityStatus !== "demora" ? "opacity-30 grayscale" : ""}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Ajustar Componentes para este Producto</label>
                            <div className="space-y-3">
                                {currentComponents.map((comp, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 group hover:border-indigo-500/50 transition-all font-bold">
                                        <div className={`p-2 rounded-xl scale-90 ${comp.type === "Esencia" ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"}`}>
                                            {comp.type === "Esencia" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{comp.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{comp.type}</p>
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                    (Costo: ${calculateComponentCost(comp).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })})
                                                </span>
                                            </div>
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
                                ))}
                                <div className="mt-4 p-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                                    <p className="text-xs font-bold text-slate-400">Podés agregar más items abajo</p>
                                </div>
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
                            className="w-full py-5 rounded-2xl bg-[#7D9878] text-white font-black text-xl hover:bg-[#6b8566] hover:shadow-2xl hover:shadow-[#7D9878]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 group font-brand"
                        >
                            <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            Guardar Cambios
                        </button>
                    </section>
                </div>
            </form>

            <div className="mt-12">
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-1 font-bold">Agregar más Insumos y Esencias</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 font-bold">
                    {insumos.slice(0, 6).map(ins => (
                        <button
                            key={ins.id}
                            type="button"
                            onClick={() => {
                                if (currentComponents.find(c => c.id === ins.id)) return;
                                setCurrentComponents([...currentComponents, { id: ins.id, name: ins.name, qty: 0, type: "Insumo" }]);
                            }}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left hover:border-indigo-500 transition-all group shadow-sm font-bold"
                        >
                            <Package className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 mb-2" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{ins.name}</p>
                        </button>
                    ))}
                    {esencias.slice(0, 6).map(esc => (
                        <button
                            key={esc.id}
                            type="button"
                            onClick={() => {
                                if (currentComponents.find(c => c.id === esc.id)) return;
                                setCurrentComponents([...currentComponents, { id: esc.id, name: esc.name, qty: 0, type: "Esencia" }]);
                            }}
                            className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left hover:border-orange-500 transition-all group shadow-sm font-bold"
                        >
                            <FlaskConical className="w-4 h-4 text-slate-300 group-hover:text-orange-500 mb-2" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{esc.name}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
