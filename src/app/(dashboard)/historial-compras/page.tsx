"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import { ClipboardList, TrendingUp, DollarSign, Package, PlusCircle, History, X, Check, Trash2, Receipt, Wallet, MinusCircle } from "lucide-react";

type SaleRecord = {
    id: string;
    itemKey: string;
    productName: string;
    date: string;
    qty: number;
    sellPrice: number;
    costPerUnit: number;
};

// Componente de Historial de Compras
export default function HistorialComprasPage() {
    const { orders, currentUser } = useAppContext();
    const [salesLog, setSalesLog] = useState<SaleRecord[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Modal states
    const [sellingItem, setSellingItem] = useState<any | null>(null);
    const [formQty, setFormQty] = useState<number>(1);
    const [formPrice, setFormPrice] = useState<number>(0);

    // Initialize local storage logic
    useEffect(() => {
        if (!currentUser) return;
        try {
            const key = `reseller_sales_log_${currentUser.username}`;
            const stored = localStorage.getItem(key);
            if (stored) setSalesLog(JSON.parse(stored));
        } catch (e) {
            console.error("Error loading history");
        }
        setIsLoaded(true);
    }, [currentUser]);

    const saveLogToStorage = (newLog: SaleRecord[]) => {
        if (!currentUser) return;
        const key = `reseller_sales_log_${currentUser.username}`;
        localStorage.setItem(key, JSON.stringify(newLog));
    };

    // Only show completed orders of the current mayorista
    const myCompletedOrders = useMemo(() => {
        if (!currentUser) return [];
        return orders.filter(o => o.customerName.trim().toLowerCase() === currentUser.username.trim().toLowerCase() && o.paymentStatus === "pagado");
    }, [orders, currentUser]);

    // Flatten order items to track their individual sales
    const myPurchasedItems = useMemo(() => {
        const items: any[] = [];
        myCompletedOrders.forEach(order => {
            order.items.forEach(cartItem => {
                const costPerUnit = cartItem.priceType === "mayorista" ? cartItem.producto.price : cartItem.producto.priceMinorista;

                const itemKey = `${order.id}_${cartItem.producto.id}`;
                const soldSoFar = salesLog.filter(s => s.itemKey === itemKey).reduce((acc, s) => acc + s.qty, 0);

                items.push({
                    itemKey,
                    orderId: order.id,
                    date: order.date,
                    productId: cartItem.producto.id,
                    productName: cartItem.producto.name,
                    qtyBought: cartItem.quantity,
                    soldSoFar,
                    remaining: cartItem.quantity - soldSoFar,
                    costPerUnit,
                    totalCost: costPerUnit * cartItem.quantity
                });
            });
        });
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [myCompletedOrders, salesLog]);

    // Widgets calculate
    const totalCostPurchases = useMemo(() => {
        return myPurchasedItems.reduce((acc, item) => acc + item.totalCost, 0);
    }, [myPurchasedItems]);

    const totalInvestment = totalCostPurchases;

    const totalRevenue = useMemo(() => {
        return salesLog.reduce((acc, sale) => acc + (sale.qty * sale.sellPrice), 0);
    }, [salesLog]);

    const totalProfit = useMemo(() => {
        const productProfit = salesLog.reduce((acc, sale) => acc + (sale.qty * (sale.sellPrice - sale.costPerUnit)), 0);
        return productProfit;
    }, [salesLog]);

    const handleOpenSellModal = (item: any) => {
        setSellingItem(item);
        setFormQty(1);
        setFormPrice(Math.ceil((item.costPerUnit * 1.5) / 100) * 100); // Suggested +50% markup rounded
    };

    const confirmSale = () => {
        if (!sellingItem) return;
        const newRecord: SaleRecord = {
            id: `SR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            itemKey: sellingItem.itemKey,
            productName: sellingItem.productName,
            date: new Date().toLocaleDateString(),
            qty: formQty,
            sellPrice: formPrice,
            costPerUnit: sellingItem.costPerUnit
        };

        const updatedLog = [newRecord, ...salesLog];
        setSalesLog(updatedLog);
        saveLogToStorage(updatedLog);
        setSellingItem(null);
    };

    const deleteRecord = (id: string) => {
        const updatedLog = salesLog.filter(s => s.id !== id);
        setSalesLog(updatedLog);
        saveLogToStorage(updatedLog);
    };


    if (!isLoaded) return null;

    if (currentUser?.role === "admin") {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                    <X className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Acceso Denegado</h2>
                <p className="text-slate-500 font-medium max-w-sm mt-2">Los administradores no gestionan inventario de reventa personal.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Mis Finanzas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Historial de Compras
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Revisá las compras que nos realizaste, gestioná tu inventario y calculá tus ganancias profesionalmente observando el retorno sobre tu inversión real.
                    </p>
                </div>
            </header>

            {/* Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Inversión Total</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-slate-50">${totalInvestment.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-slate-500 font-medium">Mercadería Total: <span className="text-slate-700 dark:text-slate-300 font-bold">${totalCostPurchases.toLocaleString()}</span></p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ventas Registradas</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-slate-50">${totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Facturación bruta por reventa.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-colors relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ganancia Neta</p>
                            <p className={`text-3xl font-black ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {totalProfit >= 0 ? "+" : ""}${totalProfit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium relative z-10">Beneficio real extraído de las ventas tras restar el costo de mercadería despachada.</p>

                    {/* Background Progress relative indicator idea */}
                    <div className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${totalProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: totalInvestment > 0 ? `${Math.min(100, Math.max(0, (totalRevenue / totalInvestment) * 100))}%` : '0%' }}></div>
                </div>
            </div>

            {/* Table of Inventory */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden mt-6">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <Package className="w-6 h-6 text-indigo-500" />
                            Mi Inventario de Compras
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Stock disponible para vender generado a partir de tus pedidos finalizados.
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Producto</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">N° Pedido</th>
                                <th className="px-8 py-6 text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest text-center">Stock Disp.</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Costo Unitario</th>
                                <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {myPurchasedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold space-y-3">
                                        <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                                        <p>Todavía no tenés mercadería lista para entregar.</p>
                                    </td>
                                </tr>
                            ) : (
                                myPurchasedItems.map(item => (
                                    <tr key={item.itemKey} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-black">{item.productName}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.date}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center text-slate-500 dark:text-slate-400 font-medium text-sm">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg font-bold">#{item.orderId}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-lg font-black ${item.remaining > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-500"}`}>
                                                    {item.remaining}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">de {item.qtyBought} comp.</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-slate-700 dark:text-slate-300">
                                            ${item.costPerUnit.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handleOpenSellModal(item)}
                                                disabled={item.remaining === 0}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none group/sell"
                                            >
                                                <PlusCircle className="w-4 h-4 transition-transform group-hover/sell:rotate-90" />
                                                Registrar Venta
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Split layout for Sales vs Expenses */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Sales Log Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden py-4 flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <History className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Ventas Confirmadas</h3>
                    </div>

                    {salesLog.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold m-auto">
                            Aún no has registrado ninguna venta.
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Producto</th>
                                        <th className="px-6 py-4 text-center">Cant.</th>
                                        <th className="px-6 py-4 text-right">Precio V.</th>
                                        <th className="px-6 py-4 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {salesLog.map(record => {
                                        const profit = record.qty * (record.sellPrice - record.costPerUnit);
                                        return (
                                            <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-500">
                                                    {record.date.includes('T') ? new Date(record.date).toLocaleDateString() : record.date}
                                                </td>
                                                <td className="px-6 py-4 font-black flex flex-col">
                                                    <span className="text-slate-900 dark:text-slate-100">{record.productName}</span>
                                                    <span className="text-[9px] uppercase tracking-widest text-emerald-500">+${profit.toLocaleString()} Gan.</span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-indigo-600 dark:text-indigo-400">x{record.qty}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">${record.sellPrice.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => deleteRecord(record.id)}
                                                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                                        title="Eliminar registro"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Investment Log Table mapped automatically */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden py-4 flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Mis Inversiones</h3>
                        </div>
                    </div>

                    {myCompletedOrders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold m-auto">
                            Aún no tienes pedidos finalizados registrados.
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">N° Pedido</th>
                                        <th className="px-6 py-4 text-center">Bultos</th>
                                        <th className="px-6 py-4 text-right">Monto Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                    {myCompletedOrders.map(order => {
                                        const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);
                                        return (
                                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-500">
                                                    {order.date.includes('T') ? new Date(order.date).toLocaleDateString() : order.date}
                                                </td>
                                                <td className="px-6 py-4 font-black">
                                                    <span className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">#{order.id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-500">{totalItems} prods.</td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-600 dark:text-indigo-400">${order.total.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* Selling Modal */}
            {sellingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSellingItem(null)} />

                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 sm:p-10 animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setSellingItem(null)}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-8">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Registrar Venta</h2>
                            <p className="text-slate-500 font-medium">Estás vendiendo <span className="font-bold text-indigo-500">{sellingItem.productName}</span></p>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Unidades a descontar</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={sellingItem.remaining}
                                        value={formQty}
                                        onChange={e => setFormQty(Math.max(1, Math.min(sellingItem.remaining, parseInt(e.target.value) || 1)))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 dark:text-white transition-all text-center text-xl"
                                    />
                                    <p className="text-[10px] text-center font-bold text-slate-400 mt-2">Máximo disp.: {sellingItem.remaining}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Precio al cliente (C/U)</label>
                                    <div className="relative flex items-center">
                                        <span className="absolute left-4 font-black text-slate-400 text-lg">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formPrice}
                                            onChange={e => setFormPrice(parseInt(e.target.value) || 0)}
                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-600 dark:text-emerald-400 transition-all text-xl"
                                        />
                                    </div>
                                    <p className="text-[10px] text-center font-bold text-slate-400 mt-2">Costo unitario: ${sellingItem.costPerUnit}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impacto en tu bolsillo (Ganancia)</span>
                                <span className={`text-4xl font-black ${(formPrice - sellingItem.costPerUnit) * formQty >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                    ${((formPrice - sellingItem.costPerUnit) * formQty).toLocaleString()}
                                </span>
                                <span className="text-xs font-bold text-slate-500">
                                    {(formPrice - sellingItem.costPerUnit) >= 0 ? "+" : "-"}${Math.abs(formPrice - sellingItem.costPerUnit).toLocaleString()} de beneficio por cada unidad.
                                </span>
                            </div>

                            <button
                                onClick={confirmSale}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all active:scale-95"
                            >
                                <Check className="w-5 h-5" />
                                Confirmar y Registrar Venta
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
