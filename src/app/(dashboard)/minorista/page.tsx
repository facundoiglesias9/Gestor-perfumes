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
    X,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    Sparkles,
    ExternalLink,
    Loader2,
    Copy,
    Check,
    MessageCircle,
    XCircle,
    Clock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import { useState, useMemo, useEffect } from "react";
import { useAppContext, Producto, Promotion } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { formatNumber } from "@/lib/format-utils";
import { FileSpreadsheet, FileText } from "lucide-react";
import ExportModal from "@/components/ExportModal";

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

export default function ListaMinoristaPage() {
    const {
        productos,
        categorias,
        usuarios,
        deleteProducto,
        addToCart,
        cart,
        createOrder,
        updateCartQuantity,
        updateCartItemPrice,
        currentUser,
        generos,
        promotions,
        paymentInfo,
        isLoading
    } = useAppContext();
    const isAdmin = currentUser?.role === "admin";
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
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(null);
    const itemsPerPage = 10;

    const handleCopy = (text: string, field: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Restore filters + page from sessionStorage on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem('minorista_filters');
            if (saved) {
                const { search: s, categoryFilter: c, genderFilter: g, sizeFilter: sz, sortBy: sb, currentPage: p, showOutOfStock: so, showConsult: sc } = JSON.parse(saved);
                if (s !== undefined) setSearch(s);
                if (c !== undefined) setCategoryFilter(c);
                if (g !== undefined) setGenderFilter(g);
                if (sz !== undefined) setSizeFilter(sz);
                if (sb !== undefined) setSortBy(sb);
                if (p !== undefined) setCurrentPage(p);
                if (so !== undefined) setShowOutOfStock(so);
                if (sc !== undefined) setShowConsult(sc);
            }
        } catch { }
        setIsRestored(true);
    }, []);

    // Save filters + page to sessionStorage whenever they change
    useEffect(() => {
        if (isRestored) {
            sessionStorage.setItem('minorista_filters', JSON.stringify({ search, categoryFilter, genderFilter, sizeFilter, sortBy, currentPage, showOutOfStock, showConsult }));
        }
    }, [search, categoryFilter, genderFilter, sortBy, currentPage, isRestored, showOutOfStock, showConsult]);

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
            result = result.filter(p => !(isNaN(Number(p.priceMinorista)) || Number(p.priceMinorista || 0) <= 0));
        }

        if (sortBy === "price-asc") {
            result.sort((a, b) => (Number(a.priceMinorista) || 0) - (Number(b.priceMinorista) || 0));
        } else if (sortBy === "price-desc") {
            result.sort((a, b) => (Number(b.priceMinorista) || 0) - (Number(a.priceMinorista) || 0));
        }

        if (sortBy === "id-asc") {
            result.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        } else if (sortBy === "id-desc") {
            result.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
        }

        return result;
    }, [productos, search, categoryFilter, genderFilter, sortBy, showOutOfStock, showConsult]);

    const totalPages = Math.ceil(filteredAndSortedProductos.length / itemsPerPage);
    const paginatedProductos = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedProductos.slice(start, start + itemsPerPage);
    }, [filteredAndSortedProductos, currentPage]);

    const cartFiltered = useMemo(() => cart.filter(item => item.priceType === "minorista"), [cart]);

    const deliverySummary = useMemo(() => {
        if (cartFiltered.length === 0) return null;
        let maxDays = 0;
        let hasNoStock = false;
        cartFiltered.forEach(item => {
            const p = productos.find(prod => prod.id === item.producto.id) || item.producto;
            if (p.availabilityStatus === "no-disponible") hasNoStock = true;
            if (p.availabilityStatus === "demora") {
                const d = Number(p.deliveryDays) || 0;
                if (d > maxDays) maxDays = d;
            }
        });
        if (hasNoStock) return { text: "Uno o más productos no tienen stock disponible.", type: "error" };
        if (maxDays > 0) return { text: `Disponible para entrega en ${maxDays} días`, type: "warning" };
        return { text: "Entrega a acordar con el vendedor", type: "success" };
    }, [cartFiltered, productos]);

    const cartTotal = useMemo(() => cartFiltered.reduce((acc, item) => {
        const price = item.customPrice !== undefined ? item.customPrice : item.producto.priceMinorista;
        return acc + (price * item.quantity);
    }, 0), [cartFiltered]);

    // Generate MP Link when QR is selected
    useEffect(() => {
        if (paymentMethod === 'qr' && cartFiltered.length > 0 && paymentInfo.mpAccessToken) {
            const generateLink = async () => {
                setIsGeneratingQR(true);
                try {
                    console.log("Generating MP link with token length:", paymentInfo.mpAccessToken?.length);
                    const response = await fetch('/api/create-preference', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            accessToken: paymentInfo.mpAccessToken.trim(),
                            customerName: "Cliente Minorista",
                            items: cartFiltered.map(item => {
                                const unitPrice = item.customPrice !== undefined ? item.customPrice : (item.priceType === 'minorista' ? item.producto.priceMinorista : item.producto.price);
                                return {
                                    name: item.producto.name,
                                    quantity: item.quantity,
                                    price: unitPrice * 1.10
                                }
                            })
                        })
                    });
                    const data = await response.json();
                    if (data.init_point) {
                        setPaymentLink(data.init_point);
                    } else {
                        console.error("MP API Error:", data.error);
                    }
                } catch (error) {
                    console.error("Error generating MP link:", error);
                } finally {
                    setIsGeneratingQR(false);
                }
            };
            generateLink();
        } else {
            setPaymentLink("");
        }
    }, [paymentMethod, cartFiltered, paymentInfo.mpAccessToken]);

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = (!isAdmin && currentUser) ? currentUser.username : customerName;
        if (!finalName || cart.length === 0) return;
        createOrder(finalName, paymentMethod, "minorista");
        if (isAdmin) setCustomerName("");
        setOrderSuccess(true);
        setTimeout(() => {
            setIsCartOpen(false);
        }, 2000);
    };

    const handlePerformExport = (data: Producto[], format: "excel" | "pdf") => {
        if (format === "excel") {
            const excelData = data.map(p => ({
                "Producto": p.name,
                "Categoría": p.category,
                "Género": p.gender,
                "Precio Minorista": (isNaN(Number(p.priceMinorista)) || Number(p.priceMinorista) <= 0) ? "Consultar" : `$${Intl.NumberFormat("es-AR").format(Number(p.priceMinorista))}`
            }));
            exportToExcel(excelData, "Lista_Precios_Minorista_Scenta", "Scenta - Lista de Precios Minorista");
        } else {
            const headers = ["Producto", "Categoría", "Género", "Precio"];
            const rows = data.map(p => [
                p.name,
                p.category,
                p.gender,
                (isNaN(Number(p.priceMinorista)) || Number(p.priceMinorista) <= 0) ? "Consultar" : `$${Intl.NumberFormat("es-AR").format(Number(p.priceMinorista))}`
            ]);
            exportToPDF("Lista de Precios Minorista - Scenta", headers, rows, "Lista_Precios_Minorista_Scenta");
        }
        setExportFormat(null);
    };



    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Venta al Público
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Lista Minorista
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Precios sugeridos para el consumidor final con margen minorista.
                    </p>
                    <div className="mt-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl inline-flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                            Todos los productos de Perfumería Fina son de 50 ML
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                        Ver Pedido
                        {cartFiltered.length > 0 && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-black">
                                {cartFiltered.length}
                            </span>
                        )}
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setExportFormat("excel")}
                            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
                            title="Exportar a Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={() => setExportFormat("pdf")}
                            className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
                            title="Exportar a PDF"
                        >
                            <FileText className="w-5 h-5" />
                            <span>PDF</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Promotional Banner Removed */}

            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        placeholder="Buscar por nombre o ID..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] font-semibold text-lg"
                    />
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                        >
                            <option value="Todas">Categorías: Todas</option>
                            {categorias.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={genderFilter}
                            onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                        >
                            <option value="Todos">Géneros: Todos</option>
                            {generos.map((g, idx) => (
                                <option key={idx} value={g}>{g}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative min-w-[200px]">
                        <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-11 pr-10 text-slate-700 dark:text-slate-300 font-bold focus:outline-none appearance-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                        >
                            <option value="none">Ordenar por precio</option>
                            <option value="price-asc">Precio: Menor a Mayor</option>
                            <option value="price-desc">Precio: Mayor a Menor</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    <div 
                        onClick={() => { setShowOutOfStock(!showOutOfStock); setCurrentPage(1); }}
                        className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm group"
                    >
                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                            showOutOfStock 
                            ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20' 
                            : 'border-slate-300 dark:border-slate-700 group-hover:border-indigo-400'
                        }`}>
                            {showOutOfStock && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in-50 duration-300" />}
                        </div>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Mostrar Sin Stock</span>
                    </div>

                    <div 
                        onClick={() => { setShowConsult(!showConsult); setCurrentPage(1); }}
                        className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all shadow-sm group"
                    >
                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                            showConsult 
                            ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-600/20' 
                            : 'border-slate-300 dark:border-slate-700 group-hover:border-emerald-400'
                        }`}>
                            {showConsult && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in-50 duration-300" />}
                        </div>
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Mostrar Consultar</span>
                    </div>
                </div>
            </div>

            {/* Skeleton Loading State */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {[...Array(itemsPerPage)].map((_, i) => (
                        <div key={i} className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden animate-pulse">
                            <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
                            <div className="p-6 space-y-4">
                                <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                                <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                                <div className="flex justify-between items-center mt-auto pt-4">
                                    <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                                    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {paginatedProductos.map((prod, idx) => (
                        <div key={prod.id} className="relative group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            {/* Image Placeholder */}
                            <div className="relative aspect-square bg-white flex items-center justify-center overflow-hidden">
                                {prod.imageUrl ? (
                                    <Image
                                        src={getOptimizedImageUrl(prod.imageUrl, 400) || prod.imageUrl || ""}
                                        alt={prod.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500"
                                        priority={idx < 4}
                                        loading={idx < 4 ? undefined : "lazy"}
                                    />
                                ) : (
                                    <div className="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 overflow-hidden group-hover:border-emerald-400 dark:group-hover:border-emerald-500 transition-colors">
                                        <span className="text-[10px] font-medium opacity-40 uppercase tracking-widest">Sin Imagen</span>
                                    </div>
                                )}
                            </div>

                            {/* Gender Badge */}
                            <div className="absolute top-4 left-4 z-10 transition-transform duration-300 group-hover:scale-105">
                                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.05em] shadow-xl border border-white/20 text-white ${
                                    prod.gender === 'Femenino' ? 'bg-gradient-to-br from-pink-500 to-rose-600 shadow-pink-500/20' :
                                    prod.gender === 'Masculino' ? 'bg-gradient-to-br from-indigo-500 to-blue-700 shadow-indigo-500/20' :
                                    prod.gender === 'Unisex' ? 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20' :
                                    (prod.gender === 'Ambiente' || (typeof prod.gender === 'string' && prod.gender.toLowerCase().includes('ambiente'))) ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20' :
                                    (prod.gender === 'Auto' || (typeof prod.gender === 'string' && prod.gender.toLowerCase().includes('auto'))) ? 'bg-gradient-to-br from-violet-500 to-purple-700 shadow-violet-500/20' :
                                    (typeof prod.gender === 'string' && prod.gender.toLowerCase().includes('limpia')) ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/20' :
                                    'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/20'
                                    }`}>
                                    <span className="mr-2 w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></span>
                                    {prod.gender}
                                </span>
                            </div>

                            {/* Offer Badge Overlay */}
                            {(() => {
                                const promo = promotions.find(p => p.productId === prod.id && p.isActive && (!p.endDate || new Date(p.endDate) >= new Date()));
                                if (!promo) return null;
                                return (
                                    <div className="absolute bottom-4 right-4 z-20">
                                        <div className="whitespace-nowrap px-4 py-1.5 bg-violet-500 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 animate-bounce">
                                            <Sparkles className="w-3 h-3" />
                                            ¡OFERTA DEL {promo.discountPercentage}%!
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Action Buttons (Admin Edit/Delete) */}
                            {isAdmin && (
                                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/editar-producto/${prod.id}`}
                                        className="p-2.5 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl shadow-sm backdrop-blur-sm transition-all"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => deleteProducto(prod.id)}
                                        className="p-2.5 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-xl shadow-sm backdrop-blur-sm transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="p-6 flex-1 flex flex-col items-center text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                                    {prod.category}
                                </p>
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight mb-1">
                                    {extractBrand(prod.name).title}
                                </h3>
                                {extractBrand(prod.name).brand && (
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        {extractBrand(prod.name).brand}
                                    </p>
                                )}
                                <div className="mb-6 flex-1 flex justify-center items-start mt-2">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm transition-colors group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-800">
                                        Cód. {prod.id}
                                    </span>
                                    {prod.availabilityStatus === "demora" ? (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-violet-200 dark:ring-violet-800 shadow-sm">
                                            {prod.deliveryDays} Días
                                        </span>
                                    ) : prod.availabilityStatus === "no-disponible" && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest ring-1 ring-rose-200 dark:ring-rose-800 shadow-sm">
                                            Sin Stock
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-end justify-between w-full mt-auto text-left">
                                    {(isNaN(Number(prod.priceMinorista)) || Number(prod.priceMinorista || 0) <= 0) ? (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight uppercase">
                                                Consultar
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {(() => {
                                                const promo = promotions.find(p => p.productId === prod.id && p.isActive && (!p.endDate || new Date(p.endDate) >= new Date()));
                                                if (promo) {
                                                    return (
                                                        <>
                                                            <p className="text-xs text-slate-400 line-through font-bold mb-0.5 opacity-60">
                                                                ${formatNumber(prod.priceMinorista)}
                                                            </p>
                                                            <p className="text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                                                                <span className="text-xl mr-0.5">$</span>
                                                                {formatNumber(Math.round(prod.priceMinorista * (1 - promo.discountPercentage / 100)))}
                                                            </p>
                                                        </>
                                                    );
                                                }
                                            if (isNaN(Number(prod.priceMinorista)) || Number(prod.priceMinorista || 0) <= 0) {
                                                return (
                                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight uppercase">
                                                        Consultar
                                                    </p>
                                                );
                                            }
                                            return (
                                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    <span className="text-xl text-slate-400 mr-0.5">$</span>
                                                    {formatNumber(prod.priceMinorista)}
                                                </p>
                                            );
                                            })()}
                                        </div>
                                    )}

                                    {(isNaN(Number(prod.priceMinorista)) || Number(prod.priceMinorista || 0) <= 0) ? (
                                        <a
                                            href={`https://wa.me/5491123529147?text=Hola!%20Quiero%20consultar%20por%20el%20producto:%20${encodeURIComponent(prod.name)}%20(Cód.%20${prod.id})`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all"
                                            title="Consultar por WhatsApp"
                                        >
                                            <MessageCircle className="w-6 h-6" strokeWidth={2.5} />
                                        </a>
                                    ) : (
                                        <button
                                            disabled={prod.availabilityStatus === "no-disponible"}
                                            onClick={() => addToCart(prod, "minorista")}
                                            className={`p-4 rounded-2xl transition-all ${
                                                prod.availabilityStatus === "no-disponible"
                                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                                                : "bg-slate-900 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-95 text-white"
                                            }`}
                                            title={prod.availabilityStatus === "no-disponible" ? "Sin stock disponible" : "Agregar al carrito"}
                                        >
                                            <ShoppingCart className="w-6 h-6" strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                    }

                    {
                        filteredAndSortedProductos.length === 0 && (
                            <div className="col-span-full py-32 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
                                <Search className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-6" />
                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3">No se encontraron productos</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Intentá con otros filtros o términos de búsqueda.</p>
                            </div>
                        )
                    }
                </div >
            )}

            {/* Pagination UI */}
            {
                totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-8 py-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm">
                        <p className="text-sm font-bold text-slate-500 text-center sm:text-left">
                            Mostrando <span className="text-slate-900 dark:text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> a <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredAndSortedProductos.length)}</span> de <span className="text-slate-900 dark:text-white">{filteredAndSortedProductos.length}</span> productos
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === page
                                                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                                    : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return <span key={page} className="px-1 text-slate-300">...</span>;
                                    }
                                    return null;
                                })}
                            </div>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Cart Modal */}
            {
                isCartOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    <ShoppingBag className="w-6 h-6 text-emerald-600" />
                                    Review de Pedido (Minorista)
                                </h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {orderSuccess ? (
                                    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95">
                                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">¡Pedido Enviado!</h3>
                                        <p className="text-slate-500 font-medium">Revisalo en la pestaña "Solicitud de Pedidos"</p>
                                    </div>
                                ) : cartFiltered.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400">
                                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" strokeWidth={1} />
                                        <p className="font-bold">Tu carrito está vacío</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {cartFiltered.map((item, idx) => {
                                            const p = productos.find(prod => prod.id === item.producto.id) || item.producto;
                                            const basePrice = p.priceMinorista;
                                            const price = item.customPrice !== undefined ? item.customPrice : basePrice;

                                            return (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-2">
                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden shrink-0">
                                                        {p.imageUrl && (
                                                            <img src={p.imageUrl} className="w-full h-full object-contain p-1" alt={p.name} />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 w-full text-center sm:text-left">
                                                        <p className="font-black text-slate-900 dark:text-slate-100">{p.name}</p>
                                                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 mb-1.5">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${p.gender === 'Femenino' ? 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' : p.gender === 'Masculino' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                                                {p.gender}
                                                            </span>
                                                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9px] font-bold uppercase tracking-widest">
                                                                {p.category}
                                                            </span>
                                                            {p.availabilityStatus === "demora" && (
                                                                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400 rounded text-[9px] font-bold uppercase tracking-widest">
                                                                    {p.deliveryDays} Días
                                                                </span>
                                                            )}
                                                            {p.availabilityStatus === "no-disponible" && (
                                                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded text-[9px] font-bold uppercase tracking-widest">
                                                                    Sin Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isAdmin ? (
                                                            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                                                                <span className="text-xs text-slate-400 font-bold tracking-tight">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={item.customPrice !== undefined ? item.customPrice : ''}
                                                                    onChange={(e) => updateCartItemPrice(item.producto.id, item.priceType, e.target.value === '' ? undefined : Number(e.target.value))}
                                                                    className="w-20 bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                                                    placeholder={basePrice.toString()}
                                                                />
                                                                <span className="text-xs text-slate-400 font-bold tracking-tight">c/u</span>
                                                                <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-sm font-black ${price > item.producto.cost ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`} title={`Costo: $${item.producto.cost}`}>
                                                                    Margen: ${(price - item.producto.cost).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 font-bold tracking-tight">${price.toLocaleString()} c/u</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                        <div className="flex items-center bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
                                                            <button
                                                                onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity - 1)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors font-bold"
                                                            >-</button>
                                                            <span className="w-10 text-center font-black text-slate-900 dark:text-slate-100">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateCartQuantity(item.producto.id, item.priceType, item.quantity + 1)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors font-bold"
                                                            >+</button>
                                                        </div>
                                                        <p className="font-black text-emerald-600 dark:text-emerald-400 min-w-[100px] text-right">
                                                            ${(price * item.quantity).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <form onSubmit={handleCheckout} className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 space-y-10">
                                            {/* Delivery Status Summary (Prominent at top) */}
                                            {deliverySummary && (
                                                <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 transition-all shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 ${
                                                    deliverySummary.type === "error" ? "bg-rose-50 border-rose-200 text-rose-700" :
                                                    deliverySummary.type === "warning" ? "bg-violet-50 border-violet-200 text-violet-700 ring-4 ring-violet-500/10" :
                                                    "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-500/5"
                                                }`}>
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                        deliverySummary.type === "error" ? "bg-rose-500 text-white" :
                                                        deliverySummary.type === "warning" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" :
                                                        "bg-emerald-600 text-white"
                                                    }`}>
                                                        {deliverySummary.type === "error" ? <XCircle className="w-6 h-6" /> :
                                                         deliverySummary.type === "warning" ? <Clock className="w-6 h-6" /> :
                                                         <CheckCircle2 className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-lg leading-tight tracking-tight uppercase tracking-tight">{deliverySummary.text}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mt-1">Información Logística Oficial</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Cliente / Referencia</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Ej: Minorista Mendoza"
                                                        value={(!isAdmin && currentUser) ? currentUser.username : customerName}
                                                        onChange={e => {
                                                            setCustomerName(e.target.value);
                                                            if (isAdmin) setShowUserDropdown(true);
                                                        }}
                                                        onFocus={() => {
                                                            if (isAdmin) setShowUserDropdown(true);
                                                        }}
                                                        onBlur={() => {
                                                            setTimeout(() => setShowUserDropdown(false), 200);
                                                        }}
                                                        readOnly={!isAdmin}
                                                        className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all ${!isAdmin ? 'opacity-70 cursor-not-allowed text-indigo-700 dark:text-indigo-400' : ''}`}
                                                    />
                                                    {isAdmin && showUserDropdown && (
                                                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                                                            {usuarios.filter(u => (u.role === "minorista" || u.role === "admin") && u.username.toLowerCase().includes(customerName.toLowerCase())).length > 0 ? (
                                                                usuarios
                                                                    .filter(u => (u.role === "minorista" || u.role === "admin") && u.username.toLowerCase().includes(customerName.toLowerCase()))
                                                                    .map(u => (
                                                                        <button
                                                                            key={u.id}
                                                                            type="button"
                                                                            className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100 font-bold transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 flex justify-between items-center"
                                                                            onClick={() => {
                                                                                setCustomerName(u.username);
                                                                                setShowUserDropdown(false);
                                                                            }}
                                                                        >
                                                                            {u.username}
                                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{u.role}</span>
                                                                        </button>
                                                                    ))
                                                            ) : (
                                                                <div className="px-6 py-4 text-slate-500 text-xs font-medium">
                                                                    Presioná <span className="font-bold">Enter</span> para usar el nombre "{customerName}" manual, o verificá que esté bien escrito para vincularlo a un usuario.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Método de Pago</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentMethod('qr')}
                                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'qr'
                                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-4 ring-emerald-500/20'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950'
                                                            }`}
                                                    >
                                                        <span className="font-black text-lg">Mercado Pago</span>
                                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest text-blue-500">(+10% RECARGO)</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPaymentMethod('transferencia')}
                                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'transferencia'
                                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-4 ring-emerald-500/20'
                                                            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950'
                                                            }`}
                                                    >
                                                        <span className="font-black text-lg">Transferencia</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Payment Details Display */}
                                            {paymentMethod === 'qr' && (
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-emerald-500/30 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Escaneá para pagar</p>
                                                    <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center relative overflow-hidden">
                                                        {isGeneratingQR ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Generando...</p>
                                                            </div>
                                                        ) : paymentLink ? (
                                                            <QRCodeSVG
                                                                value={paymentLink}
                                                                size={160}
                                                                level="H"
                                                                includeMargin={false}
                                                                imageSettings={{
                                                                    src: "/favicon.ico",
                                                                    x: undefined,
                                                                    y: undefined,
                                                                    height: 24,
                                                                    width: 24,
                                                                    excavate: true,
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="text-[10px] font-bold text-rose-500 uppercase text-center">Falta configurar <br />Token de MP</p>
                                                        )}
                                                    </div>
                                                    {paymentLink && (
                                                        <a
                                                            href={paymentLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 animate-in slide-in-from-top-2"
                                                        >
                                                            <ExternalLink className="w-5 h-5" />
                                                            Pagar ahora con Mercado Pago
                                                        </a>
                                                    )}
                                                    <p className="mt-4 text-slate-400 font-bold text-[10px] text-center px-6 italic">
                                                        {paymentLink ? "Podés escanear el código o pulsar el botón para ir a Mercado Pago." : "Configurá tu cuenta para cobrar"}
                                                    </p>
                                                </div>
                                            )}

                                            {paymentMethod === 'transferencia' && (
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-emerald-500/30 animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Datos de Transferencia</p>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Alias</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-900 dark:text-emerald-400 select-all">{paymentInfo.alias}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(paymentInfo.alias || '', 'alias')}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                                                                    title="Copiar Alias"
                                                                >
                                                                    {copiedField === 'alias' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">CBU</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-slate-900 dark:text-emerald-400 text-[11px] select-all">{paymentInfo.cbu}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopy(paymentInfo.cbu || '', 'cbu')}
                                                                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                                                                    title="Copiar CBU"
                                                                >
                                                                    {copiedField === 'cbu' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Banco</span>
                                                            <span className="font-black text-slate-900 dark:text-slate-100">{paymentInfo.banco}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 dark:bg-white rounded-[2.5rem] text-white dark:text-slate-900">
                                                    <div className="text-center sm:text-left flex-1">

                                                        <div className="flex justify-between items-center pr-4">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total a Pagar {paymentMethod === 'qr' && <span className="text-blue-500 ml-1">(+10% MP)</span>}</p>
                                                                <p className="text-4xl font-black">${(paymentMethod === 'qr' ? cartTotal * 1.10 : cartTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                            </div>
                                                            <button
                                                                type="submit"
                                                                disabled={deliverySummary?.type === "error"}
                                                                className={`px-8 py-4 rounded-2xl font-black transition-all shadow-xl ${
                                                                    deliverySummary?.type === "error"
                                                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                                                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                                                                }`}
                                                            >
                                                                Confirmar Pedido
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Export Modal */}
            <ExportModal
                isOpen={!!exportFormat}
                onClose={() => setExportFormat(null)}
                onExport={handlePerformExport}
                productos={productos}
                categorias={categorias}
                generos={generos}
                type={exportFormat || "excel"}
                initialFilters={{
                    category: categoryFilter,
                    gender: genderFilter,
                    showOutOfStock: showOutOfStock
                }}
            />
        </div>
    );
}
