"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, ETIQUETA_CAMPO, AYUDA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { ClipboardList, TrendingUp, DollarSign, Package, PlusCircle, History, X, Check, Trash2, Receipt, Wallet, MinusCircle } from "lucide-react";
import EncabezadoPagina from "@/components/EncabezadoPagina";

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
        return orders.filter(o => 
            o.customerName.trim().toLowerCase() === currentUser.username.trim().toLowerCase() && 
            o.paymentStatus === "pagado" &&
            o.status === "entregado"
        );
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
        <div className="space-y-8 pb-12 anim-entrada">
            <EncabezadoPagina icono={ClipboardList} titulo="Historial de compras" descripcion="Las compras que hiciste, tu inventario y tus ganancias." />

            {/* Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center transition-transform">
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
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center transition-transform">
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
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center transition-transform">
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
                    <div className={`absolute bottom-0 left-0 h-1 transition-[width,background-color] duration-700 ease-out ${totalProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: totalInvestment > 0 ? `${Math.min(100, Math.max(0, (totalRevenue / totalInvestment) * 100))}%` : '0%' }}></div>
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
                                    <tr key={item.itemKey} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
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
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none group/sell"
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

            {/* Registrar venta de un producto comprado */}
            <Ventana abierta={!!sellingItem} onCerrar={() => setSellingItem(null)} etiqueta="Registrar venta">
            {sellingItem && (() => {
                    const gananciaUnidad = formPrice - sellingItem.costPerUnit;
                    const ganancia = gananciaUnidad * formQty;
                    return (
                    <PanelVentana ancho="md">
                        <CabeceraVentana
                            etiqueta="Registrar venta"
                            titulo={sellingItem.productName}
                            icono={DollarSign}
                            onCerrar={() => setSellingItem(null)}
                        />
                        <CuerpoVentana className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Unidades</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={sellingItem.remaining}
                                        value={formQty}
                                        onFocus={e => e.target.select()}
                                        onChange={e => setFormQty(Math.max(1, Math.min(sellingItem.remaining, parseInt(e.target.value) || 1)))}
                                        className={`${CAMPO.replace("text-sm", "text-base")} font-semibold tabular-nums`}
                                    />
                                    <span className={`block ${AYUDA_CAMPO}`}>Quedan {sellingItem.remaining}</span>
                                </label>
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Precio por unidad</span>
                                    <span className="relative block">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formPrice}
                                            onFocus={e => e.target.select()}
                                            onChange={e => setFormPrice(parseInt(e.target.value) || 0)}
                                            className={`${CAMPO.replace("text-sm", "text-base")} pl-8 font-semibold tabular-nums`}
                                        />
                                    </span>
                                    <span className={`block ${AYUDA_CAMPO}`}>Costo: ${sellingItem.costPerUnit.toLocaleString("es-AR")}</span>
                                </label>
                            </div>

                            <div className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 ${ganancia >= 0 ? "bg-[#7D9878]/[0.08] dark:bg-[#7D9878]/[0.12]" : "bg-[#C9866F]/10"}`}>
                                <div>
                                    <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Ganancia</p>
                                    <p className="mt-0.5 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 tabular-nums">
                                        {gananciaUnidad >= 0 ? "+" : "−"}${Math.abs(gananciaUnidad).toLocaleString("es-AR")} por unidad
                                    </p>
                                </div>
                                <p className={`text-2xl font-bold tabular-nums ${ganancia >= 0 ? "text-[#3F5A3C] dark:text-[#A3B69B]" : "text-[#B5654A] dark:text-[#DBA793]"}`}>
                                    {ganancia < 0 ? "−" : ""}${Math.abs(ganancia).toLocaleString("es-AR")}
                                </p>
                            </div>
                        </CuerpoVentana>
                        <PieVentana>
                            <button type="button" onClick={() => setSellingItem(null)} className={BOTON_SECUNDARIO}>
                                Cancelar
                            </button>
                            <button type="button" onClick={confirmSale} className={BOTON_PRINCIPAL}>
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                                Registrar venta
                            </button>
                        </PieVentana>
                    </PanelVentana>
                    );
            })()}
            </Ventana>
        </div>
    );
}
