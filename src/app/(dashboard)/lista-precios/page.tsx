"use client";

import Link from "next/link";
import {
    Tags,
    Search,
    Filter,
    Edit3,
    Trash2,
    ArrowUpDown,
    Plus,
    ShoppingCart,
    ShoppingBag,
    Store,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ArrowUpRight,
    Sparkles,
    ExternalLink,
    Loader2,
    Copy,
    Check,
    MessageCircle,
    XCircle,
    Clock,
    Wind,
    Car,
    Droplets,
    Package,
    User,
    UserCheck,
    Users,
    Percent,
    TrendingUp,
    Coins,
    Info,
    FlaskConical,
    ArrowRight,
    type LucideIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppContext, Producto } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { exportarListaExcel, exportarListaPDF } from "@/lib/exportar-lista";
import { toast } from "sonner";
import { formatNumber } from "@/lib/format-utils";
import { extractBrand } from "@/lib/product-utils";
import ExportModal from "@/components/ExportModal";
import BotonDescarga, { type EstadoDescarga } from "@/components/BotonDescarga";
import BotonCarrito from "@/components/BotonCarrito";
import EncabezadoPagina from "@/components/EncabezadoPagina";
import { Selector } from "@/components/Desplegable";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, BotonCerrar } from "@/components/ventana-partes";
import ListSelectorToggle from "@/components/ListSelectorToggle";
import PaginationControls from "@/components/PaginationControls";
import Buscador from "@/components/Buscador";

// ── Animaciones ─────────────────────────────────────────────────────
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Botones de cada fila (Fórmula y Ganancia): borde de color, mismo alto que "Agregar"
const BOTON_FILA = "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold shadow-sm shadow-black/[0.03] active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7D9878]/50";
const EASE_CAJON = [0.32, 0.72, 0, 1] as const; // como el panel lateral de iOS

const fondoModal = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Desplegable de filtro con el mismo alto y estilo que el buscador; se marca cuando está en uso.
function FiltroSelect({ icon: Icon, label, value, activo, onChange, children }: {
    icon: LucideIcon;
    label: string;
    value: string;
    activo: boolean;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <Selector
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            resaltado={activo}
            icono={<Icon className={`w-4 h-4 ${activo ? "text-[#7D9878] dark:text-[#A3B69B]" : ""}`} />}
            className="w-full"
        >
            {children}
        </Selector>
    );
}

const getPaginationRange = (currentPage: number, totalPages: number) => {
    const delta = 2;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            range.push(i);
        }
    }

    for (const i of range) {
        if (typeof i === "number") {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
    }

    return rangeWithDots;
};

const getCategoryBadge = (category: string) => {
    const c = (category || "").toLowerCase();
    
    // 50 ML
    if (c.includes("50") || c.includes("50ml") || c.includes("50 ml")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Package className="w-3 h-3 text-emerald-500" />
                {category}
            </span>
        );
    }

    // 30 ML
    if (c.includes("30") || c.includes("30ml") || c.includes("30 ml")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Package className="w-3 h-3 text-cyan-500" />
                {category}
            </span>
        );
    }

    // 100 ML
    if (c.includes("100") || c.includes("100ml") || c.includes("100 ml")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Package className="w-3 h-3 text-indigo-500" />
                {category}
            </span>
        );
    }

    // Difusores / Ambiente / Textil
    if (c.includes("difusor") || c.includes("textil") || c.includes("ambiente")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Wind className="w-3 h-3 text-teal-500" />
                {category}
            </span>
        );
    }

    // Auto
    if (c.includes("auto")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Car className="w-3 h-3 text-amber-500" />
                {category}
            </span>
        );
    }

    // Limpieza / Pisos
    if (c.includes("piso") || c.includes("limp")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Droplets className="w-3 h-3 text-sky-500" />
                {category}
            </span>
        );
    }

    // Perfumería Fina / Perfume
    if (c.includes("fina") || c.includes("perfume")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/30 rounded-full text-xs font-semibold whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-purple-500" />
                {category}
            </span>
        );
    }

    // Dynamic Hash for any other unique Category
    const palettes = [
        { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200/50 dark:border-emerald-500/30", icon: "text-emerald-500" },
        { bg: "bg-cyan-50 dark:bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-200/50 dark:border-cyan-500/30", icon: "text-cyan-500" },
        { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-200/50 dark:border-indigo-500/30", icon: "text-indigo-500" },
        { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200/50 dark:border-amber-500/30", icon: "text-amber-500" },
        { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200/50 dark:border-rose-500/30", icon: "text-rose-500" },
        { bg: "bg-teal-50 dark:bg-teal-500/10", text: "text-teal-700 dark:text-teal-400", border: "border-teal-200/50 dark:border-teal-500/30", icon: "text-teal-500" },
    ];

    let hash = 0;
    for (let i = 0; i < c.length; i++) {
        hash = c.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIdx = Math.abs(hash) % palettes.length;
    const theme = palettes[colorIdx];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${theme.bg} ${theme.text} border ${theme.border} rounded-full text-xs font-semibold whitespace-nowrap`}>
            <Package className={`w-3 h-3 ${theme.icon}`} />
            {category || "General"}
        </span>
    );
};

const getGenderBadge = (gender: string) => {
    const g = (gender || "").toLowerCase();
    if (g.includes("fem") || g.includes("mujer")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200/50 dark:border-pink-500/20 rounded-full text-xs font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                Femenino
            </span>
        );
    }
    if (g.includes("masc") || g.includes("hombre")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 rounded-full text-xs font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Masculino
            </span>
        );
    }
    if (g.includes("unisex")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20 rounded-full text-xs font-semibold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Unisex
            </span>
        );
    }
    if (g.includes("ambiente") || g.includes("difusor")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/20 rounded-full text-xs font-semibold whitespace-nowrap">
                <Wind className="w-3 h-3 text-teal-500" />
                Ambiente
            </span>
        );
    }
    if (g.includes("muestrario") || g.includes("muestra")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 rounded-full text-xs font-semibold whitespace-nowrap">
                <Package className="w-3 h-3 text-amber-500" />
                Muestrario
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold whitespace-nowrap">
            {gender || "—"}
        </span>
    );
};

const getProductCost = (p: Producto, esencias: any[], insumos: any[]) => {
    if (p.cost && p.cost > 0 && isFinite(p.cost)) return p.cost;
    if (!p.components || p.components.length === 0) return 0;
    
    let totalCost = 0;
    let hasInvalidComponent = false;

    for (const comp of p.components) {
        const sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
            : insumos.find(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

        if (!sourceItem) {
            hasInvalidComponent = true;
            break;
        }

        let unitCost = 0;
        if (comp.type === "Esencia") {
            const esc = sourceItem as any;
            const p100 = typeof esc.price100g === "number" ? esc.price100g : parseFloat(esc.price100g);
            const p30 = typeof esc.price30g === "number" ? esc.price30g : parseFloat(esc.price30g);
            
            if (!isNaN(p100) && p100 > 0 && isFinite(p100)) unitCost = p100 / 100;
            else if (!isNaN(p30) && p30 > 0 && isFinite(p30)) unitCost = p30 / 30;
            else if (sourceItem.cost && sourceItem.cost > 0 && isFinite(sourceItem.cost)) unitCost = sourceItem.cost / (sourceItem.qty || 1);
            else {
                hasInvalidComponent = true;
                break;
            }
        } else {
            if (sourceItem.cost && sourceItem.cost > 0 && isFinite(sourceItem.cost)) unitCost = sourceItem.cost / (sourceItem.qty || 1);
            else {
                hasInvalidComponent = true;
                break;
            }
        }
        totalCost += unitCost * comp.qty;
    }

    if (hasInvalidComponent || totalCost <= 0 || !isFinite(totalCost)) return 0;
    return totalCost;
};

const calculateProfitMargin = (cost: number, price: number): { percentStr: string; gainVal: number | null; isConsultar: boolean } => {
    if (!cost || cost <= 0 || !price || price <= 0 || isNaN(cost) || isNaN(price) || !isFinite(cost) || !isFinite(price)) {
        return { percentStr: "Consultar", gainVal: null, isConsultar: true };
    }
    const gainVal = price - cost;
    const margin = (gainVal / cost) * 100;
    if (!isFinite(margin) || isNaN(margin)) {
        return { percentStr: "Consultar", gainVal: null, isConsultar: true };
    }
    return { percentStr: `+${Math.round(margin)}%`, gainVal, isConsultar: false };
};

const getComponentBreakdown = (p: Producto, esencias: any[], insumos: any[]) => {
    if (!p.components || p.components.length === 0) return [];

    return p.components.map(comp => {
        const sourceItem = comp.type === "Esencia"
            ? esencias.find(e => e.id === comp.id || e.name.toLowerCase() === comp.name.toLowerCase())
            : insumos.find(i => i.id === comp.id || i.name.toLowerCase() === comp.name.toLowerCase());

        if (!sourceItem) {
            return {
                name: comp.name,
                qty: comp.qty,
                type: comp.type,
                unitCost: 0,
                totalCost: 0,
                isConsultar: true
            };
        }

        let unitCost = 0;
        let isConsultar = false;

        if (comp.type === "Esencia") {
            const esc = sourceItem as any;
            const p100 = typeof esc.price100g === "number" ? esc.price100g : parseFloat(esc.price100g);
            const p30 = typeof esc.price30g === "number" ? esc.price30g : parseFloat(esc.price30g);

            if (!isNaN(p100) && p100 > 0 && isFinite(p100)) unitCost = p100 / 100;
            else if (!isNaN(p30) && p30 > 0 && isFinite(p30)) unitCost = p30 / 30;
            else if (sourceItem.cost && sourceItem.cost > 0 && isFinite(sourceItem.cost)) unitCost = sourceItem.cost / (sourceItem.qty || 1);
            else isConsultar = true;
        } else {
            if (sourceItem.cost && sourceItem.cost > 0 && isFinite(sourceItem.cost)) unitCost = sourceItem.cost / (sourceItem.qty || 1);
            else isConsultar = true;
        }

        const totalCost = unitCost * comp.qty;

        return {
            name: comp.name,
            qty: comp.qty,
            type: comp.type,
            unitCost,
            totalCost,
            isConsultar: isConsultar || totalCost <= 0 || !isFinite(totalCost)
        };
    });
};

export default function ListaPreciosPage() {
    const {
        productos,
        esencias,
        insumos,
        categorias,
        usuarios,
        deleteProducto,
        addToCart,
        cart,
        registrarVenta,
        updateCartQuantity,
        currentUser,
        generos,
        promotions,
        paymentInfo,
        isLoading
    } = useAppContext();

    const [profitModalProduct, setProfitModalProduct] = useState<Producto | null>(null);
    const [infoModalProduct, setInfoModalProduct] = useState<Producto | null>(null);
    const [itemDiscounts, setItemDiscounts] = useState<Record<string, { type: "percent" | "fixed"; value: number }>>({});
    const [globalDiscountType, setGlobalDiscountType] = useState<"percent" | "fixed">("percent");
    const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
    const [isSelling, setIsSelling] = useState(false);

    const isAdmin = currentUser?.role === "admin";

    // Mode state: default based on user role (mayorista -> mayorista, minorista/admin -> minorista)
    const [mode, setMode] = useState<"minorista" | "mayorista">("minorista");
    const isMinorista = mode === "minorista";

    // Sync initial mode with user role once loaded
    useEffect(() => {
        if (currentUser?.role === "mayorista") {
            setMode("mayorista");
        }
    }, [currentUser?.role]);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Todas");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [sizeFilter, setSizeFilter] = useState("Todos");
    const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "id-asc" | "id-desc" | "none">("none");
    const [showOutOfStock, setShowOutOfStock] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [openItemDiscount, setOpenItemDiscount] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showConsult, setShowConsult] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'transferencia' | 'efectivo'>('efectivo');
    const [paymentLink, setPaymentLink] = useState<string>("");
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(null);
    // Descarga en curso (se ve en el botón redondo de Excel o PDF)
    const [descarga, setDescarga] = useState<{ formato: "excel" | "pdf"; estado: EstadoDescarga; progreso: number } | null>(null);
    const itemsPerPage = 10;

    const agregarAlPedido = (producto: Producto) => {
        addToCart(producto, isMinorista ? "minorista" : "mayorista");
    };

    // Escape cierra la ventana que esté abierta
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setProfitModalProduct(null);
            setInfoModalProduct(null);
            setIsCartOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Filter and Sort productos based on current mode
    const filteredAndSortedProductos = useMemo(() => {
        let result = [...productos];

        if (search) {
            const lowSearch = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowSearch) ||
                p.id.toLowerCase().includes(lowSearch)
            );
        }

        if (categoryFilter !== "Todas") {
            const lowCatFilter = categoryFilter.trim().toLowerCase();
            result = result.filter(p => {
                const pCat = (p.category || "").trim().toLowerCase();
                return pCat.includes(lowCatFilter) || lowCatFilter.includes(pCat);
            });
        }

        if (genderFilter !== "Todos") {
            const lowGenderFilter = genderFilter.toLowerCase();
            result = result.filter(p => p.gender?.toLowerCase() === lowGenderFilter);
        }

        if (!showOutOfStock) {
            result = result.filter(p => !p.availabilityStatus || p.availabilityStatus !== "no-disponible");
        }

        if (!showConsult) {
            result = result.filter(p => {
                const price = isMinorista ? Number(p.priceMinorista) : Number(p.price);
                return !(isNaN(price) || price <= 0);
            });
        }

        if (sortBy === "price-asc") {
            result.sort((a, b) => {
                const priceA = isMinorista ? Number(a.priceMinorista) || 0 : Number(a.price) || 0;
                const priceB = isMinorista ? Number(b.priceMinorista) || 0 : Number(b.price) || 0;
                return priceA - priceB;
            });
        } else if (sortBy === "price-desc") {
            result.sort((a, b) => {
                const priceA = isMinorista ? Number(a.priceMinorista) || 0 : Number(a.price) || 0;
                const priceB = isMinorista ? Number(b.priceMinorista) || 0 : Number(b.price) || 0;
                return priceB - priceA;
            });
        }

        if (sortBy === "id-asc") {
            result.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        } else if (sortBy === "id-desc") {
            result.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
        }

        return result;
    }, [productos, search, categoryFilter, genderFilter, sortBy, showOutOfStock, showConsult, isMinorista]);

    const totalPages = Math.ceil(filteredAndSortedProductos.length / itemsPerPage);
    const paginatedProductos = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedProductos.slice(start, start + itemsPerPage);
    }, [filteredAndSortedProductos, currentPage]);

    const cartFiltered = useMemo(() => {
        return cart.filter(item => isMinorista ? item.priceType === "minorista" : item.priceType !== "minorista");
    }, [cart, isMinorista]);

    const getItemPricing = useCallback((item: { producto: Producto; quantity: number; priceType: "mayorista" | "minorista"; customPrice?: number }) => {
        const baseUnitPrice = isMinorista ? (item.producto.priceMinorista || 0) : (item.producto.price || 0);
        const key = `${item.producto.id}_${item.priceType}`;
        const disc = itemDiscounts[key] || { type: "percent", value: 0 };

        let unitDiscount = 0;
        if (disc.value > 0) {
            if (disc.type === "percent") {
                unitDiscount = Math.round((baseUnitPrice * Math.min(100, disc.value)) / 100);
            } else {
                unitDiscount = Math.min(baseUnitPrice, disc.value);
            }
        }

        const effectiveUnitPrice = Math.max(0, baseUnitPrice - unitDiscount);
        const itemSubtotal = baseUnitPrice * item.quantity;
        const itemTotalDiscount = unitDiscount * item.quantity;
        const itemFinalTotal = effectiveUnitPrice * item.quantity;

        const unitCost = getProductCost(item.producto, esencias, insumos);
        const hasInvalidCost = !unitCost || unitCost <= 0 || !isFinite(unitCost);
        const itemTotalCost = (unitCost || 0) * item.quantity;

        const itemNetProfit = (!hasInvalidCost && isFinite(itemFinalTotal - itemTotalCost)) ? (itemFinalTotal - itemTotalCost) : null;
        const itemMarginPercent = (!hasInvalidCost && itemTotalCost > 0 && itemNetProfit !== null) ? (itemNetProfit / itemTotalCost) * 100 : null;

        return {
            key,
            baseUnitPrice,
            unitDiscount,
            effectiveUnitPrice,
            itemSubtotal,
            itemTotalDiscount,
            itemFinalTotal,
            unitCost,
            hasInvalidCost,
            itemTotalCost,
            itemNetProfit,
            itemMarginPercent,
            disc
        };
    }, [isMinorista, itemDiscounts, esencias, insumos]);

    // Totales del pedido. Primero el descuento de cada producto (por unidad) y después, sobre lo que queda,
    // el descuento a todo el pedido: en % o un monto fijo en $ que se resta UNA vez del total.
    const cartSummary = useMemo(() => {
        let baseSubtotal = 0;
        let itemsDiscount = 0;
        let subtotalConDescuentos = 0;
        let totalCost = 0;
        let hasAnyInvalidCost = false;

        for (const item of cartFiltered) {
            const pricing = getItemPricing(item);
            baseSubtotal += pricing.itemSubtotal;
            itemsDiscount += pricing.itemTotalDiscount;
            subtotalConDescuentos += pricing.itemFinalTotal;
            totalCost += pricing.itemTotalCost;
            if (pricing.hasInvalidCost) hasAnyInvalidCost = true;
        }

        let orderDiscount = 0;
        if (globalDiscountValue > 0 && subtotalConDescuentos > 0) {
            orderDiscount = globalDiscountType === "percent"
                ? Math.round((subtotalConDescuentos * Math.min(100, globalDiscountValue)) / 100)
                : Math.min(subtotalConDescuentos, Math.round(globalDiscountValue));
        }
        const totalFinal = subtotalConDescuentos - orderDiscount;
        // Parte del precio de cada producto que queda después del descuento al pedido (se reparte en proporción)
        const factorPedido = subtotalConDescuentos > 0 ? totalFinal / subtotalConDescuentos : 1;

        const netProfit = (!hasAnyInvalidCost && isFinite(totalFinal - totalCost)) ? (totalFinal - totalCost) : null;
        const marginPercent = (!hasAnyInvalidCost && totalCost > 0 && netProfit !== null) ? (netProfit / totalCost) * 100 : null;

        return {
            baseSubtotal,
            itemsDiscount,
            subtotalConDescuentos,
            orderDiscount,
            totalDiscount: itemsDiscount + orderDiscount,
            totalFinal,
            factorPedido,
            totalCost,
            hasAnyInvalidCost,
            netProfit,
            marginPercent
        };
    }, [cartFiltered, getItemPricing, globalDiscountType, globalDiscountValue]);

    const handleVender = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartFiltered.length === 0 || isSelling) return;

        // El precio final de cada ítem (con su descuento y su parte del descuento al pedido) se calcula acá
        // y se manda tal cual, así la venta suma exactamente el "Total a cobrar".
        const items = cartFiltered.map(item => ({
            producto: item.producto,
            quantity: item.quantity,
            priceType: item.priceType,
            unitPrice: Math.round(getItemPricing(item).effectiveUnitPrice * cartSummary.factorPedido * 100) / 100,
        }));

        const enCero = items.filter(i => !(i.unitPrice > 0));
        if (enCero.length > 0 && !window.confirm(
            `Estos productos quedan en $0: ${enCero.map(i => i.producto.name).join(", ")}.\n\n¿Registrar la venta igual?`
        )) return;

        setIsSelling(true);
        const resultado = await registrarVenta({ items, customerName, paymentMethod });
        setIsSelling(false);
        if (!resultado.ok) return;

        setCustomerName("");
        setItemDiscounts({});
        setGlobalDiscountValue(0);
        setOrderSuccess(true);
        setTimeout(() => {
            setIsCartOpen(false);
            setOrderSuccess(false);
        }, 2500);
    };

    const handleClearCart = () => {
        cartFiltered.forEach(item => {
            updateCartQuantity(item.producto.id, item.priceType, 0);
        });
        setItemDiscounts({});
        setGlobalDiscountValue(0);
    };

    // Al confirmar en la ventana de exportar, la ventana se cierra y el avance se ve en el botón redondo
    const handlePerformExport = async (data: Producto[], format: "excel" | "pdf") => {
        const lista = isMinorista ? "Minorista" : "Mayorista";
        setExportFormat(null);
        setDescarga({ formato: format, estado: "descargando", progreso: 0 });
        const alAvanzar = (progreso: number) => setDescarga(d => d && d.formato === format ? { ...d, progreso } : d);
        // Que la animación se llegue a ver aunque el archivo salga enseguida
        const minimo = new Promise(r => setTimeout(r, 900));
        try {
            await (format === "excel"
                ? exportarListaExcel({ lista, productos: data, alAvanzar })
                : exportarListaPDF({ lista, productos: data, alAvanzar }));
            await minimo;
            setDescarga({ formato: format, estado: "listo", progreso: 1 });
            setTimeout(() => setDescarga(d => d?.estado === "listo" ? null : d), 2600);
        } catch (err) {
            console.error("Error al exportar:", err);
            await minimo;
            setDescarga(d => d ? { ...d, estado: "error" } : d);
            toast.error("No se pudo generar el archivo", { description: "Probá de nuevo en un momento." });
            setTimeout(() => setDescarga(d => d?.estado === "error" ? null : d), 3500);
        }
    };
    const estadoDescarga = (formato: "excel" | "pdf"): EstadoDescarga => descarga?.formato === formato ? descarga.estado : "reposo";

    const unidadesCarrito = cartFiltered.reduce((acc, i) => acc + i.quantity, 0);
    const hayFiltros = search !== "" || categoryFilter !== "Todas" || genderFilter !== "Todos" || sortBy !== "none";
    const limpiarFiltros = () => {
        setSearch("");
        setCategoryFilter("Todas");
        setGenderFilter("Todos");
        setSortBy("none");
        setCurrentPage(1);
    };

    return (
        <div className={`space-y-6 ${cartFiltered.length > 0 ? "pb-28" : "pb-12"}`}>
            {/* Encabezado: qué lista es, selector y acciones */}
            <EncabezadoPagina
                icono={isMinorista ? ShoppingBag : Store}
                titulo={isMinorista ? "Lista minorista" : "Lista mayorista"}
                descripcion={<>
                    {isMinorista ? "Precios para el consumidor final." : "Tus precios mayoristas y pedidos rápidos."}
                    <span className="inline-flex items-center gap-1 ml-1.5">
                        <Info className="w-3.5 h-3.5 text-[#7D9878] dark:text-[#A3B69B]" />
                        Perfumería fina: 50 ml.
                    </span>
                </>}
            >
                <ListSelectorToggle
                    activeMode={mode}
                    onSelectMode={(newMode) => {
                        setMode(newMode);
                        setCurrentPage(1);
                    }}
                />
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex items-center gap-2 h-10 pl-3.5 pr-2.5 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-sm shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150 whitespace-nowrap"
                >
                    <ShoppingBag className="w-4 h-4" />
                    Ver pedido
                    <span
                        key={cartFiltered.length}
                        className={`min-w-6 h-6 px-1.5 rounded-lg text-xs font-bold tabular-nums flex items-center justify-center ${cartFiltered.length > 0 ? "anim-pop bg-white text-[#5A7356]" : "bg-white/20"}`}
                    >
                        {cartFiltered.length}
                    </span>
                </button>
                <div className="flex items-start gap-2">
                    {(["excel", "pdf"] as const).map(formato => (
                        <BotonDescarga
                            key={formato}
                            formato={formato}
                            estado={estadoDescarga(formato)}
                            progreso={descarga?.formato === formato ? descarga.progreso : 0}
                            deshabilitado={descarga?.estado === "descargando"}
                            onClick={() => setExportFormat(formato)}
                        />
                    ))}
                </div>
            </EncabezadoPagina>

            {/* Buscador y filtros en una sola barra pareja */}
            <div className="anim-entrada [animation-delay:60ms] bg-white dark:bg-[#242723] p-3 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col lg:flex-row gap-3">
                <Buscador
                    valor={search}
                    onCambiar={v => { setSearch(v); setCurrentPage(1); }}
                    placeholder="Buscar por nombre o código…"
                    aria-label="Buscar productos"
                    fondo="crema"
                    className="flex-1 min-w-0"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex gap-3">
                    <FiltroSelect
                        icon={Tags}
                        label="Categoría"
                        value={categoryFilter}
                        activo={categoryFilter !== "Todas"}
                        onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
                    >
                        <option value="Todas">Todas las categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </FiltroSelect>

                    <FiltroSelect
                        icon={Users}
                        label="Género"
                        value={genderFilter}
                        activo={genderFilter !== "Todos"}
                        onChange={(v) => { setGenderFilter(v); setCurrentPage(1); }}
                    >
                        <option value="Todos">Todos los géneros</option>
                        {generos.map(g => (
                            <option key={typeof g === 'string' ? g : (g as any).id} value={typeof g === 'string' ? g : (g as any).name}>
                                {typeof g === 'string' ? g : (g as any).name}
                            </option>
                        ))}
                    </FiltroSelect>

                    <FiltroSelect
                        icon={ArrowUpDown}
                        label="Orden"
                        value={sortBy}
                        activo={sortBy !== "none"}
                        onChange={(v) => setSortBy(v as any)}
                    >
                        <option value="none">Sin ordenar</option>
                        <option value="price-asc">Precio: menor a mayor</option>
                        <option value="price-desc">Precio: mayor a menor</option>
                        <option value="id-asc">Código: menor a mayor</option>
                        <option value="id-desc">Código: mayor a menor</option>
                    </FiltroSelect>
                </div>

                {hayFiltros && (
                    <button
                        onClick={limpiarFiltros}
                        className="h-11 px-4 rounded-xl text-sm font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.97] transition-[background-color,color,transform] duration-150 whitespace-nowrap"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Tabla de productos */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7D9878]" />
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-semibold">Cargando productos…</p>
                </div>
            ) : filteredAndSortedProductos.length === 0 ? (
                <div className="anim-entrada bg-white dark:bg-[#242723] rounded-2xl py-16 px-6 text-center border border-[#E6DFD5] dark:border-[#353B33] flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#F4EFEA] dark:bg-[#1B1D1A] flex items-center justify-center mb-4">
                        <Search className="w-6 h-6 text-[#7D9878] dark:text-[#A3B69B]" />
                    </div>
                    <h3 className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">No se encontraron productos</h3>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 text-sm mt-1">Probá con otra búsqueda o sacá algún filtro.</p>
                    {hayFiltros && (
                        <button
                            onClick={limpiarFiltros}
                            className="mt-4 h-9 px-4 rounded-xl text-sm font-semibold bg-[#7D9878] text-white hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="anim-entrada [animation-delay:120ms] bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-[#E6DFD5] dark:border-[#353B33]">
                        <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                            <span className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] tabular-nums">{filteredAndSortedProductos.length}</span>{" "}
                            {filteredAndSortedProductos.length === 1 ? "producto" : "productos"}
                            {hayFiltros && " con estos filtros"}
                        </p>
                        {totalPages > 1 && (
                            <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 tabular-nums">
                                Página {currentPage} de {totalPages}
                            </p>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[#F9F6F0]/70 dark:bg-[#1B1D1A]/60 text-[11px] font-semibold uppercase tracking-wider text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 border-b border-[#E6DFD5] dark:border-[#353B33]">
                                    <th className="py-3 pl-6 pr-4 text-left font-semibold">Producto</th>
                                    <th className="py-3 px-4 text-center font-semibold">Categoría</th>
                                    <th className="py-3 px-4 text-center font-semibold">Género</th>
                                    <th className="py-3 px-4 text-center font-semibold">Precio {isMinorista ? "minorista" : "mayorista"}</th>
                                    <th className="py-3 px-4 text-center font-semibold">Margen</th>
                                    <th className="py-3 pl-4 pr-6 text-right font-semibold"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            {/* La clave cambia al pasar de página o de lista: las filas entran escalonadas */}
                            <tbody key={`${mode}-${currentPage}`} className="divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                                {paginatedProductos.map((producto, i) => {
                                    const { title, brand } = extractBrand(producto.name);
                                    const cost = getProductCost(producto, esencias, insumos);

                                    const rawPrice = isMinorista ? Number(producto.priceMinorista) : Number(producto.price);
                                    const isValidPrice = isFinite(rawPrice) && !isNaN(rawPrice) && rawPrice > 0;
                                    const currentPrice = isValidPrice ? rawPrice : 0;

                                    const marginMay = calculateProfitMargin(cost, Number(producto.price) || 0);
                                    const marginMin = calculateProfitMargin(cost, Number(producto.priceMinorista) || 0);
                                    const currentMargin = isMinorista ? marginMin : marginMay;

                                    return (
                                        <tr
                                            key={producto.id}
                                            style={{ animationDelay: `${i * 22}ms` }}
                                            className="anim-fila group transition-colors duration-150 hover:bg-[#F9F6F0] dark:hover:bg-[#2A2E29]"
                                        >
                                            <td className="py-3.5 pl-6 pr-4">
                                                <div className="min-w-[200px] max-w-[340px]">
                                                    {brand && (
                                                        <p className="text-[10px] font-bold text-[#6B8566] dark:text-[#A3B69B] uppercase tracking-widest truncate">
                                                            {brand}
                                                        </p>
                                                    )}
                                                    <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] truncate" title={producto.name}>
                                                        {title}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {getCategoryBadge(producto.category)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {getGenderBadge(producto.gender)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {!isValidPrice ? (
                                                    <span className="px-2.5 py-1 bg-[#DAC4AA]/20 text-[#7A5C34] dark:text-[#DAC4AA] rounded-lg text-xs font-semibold">
                                                        Consultar
                                                    </span>
                                                ) : (
                                                    <span className="text-[15px] font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                        ${Intl.NumberFormat("es-AR").format(currentPrice)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums ${currentMargin.isConsultar ? "bg-[#DAC4AA]/20 text-[#7A5C34] dark:text-[#DAC4AA]" : (isMinorista ? "bg-[#C9866F]/10 text-[#97604D] dark:text-[#DBA793]" : "bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B]")}`}>
                                                    {!currentMargin.isConsultar && <TrendingUp className="w-3.5 h-3.5" />}
                                                    {currentMargin.percentStr}
                                                </span>
                                            </td>
                                            <td className="py-3.5 pl-4 pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setInfoModalProduct(producto)}
                                                        className={`${BOTON_FILA} border-[#C9A877]/60 bg-[#DAC4AA]/[0.14] text-[#7A5C34] dark:text-[#E3CBA4] hover:bg-[#DAC4AA]/30 hover:border-[#C9A877]`}
                                                        title="Ver insumos y fórmula utilizada"
                                                        aria-label={`Fórmula de ${producto.name}`}
                                                    >
                                                        <FlaskConical className="w-3.5 h-3.5" />
                                                        Fórmula
                                                    </button>
                                                    <button
                                                        onClick={() => setProfitModalProduct(producto)}
                                                        className={`${BOTON_FILA} border-[#1baf7a]/45 bg-[#1baf7a]/[0.08] text-[#128a5f] dark:text-[#4fd1a0] hover:bg-[#1baf7a]/[0.18] hover:border-[#1baf7a]/75`}
                                                        title="Ver desglose de % de ganancia"
                                                        aria-label={`Ganancia de ${producto.name}`}
                                                    >
                                                        <Percent className="w-3.5 h-3.5" />
                                                        Ganancia
                                                    </button>
                                                    <span className="ml-1">
                                                        <BotonCarrito
                                                            variante="salvia"
                                                            onAgregar={() => agregarAlPedido(producto)}
                                                            disabled={!isValidPrice}
                                                            aria-label={`Agregar ${producto.name} al pedido`}
                                                        />
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => setCurrentPage(p)}
                showSummary={false}
            />

            {/* Barra flotante del pedido: siempre a mano mientras se recorre la lista */}
            <AnimatePresence>
                {cartFiltered.length > 0 && !isCartOpen && (
                    <motion.div
                        key="barra-pedido"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } }}
                        exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
                        className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none print:hidden"
                    >
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="pointer-events-auto flex items-center gap-4 max-w-full pl-5 pr-2 py-2 rounded-2xl bg-[#2C2C2C] dark:bg-[#F4EFEA] text-white dark:text-[#1B1D1A] shadow-2xl shadow-black/25 ring-1 ring-black/5 active:scale-[0.98] transition-transform duration-150"
                        >
                            <ShoppingBag className="w-5 h-5 shrink-0 opacity-80" />
                            <span className="text-left leading-tight min-w-0">
                                <span className="block text-[11px] opacity-60 whitespace-nowrap">
                                    {unidadesCarrito} {unidadesCarrito === 1 ? "unidad" : "unidades"} · Pedido {isMinorista ? "minorista" : "mayorista"}
                                </span>
                                <span key={cartSummary.totalFinal} className="anim-pop inline-block text-base font-bold tabular-nums">
                                    ${Intl.NumberFormat("es-AR").format(Math.round(cartSummary.totalFinal))}
                                </span>
                            </span>
                            <span className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold whitespace-nowrap">
                                Ver pedido
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Export Modal */}
            {exportFormat && (
                <ExportModal
                    isOpen={!!exportFormat}
                    onClose={() => setExportFormat(null)}
                    onExport={(filteredData, format) => handlePerformExport(filteredData, format)}
                    productos={productos}
                    categorias={categorias}
                    generos={generos}
                    initialFilters={{
                        category: categoryFilter,
                        gender: genderFilter,
                        showOutOfStock: showOutOfStock,
                        showConsult: showConsult
                    }}
                    type={exportFormat}
                    lista={isMinorista ? "Minorista" : "Mayorista"}
                />
            )}

            {/* Ficha del producto: fórmula y ganancia en una sola ventana, con pestañas */}
            <Ventana
                abierta={!!(infoModalProduct || profitModalProduct)}
                onCerrar={() => { setInfoModalProduct(null); setProfitModalProduct(null); }}
                etiqueta="Ficha del producto"
            >
            {(infoModalProduct || profitModalProduct) && (() => {
                const p = (infoModalProduct || profitModalProduct)!;
                const vista: "formula" | "ganancia" = infoModalProduct ? "formula" : "ganancia";
                const verVista = (v: "formula" | "ganancia") => {
                    setInfoModalProduct(v === "formula" ? p : null);
                    setProfitModalProduct(v === "ganancia" ? p : null);
                };
                const cerrar = () => { setInfoModalProduct(null); setProfitModalProduct(null); };
                const pesos = (n: number) => `$${Intl.NumberFormat("es-AR").format(Math.round(n))}`;
                const valido = (n: number) => n > 0 && isFinite(n);
                const breakdown = getComponentBreakdown(p, esencias, insumos);
                const cost = getProductCost(p, esencias, insumos);
                const canales = [
                    { titulo: "Mayorista", Icono: Store, precio: Number(p.price) || 0, color: "#7D9878", texto: "text-[#3F5A3C] dark:text-[#A3B69B]", chip: "bg-[#7D9878]/12 text-[#3F5A3C] dark:text-[#A3B69B]" },
                    { titulo: "Minorista", Icono: UserCheck, precio: Number(p.priceMinorista) || 0, color: "#C9866F", texto: "text-[#97604D] dark:text-[#DBA793]", chip: "bg-[#C9866F]/12 text-[#97604D] dark:text-[#DBA793]" },
                ].map(c => ({ ...c, margen: calculateProfitMargin(cost, c.precio) }));
                const { title, brand } = extractBrand(p.name);
                // Colores de cada componente en la barra de composición
                const COLORES = ["#7D9878", "#C9A877", "#C9866F", "#A3B69B", "#8C9DB5", "#DAC4AA", "#5A7356", "#B5735C"];
                const totalComp = breakdown.reduce((a, c) => a + (c.isConsultar ? 0 : c.totalCost), 0);
                const rotulo = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40";

                return (
                    <PanelVentana ancho="lg">
                        <CabeceraVentana
                            etiqueta={brand || "Ficha del producto"}
                            titulo={title}
                            descripcion={[p.category || "Perfumería fina", p.gender].filter(Boolean).join(" · ")}
                            icono={vista === "formula" ? FlaskConical : TrendingUp}
                            onCerrar={cerrar}
                        >
                            <div role="tablist" aria-label="Ver" className="mt-4 inline-flex p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                                {([["formula", "Fórmula", FlaskConical], ["ganancia", "Ganancia", Percent]] as const).map(([clave, texto, Icono]) => {
                                    const activo = vista === clave;
                                    return (
                                        <button
                                            key={clave}
                                            type="button"
                                            role="tab"
                                            aria-selected={activo}
                                            onClick={() => verVista(clave)}
                                            className={`relative inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${activo ? "text-[#2C2C2C] dark:text-[#F4EFEA]" : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                        >
                                            {activo && (
                                                <motion.span layoutId="ficha-pestana" transition={{ type: "spring", bounce: 0.15, duration: 0.35 }} className="absolute inset-0 rounded-lg bg-white dark:bg-[#353B33] shadow-sm" />
                                            )}
                                            <span className="relative inline-flex items-center gap-1.5"><Icono className="w-3.5 h-3.5" />{texto}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CabeceraVentana>

                        <CuerpoVentana className="space-y-5">
                            {/* Números clave: siempre a la vista */}
                            <dl className="grid grid-cols-3 gap-2.5">
                                <div className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] px-3.5 py-3">
                                    <dt className="flex items-center gap-1.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50"><Coins className="w-3.5 h-3.5" /> Costo</dt>
                                    <dd className="mt-1 text-lg font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{valido(cost) ? pesos(cost) : "Consultar"}</dd>
                                    <dd className="text-[11px] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">por unidad</dd>
                                </div>
                                {canales.map(c => (
                                    <div key={c.titulo} className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] px-3.5 py-3">
                                        <dt className={`flex items-center gap-1.5 text-xs ${c.texto}`}><c.Icono className="w-3.5 h-3.5" /> {c.titulo}</dt>
                                        <dd className="mt-1 text-lg font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{valido(c.precio) ? pesos(c.precio) : "Consultar"}</dd>
                                        <dd className={`text-[11px] font-semibold tabular-nums ${c.margen.isConsultar ? "text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40" : c.texto}`}>
                                            {c.margen.isConsultar ? "Sin margen" : `${c.margen.percentStr} sobre el costo`}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            {vista === "formula" ? (
                                breakdown.length === 0 ? (
                                    <p className="rounded-xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-8 text-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                        Este producto todavía no tiene insumos en su fórmula.
                                    </p>
                                ) : (
                                    <section>
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className={rotulo}>Composición del costo</p>
                                            <p className="text-xs text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">{breakdown.length} {breakdown.length === 1 ? "componente" : "componentes"}</p>
                                        </div>
                                        {/* Barra: cuánto pesa cada componente en el costo */}
                                        {totalComp > 0 && (
                                            <div className="mt-2.5 flex h-2.5 rounded-full overflow-hidden bg-[#2C2C2C]/[0.06] dark:bg-white/[0.06]" aria-hidden>
                                                {breakdown.map((c, i) => !c.isConsultar && c.totalCost > 0 && (
                                                    <motion.div
                                                        key={i}
                                                        style={{ backgroundColor: COLORES[i % COLORES.length] }}
                                                        className="h-full border-r border-white/60 dark:border-[#242723] last:border-r-0"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(c.totalCost / totalComp) * 100}%` }}
                                                        transition={{ duration: 0.5, delay: i * 0.04, ease: EASE_OUT }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <ul className="mt-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 overflow-hidden">
                                            {breakdown.map((c, i) => {
                                                const parte = totalComp > 0 && !c.isConsultar ? Math.round((c.totalCost / totalComp) * 100) : null;
                                                return (
                                                    <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.isConsultar ? "transparent" : COLORES[i % COLORES.length], boxShadow: c.isConsultar ? "inset 0 0 0 1.5px #C9A877" : undefined }} />
                                                        {c.type === "Esencia"
                                                            ? <FlaskConical className="w-4 h-4 shrink-0 text-[#5A7356] dark:text-[#A3B69B]" />
                                                            : <Package className="w-4 h-4 shrink-0 text-[#7A5C34] dark:text-[#DAC4AA]" />}
                                                        <span className="flex-1 min-w-0">
                                                            <span className="block truncate text-[#2C2C2C] dark:text-[#F4EFEA]">{c.name}</span>
                                                            <span className="block text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 tabular-nums">
                                                                {c.qty} {c.type === "Esencia" ? "g" : "un."}{c.type === "Esencia" ? " de esencia" : ""}
                                                            </span>
                                                        </span>
                                                        {parte !== null && <span className="text-xs tabular-nums text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 w-10 text-right">{parte}%</span>}
                                                        <span className={`w-24 text-right font-semibold tabular-nums ${c.isConsultar ? "text-[#7A5C34] dark:text-[#DAC4AA] text-xs" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>
                                                            {c.isConsultar ? "Consultar" : pesos(c.totalCost)}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                            <li className="flex items-center justify-between gap-3 px-3.5 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                                                <span className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Costo total</span>
                                                <span className="text-base font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{valido(cost) ? pesos(cost) : "Consultar"}</span>
                                            </li>
                                        </ul>
                                    </section>
                                )
                            ) : (
                                <section className="space-y-3">
                                    <p className={rotulo}>Cómo se arma el precio</p>
                                    {canales.map(c => {
                                        const okPrecio = valido(c.precio) && valido(cost);
                                        const parteCosto = okPrecio ? Math.min(100, (cost / c.precio) * 100) : 0;
                                        const sobrePrecio = okPrecio && c.margen.gainVal !== null ? Math.round((c.margen.gainVal / c.precio) * 100) : null;
                                        return (
                                            <div key={c.titulo} className="rounded-xl border border-[#E6DFD5] dark:border-[#353B33] p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className={`flex items-center gap-2 text-sm font-semibold ${c.texto}`}>
                                                        <c.Icono className="w-4 h-4" /> Venta {c.titulo.toLowerCase()}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${c.margen.isConsultar ? "bg-[#DAC4AA]/20 text-[#7A5C34] dark:text-[#DAC4AA]" : c.chip}`}>
                                                        {c.margen.percentStr}
                                                    </span>
                                                </div>
                                                {okPrecio ? (
                                                    <>
                                                        {/* Precio = costo + ganancia */}
                                                        <div className="mt-3 flex h-7 rounded-lg overflow-hidden text-[11px] font-semibold">
                                                            <motion.div
                                                                className="flex items-center px-2 bg-[#2C2C2C]/[0.08] dark:bg-white/[0.08] text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 whitespace-nowrap overflow-hidden"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${parteCosto}%` }}
                                                                transition={{ duration: 0.5, ease: EASE_OUT }}
                                                            >
                                                                Costo
                                                            </motion.div>
                                                            <div className="flex-1 flex items-center justify-end px-2 text-white whitespace-nowrap overflow-hidden" style={{ backgroundColor: c.color }}>
                                                                Ganancia
                                                            </div>
                                                        </div>
                                                        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                                            <div>
                                                                <dt className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">Costo</dt>
                                                                <dd className="font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(cost)}</dd>
                                                            </div>
                                                            <div>
                                                                <dt className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">+ Ganancia</dt>
                                                                <dd className={`font-semibold tabular-nums ${c.texto}`}>{c.margen.gainVal !== null ? pesos(c.margen.gainVal) : "—"}</dd>
                                                            </div>
                                                            <div className="text-right">
                                                                <dt className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">= Precio</dt>
                                                                <dd className="font-bold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{pesos(c.precio)}</dd>
                                                            </div>
                                                        </dl>
                                                        {sobrePrecio !== null && (
                                                            <p className="mt-2 text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45">
                                                                De cada {pesos(c.precio)} que cobrás, {pesos(c.margen.gainVal ?? 0)} son ganancia ({sobrePrecio}% del precio).
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="mt-2 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                                        {valido(c.precio) ? "Falta el costo de algún componente para calcular la ganancia." : "Este producto no tiene precio cargado en esta lista."}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>
                            )}
                        </CuerpoVentana>
                    </PanelVentana>
                );
            })()}
            </Ventana>

            {/* Modal de Ver Pedido / Carrito (isCartOpen) */}
            {/* Portal al body: así el panel queda por encima de la barra de navegación. */}
            {typeof document !== "undefined" && createPortal(
            <AnimatePresence>
            {isCartOpen && (() => {
                const closeCart = () => {
                    setIsCartOpen(false);
                    setOrderSuccess(false);
                    setOpenItemDiscount(null);
                };
                const fmt = (n: number) => Intl.NumberFormat("es-AR").format(Math.round(n));
                // Misma cuenta que registrarVenta: lo que se ve acá es exactamente lo que se guarda.
                const recargoQR = paymentMethod === "qr" ? Math.round(cartSummary.totalFinal * 0.1) : 0;
                const totalACobrar = cartSummary.totalFinal + recargoQR;
                const hasItems = cartFiltered.length > 0 && !orderSuccess;
                const chip = (active: boolean) =>
                    `px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${active
                        ? "bg-[#7D9878] text-white border-[#7D9878]"
                        : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"}`;

                return (
                    <motion.div
                        key="carrito"
                        {...fondoModal}
                        className="fixed inset-0 z-[300] flex justify-end bg-black/60 backdrop-blur-sm"
                        onClick={closeCart}
                    >
                        {/* El panel entra desde la derecha con la curva de los cajones de iOS */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            initial={{ transform: "translateX(100%)" }}
                            animate={{ transform: "translateX(0%)", transition: { duration: 0.42, ease: EASE_CAJON } }}
                            exit={{ transform: "translateX(100%)", transition: { duration: 0.24, ease: EASE_OUT } }}
                            className={`bg-[#F9F6F0] dark:bg-[#1B1D1A] w-full h-full shadow-2xl border-l border-[#E6DFD5] dark:border-[#353B33] flex flex-col ${hasItems ? "max-w-lg lg:max-w-5xl" : "max-w-lg"}`}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Encabezado */}
                            <div className="px-5 py-4 border-b border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] flex items-center gap-3 shrink-0">
                                <div className="p-2 rounded-xl bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B]">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B]">
                                        Pedido {isMinorista ? "Minorista" : "Mayorista"}
                                        {hasItems && ` · ${cartFiltered.reduce((acc, i) => acc + i.quantity, 0)} unidades`}
                                    </span>
                                    <h3 className="text-lg font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand leading-tight">
                                        Resumen de Pedido
                                    </h3>
                                </div>
                                {!orderSuccess && (
                                    <button
                                        type="button"
                                        onClick={closeCart}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#7D9878] dark:text-[#A3B69B] hover:bg-[#7D9878]/10 transition"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Seguir agregando
                                    </button>
                                )}
                                <BotonCerrar onClick={closeCart} />
                            </div>

                            {orderSuccess ? (
                                <div className="flex-1 p-6">
                                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-3">
                                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto anim-pop" />
                                        <h4 className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-brand">
                                            ¡Venta Registrada con Éxito!
                                        </h4>
                                        <p className="text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                            La venta quedó registrada como entregada y pagada, se descontó el stock de esencias e insumos y el cobro se anotó en <strong>Caja</strong>.
                                        </p>
                                    </div>
                                </div>
                            ) : cartFiltered.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6">
                                    <ShoppingCart className="w-14 h-14 text-[#7D9878]/40" />
                                    <h4 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                        Tu pedido está vacío
                                    </h4>
                                    <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 max-w-xs font-medium">
                                        Hacé clic en <strong>+ Agregar</strong> en la lista de precios para sumar productos.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={closeCart}
                                        className="mt-2 px-4 py-2.5 rounded-xl bg-[#7D9878] text-white text-xs font-bold"
                                    >
                                        Ir a la lista de precios
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Cuerpo: en pantallas grandes, productos a la izquierda y resumen a la derecha */}
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar lg:overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
                                        {/* Productos */}
                                        <section className="p-4 sm:p-5 space-y-2.5 lg:overflow-y-auto custom-scrollbar">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 px-1">
                                                Productos ({cartFiltered.length})
                                            </h4>
                                            {cartFiltered.map(item => {
                                                const pricing = getItemPricing(item);
                                                const discountOpen = openItemDiscount === pricing.key;
                                                const hasDiscount = pricing.disc.value > 0;

                                                return (
                                                    <div
                                                        key={item.producto.id}
                                                        className="rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-3.5"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                {item.producto.category && (
                                                                    <span className="text-[9px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest block">
                                                                        {item.producto.category}
                                                                    </span>
                                                                )}
                                                                <h5 className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] leading-snug line-clamp-2">
                                                                    {item.producto.name}
                                                                </h5>
                                                                <p className="text-xs font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-0.5">
                                                                    {hasDiscount ? (
                                                                        <>
                                                                            <span className="line-through mr-1.5">${fmt(pricing.baseUnitPrice)}</span>
                                                                            <span className="text-[#2C2C2C] dark:text-[#F4EFEA]">${fmt(pricing.effectiveUnitPrice)} c/u</span>
                                                                        </>
                                                                    ) : (
                                                                        <>${fmt(pricing.baseUnitPrice)} c/u</>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Cantidad */}
                                                            <div className="flex items-center bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl shrink-0">
                                                                <button
                                                                    onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity - 1)}
                                                                    className="w-8 h-8 flex items-center justify-center text-sm font-black rounded-lg hover:bg-[#7D9878]/10 text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                                    aria-label="Quitar uno"
                                                                >
                                                                    −
                                                                </button>
                                                                <span className="w-7 text-center text-sm font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity + 1)}
                                                                    className="w-8 h-8 flex items-center justify-center text-sm font-black rounded-lg hover:bg-[#7D9878]/10 text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                                    aria-label="Agregar uno"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>

                                                            <span className="hidden sm:block w-24 text-right text-sm font-black text-[#2C2C2C] dark:text-[#F4EFEA] shrink-0">
                                                                ${fmt(pricing.itemFinalTotal)}
                                                            </span>

                                                            <button
                                                                onClick={() => updateCartQuantity(item.producto.id, item.priceType, 0)}
                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                                                                title="Eliminar producto"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Línea secundaria: ganancia, descuento y subtotal (móvil) */}
                                                        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-[#E6DFD5]/70 dark:border-[#353B33]/70 text-[11px]">
                                                            <span className="font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                                                                Ganancia:{" "}
                                                                <span className={pricing.itemNetProfit !== null && pricing.itemNetProfit > 0 ? "font-black text-[#7D9878] dark:text-[#A3B69B]" : "font-bold text-[#DAC4AA]"}>
                                                                    {pricing.itemNetProfit !== null
                                                                        ? `+$${fmt(pricing.itemNetProfit)}${pricing.itemMarginPercent !== null ? ` (+${Math.round(pricing.itemMarginPercent)}%)` : ""}`
                                                                        : "Consultar"}
                                                                </span>
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setOpenItemDiscount(discountOpen ? null : pricing.key)}
                                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition ${hasDiscount
                                                                        ? "bg-[#C9866F]/10 text-[#B5735C] dark:text-[#D29680] border-[#C9866F]/30"
                                                                        : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"}`}
                                                                >
                                                                    <Percent className="w-3 h-3" />
                                                                    {hasDiscount
                                                                        ? (pricing.disc.type === "percent" ? `-${pricing.disc.value}%` : `-$${fmt(pricing.disc.value)}`)
                                                                        : "Descuento"}
                                                                    <ChevronDown className={`w-3 h-3 transition-transform ${discountOpen ? "rotate-180" : ""}`} />
                                                                </button>
                                                                <span className="sm:hidden font-black text-sm text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                    ${fmt(pricing.itemFinalTotal)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Editor de descuento del producto (se abre a pedido) */}
                                                        {discountOpen && (
                                                            <div className="mt-2.5 p-3 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] space-y-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={pricing.disc.type === "percent" ? "100" : undefined}
                                                                        value={pricing.disc.value || ""}
                                                                        onChange={e => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            setItemDiscounts(prev => ({
                                                                                ...prev,
                                                                                [pricing.key]: { type: pricing.disc.type, value: val }
                                                                            }));
                                                                        }}
                                                                        placeholder={pricing.disc.type === "percent" ? "Descuento en %" : "Descuento en $ por unidad"}
                                                                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                                                    />
                                                                    <div className="flex bg-white dark:bg-[#242723] p-0.5 rounded-lg border border-[#E6DFD5] dark:border-[#353B33] shrink-0">
                                                                        {(["percent", "fixed"] as const).map(t => (
                                                                            <button
                                                                                key={t}
                                                                                type="button"
                                                                                onClick={() => setItemDiscounts(prev => ({
                                                                                    ...prev,
                                                                                    [pricing.key]: { type: t, value: pricing.disc.value }
                                                                                }))}
                                                                                className={`px-2.5 py-1 text-[11px] font-black rounded-md ${pricing.disc.type === t ? "bg-[#7D9878] text-white" : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                                                            >
                                                                                {t === "percent" ? "%" : "$"}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {[
                                                                        { label: "Sin dto", val: 0 },
                                                                        { label: "-10%", val: 10 },
                                                                        { label: "-20%", val: 20 },
                                                                        { label: "2do al 50% (-25%)", val: 25 },
                                                                        { label: "-50%", val: 50 },
                                                                    ].map(preset => (
                                                                        <button
                                                                            key={preset.label}
                                                                            type="button"
                                                                            onClick={() => setItemDiscounts(prev => ({
                                                                                ...prev,
                                                                                [pricing.key]: { type: "percent", value: preset.val }
                                                                            }))}
                                                                            className={chip(pricing.disc.type === "percent" && pricing.disc.value === preset.val)}
                                                                        >
                                                                            {preset.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </section>

                                        {/* Resumen y datos de la venta */}
                                        <aside className="p-4 sm:p-5 space-y-4 border-t lg:border-t-0 lg:border-l border-[#E6DFD5] dark:border-[#353B33] lg:overflow-y-auto custom-scrollbar lg:bg-white/50 lg:dark:bg-[#242723]/40">
                                            {isAdmin && (
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 block px-1">
                                                        Cliente / Destinatario
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customerName}
                                                        onChange={e => setCustomerName(e.target.value)}
                                                        placeholder="Nombre del cliente"
                                                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                                    />
                                                </div>
                                            )}

                                            {/* Descuento general */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 flex items-center gap-1 px-1">
                                                    <Percent className="w-3 h-3" /> Descuento a todo el pedido
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1 min-w-0">
                                                        {globalDiscountType === "fixed" && (
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">$</span>
                                                        )}
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={globalDiscountType === "percent" ? "100" : undefined}
                                                            inputMode="decimal"
                                                            aria-label={globalDiscountType === "percent" ? "Descuento a todo el pedido, en porcentaje" : "Descuento a todo el pedido, en pesos"}
                                                            value={globalDiscountValue || ""}
                                                            onChange={e => setGlobalDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                                                            placeholder={globalDiscountType === "percent" ? "Ej: 10" : "Ej: 2000"}
                                                            className={`w-full py-2.5 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878] ${globalDiscountType === "fixed" ? "pl-7 pr-3" : "pl-3 pr-8"}`}
                                                        />
                                                        {globalDiscountType === "percent" && (
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">%</span>
                                                        )}
                                                    </div>
                                                    <div role="radiogroup" aria-label="Tipo de descuento" className="flex bg-white dark:bg-[#242723] p-0.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] shrink-0">
                                                        {(["percent", "fixed"] as const).map(t => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={globalDiscountType === t}
                                                                aria-label={t === "percent" ? "En porcentaje" : "En pesos"}
                                                                onClick={() => setGlobalDiscountType(t)}
                                                                className={`px-3 py-1.5 text-xs font-black rounded-lg ${globalDiscountType === t ? "bg-[#7D9878] text-white" : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                                            >
                                                                {t === "percent" ? "%" : "$"}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Qué se va a descontar, en pesos, para no tener dudas */}
                                                {cartSummary.orderDiscount > 0 && (
                                                    <p className="px-1 text-xs font-semibold text-[#B5735C] dark:text-[#D29680]" aria-live="polite">
                                                        {globalDiscountType === "percent"
                                                            ? `${Math.min(100, globalDiscountValue)}% del pedido: se descuentan $${fmt(cartSummary.orderDiscount)}`
                                                            : `Se descuentan $${fmt(cartSummary.orderDiscount)} del total${Math.round(globalDiscountValue) > cartSummary.subtotalConDescuentos ? " (no puede ser más que el total)" : ""}`}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {[
                                                        { label: "Sin dto", val: 0 },
                                                        { label: "-5%", val: 5 },
                                                        { label: "-10%", val: 10 },
                                                        { label: "-15%", val: 15 },
                                                        { label: "-20%", val: 20 },
                                                        { label: "2do al 50% (-25%)", val: 25 },
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            onClick={() => {
                                                                setGlobalDiscountType("percent");
                                                                setGlobalDiscountValue(preset.val);
                                                            }}
                                                            className={chip(preset.val === 0 ? !(globalDiscountValue > 0) : globalDiscountType === "percent" && globalDiscountValue === preset.val)}
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Forma de pago (QR de Mercado Pago lleva 10% de recargo) */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 block px-1">
                                                    Forma de pago
                                                </label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {([
                                                        { value: "efectivo", label: "Efectivo" },
                                                        { value: "transferencia", label: "Transferencia" },
                                                        { value: "qr", label: "QR (+10%)" },
                                                    ] as const).map(op => (
                                                        <button
                                                            key={op.value}
                                                            type="button"
                                                            onClick={() => setPaymentMethod(op.value)}
                                                            className={chip(paymentMethod === op.value)}
                                                        >
                                                            {op.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Números del pedido */}
                                            <div className="rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] p-4 space-y-2 text-xs font-bold">
                                                <div className="flex justify-between text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                                    <span>Subtotal lista</span>
                                                    <span>${fmt(cartSummary.baseSubtotal)}</span>
                                                </div>
                                                {cartSummary.itemsDiscount > 0 && (
                                                    <div className="flex justify-between text-[#B5735C] dark:text-[#D29680]">
                                                        <span>Descuentos por producto</span>
                                                        <span>-${fmt(cartSummary.itemsDiscount)}</span>
                                                    </div>
                                                )}
                                                {cartSummary.orderDiscount > 0 && (
                                                    <div className="flex justify-between text-[#B5735C] dark:text-[#D29680]">
                                                        <span>Descuento al pedido{globalDiscountType === "percent" ? ` (${Math.min(100, globalDiscountValue)}%)` : ""}</span>
                                                        <span>-${fmt(cartSummary.orderDiscount)}</span>
                                                    </div>
                                                )}
                                                {recargoQR > 0 && (
                                                    <div className="flex justify-between text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                                        <span>Recargo QR (10%)</span>
                                                        <span>+${fmt(recargoQR)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                                                    <span>Costo de fabricación</span>
                                                    <span>{!cartSummary.hasAnyInvalidCost ? `$${fmt(cartSummary.totalCost)}` : "Consultar"}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-[#E6DFD5] dark:border-[#353B33]">
                                                    <span className="flex items-center gap-1.5 text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                        <TrendingUp className="w-3.5 h-3.5 text-[#7D9878]" /> Ganancia
                                                    </span>
                                                    <span className={cartSummary.netProfit !== null && cartSummary.netProfit > 0 ? "font-black text-[#7D9878] dark:text-[#A3B69B] text-sm" : "text-[#DAC4AA]"}>
                                                        {cartSummary.netProfit !== null
                                                            ? `+$${fmt(cartSummary.netProfit)}${cartSummary.marginPercent !== null ? ` (+${Math.round(cartSummary.marginPercent)}%)` : ""}`
                                                            : "Consultar"}
                                                    </span>
                                                </div>
                                            </div>
                                        </aside>
                                    </div>

                                    {/* Barra fija: total y acciones */}
                                    <div className="px-4 sm:px-5 py-3.5 border-t border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] flex items-center gap-3 shrink-0">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 block">
                                                Total a cobrar
                                            </span>
                                            <span className="text-2xl font-black text-[#7D9878] dark:text-[#A3B69B] font-brand leading-none">
                                                ${fmt(totalACobrar)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearCart}
                                            className="px-4 py-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-rose-500 font-bold text-xs hover:bg-rose-500/10 transition"
                                        >
                                            Vaciar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleVender}
                                            disabled={isSelling}
                                            className="px-6 py-3 rounded-xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-black text-sm transition shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                                        >
                                            {isSelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {isSelling ? "Registrando..." : "Vender"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                );
            })()}
            </AnimatePresence>,
            document.body)}
        </div>
    );
}
