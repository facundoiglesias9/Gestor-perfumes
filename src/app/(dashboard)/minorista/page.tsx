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
    Loader2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import { useState, useMemo, useEffect } from "react";
import { useAppContext, Producto, Promotion } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import { FileSpreadsheet, FileText } from "lucide-react";

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
        deleteProducto,
        addToCart,
        cart,
        createOrder,
        updateCartQuantity,
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
    const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "id-asc" | "id-desc" | "none">("none");
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isRestored, setIsRestored] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'transferencia' | 'efectivo'>('qr');
    const [paymentLink, setPaymentLink] = useState<string>("");
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const itemsPerPage = 10;

    // Restore filters + page from sessionStorage on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem('minorista_filters');
            if (saved) {
                const { search: s, categoryFilter: c, genderFilter: g, sortBy: sb, currentPage: p } = JSON.parse(saved);
                if (s !== undefined) setSearch(s);
                if (c !== undefined) setCategoryFilter(c);
                if (g !== undefined) setGenderFilter(g);
                if (sb !== undefined) setSortBy(sb);
                if (p !== undefined) setCurrentPage(p);
            }
        } catch { }
        setIsRestored(true);
    }, []);

    // Save filters + page to sessionStorage whenever they change
    useEffect(() => {
        if (isRestored) {
            sessionStorage.setItem('minorista_filters', JSON.stringify({ search, categoryFilter, genderFilter, sortBy, currentPage }));
        }
    }, [search, categoryFilter, genderFilter, sortBy, currentPage, isRestored]);

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
            result = result.filter(p => p.category === categoryFilter);
        }

        if (genderFilter !== "Todos") {
            result = result.filter(p => p.gender === genderFilter);
        }

        if (sortBy === "price-asc") {
            result.sort((a, b) => a.priceMinorista - b.priceMinorista);
        } else if (sortBy === "price-desc") {
            result.sort((a, b) => b.priceMinorista - a.priceMinorista);
        }

        if (sortBy === "id-asc") {
            result.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        } else if (sortBy === "id-desc") {
            result.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
        }

        return result;
    }, [productos, search, categoryFilter, genderFilter, sortBy]);

    const totalPages = Math.ceil(filteredAndSortedProductos.length / itemsPerPage);
    const paginatedProductos = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAndSortedProductos.slice(start, start + itemsPerPage);
    }, [filteredAndSortedProductos, currentPage]);

    // Generate MP Link when QR is selected
    useEffect(() => {
        if (paymentMethod === 'qr' && cart.length > 0 && paymentInfo.mpAccessToken) {
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
                            items: cart.map(item => ({
                                name: item.producto.name,
                                quantity: item.quantity,
                                price: item.priceType === 'minorista' ? item.producto.priceMinorista : item.producto.price
                            }))
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
    }, [paymentMethod, cart, paymentInfo.mpAccessToken]);

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = (!isAdmin && currentUser) ? currentUser.username : customerName;
        if (!finalName || cart.length === 0) return;
        createOrder(finalName, paymentMethod);
        if (isAdmin) setCustomerName("");
        setOrderSuccess(true);
        setTimeout(() => {
            setIsCartOpen(false);
        }, 2000);
    };

    const handleExportExcel = () => {
        const data = filteredAndSortedProductos.map(p => ({
            "Producto": p.name,
            "Categoría": p.category,
            "Género": p.gender,
            "Precio Minorista": `$${p.priceMinorista.toLocaleString("es-AR")}`
        }));
        exportToExcel(data, "Lista_Precios_Minorista_Scenta", "Scenta - Lista de Precios Minorista");
    };

    const handleExportPDF = () => {
        const headers = ["Producto", "Categoría", "Género", "Precio"];
        const rows = filteredAndSortedProductos.map(p => [
            p.name,
            p.category,
            p.gender,
            `$${p.priceMinorista.toLocaleString("es-AR")}`
        ]);
        exportToPDF("Lista de Precios Minorista - Scenta", headers, rows, "Lista_Precios_Minorista_Scenta");
    };

    const cartFiltered = useMemo(() => cart.filter(item => item.priceType === "minorista"), [cart]);

    const cartTotal = cartFiltered.reduce((acc, item) => {
        return acc + (item.producto.priceMinorista * item.quantity);
    }, 0);

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
                            onClick={handleExportExcel}
                            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center gap-2 font-bold text-sm"
                            title="Exportar a Excel"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
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
                            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center p-6 overflow-hidden">
                                {prod.imageUrl ? (
                                    <Image
                                        src={getOptimizedImageUrl(prod.imageUrl, 400) || prod.imageUrl || ""}
                                        alt={prod.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className="object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
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
                            <div className="absolute top-4 left-4 z-10">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl backdrop-blur-md border ${prod.gender === 'Femenino' ? 'bg-pink-600/90 text-white border-pink-400/50' :
                                    prod.gender === 'Masculino' ? 'bg-sky-600/90 text-white border-sky-400/50' :
                                        prod.gender === 'Unisex' ? 'bg-emerald-600/90 text-white border-emerald-400/50' :
                                            'bg-slate-800/90 text-white border-slate-600/50'
                                    }`}>
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
                                </div>

                                <div className="flex items-end justify-between w-full mt-auto text-left">
                                    <div>
                                        {(() => {
                                            const promo = promotions.find(p => p.productId === prod.id && p.isActive && (!p.endDate || new Date(p.endDate) >= new Date()));
                                            if (promo) {
                                                return (
                                                    <>
                                                        <p className="text-xs text-slate-400 line-through font-bold mb-0.5 opacity-60">
                                                            ${prod.priceMinorista.toLocaleString()}
                                                        </p>
                                                        <p className="text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                                                            <span className="text-xl mr-0.5">$</span>
                                                            {Math.round(prod.priceMinorista * (1 - promo.discountPercentage / 100)).toLocaleString()}
                                                        </p>
                                                    </>
                                                );
                                            }
                                            return (
                                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    <span className="text-xl text-slate-400 mr-0.5">$</span>
                                                    {prod.priceMinorista.toLocaleString("es-AR")}
                                                </p>
                                            );
                                        })()}
                                    </div>

                                    <button
                                        onClick={() => addToCart(prod, "minorista")}
                                        className="p-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl hover:bg-emerald-600 dark:hover:bg-emerald-500 shadow-[0_4px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all"
                                        title="Agregar al carrito"
                                    >
                                        <ShoppingCart className="w-6 h-6" strokeWidth={2.5} />
                                    </button>
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
                                            const price = item.producto.priceMinorista;
                                            return (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-2">
                                                    <div className="flex-1 w-full text-center sm:text-left">
                                                        <p className="font-black text-slate-900 dark:text-slate-100">{item.producto.name}</p>
                                                        <p className="text-xs text-slate-400 font-bold tracking-tight">${price.toLocaleString()} c/u</p>
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

                                        <form onSubmit={handleCheckout} className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Cliente / Referencia</label>
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Ej: Cliente Final"
                                                    value={(!isAdmin && currentUser) ? currentUser.username : customerName}
                                                    onChange={e => setCustomerName(e.target.value)}
                                                    readOnly={!isAdmin}
                                                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 px-6 text-slate-900 dark:text-slate-100 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all ${!isAdmin ? 'opacity-70 cursor-not-allowed text-emerald-700 dark:text-emerald-400' : ''}`}
                                                />
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
                                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">(Link / QR)</span>
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
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Alias</span>
                                                            <span className="font-black text-slate-900 dark:text-emerald-400 select-all">{paymentInfo.alias}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">CBU</span>
                                                            <span className="font-black text-slate-900 dark:text-emerald-400 text-[11px] select-all">{paymentInfo.cbu}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Banco</span>
                                                            <span className="font-black text-slate-900 dark:text-slate-100">{paymentInfo.banco}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 dark:bg-white rounded-3xl text-white dark:text-slate-900">
                                                <div className="text-center sm:text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total a Pagar</p>
                                                    <p className="text-3xl font-black">${cartTotal.toLocaleString()}</p>
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-xl"
                                                >
                                                    Finalizar Solicitud
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
