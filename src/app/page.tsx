"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
    Search,
    Filter,
    ShoppingBag,
    X,
    ChevronDown,
    ArrowUpRight,
    ShoppingCart,
    MessageCircle,
    Image as ImageIcon,
    Loader2,
    Moon,
    Sun,
    Check,
    Tag,
    Tags,
    User,
    LayoutDashboard
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext, Producto } from "@/context/AppContext";
import { getOptimizedImageUrl } from "@/lib/image-optimizer";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
    const { productos, categorias, generos, isLoading, currentUser } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("Todas");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [cart, setCart] = useState<{ producto: Producto, quantity: number }[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Dropdown visibility
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isGenderOpen, setIsGenderOpen] = useState(false);

    const categoryRef = useRef<HTMLDivElement>(null);
    const genderRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
            if (genderRef.current && !genderRef.current.contains(event.target as Node)) {
                setIsGenderOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filtered products
    const filteredProductos = useMemo(() => {
        return productos.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === "Todas" || p.category === categoryFilter;
            const matchesGender = genderFilter === "Todos" || p.gender === genderFilter;
            return matchesSearch && matchesCategory && matchesGender;
        });
    }, [productos, searchTerm, categoryFilter, genderFilter]);

    // Cart logic
    const addToCart = (p: Producto) => {
        setCart(prev => {
            const existing = prev.find(item => item.producto.id === p.id);
            if (existing) {
                return prev.map(item => item.producto.id === p.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            }
            return [...prev, { producto: p, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.producto.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.producto.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.producto.priceMinorista * item.quantity), 0);

    const handleWhatsAppOrder = () => {
        const phoneNumber = "5491138902507";
        let message = "¡Hola Scenta! 👋 Quisiera hacer un pedido:\n\n";

        cart.forEach(item => {
            message += `• *${item.producto.name}* x ${item.quantity} ($${(item.producto.priceMinorista * item.quantity).toLocaleString()})\n`;
        });

        message += `\n*Total: $${cartTotal.toLocaleString()}*`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-500">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sintonizando Aromas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen transition-all duration-700 bg-white dark:bg-slate-950 selection:bg-indigo-500/30">
            <div className="dark:bg-slate-950 bg-white min-h-screen transition-colors duration-500">
                {/* Header Flotante */}
                <nav className="sticky top-0 z-[60] bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <ArrowUpRight className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">SCENTA</h1>
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Perfumería Fina</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Auth Buttons */}
                            <div className="hidden md:flex items-center gap-4 mr-2">
                                {currentUser ? (
                                    <Link
                                        href={currentUser.role === 'minorista' ? '/minorista' : '/lista-mayorista'}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl font-black text-xs uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20 hover:scale-105 transition-all"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Mi Panel
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-black text-xs uppercase tracking-widest transition-colors"
                                        >
                                            Iniciar Sesión
                                        </Link>
                                        <Link
                                            href="/registrarse"
                                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                                        >
                                            Registrarse
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Theme Toggle */}
                            <ThemeToggle />

                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative p-3 bg-indigo-600 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all group lg:ml-2"
                            >
                                <ShoppingBag className="w-5 h-5 text-white" />
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 group-hover:animate-bounce shadow-lg">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="px-6 pt-12 pb-8 max-w-7xl mx-auto">
                    <div className="relative rounded-[3rem] overflow-hidden bg-slate-50 dark:bg-slate-900 p-12 md:p-20 text-center space-y-8 shadow-2xl shadow-indigo-500/5 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-violet-600/5 dark:from-indigo-600/10 dark:to-violet-600/10" />

                        {/* Animated blobs */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] -ml-32 -mb-32 animate-pulse" />

                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <span className="px-4 py-2 rounded-full bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100 dark:border-white/10 shadow-sm">
                                Scenta • Colección 2026
                            </span>
                            <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter max-w-4xl leading-[0.95]">
                                Frascos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Excelencia</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg md:text-2xl max-w-2xl font-medium leading-relaxed">
                                Fragancias premium que cuentan una historia. Seleccioná tus favoritas y disfrutá de un aroma persistente y único.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Filtros Renovados */}
                <section className="px-6 mb-16 max-w-7xl mx-auto sticky top-28 z-[50]">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-3 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row gap-2">
                        {/* Search */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="¿Qué perfume estás buscando?"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-[1.8rem] py-5 pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all"
                            />
                        </div>

                        <div className="flex gap-2">
                            {/* Custom Category Dropdown */}
                            <div className="relative" ref={categoryRef}>
                                <button
                                    onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsGenderOpen(false); }}
                                    className={`py-5 min-w-[180px] bg-slate-50 dark:bg-slate-800/50 rounded-[1.8rem] px-6 flex items-center justify-between gap-3 font-bold text-sm transition-all border-2 ${isCategoryOpen ? 'border-indigo-500 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        <span className="truncate max-w-[100px]">{categoryFilter}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                                </button>

                                {isCategoryOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                            <button
                                                onClick={() => { setCategoryFilter("Todas"); setIsCategoryOpen(false); }}
                                                className={`w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${categoryFilter === "Todas" ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                Todas las Categorías
                                                {categoryFilter === "Todas" && <Check className="w-3 h-3" />}
                                            </button>
                                            {categorias.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { setCategoryFilter(c.name); setIsCategoryOpen(false); }}
                                                    className={`w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${categoryFilter === c.name ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                                >
                                                    {c.name}
                                                    {categoryFilter === c.name && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custom Gender Dropdown */}
                            <div className="relative" ref={genderRef}>
                                <button
                                    onClick={() => { setIsGenderOpen(!isGenderOpen); setIsCategoryOpen(false); }}
                                    className={`py-5 min-w-[160px] bg-slate-50 dark:bg-slate-800/50 rounded-[1.8rem] px-6 flex items-center justify-between gap-3 font-bold text-sm transition-all border-2 ${isGenderOpen ? 'border-indigo-500 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Tags className="w-4 h-4" />
                                        <span>{genderFilter}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isGenderOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                                </button>

                                {isGenderOpen && (
                                    <div
                                        className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-[1.5rem] p-3 shadow-2xl border border-slate-100 dark:border-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                                    >
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => { setGenderFilter("Todos"); setIsGenderOpen(false); }}
                                                className={`w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${genderFilter === "Todos" ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                Todos
                                                {genderFilter === "Todos" && <Check className="w-3 h-3" />}
                                            </button>
                                            {generos.map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => { setGenderFilter(g); setIsGenderOpen(false); }}
                                                    className={`w-full text-left px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${genderFilter === g ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                                >
                                                    {g}
                                                    {genderFilter === g && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid de Productos */}
                <main className="px-6 max-w-7xl mx-auto min-h-[500px]">
                    {filteredProductos.length === 0 ? (
                        <div className="py-32 text-center flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Sin coincidencias</p>
                                <p className="text-slate-400 font-medium">Probá ajustando los filtros o la búsqueda.</p>
                            </div>
                            <button
                                onClick={() => { setSearchTerm(""); setCategoryFilter("Todas"); setGenderFilter("Todos"); }}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all text-sm"
                            >
                                Limpiar todo
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                            {filteredProductos.map((p) => (
                                <div
                                    key={p.id}
                                    className="group relative animate-in fade-in zoom-in duration-300"
                                >
                                    <div className="aspect-[3/4] relative bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none border border-transparent dark:border-slate-800 group-hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] transition-all duration-700">
                                        {p.imageUrl ? (
                                            <Image
                                                src={getOptimizedImageUrl(p.imageUrl, 500) || ""}
                                                alt={p.name}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                loading="lazy"
                                                className="object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-1000 ease-out"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700">
                                                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Fragancia Premium</span>
                                            </div>
                                        )}

                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg ${p.gender === 'Femenino' ? 'bg-rose-500/80 text-white border-rose-400/50' :
                                                p.gender === 'Masculino' ? 'bg-blue-600/80 text-white border-blue-400/50' :
                                                    'bg-violet-600/80 text-white border-violet-400/50'
                                                }`}>
                                                {p.gender}
                                            </div>
                                        </div>

                                        {/* Fast Action (hidden on mobile, visible on group hover) */}
                                        <button
                                            onClick={() => addToCart(p)}
                                            className="absolute bottom-6 right-6 w-14 h-14 bg-white dark:bg-indigo-600 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white shadow-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 cursor-pointer hover:scale-110 active:scale-90"
                                        >
                                            <PlusIcon className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="mt-6 px-4 space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{p.category}</p>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-[1.1] transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                                {p.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    ${(p.priceMinorista * 1.2).toLocaleString()}
                                                </span>
                                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                                    ${p.priceMinorista.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg uppercase">
                                                En Stock
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Shopping Cart Drawer */}
                <AnimatePresence>
                    {isCartOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex justify-end"
                            onClick={() => setIsCartOpen(false)}
                        >
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                onClick={e => e.stopPropagation()}
                                className="w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col"
                            >
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                            <ShoppingBag className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Mi Pedido</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cart.length} Fragancias</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl hover:scale-110 h-12 w-12 flex items-center justify-center transition-all dark:text-white">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-6">
                                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center items-center">
                                                <ShoppingCart className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-black uppercase tracking-widest text-center max-w-[150px]">Tu carrito se siente algo ligero...</p>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={item.producto.id}
                                                className="flex gap-6 group/item"
                                            >
                                                <div className="w-24 h-24 rounded-[1.8rem] bg-slate-100 dark:bg-slate-900 overflow-hidden relative border border-slate-100 dark:border-slate-800 group-hover/item:shadow-lg transition-all duration-500">
                                                    {item.producto.imageUrl && (
                                                        <Image src={getOptimizedImageUrl(item.producto.imageUrl, 200) || ""} alt={item.producto.name} fill className="object-cover group-hover/item:scale-110 transition-transform duration-700" />
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between py-1">
                                                    <div className="space-y-1">
                                                        <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight group-hover/item:text-indigo-600 transition-colors uppercase tracking-tight">{item.producto.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.producto.category}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700">
                                                            <button onClick={() => updateQuantity(item.producto.id, -1)} className="text-indigo-600 dark:text-indigo-400 font-black px-1 hover:scale-125 transition-transform">-</button>
                                                            <span className="text-xs font-black text-slate-900 dark:text-white w-5 text-center">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.producto.id, 1)} className="text-indigo-600 dark:text-indigo-400 font-black px-1 hover:scale-125 transition-transform">+</button>
                                                        </div>
                                                        <span className="font-black text-sm text-slate-900 dark:text-white">${(item.producto.priceMinorista * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeFromCart(item.producto.id)} className="text-slate-200 dark:text-slate-800 hover:text-rose-500 dark:hover:text-rose-400 transition-colors py-2">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                <div className="p-8 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                            <span>Subtotal</span>
                                            <span>${cartTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-900 dark:text-white font-black text-lg uppercase tracking-tight">Total Final</span>
                                            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter shadow-indigo-500/10">
                                                ${cartTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        disabled={cart.length === 0}
                                        onClick={handleWhatsAppOrder}
                                        className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 shadow-2xl shadow-[#25D366]/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:active:scale-100 cursor-pointer group/wa"
                                    >
                                        <MessageCircle className="w-8 h-8 fill-current group-hover/wa:rotate-12 transition-transform" />
                                        Hacer mi pedido ahora
                                    </button>
                                    <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest opacity-60">Pedido vía WhatsApp • Seguro y rápido</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer */}
                <footer className="mt-40 border-t border-slate-200 dark:border-slate-800 py-20 px-6 text-center bg-white dark:bg-slate-950">
                    <div className="max-w-7xl mx-auto space-y-12">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center shadow-2xl">
                                <ArrowUpRight className="w-8 h-8 text-white dark:text-slate-900" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">SCENTA</h2>
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-lg max-w-xl mx-auto font-medium leading-relaxed">
                            Transformamos el arte de la perfumería en una experiencia inolvidable. Fragancias de alta gama para personalidades únicas.
                        </p>
                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                            {["Preguntas", "Envíos", "Mayoristas", "Contacto"].map(link => (
                                <Link key={link} href="#" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 dark:text-slate-600 dark:hover:text-indigo-400 transition-colors">
                                    {link}
                                </Link>
                            ))}
                        </div>
                        <div className="pt-12 border-t border-slate-100 dark:border-slate-900 text-[10px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-[0.3em]">
                            © 2026 Scenta Perfumes Lab • Buenos Aires
                        </div>
                    </div>
                </footer>
            </div >
        </div >
    );
}

function PlusIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}
