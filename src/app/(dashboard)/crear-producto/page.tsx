"use client";

import { Search, Plus, Sparkles, Layers, Trash2, X, FlaskConical, Package, Calculator, Save, Percent, DollarSign, ImagePlus, Loader2, Link as LinkIcon } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAppContext, Base, BaseComponent, Producto, Esencia, Insumo } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import SelectorModal from "@/components/SelectorModal";
import { upsertRecord } from "@/lib/db-actions";
import { guardarFotoProducto } from "@/lib/catalogo-actions";
import { prepararFoto } from "@/lib/foto-cliente";

export default function CrearProductoPage() {
    const { bases, insumos, esencias, categorias, productos, setProductos, setProductosSinGuardar, generos } = useAppContext();
    const router = useRouter();

    const [selectedBaseId, setSelectedBaseId] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [gender, setGender] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    // Foto ya achicada, esperando a que el producto exista para guardarla
    const [fotoPendiente, setFotoPendiente] = useState<{ base64: string; tipo: string } | null>(null);
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
            const p250 = parseFloat(esc.price250g);
            const p100 = parseFloat(esc.price100g);
            const p30 = parseFloat(esc.price30g);
            if (!isNaN(p250) && p250 > 0) {
                unitCost = p250 / 250;
            } else if (!isNaN(p100) && p100 > 0) {
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

    const roundUpTo100 = (num: number) => {
        return Math.ceil(num / 100) * 100;
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
            const preparada = await prepararFoto(file);
            setFotoPendiente(preparada);
            setImageUrl(`data:${preparada.tipo};base64,${preparada.base64}`); // solo para verla antes de guardar
        } catch (error: any) {
            console.error("Error al preparar imagen:", error);
            alert(error?.message || "Error al subir la imagen. Asegurate de que el archivo sea correcto.");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteImage = async () => {
        setImageUrl("");
        setFotoPendiente(null);
    };

    // Update derived values when cost changes
    useEffect(() => {
        if (totalCost > 0) {
            // Update Mayorista Price if in percentage mode
            if (marginTypeMayor === "porcentaje") {
            const p = roundUpTo100(totalCost * (1 + (parseFloat(marginMayor) || 0) / 100));
            setPriceMayorista(p.toString());
        } else {
            const p = totalCost + (parseFloat(marginMayor) || 0);
            setPriceMayorista(p.toFixed(0));
        }

        // Update Minorista Price if in percentage mode
        if (marginTypeMinor === "porcentaje") {
            const p = roundUpTo100(totalCost * (1 + (parseFloat(marginMinor) || 0) / 100));
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

    const handleSubmit = async (e: React.FormEvent) => {
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
            imageUrl: undefined,
            availabilityStatus,
            deliveryDays: parseInt(deliveryDays) || 0
        };
        setProductos([newProduct, ...productos]);

        // Guardar en la base de datos
        await upsertRecord("productos", {
            id: newProduct.id,
            name: newProduct.name,
            category: newProduct.category,
            gender: newProduct.gender,
            base_id: newProduct.baseId,
            components: newProduct.components,
            cost: newProduct.cost,
            price: newProduct.price,
            price_minorista: newProduct.priceMinorista,
            stock: newProduct.stock,
            description: newProduct.description,
            image_url: null,
            availability_status: newProduct.availabilityStatus,
            delivery_days: newProduct.deliveryDays
        });

        // Con el producto ya creado, se guarda su foto aparte
        if (fotoPendiente) {
            const r = await guardarFotoProducto(newProduct.id, fotoPendiente.base64, fotoPendiente.tipo);
            if (r.ok) setProductosSinGuardar(prev => prev.map(p => p.id === newProduct.id ? { ...p, imageUrl: r.dato } : p));
            else alert(`El producto se creó, pero la foto no se pudo guardar: ${r.error}`);
        }

        router.push("/lista-mayorista");
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="relative text-center p-8 md:p-10 bg-white dark:bg-[#242723] rounded-[2.5rem] border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col items-center justify-center">
                <div className="space-y-3 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase mb-1 border border-[#7D9878]/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        Lanzamientos
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand text-center">
                        Crear Producto
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg max-w-xl leading-relaxed font-medium transition-colors text-center">
                        Convertí tus bases en productos finales listos para la venta.
                    </p>
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
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Seleccionar Base (Opcional)</label>
                                <select
                                    value={selectedBaseId}
                                    onChange={(e) => handleBaseChange(e.target.value)}
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:border-[#7D9878] transition-all font-semibold"
                                >
                                    <option value="">-- Sin Base (Carga Manual) --</option>
                                    {bases.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Categoría</label>
                                <select
                                    required
                                    value={category}
                                    onChange={(e) => {
                                        const newCat = e.target.value;
                                        setCategory(newCat);
                                        const isAmb = newCat.toLowerCase().includes("difusor") || newCat.toLowerCase().includes("auto") || newCat.toLowerCase().includes("ambiente");
                                        if (isAmb) {
                                            setGender("Ambiente");
                                        } else if (gender === "Ambiente") {
                                            setGender("");
                                        }
                                    }}
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 transition-all font-semibold"
                                >
                                    <option value="">-- Seleccionar Categoría --</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Género</label>
                                {category && (category.toLowerCase().includes("difusor") || category.toLowerCase().includes("auto") || category.toLowerCase().includes("ambiente")) ? (
                                    <select
                                        required
                                        disabled
                                        value="Ambiente"
                                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 font-bold cursor-not-allowed opacity-80"
                                    >
                                        <option value="Ambiente">Ambiente</option>
                                    </select>
                                ) : (
                                    <select
                                        required
                                        value={gender === "Ambiente" ? "" : gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 transition-all font-semibold"
                                    >
                                        <option value="">-- Seleccionar Género --</option>
                                        {generos
                                            .filter(g => g.toLowerCase() !== "ambiente")
                                            .map((g, idx) => (
                                                <option key={idx} value={g}>{g}</option>
                                            ))
                                        }
                                    </select>
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Nombre Comercial del Producto</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ej: Floral Mystery 100ml"
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Estado de Disponibilidad</label>
                                <select
                                    value={availabilityStatus}
                                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                                    className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 transition-all"
                                >
                                    <option value="disponible">En Mano / Inmediata</option>
                                    <option value="demora">Con Demora (X Días)</option>
                                    <option value="no-disponible">Faltante / Consultar</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Días de Demora</label>
                                <input
                                    type="number"
                                    disabled={availabilityStatus !== "demora"}
                                    value={deliveryDays}
                                    onChange={e => setDeliveryDays(e.target.value)}
                                    className={`w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl py-3.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30 transition-all ${availabilityStatus !== "demora" ? "opacity-30 grayscale" : ""}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[#E6DFD5] dark:border-[#353B33] mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Fórmula del Producto</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEssenceModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA] rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-[#DAC4AA]/30 transition-all"
                                    >
                                        <FlaskConical className="w-3.5 h-3.5" /> + Esencia
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsInsumoModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-[#7D9878]/20 transition-all"
                                    >
                                        <Package className="w-3.5 h-3.5" /> + Insumo
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {currentComponents.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-[#E6DFD5] dark:border-[#353B33] rounded-3xl text-center text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 font-medium font-bold">
                                        No hay componentes cargados. Usá una base o agregá items manualmente.
                                    </div>
                                ) : (
                                    currentComponents.map((comp, idx) => {
                                        const { total } = getComponentCostInfo(comp);
                                        return (
                                            <div key={idx} className="flex items-center gap-4 bg-[#F9F6F0] dark:bg-[#1B1D1A] p-4 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] group hover:border-[#7D9878] transition-all font-bold">
                                                <div className={`p-2 rounded-xl scale-90 ${comp.type === "Esencia" ? "bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA]" : "bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B]"}`}>
                                                    {comp.type === "Esencia" ? <FlaskConical className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] line-clamp-1">{comp.name}</p>
                                                    <p className="text-[10px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-tight">
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
                                                        className="w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2 px-3 text-center font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:ring-2 focus:ring-[#7D9878] focus:outline-none"
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 w-8">{comp.type === "Esencia" ? (gender === "Limpia pisos" ? "ml" : "g") : "un."}</span>
                                                <button type="button" onClick={() => setCurrentComponents(currentComponents.filter(c => c.id !== comp.id))} className="p-2 text-[#2C2C2C]/40 hover:text-[#C9866F] transition-colors opacity-0 group-hover:opacity-100">
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
                    <section className="bg-white dark:bg-[#242723] rounded-[2.5rem] p-8 border border-[#E6DFD5] dark:border-[#353B33] shadow-sm space-y-6 sticky top-8 animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#F9F6F0] dark:bg-[#1B1D1A] rounded-xl text-[#7D9878] dark:text-[#A3B69B]">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Cálculo de Precios</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-[#1B1D1A] rounded-3xl border border-[#353B33] shadow-inner text-center">
                                <p className="text-[10px] font-bold text-[#F4EFEA]/60 uppercase tracking-widest mb-1">Costo de Elaboración</p>
                                <p className="text-3xl font-black text-white font-brand">${totalCost.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            </div>

                            {/* Mayorista Section */}
                            <div className="space-y-4 p-6 rounded-[2rem] bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-sm font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-tight">Venta Mayorista</h3>
                                    <div className="flex bg-white dark:bg-[#242723] p-1 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMayoristaModeChange("porcentaje")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMayor === "porcentaje" ? "bg-[#7D9878] text-white shadow-sm" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50"}`}
                                        >
                                            <Percent className="w-3 h-3" /> %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMayoristaModeChange("monto")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMayor === "monto" ? "bg-[#7D9878] text-white shadow-sm" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50"}`}
                                        >
                                            <DollarSign className="w-3 h-3" /> $
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">{marginTypeMayor === "porcentaje" ? "Margen (%)" : "Ganancia ($)"}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={marginMayor}
                                                onFocus={(e) => e.target.select()}
                                                disabled={marginTypeMayor === "monto"}
                                                readOnly={marginTypeMayor === "monto"}
                                                onChange={e => handleMarginMayoristaChange(e.target.value)}
                                                className={`w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878] transition-all ${marginTypeMayor === "monto" ? "opacity-50" : ""}`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#2C2C2C]/40 text-xs">{marginTypeMayor === "porcentaje" ? "%" : "$"}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Precio Final</label>
                                        <input
                                            type="number"
                                            value={priceMayorista}
                                            onFocus={(e) => e.target.select()}
                                            disabled={marginTypeMayor === "porcentaje"}
                                            readOnly={marginTypeMayor === "porcentaje"}
                                            onChange={e => handlePriceMayoristaChange(e.target.value)}
                                            className={`w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-black focus:outline-none focus:ring-2 focus:ring-[#7D9878] transition-all ${marginTypeMayor === "porcentaje" ? "opacity-50" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Minorista Section */}
                            <div className="space-y-4 p-6 rounded-[2rem] bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] transition-all">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-sm font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-tight">Venta Minorista</h3>
                                    <div className="flex bg-white dark:bg-[#242723] p-1 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMinoristaModeChange("porcentaje")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMinor === "porcentaje" ? "bg-[#7D9878] text-white shadow-sm" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50"}`}
                                        >
                                            <Percent className="w-3 h-3" /> %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMarginMinoristaModeChange("monto")}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${marginTypeMinor === "monto" ? "bg-[#7D9878] text-white shadow-sm" : "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50"}`}
                                        >
                                            <DollarSign className="w-3 h-3" /> $
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">{marginTypeMinor === "porcentaje" ? "Margen (%)" : "Ganancia ($)"}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={marginMinor}
                                                onFocus={(e) => e.target.select()}
                                                disabled={marginTypeMinor === "monto"}
                                                readOnly={marginTypeMinor === "monto"}
                                                onChange={e => handleMarginMinoristaChange(e.target.value)}
                                                className={`w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-bold focus:outline-none focus:ring-2 focus:ring-[#7D9878] transition-all ${marginTypeMinor === "monto" ? "opacity-50" : ""}`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#2C2C2C]/40 text-xs">{marginTypeMinor === "porcentaje" ? "%" : "$"}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest pl-1">Precio Final</label>
                                        <input
                                            type="number"
                                            value={priceMinorista}
                                            onFocus={(e) => e.target.select()}
                                            disabled={marginTypeMinor === "porcentaje"}
                                            readOnly={marginTypeMinor === "porcentaje"}
                                            onChange={e => handlePriceMinoristaChange(e.target.value)}
                                            className={`w-full bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl py-2.5 px-4 text-[#2C2C2C] dark:text-[#F4EFEA] font-black focus:outline-none focus:ring-2 focus:ring-[#7D9878] transition-all ${marginTypeMinor === "porcentaje" ? "opacity-50" : ""}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!name || !category || !gender || currentComponents.length === 0}
                            className="w-full py-5 rounded-2xl bg-[#7D9878] disabled:bg-[#E6DFD5] dark:disabled:bg-[#353B33] text-white font-black text-xl hover:bg-[#6b8566] hover:shadow-2xl hover:shadow-[#7D9878]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 group font-brand"
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
