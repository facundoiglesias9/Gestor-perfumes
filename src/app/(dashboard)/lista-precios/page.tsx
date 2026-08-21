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
    FlaskConical
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useAppContext, Producto } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { formatNumber } from "@/lib/format-utils";
import ExportModal from "@/components/ExportModal";
import ListSelectorToggle from "@/components/ListSelectorToggle";
import PaginationControls from "@/components/PaginationControls";

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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Package className="w-3 h-3 text-emerald-500" />
                {category}
            </span>
        );
    }

    // 30 ML
    if (c.includes("30") || c.includes("30ml") || c.includes("30 ml")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Package className="w-3 h-3 text-cyan-500" />
                {category}
            </span>
        );
    }

    // 100 ML
    if (c.includes("100") || c.includes("100ml") || c.includes("100 ml")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Package className="w-3 h-3 text-indigo-500" />
                {category}
            </span>
        );
    }

    // Difusores / Ambiente / Textil
    if (c.includes("difusor") || c.includes("textil") || c.includes("ambiente")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Wind className="w-3 h-3 text-teal-500" />
                {category}
            </span>
        );
    }

    // Auto
    if (c.includes("auto")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Car className="w-3 h-3 text-amber-500" />
                {category}
            </span>
        );
    }

    // Limpieza / Pisos
    if (c.includes("piso") || c.includes("limp")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Droplets className="w-3 h-3 text-sky-500" />
                {category}
            </span>
        );
    }

    // Perfumería Fina / Perfume
    if (c.includes("fina") || c.includes("perfume")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
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
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${theme.bg} ${theme.text} border ${theme.border} rounded-full text-[10px] font-black uppercase tracking-wider`}>
            <Package className={`w-3 h-3 ${theme.icon}`} />
            {category || "General"}
        </span>
    );
};

const getGenderBadge = (gender: string) => {
    const g = (gender || "").toLowerCase();
    if (g.includes("fem") || g.includes("mujer")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200/50 dark:border-pink-500/20 rounded-full text-xs font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                Femenino
            </span>
        );
    }
    if (g.includes("masc") || g.includes("hombre")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 rounded-full text-xs font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Masculino
            </span>
        );
    }
    if (g.includes("unisex")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20 rounded-full text-xs font-extrabold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Unisex
            </span>
        );
    }
    if (g.includes("ambiente") || g.includes("difusor")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/20 rounded-full text-xs font-extrabold">
                <Wind className="w-3 h-3 text-teal-500" />
                Ambiente
            </span>
        );
    }
    if (g.includes("muestrario") || g.includes("muestra")) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 rounded-full text-xs font-extrabold">
                <Package className="w-3 h-3 text-amber-500" />
                Muestrario
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-extrabold">
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
        createOrder,
        updateOrderPaymentStatus,
        updateCartQuantity,
        updateCartItemPrice,
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
    const [customerName, setCustomerName] = useState("");
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showConsult, setShowConsult] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'transferencia' | 'efectivo'>('qr');
    const [paymentLink, setPaymentLink] = useState<string>("");
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(null);
    const itemsPerPage = 10;

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
        const finalName = (!isAdmin && currentUser) ? currentUser.username : customerName;
        if (cartFiltered.length === 0) return;

        // Apply individual item discounted effective unit prices before creating order
        cartFiltered.forEach(item => {
            const pricing = getItemPricing(item);
            updateCartItemPrice(item.producto.id, item.priceType, pricing.effectiveUnitPrice);
        });

        // 1. Create Order
        await createOrder(finalName || "Venta Directa", paymentMethod, isMinorista ? "minorista" : "mayorista");

        // 2. Automatically register in Caja as paid income (Ingreso)
        const lastOrderId = localStorage.getItem("lastCreatedOrderId");
        if (lastOrderId) {
            await updateOrderPaymentStatus(lastOrderId, "pagado");
        }

        if (isAdmin) setCustomerName("");
        setItemDiscounts({});
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

    const handlePerformExport = (data: Producto[], format: "excel" | "pdf") => {
        const listName = isMinorista ? "Minorista" : "Mayorista";
        if (format === "excel") {
            const excelData = data.map(p => {
                const val = isMinorista ? Number(p.priceMinorista) : Number(p.price);
                return {
                    "Producto": p.name,
                    "Categoría": p.category,
                    "Género": p.gender,
                    [`Precio ${listName}`]: (isNaN(val) || val <= 0) ? "Consultar" : `$${Intl.NumberFormat("es-AR").format(val)}`
                };
            });
            exportToExcel(excelData, `Lista_Precios_${listName}_Scenta`, `Scenta - Lista de Precios ${listName}`);
        } else {
            const headers = ["Producto", "Categoría", "Género", `Precio ${listName}`];
            const rows = data.map(p => {
                const val = isMinorista ? Number(p.priceMinorista) : Number(p.price);
                return [
                    p.name,
                    p.category,
                    p.gender,
                    (isNaN(val) || val <= 0) ? "Consultar" : `$${Intl.NumberFormat("es-AR").format(val)}`
                ];
            });
            exportToPDF(`Lista de Precios ${listName} - Scenta`, headers, rows, `Lista_Precios_${listName}_Scenta`);
        }
        setExportFormat(null);
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration">
            <header className="bg-white dark:bg-[#242723] rounded-[2.5rem] p-8 md:p-10 border border-[#E6DFD5] dark:border-[#353B33] shadow-sm relative overflow-hidden transition-colors duration-300">
                <div className="flex flex-col items-center text-center gap-6 relative z-10">
                    <div className="flex flex-col items-center space-y-3 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 text-xs font-bold tracking-widest uppercase">
                            <span className="w-2 h-2 rounded-full animate-pulse bg-[#7D9878]"></span>
                            {isMinorista ? "Venta al Público" : "Comercialización Mayorista"}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] transition-colors font-brand">
                            {isMinorista ? "Lista Minorista" : "Lista Mayorista"}
                        </h1>
                        <p className="text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 text-lg leading-relaxed font-medium transition-colors">
                            {isMinorista
                                ? "Precios sugeridos para el consumidor final con margen minorista."
                                : "Gestioná tus precios mayoristas y prepará pedidos rápidamente."}
                        </p>
                        <div className="mt-2 px-4 py-2 border border-[#E6DFD5] dark:border-[#353B33] rounded-xl inline-flex items-center gap-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA]">
                            <div className="w-2 h-2 rounded-full animate-pulse bg-[#7D9878]"></div>
                            <p className="text-sm font-bold">
                                Todos los productos de Perfumería Fina son de 50 ML
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#7D9878] text-white font-bold hover:bg-[#6b8566] active:scale-95 transition-all shadow-lg shadow-[#7D9878]/20"
                        >
                            <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                            Ver Pedido
                            {cartFiltered.length > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#C9866F] text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-black">
                                    {cartFiltered.length}
                                </span>
                            )}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setExportFormat("excel")}
                                className="p-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] hover:bg-[#7D9878]/10 border border-[#E6DFD5] dark:border-[#353B33] transition-all"
                                title="Exportar a Excel"
                            >
                                <FileSpreadsheet className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setExportFormat("pdf")}
                                className="p-3.5 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#C9866F] hover:bg-[#C9866F]/10 border border-[#E6DFD5] dark:border-[#353B33] transition-all"
                                title="Exportar a PDF"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CENTERED DUAL SELECTOR (Located between Header and Filters) */}
            <div className="flex justify-center w-full py-2">
                <ListSelectorToggle
                    activeMode={mode}
                    onSelectMode={(newMode) => {
                        setMode(newMode);
                        setCurrentPage(1);
                    }}
                />
            </div>

            {/* Filter and Control Bar */}

            {/* Filter and Control Bar */}
            <div className="bg-white dark:bg-[#242723] p-6 rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                    {/* Search */}
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ID..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-12 pr-4 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/50 dark:placeholder:text-[#F4EFEA]/60 focus:outline-none focus:border-[#7D9878] font-semibold transition-all"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]/40 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                            className="px-4 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30"
                        >
                            <option value="Todas">Todas las Categorías</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>

                        <select
                            value={genderFilter}
                            onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                            className="px-4 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30"
                        >
                            <option value="Todos">Todos los Géneros</option>
                            {generos.map(g => (
                                <option key={typeof g === 'string' ? g : (g as any).id} value={typeof g === 'string' ? g : (g as any).name}>
                                    {typeof g === 'string' ? g : (g as any).name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-3 bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#7D9878]/30"
                        >
                            <option value="none">Sin Ordenar</option>
                            <option value="price-asc">Precio: Menor a Mayor</option>
                            <option value="price-desc">Precio: Mayor a Menor</option>
                            <option value="id-asc">ID: Menor a Mayor</option>
                            <option value="id-desc">ID: Mayor a Menor</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#7D9878]" />
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-bold">Cargando productos...</p>
                </div>
            ) : filteredAndSortedProductos.length === 0 ? (
                <div className="bg-white dark:bg-[#242723] rounded-3xl p-12 text-center border border-[#E6DFD5] dark:border-[#353B33] space-y-4">
                    <Search className="w-12 h-12 text-[#7D9878] mx-auto" />
                    <h3 className="text-xl font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">No se encontraron productos</h3>
                    <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 text-sm">Intenta ajustar los filtros de búsqueda.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#242723] rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm overflow-hidden transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[11px] font-black uppercase text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 tracking-wider border-b border-[#E6DFD5] dark:border-[#353B33]">
                                    <th className="py-4 px-6 text-center">Producto</th>
                                    <th className="py-4 px-6 text-center">Categoría</th>
                                    <th className="py-4 px-6 text-center">Género / Variante</th>
                                    <th className="py-4 px-6 text-center">Precio {isMinorista ? "Minorista" : "Mayorista"}</th>
                                    <th className="py-4 px-6 text-center">% Margen</th>
                                    <th className="py-4 px-6 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                                {paginatedProductos.map(producto => {
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
                                            className="hover:bg-[#7D9878]/5 dark:hover:bg-[#A3B69B]/10 transition-colors group text-center"
                                        >
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center justify-center text-center">
                                                    {brand && (
                                                        <span className="text-[10px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest">
                                                            {brand}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                        {title}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex justify-center">
                                                    {getCategoryBadge(producto.category)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex justify-center">
                                                    {getGenderBadge(producto.gender)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center font-black text-[#2C2C2C] dark:text-[#F4EFEA] text-base">
                                                {!isValidPrice ? (
                                                    <span className="px-2.5 py-1 bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA] rounded-lg text-xs font-bold">
                                                        Consultar
                                                    </span>
                                                ) : (
                                                    `$${Intl.NumberFormat("es-AR").format(currentPrice)}`
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold ${currentMargin.isConsultar ? "bg-[#DAC4AA]/20 text-[#2C2C2C] dark:text-[#DAC4AA]" : (isMinorista ? "bg-[#C9866F]/10 text-[#C9866F]" : "bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B]")}`}>
                                                    {!currentMargin.isConsultar && <TrendingUp className="w-3.5 h-3.5" />}
                                                    {currentMargin.percentStr}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setInfoModalProduct(producto)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold transition-all bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 active:scale-95 whitespace-nowrap"
                                                        title="Ver insumos y fórmula utilizada"
                                                    >
                                                        <Info className="w-4 h-4" />
                                                        <span className="hidden md:inline">Insumos</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setProfitModalProduct(producto)}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#7D9878] dark:text-[#A3B69B] border border-[#E6DFD5] dark:border-[#353B33] hover:bg-[#7D9878]/10 active:scale-95 whitespace-nowrap"
                                                        title="Ver Desglose de % Ganancia"
                                                    >
                                                        <Percent className="w-3.5 h-3.5" />
                                                        <span>% Ganancia</span>
                                                    </button>
                                                    <button
                                                        onClick={() => addToCart(producto, isMinorista ? "minorista" : "mayorista")}
                                                        disabled={!isValidPrice}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 bg-[#7D9878] hover:bg-[#6b8566] shadow-[#7D9878]/20 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Agregar
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
            />

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
                        showOutOfStock: showOutOfStock
                    }}
                    type={exportFormat}
                />
            )}

            {/* Modal de Rentabilidad (% Ganancia) */}
            {profitModalProduct && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300">
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
                    </div>
                </div>
            )}

            {/* Modal de Insumos y Fórmula de Fabricación (Info Button) */}
            {infoModalProduct && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
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
                    </div>
                </div>
            )}

            {/* Modal de Ver Pedido / Carrito (isCartOpen) */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[300] flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#242723] w-full max-w-lg h-full shadow-2xl border-l border-[#E6DFD5] dark:border-[#353B33] animate-in slide-in-from-right duration-300 flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-[#E6DFD5] dark:border-[#353B33] flex justify-between items-center bg-[#F9F6F0] dark:bg-[#1B1D1A] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-[#7D9878]/10 text-[#7D9878]">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#7D9878] dark:text-[#A3B69B]">
                                        Pedido {isMinorista ? "Minorista" : "Mayorista"}
                                    </span>
                                    <h3 className="text-xl font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                                        Resumen de Pedido
                                    </h3>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCartOpen(false);
                                    setOrderSuccess(false);
                                }}
                                className="p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 transition-all border border-[#353B33]"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Cart Items or Success state */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Button to close and keep adding products */}
                            {!orderSuccess && (
                                <button
                                    type="button"
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-full py-2.5 px-4 rounded-2xl bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20 hover:bg-[#7D9878]/20 transition-all font-bold text-xs flex items-center justify-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Seguir agregando productos
                                </button>
                            )}

                            {orderSuccess ? (
                                <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center space-y-3">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                                    <h4 className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-brand">
                                        ¡Venta Registrada con Éxito!
                                    </h4>
                                    <p className="text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                        La venta fue ingresada en el sistema y el cobro se registró automáticamente en <strong>Caja</strong>.
                                    </p>
                                </div>
                            ) : cartFiltered.length === 0 ? (
                                <div className="py-16 text-center space-y-4">
                                    <ShoppingCart className="w-16 h-16 text-[#7D9878]/40 mx-auto" />
                                    <h4 className="text-base font-bold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                        Tu pedido está vacío
                                    </h4>
                                    <p className="text-xs text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 max-w-xs mx-auto font-medium">
                                        Hacé clic en <strong>+ Agregar</strong> en la lista de precios para sumar productos.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Massive / Global Discount Option */}
                                    <div className="p-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 flex items-center gap-1">
                                                <Percent className="w-3.5 h-3.5 text-[#7D9878]" /> Descuento Masivo a Todos los Productos
                                            </label>
                                            <div className="flex gap-1 bg-white dark:bg-[#242723] p-1 rounded-xl border border-[#E6DFD5] dark:border-[#353B33]">
                                                <button
                                                    type="button"
                                                    onClick={() => setGlobalDiscountType("percent")}
                                                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${globalDiscountType === "percent" ? "bg-[#7D9878] text-white" : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                                >
                                                    % Porcentaje
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setGlobalDiscountType("fixed")}
                                                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${globalDiscountType === "fixed" ? "bg-[#7D9878] text-white" : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60"}`}
                                                >
                                                    $ Monto Fijo
                                                </button>
                                            </div>
                                        </div>

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
                                                placeholder={globalDiscountType === "percent" ? "Ej: 10 (aplica 10% a cada producto)" : "Ej: 2000 (descuento $ a cada producto)"}
                                                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                            />
                                        </div>

                                        {/* Presets to apply to all items */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {[
                                                { label: "Sin Descuento", val: 0 },
                                                { label: "-5%", val: 5 },
                                                { label: "-10%", val: 10 },
                                                { label: "-15%", val: 15 },
                                                { label: "-20%", val: 20 },
                                                { label: "2do 50% Off (-25%)", val: 25 },
                                            ].map(preset => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setGlobalDiscountType("percent");
                                                        setGlobalDiscountValue(preset.val);
                                                        handleApplyGlobalDiscount("percent", preset.val);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${globalDiscountType === "percent" && globalDiscountValue === preset.val ? "bg-[#7D9878] text-white border-[#7D9878]" : "bg-white dark:bg-[#242723] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"}`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Per-Item Cards */}
                                    <div className="space-y-3">
                                        {cartFiltered.map(item => {
                                            const pricing = getItemPricing(item);

                                            return (
                                                <div
                                                    key={item.producto.id}
                                                    className="p-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] space-y-3"
                                                >
                                                    {/* Product Header & Quantity */}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-[9px] font-black text-[#7D9878] dark:text-[#A3B69B] uppercase tracking-widest block">
                                                                {item.producto.category}
                                                            </span>
                                                            <h5 className="text-sm font-bold text-[#2C2C2C] dark:text-[#F4EFEA] truncate">
                                                                {item.producto.name}
                                                            </h5>
                                                            <p className="text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-0.5">
                                                                Precio Lista: ${Intl.NumberFormat("es-AR").format(pricing.baseUnitPrice)} c/u
                                                            </p>
                                                        </div>

                                                        {/* Quantity Controls */}
                                                        <div className="flex items-center gap-2 bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-xl p-1">
                                                            <button
                                                                onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity - 1)}
                                                                className="w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg hover:bg-[#7D9878]/10 text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="w-6 text-center text-xs font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity + 1)}
                                                                className="w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg hover:bg-[#7D9878]/10 text-[#2C2C2C] dark:text-[#F4EFEA]"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() => updateCartQuantity(item.producto.id, item.priceType, 0)}
                                                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                            title="Eliminar producto"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Per-Product Discount Input */}
                                                    <div className="p-3 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] space-y-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 flex items-center gap-1">
                                                                <Percent className="w-3 h-3 text-[#7D9878]" /> Descuento este producto:
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
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
                                                                    placeholder={pricing.disc.type === "percent" ? "% Dto" : "$ Dto"}
                                                                    className="w-20 px-2.5 py-1 rounded-lg bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-center text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextType = pricing.disc.type === "percent" ? "fixed" : "percent";
                                                                        setItemDiscounts(prev => ({
                                                                            ...prev,
                                                                            [pricing.key]: { type: nextType, value: pricing.disc.value }
                                                                        }));
                                                                    }}
                                                                    className="px-2 py-1 text-[10px] font-black rounded-lg bg-[#7D9878]/10 text-[#7D9878] dark:text-[#A3B69B] border border-[#7D9878]/20"
                                                                >
                                                                    {pricing.disc.type === "percent" ? "%" : "$"}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Individual Item Presets */}
                                                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                            {[
                                                                { label: "Sin dto", val: 0 },
                                                                { label: "-10%", val: 10 },
                                                                { label: "-20%", val: 20 },
                                                                { label: "2do 50% Off (-25%)", val: 25 },
                                                                { label: "-50%", val: 50 },
                                                            ].map(preset => (
                                                                <button
                                                                    key={preset.label}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setItemDiscounts(prev => ({
                                                                            ...prev,
                                                                            [pricing.key]: { type: "percent", value: preset.val }
                                                                        }));
                                                                    }}
                                                                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-all ${pricing.disc.type === "percent" && pricing.disc.value === preset.val ? "bg-[#7D9878] text-white border-[#7D9878]" : "bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70 border-[#E6DFD5] dark:border-[#353B33] hover:border-[#7D9878]"}`}
                                                                >
                                                                    {preset.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Item Price & Profit Margin Breakdown */}
                                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E6DFD5]/60 dark:border-[#353B33]/60">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 block">Ganancia en pesos:</span>
                                                            <span className={pricing.itemNetProfit !== null && pricing.itemNetProfit > 0 ? "font-black text-[#7D9878] dark:text-[#A3B69B]" : "font-bold text-[#DAC4AA]"}>
                                                                {pricing.itemNetProfit !== null
                                                                    ? `+$${Intl.NumberFormat("es-AR").format(Math.round(pricing.itemNetProfit))} ${pricing.itemMarginPercent !== null ? `(+${Math.round(pricing.itemMarginPercent)}%)` : ""}`
                                                                    : "Consultar"}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-bold text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 block">Subtotal Item:</span>
                                                            <span className="font-black text-[#2C2C2C] dark:text-[#F4EFEA] text-sm">
                                                                ${Intl.NumberFormat("es-AR").format(pricing.itemFinalTotal)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Checkout Form */}
                        {cartFiltered.length > 0 && !orderSuccess && (
                            <div className="p-6 border-t border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0] dark:bg-[#1B1D1A] space-y-4 shrink-0">
                                {isAdmin && (
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 block mb-1">
                                            Nombre del Cliente / Destinatario
                                        </label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Ingresá el nombre del cliente..."
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-xs font-bold text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:border-[#7D9878]"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2 pt-1">
                                    <div className="flex justify-between items-center text-xs font-bold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/70">
                                        <span>Subtotal Lista:</span>
                                        <span>${Intl.NumberFormat("es-AR").format(cartSummary.baseSubtotal)}</span>
                                    </div>
                                    {cartSummary.totalDiscount > 0 && (
                                        <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                                            <span>Descuentos aplicados:</span>
                                            <span>-${Intl.NumberFormat("es-AR").format(cartSummary.totalDiscount)}</span>
                                        </div>
                                    )}

                                    {/* Financial Breakdown (Cost & Net Profit in Pesos) */}
                                    <div className="p-3 rounded-2xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] space-y-1.5 my-2">
                                        <div className="flex justify-between items-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60">
                                            <span>Costo Total Estimado de Fabricación:</span>
                                            <span>
                                                {!cartSummary.hasAnyInvalidCost
                                                    ? `$${Intl.NumberFormat("es-AR").format(Math.round(cartSummary.totalCost))}`
                                                    : "Consultar"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-black pt-1.5 border-t border-[#E6DFD5]/60 dark:border-[#353B33]/60">
                                            <span className="text-[#2C2C2C] dark:text-[#F4EFEA] flex items-center gap-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-[#7D9878]" /> Margen de Ganancia Real Total:
                                            </span>
                                            <span className={cartSummary.netProfit !== null && cartSummary.netProfit > 0 ? "text-[#7D9878] dark:text-[#A3B69B] text-sm" : "text-[#DAC4AA]"}>
                                                {cartSummary.netProfit !== null
                                                    ? `+$${Intl.NumberFormat("es-AR").format(Math.round(cartSummary.netProfit))} ${cartSummary.marginPercent !== null ? `(+${Math.round(cartSummary.marginPercent)}%)` : ""}`
                                                    : "Consultar"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-1.5 border-t border-[#E6DFD5] dark:border-[#353B33]">
                                        <span className="text-sm font-extrabold text-[#2C2C2C] dark:text-[#F4EFEA]">
                                            Total a Cobrar:
                                        </span>
                                        <span className="text-2xl font-black text-[#7D9878] dark:text-[#A3B69B] font-brand">
                                            ${Intl.NumberFormat("es-AR").format(cartSummary.totalFinal)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleClearCart}
                                        className="px-4 py-3 rounded-xl bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] text-rose-500 font-bold text-xs hover:bg-rose-500/10 transition-all"
                                    >
                                        Vaciar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleVender}
                                        className="flex-1 py-3.5 rounded-xl bg-[#7D9878] hover:bg-[#6b8566] text-white font-black text-xs transition-all shadow-md active:scale-95 text-center flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Vender (${Intl.NumberFormat("es-AR").format(cartSummary.totalFinal)})
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
