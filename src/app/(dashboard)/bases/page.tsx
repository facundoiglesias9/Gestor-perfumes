"use client";

import { Search, Plus, Minus, Layers, Trash2, X, Edit2, FlaskConical, Package, Sparkles, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, TriangleAlert, Loader2, CheckSquare, Square, Check, Wand2, Flower2, Car, Info, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import { useAppContext, Base, BaseComponent } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { Selector } from "@/components/Desplegable";

// Curva de la casa: salida rápida para lo que aparece.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const PASOS: { n: 1 | 2 | 3; titulo: string }[] = [
    { n: 1, titulo: "Presentación" },
    { n: 2, titulo: "Insumos" },
    { n: 3, titulo: "Resumen" },
];

const PRESENTACIONES: { id: string; titulo: string; detalle: string; ml?: string; icono?: LucideIcon }[] = [
    { id: "Frascos de 50 ML", titulo: "Frasco de 50 ml", detalle: "Perfumería fina", ml: "50" },
    { id: "Frascos de 30 ML", titulo: "Frasco de 30 ml", detalle: "Perfumería fina", ml: "30" },
    { id: "Frascos Difusores", titulo: "Difusor", detalle: "Ambiente, con varillas", icono: Flower2 },
    { id: "Frascos de Auto", titulo: "Auto", detalle: "Aromatizante para el auto", icono: Car },
];

// Al avanzar el paso entra desde la derecha; al volver, desde la izquierda
const PASO_VARIANTES = {
    entra: (d: number) => ({ opacity: 0, x: d * 18 }),
    quieto: { opacity: 1, x: 0, transition: { duration: 0.22, ease: EASE_OUT } },
    sale: (d: number) => ({ opacity: 0, x: d * -12, transition: { duration: 0.12, ease: "easeOut" as const } }),
};

const ETIQUETA = "block mb-1.5 text-sm font-medium text-[#2C2C2C]/80 dark:text-[#F4EFEA]/75";
const CAMPO = "w-full h-11 px-3.5 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-sm text-[#2C2C2C] dark:text-[#F4EFEA] outline-none focus:border-[#7D9878]/70 focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150";

const esAmbiente = (cat: string) => /difusor|auto|ambiente/i.test(cat || "");
const dosisSugerida = (cat: string) => {
    const c = cat.toLowerCase();
    return c.includes("50") ? 15 : c.includes("30") ? 10 : c.includes("difusor") ? 35 : 5;
};
const unidadDe = (nombre: string, tipo?: string) => (tipo === "Esencia" || nombre.toLowerCase().includes("alcohol") ? "g" : "un.");
const pesos = (v: number) => `$ ${Math.round(v || 0).toLocaleString("es-AR")}`;

// Número con botones de menos y más (gramos de esencia, cantidad de cada insumo)
function Cantidad({ valor, unidad, paso = 1, etiqueta, chico, onCambiar }: {
    valor: number; unidad: string; paso?: number; etiqueta: string; chico?: boolean; onCambiar: (n: number) => void;
}) {
    const boton = `${chico ? "w-7 h-7" : "w-8 h-8"} rounded-lg flex items-center justify-center text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:bg-[#2C2C2C]/[0.06] dark:hover:bg-white/10 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] active:scale-[0.92] transition-[background-color,color,transform] duration-150 disabled:opacity-35 disabled:pointer-events-none`;
    const redondear = (n: number) => Math.max(0, Math.round(n * 100) / 100);
    return (
        <div className={`inline-flex items-center gap-0.5 px-1 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] focus-within:border-[#7D9878]/70 focus-within:ring-2 focus-within:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150 ${chico ? "h-9" : "h-11"}`}>
            <button type="button" aria-label={`Restar ${etiqueta}`} className={boton} disabled={valor <= 0} onClick={() => onCambiar(redondear(valor - paso))}>
                <Minus className="w-3.5 h-3.5" />
            </button>
            <input
                type="number"
                inputMode="decimal"
                aria-label={etiqueta}
                value={valor}
                onFocus={e => e.target.select()}
                onChange={e => onCambiar(redondear(parseFloat(e.target.value) || 0))}
                className={`${chico ? "w-9" : "w-11"} bg-transparent text-right text-sm font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA] outline-none`}
            />
            <span className="w-7 text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">{unidad}</span>
            <button type="button" aria-label={`Sumar ${etiqueta}`} className={boton} onClick={() => onCambiar(redondear(valor + paso))}>
                <Plus className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default function BasesPage() {
    const { bases, setBases, insumos, esencias, categorias, generateProductsFromBase, removeDuplicateProducts, clearAllProductos, generos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGeneratingModalOpen, setIsGeneratingModalOpen] = useState<string | null>(null);
    const [generationResult, setGenerationResult] = useState<{ created: number, updated: number } | null>(null);
    const [targetCategory, setTargetCategory] = useState("Perfumería Fina");
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [insumoSearch, setInsumoSearch] = useState("");
    const [limpiaPisosSize, setLimpiaPisosSize] = useState<"1L" | "5L">("1L");
    const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
    const [direccion, setDireccion] = useState<1 | -1>(1);
    const [verOtrosInsumos, setVerOtrosInsumos] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        components: [] as BaseComponent[],
        essenceGender: "Todos",
        essenceGrams: 10,
        category: "Perfumería Fina"
    });

    const calculateComponentCost = useCallback((comp: BaseComponent) => {
        let sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase())
            : insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase());

        if (sourceItem) {
            let unitCost = 0;
            if (comp.type === "Esencia") {
                const esc = sourceItem as any;
                const p100 = parseFloat(esc.price100g);
                const p30 = parseFloat(esc.price30g);
                if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                else unitCost = sourceItem.cost / (sourceItem.qty || 1);
            } else {
                unitCost = sourceItem.cost / (sourceItem.qty || 1);
            }
            return unitCost * comp.qty;
        }
        return 0;
    }, [esencias, insumos]);

    const totalFormDataCost = useMemo(() => {
        return formData.components.reduce((acc, comp) => acc + calculateComponentCost(comp), 0);
    }, [formData.components, calculateComponentCost]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalName = formData.name;
        if (formData.essenceGender === "Limpia pisos") {
            finalName = finalName.replace(/\s*(1L|5L)$/, "").trim() + " " + limpiaPisosSize;
        }

        const newBase: Base = {
            id: editingId || getNextId(bases, "B-"),
            name: finalName,
            components: formData.components,
            essenceGender: formData.essenceGender,
            essenceGrams: formData.essenceGrams,
            category: formData.category
        };

        if (editingId) {
            setBases(bases.map(b => b.id === editingId ? newBase : b));
            setEditingId(null);
        } else {
            setBases([newBase, ...bases]);
        }

        handleCloseModal();
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setModalStep(1);
        setDireccion(1);
        setVerOtrosInsumos(false);
        setFormData({ name: "", components: [], essenceGender: "Todos", essenceGrams: 10, category: categorias[0]?.name || "Frascos de 50 ML" });
    };

    const openEditModal = (base: Base) => {
        setEditingId(base.id);

        let cleanedName = base.name;
        if (base.essenceGender === "Limpia pisos") {
            setLimpiaPisosSize(base.name.includes("5L") ? "5L" : "1L");
            cleanedName = base.name.replace(/\s*(1L|5L)$/, "").trim();
        } else {
            setLimpiaPisosSize("1L");
        }

        setFormData({
            name: cleanedName,
            components: [...base.components],
            essenceGender: base.essenceGender || "Todos",
            essenceGrams: base.essenceGrams || 10,
            category: base.category || categorias[0]?.name || "Perfumería Fina"
        });
        // Esencias válidas: tienen precio 100g numérico (soporta number o string numérico de Supabase)
        const validEsencias = esencias.filter(e => {
            const p = parseFloat(e.price100g as any);
            return !isNaN(p) && p > 0;
        });

        const targetEsencias = base.essenceGender && base.essenceGender !== "Todos"
            ? validEsencias.filter(e => e.gender === base.essenceGender)
            : validEsencias;
        setIsAddModalOpen(true);
    };

    const removeComponentFromForm = (id: string) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.filter(c => c.id !== id)
        }));
    };

    const updateComponentQty = (id: string, qty: number) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map(c => c.id === id ? { ...c, qty } : c)
        }));
    };

    const toggleInsumoInForm = (ins: any) => {
        const isSelected = formData.components.some(c => c.id === ins.id);
        if (isSelected) {
            removeComponentFromForm(ins.id);
        } else {
            const defaultQty = ins.name.toLowerCase().includes("alcohol") ? 35 : 1;
            setFormData(prev => ({
                ...prev,
                components: [...prev.components, {
                    id: ins.id,
                    name: ins.name,
                    qty: defaultQty,
                    type: "Insumo"
                }]
            }));
        }
    };

    const applySuggestedInsumosForCategory = (catName: string) => {
        const lowerCat = catName.toLowerCase();
        const suggested: BaseComponent[] = [];

        insumos.forEach(i => {
            const n = i.name.toLowerCase();
            if (n.includes("alcohol")) {
                const grams = lowerCat.includes("50") ? 35 : lowerCat.includes("30") ? 20 : lowerCat.includes("difusor") ? 90 : 5;
                suggested.push({ id: i.id, name: i.name, qty: grams, type: "Insumo" });
            } else if (lowerCat.includes("50") && (n.includes("50") || (n.includes("frasco") && !n.includes("auto") && !n.includes("difusor")))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("30") && (n.includes("30") || (n.includes("frasco") && !n.includes("auto") && !n.includes("difusor")))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("difusor") && (n.includes("difusor") || n.includes("varita") || n.includes("varilla"))) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (lowerCat.includes("auto") && n.includes("auto")) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            } else if (n.includes("tul") || n.includes("bolsa")) {
                suggested.push({ id: i.id, name: i.name, qty: 1, type: "Insumo" });
            }
        });

        if (suggested.length > 0) {
            setFormData(prev => ({
                ...prev,
                components: suggested
            }));
        }
    };

    const irAPaso = (n: 1 | 2 | 3) => {
        if (n === modalStep) return;
        setDireccion(n > modalStep ? 1 : -1);
        setModalStep(n);
    };

    // Elegir otra presentación carga sus insumos y su dosis sugerida.
    // Volver a tocar la que ya está elegida no cambia nada (antes borraba lo que se había ajustado).
    const elegirPresentacion = (id: string) => {
        if (formData.category === id) return;
        setFormData(prev => ({
            ...prev,
            category: id,
            name: !prev.name.trim() || prev.name === prev.category ? id : prev.name,
            essenceGender: esAmbiente(id) ? "Ambiente" : (prev.essenceGender === "Ambiente" ? "Todos" : prev.essenceGender),
            essenceGrams: dosisSugerida(id),
        }));
        applySuggestedInsumosForCategory(id);
    };

    const presentacionActual = PRESENTACIONES.find(p => p.id === formData.category);

    // Insumos de la presentación elegida (o para todas) primero; los de otras, plegados
    const insumoEsDe = (ins: { category?: string }, cat: string) => {
        const c = (ins.category || "").trim().toLowerCase();
        return !c || c === "todas" || c === cat.toLowerCase();
    };
    const insumosPropios = insumos.filter(i => insumoEsDe(i, formData.category) || formData.components.some(c => c.id === i.id));
    const insumosOtros = insumos.filter(i => !insumosPropios.includes(i));

    const filaInsumo = (ins: (typeof insumos)[number]) => {
        const comp = formData.components.find(c => c.id === ins.id);
        const elegido = !!comp;
        const esAlcohol = ins.name.toLowerCase().includes("alcohol");
        return (
            <li key={ins.id} className={`flex items-center gap-3 pl-3.5 pr-2.5 py-2 transition-colors duration-150 ${elegido ? "bg-[#7D9878]/[0.06] dark:bg-[#7D9878]/[0.1]" : ""}`}>
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={elegido}
                    onClick={() => toggleInsumoInForm(ins)}
                    className="flex items-center gap-3 flex-1 min-w-0 py-1.5 text-left rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                >
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-[background-color,border-color] duration-150 ${elegido
                        ? "bg-[#7D9878] border-[#7D9878] text-white"
                        : "bg-white dark:bg-[#1B1D1A] border-[#2C2C2C]/25 dark:border-[#F4EFEA]/25"}`}
                    >
                        {elegido && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate first-letter:uppercase">{ins.name}</span>
                        <span className="block text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 truncate">
                            {ins.category && ins.category.toLowerCase() !== "todas" ? ins.category : "Para todas las presentaciones"}
                        </span>
                    </span>
                </button>
                <AnimatePresence initial={false}>
                    {comp && (
                        <motion.div
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0, transition: { duration: 0.16, ease: EASE_OUT } }}
                            exit={{ opacity: 0, x: 6, transition: { duration: 0.1, ease: "easeOut" } }}
                        >
                            <Cantidad
                                chico
                                valor={comp.qty}
                                unidad={unidadDe(ins.name)}
                                paso={esAlcohol ? 5 : 1}
                                etiqueta={`cantidad de ${ins.name}`}
                                onCambiar={n => updateComponentQty(comp.id, n)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </li>
        );
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setBases(bases.filter(b => b.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    return (
        <div className="space-y-8 pb-12 anim-entrada relative">
            <header className="flex flex-col items-center text-center gap-6 bg-white dark:bg-[#242723] p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-[#E6DFD5] dark:border-[#353B33] transition-colors duration-300">
                <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] text-xs font-bold tracking-widest uppercase">
                        <Layers className="w-3.5 h-3.5" />
                        Fórmulas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand">
                        Bases de Productos
                    </h1>
                    <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg leading-relaxed font-medium transition-colors">
                        Definí los componentes y cantidades predeterminadas para cada tipo de producto.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={removeDuplicateProducts}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition"
                    >
                        <Sparkles className="w-5 h-5" />
                        Limpiar Duplicados
                    </button>
                    <button
                        onClick={clearAllProductos}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] border border-[#E6DFD5] dark:border-[#353B33] font-bold hover:bg-[#C9866F]/10 transition"
                    >
                        <Trash2 className="w-5 h-5" />
                        Vaciar Catálogo
                    </button>
                    <button
                        onClick={() => {
                            const defaultCat = categorias[0]?.name || "Frascos de 50 ML";
                            setFormData({
                                name: defaultCat,
                                components: [],
                                essenceGender: defaultCat.toLowerCase().includes("difusor") || defaultCat.toLowerCase().includes("auto") ? "Ambiente" : "Todos",
                                essenceGrams: defaultCat.toLowerCase().includes("50") ? 15 : defaultCat.toLowerCase().includes("30") ? 10 : defaultCat.toLowerCase().includes("difusor") ? 35 : 5,
                                category: defaultCat
                            });
                            applySuggestedInsumosForCategory(defaultCat);
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold hover:shadow-xl hover:shadow-[#7D9878]/20 active:scale-95 transition"
                    >
                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                        Nueva Base
                    </button>
                </div>
            </header>

            <div className="space-y-4">
                {bases.map((base) => {
                    const estimatedCost = base.components.reduce((acc, comp) => {
                        const sourceItem = comp.type === "Esencia"
                            ? (esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase()))
                            : (insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase()));
                        if (sourceItem) {
                            let unitCost = 0;
                            if (comp.type === "Esencia") {
                                const esc = sourceItem as any;
                                const p100 = parseFloat(esc.price100g);
                                const p30 = parseFloat(esc.price30g);
                                if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                                else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                                else unitCost = sourceItem.cost / (sourceItem.qty || 1);
                            } else {
                                unitCost = sourceItem.cost / (sourceItem.qty || 1);
                            }
                            return acc + (unitCost * comp.qty);
                        }
                        return acc;
                    }, 0);

                    return (
                        <div key={base.id} className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl p-5 shadow-sm hover:border-[#7D9878]/50 transition flex flex-col xl:flex-row xl:items-center justify-between gap-5 group">
                            {/* 1. Left: Icon, Base Name & Metadata Badges */}
                            <div className="flex items-center gap-4 min-w-[280px]">
                                <div className="p-3.5 bg-[#7D9878]/10 rounded-2xl text-[#7D9878] dark:text-[#A3B69B] transition-transform shrink-0">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand leading-snug">{base.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-bold text-[#7D9878] dark:text-[#A3B69B]">
                                            {base.category || "No asignada"}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-[11px] font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                            Género: {base.essenceGender || "Todos"}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-lg bg-[#7D9878]/10 border border-[#7D9878]/20 text-[11px] font-black text-[#7D9878] dark:text-[#A3B69B]">
                                            {base.essenceGrams || 10}{base.essenceGender === "Limpia pisos" ? "ml" : "g"} Esencia
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Center: Components Inline Tags */}
                            <div className="flex-1 flex flex-wrap items-center gap-2 py-2 xl:py-0 border-y xl:border-y-0 border-[#E6DFD5] dark:border-[#353B33]">
                                {base.components.map((comp, idx) => {
                                    const exists = comp.type === "Esencia"
                                        ? esencias.some(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
                                        : insumos.some(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

                                    return (
                                        <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${exists ? "bg-[#F9F6F0] dark:bg-[#1B1D1A] border-[#E6DFD5] dark:border-[#353B33] text-[#2C2C2C]/80 dark:text-[#F4EFEA]/80" : "bg-[#C9866F]/10 border-[#C9866F]/30 text-[#C9866F]"}`}>
                                            {comp.type === "Esencia" ? <FlaskConical className="w-3.5 h-3.5 text-[#7D9878]" /> : <Package className="w-3.5 h-3.5 text-[#7D9878]" />}
                                            {comp.name} <span className="font-black text-[#2C2C2C] dark:text-[#F4EFEA]">({comp.qty} {comp.type === "Esencia" ? (base.essenceGender === "Limpia pisos" ? "ml" : "g") : "un."})</span>
                                        </span>
                                    );
                                })}
                            </div>

                            {/* 3. Right: Cost & Action Button */}
                            <div className="flex items-center justify-between xl:justify-end gap-5 shrink-0">
                                <div className="text-left xl:text-right">
                                    <p className="text-[10px] font-black text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase tracking-widest">Costo Estimado</p>
                                    <p className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">${estimatedCost.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</p>
                                </div>

                                <button
                                    onClick={() => setIsGeneratingModalOpen(base.id)}
                                    className="px-5 py-3 bg-[#7D9878] hover:bg-[#6b8566] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition shadow-md shadow-[#7D9878]/25 hover:scale-[1.02] active:scale-95 flex items-center gap-2 font-brand whitespace-nowrap"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generar Catálogo
                                </button>

                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => openEditModal(base)} 
                                        className="p-2.5 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#7D9878] dark:hover:text-[#A3B69B] hover:bg-[#7D9878]/10 rounded-xl transition"
                                        title="Editar Base"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setItemToDelete(base.id)} 
                                        className="p-2.5 text-[#2C2C2C]/40 dark:text-[#F4EFEA]/40 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition"
                                        title="Eliminar Base"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ventana de nueva base / editar base: tres pasos (presentación, insumos y resumen) */}
            <Ventana abierta={isAddModalOpen} onCerrar={handleCloseModal} cerrarAlTocarFondo={false}>
            {isAddModalOpen && (
                    <div className="bg-white dark:bg-[#242723] rounded-[1.75rem] shadow-2xl shadow-black/10 w-full max-w-2xl overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] flex flex-col max-h-[calc(100dvh-6rem)]">

                        {/* Encabezado: nombre de la base y pasos */}
                        <div className="px-7 pt-6 pb-5 border-b border-[#E6DFD5]/70 dark:border-[#353B33]/70 shrink-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5A7356] dark:text-[#A3B69B]">
                                        {editingId ? "Editar base" : "Nueva base"}
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold leading-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand truncate">
                                        {formData.name.trim() || "Sin nombre"}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="w-10 h-10 rounded-full bg-[#2C2C2C]/[0.05] dark:bg-white/[0.06] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 hover:bg-[#2C2C2C]/10 dark:hover:bg-white/[0.12] hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] active:scale-[0.94] transition-[background-color,color,transform] duration-150 ease-out flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                                    title="Cerrar"
                                    aria-label="Cerrar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <ol aria-label="Pasos" className="mt-5 flex items-center gap-2">
                                {PASOS.map((p, i) => {
                                    const estado = p.n === modalStep ? "actual" : p.n < modalStep ? "hecho" : "pendiente";
                                    return (
                                        <li key={p.n} className={`flex items-center gap-2 ${i < PASOS.length - 1 ? "flex-1" : ""}`}>
                                            <button
                                                type="button"
                                                onClick={() => irAPaso(p.n)}
                                                aria-current={estado === "actual" ? "step" : undefined}
                                                className="group flex items-center gap-2 rounded-full pr-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50"
                                            >
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold tabular-nums transition-[background-color,color,box-shadow] duration-200 ${estado === "actual"
                                                    ? "bg-[#7D9878] text-white shadow-[0_0_0_4px_rgba(125,152,120,0.18)]"
                                                    : estado === "hecho"
                                                        ? "bg-[#7D9878]/15 text-[#5A7356] dark:text-[#A3B69B]"
                                                        : "bg-[#2C2C2C]/[0.05] dark:bg-white/[0.06] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45"}`}
                                                >
                                                    {estado === "hecho" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : p.n}
                                                </span>
                                                <span className={`text-sm font-semibold transition-colors duration-200 ${estado === "actual"
                                                    ? "text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                    : estado === "hecho"
                                                        ? "hidden sm:inline text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75"
                                                        : "hidden sm:inline text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 group-hover:text-[#2C2C2C]/70 dark:group-hover:text-[#F4EFEA]/70"}`}
                                                >
                                                    {p.titulo}
                                                </span>
                                            </button>
                                            {i < PASOS.length - 1 && (
                                                <span aria-hidden className="relative flex-1 h-px bg-[#E6DFD5] dark:bg-[#353B33] overflow-hidden">
                                                    <motion.span
                                                        className="absolute inset-0 bg-[#7D9878] dark:bg-[#A3B69B] origin-left"
                                                        initial={false}
                                                        animate={{ scaleX: modalStep > p.n ? 1 : 0 }}
                                                        transition={{ duration: 0.3, ease: EASE_OUT }}
                                                    />
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>

                        {/* Contenido del paso: avanza hacia la izquierda, vuelve hacia la derecha */}
                        <div className="relative flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <AnimatePresence mode="wait" initial={false} custom={direccion}>
                                <motion.div
                                    key={modalStep}
                                    custom={direccion}
                                    variants={PASO_VARIANTES}
                                    initial="entra"
                                    animate="quieto"
                                    exit="sale"
                                    className="px-7 py-6 min-h-[380px]"
                                >
                                    {/* PASO 1: presentación, nombre, género y esencia */}
                                    {modalStep === 1 && (
                                        <div className="space-y-7">
                                            <fieldset>
                                                <legend className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Presentación</legend>
                                                <p className="mt-0.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                    Al cambiarla se cargan sus insumos y la dosis de esencia sugerida.
                                                </p>
                                                <div role="radiogroup" aria-label="Presentación" className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {PRESENTACIONES.map(p => {
                                                        const elegido = formData.category === p.id;
                                                        const Icono = p.icono;
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={elegido}
                                                                onClick={() => elegirPresentacion(p.id)}
                                                                className={`relative flex items-center gap-3 p-3.5 rounded-2xl border text-left cursor-pointer active:scale-[0.98] transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50 ${elegido
                                                                    ? "border-[#7D9878] bg-[#7D9878]/[0.07] dark:bg-[#7D9878]/[0.12] shadow-[inset_0_0_0_1px_#7D9878]"
                                                                    : "border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]/50 hover:bg-[#F9F6F0] dark:hover:bg-[#1B1D1A]"}`}
                                                            >
                                                                <span className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 transition-colors duration-150 ${elegido
                                                                    ? "bg-[#7D9878] text-white"
                                                                    : "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#5A7356] dark:text-[#A3B69B]"}`}
                                                                >
                                                                    {Icono ? <Icono className="w-5 h-5" /> : (
                                                                        <>
                                                                            <span className="text-sm font-bold leading-none tabular-nums">{p.ml}</span>
                                                                            <span className="mt-0.5 text-[9px] font-semibold uppercase leading-none">ml</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                                <span className="min-w-0 pr-6">
                                                                    <span className="block text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{p.titulo}</span>
                                                                    <span className="block text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{p.detalle}</span>
                                                                </span>
                                                                <AnimatePresence initial={false}>
                                                                    {elegido && (
                                                                        <motion.span
                                                                            initial={{ opacity: 0, scale: 0.6 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}
                                                                            transition={{ duration: 0.18, ease: EASE_OUT }}
                                                                            className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#7D9878] text-white flex items-center justify-center"
                                                                        >
                                                                            <Check className="w-3 h-3" strokeWidth={3} />
                                                                        </motion.span>
                                                                    )}
                                                                </AnimatePresence>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                                                <label className="block sm:col-span-2">
                                                    <span className={ETIQUETA}>Nombre de la base</span>
                                                    <input
                                                        type="text"
                                                        value={formData.name}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                        placeholder="Ej: Frascos de 50 ML"
                                                        className={CAMPO}
                                                    />
                                                </label>
                                                <div>
                                                    <span className={ETIQUETA}>Esencias para</span>
                                                    {esAmbiente(formData.category) ? (
                                                        <div className={`${CAMPO} flex items-center gap-2 text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70`}>
                                                            <Flower2 className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                                                            Ambiente
                                                        </div>
                                                    ) : (
                                                        <Selector
                                                            aria-label="Esencias para"
                                                            value={formData.essenceGender === "Ambiente" ? "Todos" : formData.essenceGender}
                                                            onChange={e => setFormData({ ...formData, essenceGender: e.target.value })}
                                                            className={`${CAMPO} cursor-pointer`}
                                                        >
                                                            <option value="Todos">Todos los géneros</option>
                                                            {generos
                                                                .filter(g => g.toLowerCase() !== "ambiente")
                                                                .map((g, i) => <option key={i} value={g}>{g}</option>)}
                                                        </Selector>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className={ETIQUETA}>Esencia por frasco</span>
                                                    <Cantidad
                                                        valor={formData.essenceGrams}
                                                        unidad="g"
                                                        etiqueta="gramos de esencia por frasco"
                                                        onCambiar={n => setFormData(prev => ({ ...prev, essenceGrams: n }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PASO 2: insumos de la presentación (los de otras, plegados) */}
                                    {modalStep === 2 && (
                                        <div className="space-y-5">
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Insumos fijos</h3>
                                                    <p className="mt-0.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                        Lo que lleva cada frasco además de la esencia · {formData.components.length} {formData.components.length === 1 ? "elegido" : "elegidos"}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => applySuggestedInsumosForCategory(formData.category)}
                                                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-[#5A7356] dark:text-[#A3B69B] hover:bg-[#7D9878]/10 active:scale-[0.97] transition-[background-color,transform] duration-150 shrink-0"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5" />
                                                    Usar sugeridos
                                                </button>
                                            </div>

                                            {insumosPropios.length > 0 ? (
                                                <ul className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 overflow-hidden">
                                                    {insumosPropios.map(filaInsumo)}
                                                </ul>
                                            ) : (
                                                <p className="rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-6 text-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                    No hay insumos cargados para esta presentación.
                                                </p>
                                            )}

                                            {insumosOtros.length > 0 && (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setVerOtrosInsumos(v => !v)}
                                                        aria-expanded={verOtrosInsumos}
                                                        className="inline-flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-lg text-xs font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.04] dark:hover:bg-white/[0.06] transition-[background-color,color] duration-150"
                                                    >
                                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ease-out ${verOtrosInsumos ? "rotate-180" : ""}`} />
                                                        {verOtrosInsumos ? "Ocultar" : "Ver"} insumos de otras presentaciones ({insumosOtros.length})
                                                    </button>
                                                    <AnimatePresence initial={false}>
                                                        {verOtrosInsumos && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1, transition: { duration: 0.24, ease: EASE_OUT } }}
                                                                exit={{ height: 0, opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
                                                                className="overflow-hidden"
                                                            >
                                                                <ul className="mt-2 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 overflow-hidden">
                                                                    {insumosOtros.map(filaInsumo)}
                                                                </ul>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* PASO 3: resumen y costo */}
                                    {modalStep === 3 && (
                                        <div className="space-y-5">
                                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {[
                                                    ["Presentación", presentacionActual?.titulo ?? formData.category],
                                                    ["Esencias para", esAmbiente(formData.category) ? "Ambiente" : formData.essenceGender === "Todos" ? "Todos los géneros" : formData.essenceGender],
                                                    ["Esencia por frasco", `${formData.essenceGrams} g`],
                                                ].map(([titulo, valor]) => (
                                                    <div key={titulo} className="rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] px-4 py-3">
                                                        <dt className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">{titulo}</dt>
                                                        <dd className="mt-0.5 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{valor}</dd>
                                                    </div>
                                                ))}
                                            </dl>

                                            {formData.components.length === 0 ? (
                                                <div className="flex items-start gap-3 rounded-2xl border border-[#C9866F]/30 bg-[#C9866F]/[0.07] p-4">
                                                    <TriangleAlert className="w-5 h-5 text-[#C9866F] shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Todavía no elegiste insumos</p>
                                                        <p className="mt-0.5 text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                                            La base se puede guardar igual, pero el costo de sus insumos va a quedar en $ 0.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => irAPaso(2)}
                                                            className="mt-2 text-xs font-semibold text-[#97604D] dark:text-[#DBA793] hover:underline"
                                                        >
                                                            Elegir insumos
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] overflow-hidden">
                                                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                                        <span className="flex-1">Insumo</span>
                                                        <span>Cantidad</span>
                                                        <span className="w-24 text-right">Costo</span>
                                                    </div>
                                                    <ul className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                                        {formData.components.map(comp => (
                                                            <li key={comp.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                                                <span className="flex-1 min-w-0 truncate text-[#2C2C2C] dark:text-[#F4EFEA] first-letter:uppercase">{comp.name}</span>
                                                                <span className="text-xs tabular-nums text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                                    {comp.qty} {unidadDe(comp.name, comp.type)}
                                                                </span>
                                                                <span className="w-24 text-right font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                    {pesos(calculateComponentCost(comp))}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <div className="flex items-center justify-between gap-3 px-4 py-4 border-t border-[#E6DFD5] dark:border-[#353B33] bg-[#7D9878]/[0.06] dark:bg-[#7D9878]/[0.1]">
                                                        <span className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Costo de insumos por frasco</span>
                                                        <span className="text-xl font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(totalFormDataCost)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="flex items-start gap-2 text-xs leading-relaxed text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                                <Info className="w-4 h-4 shrink-0 mt-px text-[#7D9878] dark:text-[#A3B69B]" />
                                                La esencia ({formData.essenceGrams} g) no está incluida: se suma sola al generar los productos, según el precio de cada esencia.
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Pie: volver / continuar */}
                        <div className="px-7 py-4 border-t border-[#E6DFD5]/70 dark:border-[#353B33]/70 flex items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={modalStep === 1 ? handleCloseModal : () => irAPaso((modalStep - 1) as 1 | 2)}
                                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl text-sm font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#2C2C2C]/[0.05] dark:hover:bg-white/[0.07] active:scale-[0.97] transition-[background-color,color,transform] duration-150"
                            >
                                {modalStep === 1 ? "Cancelar" : (
                                    <>
                                        <ChevronLeft className="w-4 h-4" />
                                        Atrás
                                    </>
                                )}
                            </button>
                            <span className="hidden sm:block text-xs tabular-nums text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">Paso {modalStep} de 3</span>
                            {modalStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => irAPaso((modalStep + 1) as 2 | 3)}
                                    className="inline-flex items-center gap-1.5 h-11 pl-5 pr-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                                >
                                    Continuar
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleAddSubmit}
                                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                                >
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    {editingId ? "Guardar cambios" : "Crear base"}
                                </button>
                            )}
                        </div>
                    </div>
            )}
            </Ventana>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Base"
                message="¿Estás seguro de que deseas eliminar esta base? No afectará a los productos ya creados, pero no estará disponible para nuevos."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            {/* Generar productos desde una base */}
            <Ventana abierta={!!isGeneratingModalOpen} onCerrar={() => { if (!isGenerating) setIsGeneratingModalOpen(null); }} z={110} etiqueta="Generar productos">
            {isGeneratingModalOpen && (() => {
                    const baseActiva = bases.find(b => b.id === isGeneratingModalOpen);
                    const categoria = baseActiva?.category || targetCategory || "Perfumería Fina";
                    const generar = async () => {
                        if (!isGeneratingModalOpen || isGenerating) return;
                        setIsGenerating(true);
                        try {
                            const result = await generateProductsFromBase(isGeneratingModalOpen, categoria);
                            setIsGeneratingModalOpen(null);
                            if (result) setGenerationResult(result);
                        } finally {
                            setIsGenerating(false);
                        }
                    };
                    return (
                    <PanelVentana ancho="sm">
                        <CabeceraVentana
                            etiqueta="Generar productos"
                            titulo={baseActiva?.name || categoria}
                            descripcion="Se crea un producto por cada esencia con precio cargado."
                            icono={Sparkles}
                            onCerrar={() => setIsGeneratingModalOpen(null)}
                            cerrarDeshabilitado={isGenerating}
                        />
                        <CuerpoVentana className="space-y-4">
                            <dl className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] px-4 py-3">
                                    <dt className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Presentación</dt>
                                    <dd className="mt-0.5 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{categoria}</dd>
                                </div>
                                <div className="rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] px-4 py-3">
                                    <dt className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">Esencia por frasco</dt>
                                    <dd className="mt-0.5 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                        {baseActiva?.essenceGrams || 10} g · {baseActiva?.essenceGender === "Todos" || !baseActiva?.essenceGender ? "todos los géneros" : baseActiva.essenceGender}
                                    </dd>
                                </div>
                            </dl>
                            <p className="flex items-start gap-2 text-xs leading-relaxed text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                <Info className="w-4 h-4 shrink-0 mt-px text-[#7D9878] dark:text-[#A3B69B]" />
                                Los productos que ya existen no se duplican: se actualizan con los costos nuevos.
                            </p>
                        </CuerpoVentana>
                        <PieVentana>
                            <button type="button" onClick={() => setIsGeneratingModalOpen(null)} disabled={isGenerating} className={BOTON_SECUNDARIO}>
                                Cancelar
                            </button>
                            <button type="button" onClick={generar} disabled={isGenerating} aria-busy={isGenerating} className={BOTON_PRINCIPAL}>
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGenerating ? "Generando…" : "Generar productos"}
                            </button>
                        </PieVentana>
                    </PanelVentana>
                    );
            })()}
            </Ventana>

            {/* Resultado de la generación */}
            <Ventana abierta={!!generationResult} onCerrar={() => setGenerationResult(null)} z={120} etiqueta="Productos generados">
            {generationResult && (
                    <PanelVentana ancho="sm">
                        <div className="px-7 pt-8 pb-6 text-center">
                            <span className="anim-pop mx-auto w-12 h-12 rounded-full bg-[#7D9878] text-white flex items-center justify-center shadow-lg shadow-[#7D9878]/30">
                                <Check className="w-6 h-6" strokeWidth={3} />
                            </span>
                            <h2 className="mt-4 text-2xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">Productos listos</h2>
                            <p className="mt-1 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Ya están en la lista de precios.</p>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#7D9878]/[0.08] dark:bg-[#7D9878]/[0.12] px-4 py-4">
                                    <p className="text-3xl font-bold tabular-nums text-[#3F5A3C] dark:text-[#A3B69B]">{generationResult.created}</p>
                                    <p className="mt-1 text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">nuevos</p>
                                </div>
                                <div className="rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] px-4 py-4">
                                    <p className="text-3xl font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{generationResult.updated}</p>
                                    <p className="mt-1 text-xs font-medium text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">actualizados</p>
                                </div>
                            </div>
                        </div>
                        <PieVentana className="justify-end">
                            <button type="button" autoFocus onClick={() => setGenerationResult(null)} className={BOTON_PRINCIPAL}>
                                Listo
                            </button>
                        </PieVentana>
                    </PanelVentana>
            )}
            </Ventana>
        </div>
    );
}
