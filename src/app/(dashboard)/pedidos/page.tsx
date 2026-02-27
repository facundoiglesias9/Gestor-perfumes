"use client";

import { ShoppingCart, Plus, CheckCircle2, Package, Search, X, FlaskConical, Filter, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

export default function PedidosPage() {
    const { esencias, insumos, inventario, setInventario, transacciones, setTransacciones, getNextId, categorias, proveedores, generos } = useAppContext();

    const [cart, setCart] = useState<{
        cartId: string;
        type: "Esencia" | "Insumo";
        item_id: string;
        name: string;
        category: string;
        bultosToBuy: number;
        bultoQty: number;
        bultoCost: number;
        unit: string;
    }[]>([]);

    const [formData, setFormData] = useState({
        type: "Esencia" as "Esencia" | "Insumo",
        item_id: "",
        bultosToBuy: 1,
        selectedWeightType: "30g" as "30g" | "100g"
    });

    const [isEsenciaModalOpen, setIsEsenciaModalOpen] = useState(false);
    const [esenciaSearch, setEsenciaSearch] = useState("");
    const [esenciaTab, setEsenciaTab] = useState<"Perfumería" | "Limpia Pisos">("Perfumería");
    const [esenciaGenderFilter, setEsenciaGenderFilter] = useState("Todos");
    const [esenciaProviderFilter, setEsenciaProviderFilter] = useState("Todos");
    const [esenciaCategoryFilter, setEsenciaCategoryFilter] = useState("Todos");

    const filteredEsencias = useMemo(() => {
        return esencias.filter(e => {
            const isLP = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
            if (esenciaTab === "Perfumería" && isLP) return false;
            if (esenciaTab === "Limpia Pisos" && !isLP) return false;
            const matchesSearch = e.name.toLowerCase().includes(esenciaSearch.toLowerCase());
            if (esenciaTab === "Limpia Pisos") {
                const matchesCat = esenciaCategoryFilter === "Todos" || e.category?.toLowerCase() === esenciaCategoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
            }
            const genderValue = e.gender || (e.category.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
            const matchesGender = esenciaGenderFilter === "Todos" || genderValue === esenciaGenderFilter;
            const matchesProvider = esenciaProviderFilter === "Todos" || e.provider === esenciaProviderFilter;
            return matchesSearch && matchesGender && matchesProvider;
        });
    }, [esencias, esenciaSearch, esenciaTab, esenciaGenderFilter, esenciaProviderFilter, esenciaCategoryFilter]);

    const getSelectedItemDetails = () => {
        if (formData.type === "Esencia") {
            const esencia = esencias.find(e => e.id === formData.item_id);
            if (!esencia) return null;

            // Adjust details based on selected weight
            const cost = formData.selectedWeightType === "30g"
                ? (typeof esencia.price30g === "number" ? esencia.price30g : 0)
                : (typeof esencia.price100g === "number" ? esencia.price100g : 0);
            const qty = formData.selectedWeightType === "30g" ? 30 : 100;

            return { ...esencia, cost, qty };
        }
        if (formData.type === "Insumo") return insumos.find(i => i.id === formData.item_id);
        return null;
    };

    const handleAddToCart = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const details = getSelectedItemDetails();
        if (!details) return;

        const bultoUnit = formData.type === "Esencia" ? "g" : (details as any).unit || "un.";

        setCart([...cart, {
            cartId: `C-${Date.now()}-${Math.random()}`,
            type: formData.type,
            item_id: details.id,
            name: details.name + (formData.type === "Esencia" ? ` (${formData.selectedWeightType})` : ""),
            category: details.category || "Perfumería Fina",
            bultosToBuy: formData.bultosToBuy,
            bultoQty: details.qty,
            bultoCost: details.cost,
            unit: bultoUnit
        }]);

        if (formData.type === "Insumo") {
            setFormData({ ...formData, item_id: "", bultosToBuy: 1 });
        } else {
            setIsEsenciaModalOpen(false);
            setFormData({ ...formData, item_id: "", bultosToBuy: 1 });
        }
    };

    const handleSelectEsencia = (esencia: any, weight: "30g" | "100g") => {
        const cost = weight === "30g" ? esencia.price30g : esencia.price100g;
        if (cost === "consultar" || !cost) {
            alert("Este producto requiere consulta de precio al proveedor.");
            return;
        }

        // Temporarily set the data and add to cart directly or let form handle it
        // To keep it simple, we'll auto-add when selected from the modal
        const bultoQty = weight === "30g" ? 30 : 100;

        setCart([...cart, {
            cartId: `C-${Date.now()}-${Math.random()}`,
            type: "Esencia",
            item_id: esencia.id,
            name: `${esencia.name} (${weight})`,
            category: esencia.category || "Perfumería Fina",
            bultosToBuy: 1, // Default 1 when selecting from modal
            bultoQty: bultoQty,
            bultoCost: cost as number,
            unit: "g"
        }]);

        setIsEsenciaModalOpen(false);
    };

    const handleRemoveFromCart = (cartId: string) => {
        setCart(cart.filter(c => c.cartId !== cartId));
    };

    const handleConfirmOrder = () => {
        if (cart.length === 0) return;

        const orderTotal = cart.reduce((acc, item) => acc + (item.bultosToBuy * item.bultoCost), 0);
        const descriptionItemNames = cart.map(c => c.name).join(", ");
        const description = `Pedido Mayorista: ${descriptionItemNames}`.substring(0, 100);

        setTransacciones([
            {
                id: getNextId(transacciones, "T-"),
                type: "Egreso",
                amount: orderTotal,
                description: description + (descriptionItemNames.length > 100 ? "..." : ""),
                date: new Date().toLocaleDateString("es-AR")
            },
            ...transacciones
        ]);

        let currentInv = [...inventario];
        const newInventoryItems = cart.map(c => {
            const newId = getNextId(currentInv, "INV-");
            const newItem = {
                id: newId,
                name: c.name,
                type: c.type,
                category: c.category,
                qty: c.bultosToBuy * c.bultoQty,
                lastUpdate: new Date().toLocaleDateString("es-AR"),
                unit: c.unit
            };
            currentInv.push(newItem);
            return newItem;
        });

        setInventario(currentInv);
        setCart([]);
        alert("¡Pedido Mayorista Confirmado! Se cargaron los fondos a la caja y el stock al inventario.");
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.bultosToBuy * item.bultoCost), 0);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700 relative">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Compras
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Pedido Mayorista
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Simulá y confirmá compras a tus proveedores. Modifica caja e inventario.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Formulario Agregar Ítem */}
                <div className="xl:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                        <Package className="w-5 h-5 text-cyan-500" />
                        Añadir al Pedido
                    </h3>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Tipo de Insumo</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setFormData({ ...formData, type: "Esencia", item_id: "" })}
                                    className={`py-3 rounded-2xl font-bold transition-all border ${formData.type === "Esencia"
                                        ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 font-black"
                                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    Esencias
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, type: "Insumo", item_id: "" })}
                                    className={`py-3 rounded-2xl font-bold transition-all border ${formData.type === "Insumo"
                                        ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 font-black"
                                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    Insumos
                                </button>
                            </div>
                        </div>

                        {formData.type === "Esencia" ? (
                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <button
                                    onClick={() => setIsEsenciaModalOpen(true)}
                                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 group transition-all"
                                >
                                    <span className="font-bold text-slate-600 dark:text-slate-400 group-hover:text-cyan-600 transition-colors">Seleccionar Esencia...</span>
                                    <Search className="w-5 h-5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Insumo</label>
                                    <select
                                        value={formData.item_id}
                                        onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-semibold appearance-none"
                                    >
                                        <option value="" disabled>Elegí un insumo</option>
                                        {insumos.map(i => (
                                            <option key={i.id} value={i.id}>{i.name} (${i.cost.toLocaleString()} / {i.qty}{i.unit})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Cantidad de Bultos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.bultosToBuy}
                                        onFocus={(e) => e.target.select()}
                                        onChange={e => setFormData({ ...formData, bultosToBuy: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-bold"
                                    />
                                </div>

                                <button
                                    onClick={() => handleAddToCart()}
                                    disabled={!formData.item_id}
                                    className="w-full py-4 rounded-2xl bg-cyan-600 text-white font-extrabold text-lg flex items-center justify-center gap-2 hover:bg-cyan-700 hover:shadow-xl hover:shadow-cyan-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Agregar al Carrito
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Carrito Resumen */}
                <div className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        Resumen del Pedido
                    </h3>

                    <div className="flex-1 overflow-y-auto mb-6 max-h-[500px] custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-70 p-8">
                                <ShoppingCart className="w-16 h-16" />
                                <p className="font-semibold text-center">El pedido está vacío.<br />Agregá materias primas desde el panel.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.cartId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-cyan-500/30 transition-all group">
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                                {item.name}
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${item.type === 'Esencia' ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'
                                                    }`}>
                                                    {item.type}
                                                </span>
                                            </p>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">
                                                {item.category} • {item.bultosToBuy} x {item.bultoQty}{item.unit} (${item.bultoCost.toLocaleString()} c/u)
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 border-t sm:border-0 border-slate-200 dark:border-slate-700 pt-3 sm:pt-0">
                                            <p className="font-black text-xl text-slate-900 dark:text-slate-100">
                                                ${(item.bultosToBuy * item.bultoCost).toLocaleString()}
                                            </p>
                                            <button
                                                onClick={() => handleRemoveFromCart(item.cartId)}
                                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mt-auto">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-lg font-bold text-slate-500 dark:text-slate-400">Total a Pagar</p>
                            <p className="text-4xl font-black text-slate-900 dark:text-slate-50">${cartTotal.toLocaleString()}</p>
                        </div>
                        <button
                            onClick={handleConfirmOrder}
                            disabled={cart.length === 0}
                            className="w-full py-5 rounded-[1.5rem] bg-indigo-600 text-white font-black text-xl flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
                        >
                            <CheckCircle2 className="w-7 h-7" />
                            Confirmar Compra
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Búsqueda de Esencias */}
            {isEsenciaModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-orange-500" />
                                Seleccionar Esencia
                            </h2>
                            <button onClick={() => setIsEsenciaModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-0 border-b border-slate-200 dark:border-slate-800 shrink-0 px-5">
                            {(["Perfumería", "Limpia Pisos"] as const).map(tab => (
                                <button key={tab} onClick={() => { setEsenciaTab(tab); setEsenciaGenderFilter("Todos"); setEsenciaProviderFilter("Todos"); setEsenciaCategoryFilter("Todos"); }}
                                    className={`pb-3 pt-3 px-4 font-black text-sm transition-colors border-b-2 ${esenciaTab === tab ? "border-cyan-500 text-cyan-600 dark:text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-600"
                                        }`}>
                                    {tab === "Perfumería" ? "Perfumería Fina" : "Limpia Pisos"}
                                </button>
                            ))}
                        </div>

                        {/* Filtros */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 shrink-0">
                            <div className="relative flex-1 min-w-[180px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input autoFocus type="text" placeholder="Buscar por nombre..." value={esenciaSearch}
                                    onChange={e => setEsenciaSearch(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm font-bold focus:outline-none focus:border-cyan-500 transition-all" />
                            </div>
                            {esenciaTab === "Perfumería" ? (
                                <>
                                    <select value={esenciaGenderFilter} onChange={e => setEsenciaGenderFilter(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black focus:outline-none appearance-none cursor-pointer">
                                        <option value="Todos">Género: Todos</option>
                                        {generos.filter(g => g.toLowerCase() !== "limpia pisos").map((g, i) => <option key={i} value={g}>{g}</option>)}
                                    </select>
                                    <select value={esenciaProviderFilter} onChange={e => setEsenciaProviderFilter(e.target.value)}
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black focus:outline-none appearance-none cursor-pointer">
                                        <option value="Todos">Proveedor: Todos</option>
                                        {proveedores.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </>
                            ) : (
                                <select value={esenciaCategoryFilter} onChange={e => setEsenciaCategoryFilter(e.target.value)}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black focus:outline-none appearance-none cursor-pointer">
                                    <option value="Todos">Categoría: Todos</option>
                                    {categorias.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Lista */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {filteredEsencias.length === 0 && (
                                <div className="py-10 text-center text-slate-400 font-bold text-sm">No se encontraron esencias.</div>
                            )}
                            {filteredEsencias.map(e => {
                                const isLP = e.gender?.toLowerCase() === "limpia pisos" || e.category?.toLowerCase()?.includes("limpia pisos");
                                const gender = e.gender || (e.category?.toLowerCase().includes("femenina") ? "Femenino" : "Masculino");
                                const catLabel = e.category || (isLP ? "Limpia Pisos" : "Perfumería Fina");
                                return (
                                    <div key={e.id} className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isLP ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                                                            gender === "Femenino" ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"
                                                        }`}>{isLP ? "LP" : gender === "Femenino" ? "F" : "M"}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{catLabel}</span>
                                                    {e.provider && <span className="text-[9px] text-slate-400 font-bold uppercase">• {e.provider}</span>}
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{e.name}</h4>
                                            </div>
                                        </div>
                                        {isLP ? (
                                            <button
                                                onClick={() => {
                                                    setCart([...cart, {
                                                        cartId: `C-${Date.now()}`,
                                                        type: "Esencia",
                                                        item_id: e.id,
                                                        name: e.name,
                                                        category: e.category || "Limpia Pisos",
                                                        bultosToBuy: 1,
                                                        bultoQty: e.qty || 1,
                                                        bultoCost: e.cost || 0,
                                                        unit: "ml"
                                                    }]);
                                                    setIsEsenciaModalOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-all"
                                            >
                                                <span className="text-xs font-black text-slate-500 uppercase">Costo</span>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">${(e.cost || 0).toLocaleString()}</span>
                                            </button>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleSelectEsencia(e, '30g')}
                                                    className="flex flex-col items-center py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">30g</span>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {typeof e.price30g === 'number' ? `$${e.price30g.toLocaleString()}` : 'Cons.'}
                                                    </span>
                                                </button>
                                                <button onClick={() => handleSelectEsencia(e, '100g')}
                                                    className="flex flex-col items-center py-2 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">100g</span>
                                                    <span className="text-xs font-black text-slate-900 dark:text-white">
                                                        {typeof e.price100g === 'number' ? `$${e.price100g.toLocaleString()}` : 'Cons.'}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
