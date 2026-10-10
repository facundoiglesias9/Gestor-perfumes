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
    X,
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
    FileSpreadsheet,
    FileText,
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
    type LucideIcon
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
import ListSelectorToggle from "@/components/ListSelectorToggle";
import PaginationControls from "@/components/PaginationControls";

// ── Animaciones ─────────────────────────────────────────────────────
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_CAJON = [0.32, 0.72, 0, 1] as const; // como el panel lateral de iOS

const fondoModal = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};
const panelModal = {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
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
        <label className={`relative flex items-center h-11 rounded-xl border transition-colors duration-150 focus-within:ring-2 focus-within:ring-[#7D9878]/25 ${activo
            ? "border-[#7D9878]/60 bg-[#7D9878]/[0.08] dark:bg-[#A3B69B]/10"
            : "border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] hover:border-[#D3CBBF] dark:hover:border-[#474C44]"}`}
        >
            <span className="sr-only">{label}</span>
            <Icon className={`absolute left-3.5 w-4 h-4 pointer-events-none ${activo ? "text-[#7D9878] dark:text-[#A3B69B]" : "text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45"}`} />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none w-full h-full bg-transparent pl-10 pr-10 text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none cursor-pointer dark:[&_option]:bg-[#242723]"
            >
                {children}
            </select>
            <ChevronDown className="absolute right-3.5 w-4 h-4 pointer-events-none text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45" />
        </label>
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
    const itemsPerPage = 10;

    // "Agregar" se convierte un momento en "Agregado" para confirmar el clic
    const [recienAgregado, setRecienAgregado] = useState<string | null>(null);
    const agregadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const agregarAlPedido = (producto: Producto) => {
        addToCart(producto, isMinorista ? "minorista" : "mayorista");
        setRecienAgregado(producto.id);
        if (agregadoTimer.current) clearTimeout(agregadoTimer.current);
        agregadoTimer.current = setTimeout(() => setRecienAgregado(null), 1400);
    };
    useEffect(() => () => { if (agregadoTimer.current) clearTimeout(agregadoTimer.current); }, []);

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

    const cartSummary = useMemo(() => {
        let baseSubtotal = 0;
        let totalDiscount = 0;
        let totalFinal = 0;
        let totalCost = 0;
        let hasAnyInvalidCost = false;

        for (const item of cartFiltered) {
            const pricing = getItemPricing(item);
            baseSubtotal += pricing.itemSubtotal;
            totalDiscount += pricing.itemTotalDiscount;
            totalFinal += pricing.itemFinalTotal;
            totalCost += pricing.itemTotalCost;
            if (pricing.hasInvalidCost) hasAnyInvalidCost = true;
        }

        const netProfit = (!hasAnyInvalidCost && isFinite(totalFinal - totalCost)) ? (totalFinal - totalCost) : null;
        const marginPercent = (!hasAnyInvalidCost && totalCost > 0 && netProfit !== null) ? (netProfit / totalCost) * 100 : null;

        return {
            baseSubtotal,
            totalDiscount,
            totalFinal,
            totalCost,
            hasAnyInvalidCost,
            netProfit,
            marginPercent
        };
    }, [cartFiltered, getItemPricing]);

    const handleApplyGlobalDiscount = (type: "percent" | "fixed", value: number) => {
        const updated: Record<string, { type: "percent" | "fixed"; value: number }> = {};
        cartFiltered.forEach(item => {
            const key = `${item.producto.id}_${item.priceType}`;
            updated[key] = { type, value };
        });
        setItemDiscounts(updated);
    };

    const handleVender = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cartFiltered.length === 0 || isSelling) return;

        // El precio final de cada ítem (con su descuento) se calcula acá y se manda tal cual:
        // antes se guardaba en el carrito y la venta se registraba con el precio de lista.
        const items = cartFiltered.map(item => ({
            producto: item.producto,
            quantity: item.quantity,
            priceType: item.priceType,
            unitPrice: getItemPricing(item).effectiveUnitPrice,
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
    };

    const handlePerformExport = async (data: Producto[], format: "excel" | "pdf") => {
        const lista = isMinorista ? "Minorista" : "Mayorista";
        try {
            if (format === "excel") await exportarListaExcel({ lista, productos: data });
            else await exportarListaPDF({ lista, productos: data });
            toast.success(format === "excel" ? "Excel descargado" : "PDF descargado", {
                description: `${data.length} productos de la lista ${lista.toLowerCase()}.`,
            });
            setExportFormat(null);
        } catch (err) {
            console.error("Error al exportar:", err);
            toast.error("No se pudo generar el archivo", { description: "Probá de nuevo en un momento." });
        }
    };

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
            {/* Encabezado: qué lista es, selector y acciones, todo centrado */}
            <header className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-[2rem] px-6 py-9 md:px-10 md:py-11 border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                {/* Luz suave detrás del título */}
                <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-36 w-[760px] max-w-full h-72 rounded-full bg-[#7D9878]/[0.14] dark:bg-[#A3B69B]/[0.07] blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                    {/* Al cambiar de lista, el texto se funde de una a otra */}
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, y: 4, filter: "blur(3px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
                            transition={{ duration: 0.18, ease: EASE_OUT }}
                            className="flex flex-col items-center"
                        >
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                                {isMinorista ? <ShoppingBag className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                                {isMinorista ? "Venta al público" : "Venta mayorista"}
                            </span>
                            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                                {isMinorista ? "Lista Minorista" : "Lista Mayorista"}
                            </h1>
                            <p className="mt-3 max-w-xl text-base md:text-lg text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 leading-relaxed">
                                {isMinorista
                                    ? "Precios sugeridos para el consumidor final con margen minorista."
                                    : "Gestioná tus precios mayoristas y prepará pedidos rápidamente."}
                            </p>
                            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                <Info className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                                Todos los productos de Perfumería Fina son de 50 ml.
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <ListSelectorToggle
                            activeMode={mode}
                            onSelectMode={(newMode) => {
                                setMode(newMode);
                                setCurrentPage(1);
                            }}
                        />

                        <span className="hidden sm:block w-px h-7 bg-[#E6DFD5] dark:bg-[#353B33]" aria-hidden />

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="flex items-center gap-2 h-11 pl-4 pr-3 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-md shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150"
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

                        <div className="flex items-center gap-3">
                        <button
                            onClick={() => setExportFormat("excel")}
                            className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-white dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#7D9878]/50 active:scale-[0.97] transition-[border-color,color,transform] duration-150"
                            title="Exportar a Excel"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                            Excel
                        </button>
                        <button
                            onClick={() => setExportFormat("pdf")}
                            className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-white dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:border-[#C9866F]/50 active:scale-[0.97] transition-[border-color,color,transform] duration-150"
                            title="Exportar a PDF"
                        >
                            <FileText className="w-4 h-4 text-[#C9866F]" />
                            PDF
                        </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Buscador y filtros en una sola barra pareja */}
            <div className="anim-entrada [animation-delay:60ms] bg-white dark:bg-[#242723] p-3 rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none" />
                    <input
                        type="search"
                        aria-label="Buscar productos"
                        placeholder="Buscar por nombre o código…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full h-11 pl-11 pr-10 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/45 dark:placeholder:text-[#F4EFEA]/40 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(""); setCurrentPage(1); }}
                            aria-label="Borrar búsqueda"
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#E6DFD5]/60 dark:hover:bg-[#353B33]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

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
                                    const agregado = recienAgregado === producto.id;

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
                                                        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.96] transition-[background-color,color,transform] duration-150 whitespace-nowrap"
                                                        title="Ver insumos y fórmula utilizada"
                                                        aria-label={`Insumos de ${producto.name}`}
                                                    >
                                                        <FlaskConical className="w-4 h-4" />
                                                        <span className="hidden 2xl:inline">Insumos</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setProfitModalProduct(producto)}
                                                        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-semibold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.96] transition-[background-color,color,transform] duration-150 whitespace-nowrap"
                                                        title="Ver desglose de % de ganancia"
                                                        aria-label={`Ganancia de ${producto.name}`}
                                                    >
                                                        <Percent className="w-4 h-4" />
                                                        <span className="hidden 2xl:inline">Ganancia</span>
                                                    </button>
                                                    <button
                                                        onClick={() => agregarAlPedido(producto)}
                                                        disabled={!isValidPrice}
                                                        className={`relative ml-1 inline-flex items-center justify-center min-w-[108px] h-9 px-3.5 rounded-lg text-white text-xs font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${agregado ? "bg-[#5A7356]" : "bg-[#7D9878] hover:bg-[#6B8566] shadow-sm shadow-[#7D9878]/25"}`}
                                                    >
                                                        <AnimatePresence mode="popLayout" initial={false}>
                                                            <motion.span
                                                                key={agregado ? "ok" : "agregar"}
                                                                initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
                                                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                                                exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                                                                transition={{ duration: 0.16, ease: EASE_OUT }}
                                                                className="flex items-center gap-1.5"
                                                            >
                                                                {agregado ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                                {agregado ? "Agregado" : "Agregar"}
                                                            </motion.span>
                                                        </AnimatePresence>
                                                    </button>
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

            {/* Modal de Rentabilidad (% Ganancia) */}
            <AnimatePresence>
            {profitModalProduct && (
                <motion.div
                    key="modal-ganancia"
                    {...fondoModal}
                    onClick={() => setProfitModalProduct(null)}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                    <motion.div
                        {...panelModal}
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33]"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A]">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B]">Análisis de Rentabilidad</span>
                                <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand mt-0.5">{profitModalProduct.name}</h3>
                            </div>
                            <button
                                onClick={() => setProfitModalProduct(null)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 transition-all border border-[#353B33]"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 sm:p-8 space-y-6">
                            {(() => {
                                const cost = getProductCost(profitModalProduct, esencias, insumos);
                                const priceMay = Number(profitModalProduct.price) || 0;
                                const priceMin = Number(profitModalProduct.priceMinorista) || 0;

                                const marginMay = calculateProfitMargin(cost, priceMay);
                                const marginMin = calculateProfitMargin(cost, priceMin);

                                return (
                                    <>
                                        <div className="p-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">Costo Estimado de Fabricación</p>
                                                <p className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand mt-0.5">
                                                    {cost > 0 && isFinite(cost) ? `$${Intl.NumberFormat("es-AR").format(Math.round(cost))}` : "Consultar"}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-[#7D9878]/10 rounded-xl text-[#7D9878]">
                                                <Coins className="w-6 h-6" />
                                            </div>
                                        </div>

                                        {/* Mayorista breakdown */}
                                        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] space-y-3">
                                            <div className="flex justify-between items-center border-b border-[#E6DFD5] dark:border-[#353B33] pb-2">
                                                <span className="text-xs font-black uppercase tracking-wider text-[#7D9878] dark:text-[#A3B69B] flex items-center gap-1.5 font-brand">
                                                    <Store className="w-4 h-4" /> Venta Mayorista
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${marginMay.isConsultar ? "bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA]" : "bg-[#7D9878]/15 text-[#7D9878] dark:text-[#A3B69B]"}`}>
                                                    {marginMay.percentStr}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Precio Venta Mayorista:</span>
                                                <span className="text-[#2C2C2C] dark:text-[#F4EFEA] text-sm font-bold">
                                                    {priceMay > 0 && isFinite(priceMay) ? `$${Intl.NumberFormat("es-AR").format(priceMay)}` : "Consultar"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Ganancia Neta por Unidad:</span>
                                                <span className="text-[#7D9878] dark:text-[#A3B69B] text-sm font-black">
                                                    {marginMay.gainVal !== null && marginMay.gainVal > 0 && isFinite(marginMay.gainVal) ? `+$${Intl.NumberFormat("es-AR").format(Math.round(marginMay.gainVal))}` : "Consultar"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Minorista breakdown */}
                                        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] space-y-3">
                                            <div className="flex justify-between items-center border-b border-[#E6DFD5] dark:border-[#353B33] pb-2">
                                                <span className="text-xs font-black uppercase tracking-wider text-[#C9866F] flex items-center gap-1.5 font-brand">
                                                    <UserCheck className="w-4 h-4" /> Venta Minorista
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${marginMin.isConsultar ? "bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA]" : "bg-[#C9866F]/15 text-[#C9866F]"}`}>
                                                    {marginMin.percentStr}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Precio Venta Minorista:</span>
                                                <span className="text-[#2C2C2C] dark:text-[#F4EFEA] text-sm font-bold">
                                                    {priceMin > 0 && isFinite(priceMin) ? `$${Intl.NumberFormat("es-AR").format(priceMin)}` : "Consultar"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold">
                                                <span className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">Ganancia Neta por Unidad:</span>
                                                <span className="text-[#C9866F] text-sm font-black">
                                                    {marginMin.gainVal !== null && marginMin.gainVal > 0 && isFinite(marginMin.gainVal) ? `+$${Intl.NumberFormat("es-AR").format(Math.round(marginMin.gainVal))}` : "Consultar"}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Modal de Insumos y Fórmula de Fabricación (Info Button) */}
            <AnimatePresence>
            {infoModalProduct && (
                <motion.div
                    key="modal-insumos"
                    {...fondoModal}
                    onClick={() => setInfoModalProduct(null)}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                    <motion.div
                        {...panelModal}
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-[#242723] rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A] shrink-0">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B] flex items-center gap-1.5 font-brand">
                                    <Info className="w-3.5 h-3.5" /> Fórmula e Insumos de Fabricación
                                </span>
                                <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand mt-0.5">{infoModalProduct.name}</h3>
                            </div>
                            <button
                                onClick={() => setInfoModalProduct(null)}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 transition-all border border-[#353B33]"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#7D9878] dark:text-[#A3B69B]">
                                    Categoría: {infoModalProduct.category || "Perfumería Fina"}
                                </span>
                                <span className="px-3 py-1 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                    Género: {infoModalProduct.gender || "Todos"}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                                    Componentes Utilizados en Cálculo ({infoModalProduct.components?.length || 0})
                                </p>

                                {(() => {
                                    const breakdown = getComponentBreakdown(infoModalProduct, esencias, insumos);
                                    if (breakdown.length === 0) {
                                        return (
                                            <div className="p-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                                                Este producto no posee insumos asignados en su fórmula actual.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            {breakdown.map((comp, idx) => (
                                                <div key={idx} className="p-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2.5 rounded-xl bg-[#7D9878]/10 text-[#7D9878] shrink-0">
                                                            {comp.type === "Esencia" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{comp.name}</p>
                                                            <p className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50">
                                                                Dosis: <span className="font-extrabold text-[#7D9878] dark:text-[#A3B69B]">{comp.qty} {comp.type === "Esencia" ? "g/ml" : "un."}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 uppercase">Costo Parcial</p>
                                                        <p className="text-sm font-black text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                            {comp.isConsultar ? "Consultar" : `$${Intl.NumberFormat("es-AR").format(Math.round(comp.totalCost))}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Total Cost Summary */}
                            {(() => {
                                const cost = getProductCost(infoModalProduct, esencias, insumos);
                                const priceMay = Number(infoModalProduct.price) || 0;
                                const priceMin = Number(infoModalProduct.priceMinorista) || 0;

                                return (
                                    <div className="p-4 rounded-2xl bg-[#7D9878]/10 border border-[#7D9878]/20 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B]">Costo Total Calculado</p>
                                            <p className="text-xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] font-brand mt-0.5">
                                                {cost > 0 && isFinite(cost) ? `$${Intl.NumberFormat("es-AR").format(Math.round(cost))}` : "Consultar"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase">Precios finales</p>
                                            <p className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                Mayorista: <strong className="text-[#7D9878] dark:text-[#A3B69B]">{priceMay > 0 && isFinite(priceMay) ? `$${Intl.NumberFormat("es-AR").format(priceMay)}` : "Consultar"}</strong>
                                            </p>
                                            <p className="text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                Minorista: <strong className="text-[#C9866F]">{priceMin > 0 && isFinite(priceMin) ? `$${Intl.NumberFormat("es-AR").format(priceMin)}` : "Consultar"}</strong>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

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
                    `px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${active
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
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#7D9878] dark:text-[#A3B69B] hover:bg-[#7D9878]/10 transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Seguir agregando
                                    </button>
                                )}
                                <button
                                    onClick={closeCart}
                                    className="p-2 rounded-full text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                    title="Cerrar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
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
                                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-all ${hasDiscount
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
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={globalDiscountType === "percent" ? "100" : undefined}
                                                        value={globalDiscountValue || ""}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setGlobalDiscountValue(val);
                                                            handleApplyGlobalDiscount(globalDiscountType, val);
                                                        }}
                                                        placeholder={globalDiscountType === "percent" ? "Ej: 10" : "Ej: 2000 por producto"}
                                                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                                    />
                                                    <div className="flex bg-white dark:bg-[#242723] p-0.5 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] shrink-0">
                                                        {(["percent", "fixed"] as const).map(t => (
                                                            <button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => setGlobalDiscountType(t)}
                                                                className={`px-3 py-1.5 text-xs font-black rounded-lg ${globalDiscountType === t ? "bg-[#7D9878] text-white" : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                                            >
                                                                {t === "percent" ? "%" : "$"}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
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
                                                                handleApplyGlobalDiscount("percent", preset.val);
                                                            }}
                                                            className={chip(globalDiscountType === "percent" && globalDiscountValue === preset.val)}
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
                                                {cartSummary.totalDiscount > 0 && (
                                                    <div className="flex justify-between text-[#B5735C] dark:text-[#D29680]">
                                                        <span>Descuentos</span>
                                                        <span>-${fmt(cartSummary.totalDiscount)}</span>
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
                                            className="px-4 py-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-rose-500 font-bold text-xs hover:bg-rose-500/10 transition-all"
                                        >
                                            Vaciar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleVender}
                                            disabled={isSelling}
                                            className="px-6 py-3 rounded-xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-black text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
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
