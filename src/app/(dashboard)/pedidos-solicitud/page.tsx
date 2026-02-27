"use client";

import { Package, Clock, CheckCircle2, Truck, ClipboardList, Search, Filter, ShoppingCart, ArrowRight, X, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppContext, OrderStatus, Order, Transaccion, InventarioItem } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";

const Toast = ({ message, onClose, type = "success" }: { message: string, onClose: () => void, type?: "success" | "info" | "error" }) => (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
        <div className={`flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-2xl border ${type === "success"
            ? "bg-emerald-600 border-emerald-500 text-white"
            : type === "error"
                ? "bg-rose-600 border-rose-500 text-white"
                : "bg-blue-600 border-blue-500 text-white"
            }`}>
            <div className="p-2 bg-white/20 rounded-xl">
                {type === "success" ? <CheckCircle2 className="w-5 h-5" /> : type === "error" ? <X className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
                <p className="font-black text-sm">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4" />
            </button>
        </div>
    </div>
);

export default function PedidosSolicitudPage() {
    const { orders, updateOrderStatus, setTransacciones, transacciones, setInventario, inventario, esencias, insumos, deleteOrder, currentUser, getNextId } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const stages: { level: OrderStatus; label: string; icon: any; color: string }[] = [
        { level: "solicitud recibida", label: "Recibida", icon: Clock, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
        { level: "pedido confirmado", label: "Confirmado", icon: CheckCircle2, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
        { level: "en preparacion", label: "En Preparación", icon: ClipboardList, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
        { level: "listo para entregar", label: "Listo / Enviado", icon: Truck, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
    ];

    const filteredOrders = orders.filter(o => {
        // Search filter
        const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);

        // Role filter
        const isAdmin = currentUser?.role === "admin";
        const isMine = o.customerName === currentUser?.username;

        return matchesSearch && (isAdmin || isMine);
    });

    const getNextStatus = (current: OrderStatus): OrderStatus | null => {
        const order = ["solicitud recibida", "pedido confirmado", "en preparacion", "listo para entregar"];
        const currentIndex = order.indexOf(current);
        if (currentIndex < order.length - 1) {
            return order[currentIndex + 1] as OrderStatus;
        }
        return null;
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Package className="w-3.5 h-3.5" />
                        Logística de Ventas
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Solicitud de Pedidos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Gestioná el flujo de tus pedidos desde que entran hasta que salen.
                    </p>
                </div>
            </header>

            {/* Pipeline Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stages.map((stage) => (
                    <div key={stage.level} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl ${stage.color}`}>
                                <stage.icon className="w-5 h-5" />
                            </div>
                            <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                                {orders.filter(o => o.status === stage.level).length}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{stage.label}</p>
                    </div>
                ))}
            </div>

            <div className="mb-6 relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                    type="text"
                    placeholder="Buscar por cliente o N° de pedido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-semibold"
                />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Pedido</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Productos</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Total</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado Actual</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 text-slate-300 dark:text-slate-700">
                                        <ShoppingCart className="w-16 h-16" strokeWidth={1} />
                                        <p className="text-xl font-bold">No hay pedidos registrados</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const currentStage = stages.find(s => s.level === order.status);
                                const nextStatus = getNextStatus(order.status);

                                return (
                                    <tr key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-black text-lg">#{order.id}</p>
                                            <p className="text-xs text-slate-400 font-bold tracking-tight">{order.date}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-bold">{order.customerName}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center relative group/tooltip">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black text-slate-600 dark:text-slate-400 cursor-help transition-colors group-hover/tooltip:bg-slate-200 dark:group-hover/tooltip:bg-slate-700">
                                                {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                                            </span>

                                            {/* Tooltip */}
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-1/2 mb-4 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-2xl shadow-[0_10px_50px_-10px_rgba(0,0,0,0.6)] w-max min-w-[320px] max-w-[450px] p-5 text-left pointer-events-none border border-slate-700 dark:border-slate-600">
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
                                                    {order.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between items-start gap-5 border-b border-slate-700/50 dark:border-slate-600/50 last:border-0 pb-3 last:pb-0">
                                                            <div className="flex flex-col">
                                                                <span className="leading-tight text-slate-100 dark:text-slate-200 text-sm mb-1">{item.producto.name}</span>
                                                                <span className="text-[9px] text-slate-400 uppercase tracking-widest">{item.producto.category} • {item.producto.gender}</span>
                                                            </div>
                                                            <span className="text-indigo-400 dark:text-indigo-300 font-black whitespace-nowrap mt-0.5">x{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-[5px] border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <p className="text-indigo-600 dark:text-indigo-400 font-black">
                                                ${order.total.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${currentStage?.color}`}>
                                                {currentStage?.label}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {currentUser?.role === "admin" ? (
                                                    <>
                                                        {nextStatus ? (
                                                            <button
                                                                onClick={() => {
                                                                    // Check for stock if confirming
                                                                    if (nextStatus === "pedido confirmado") {
                                                                        const requiredStock: Record<string, number> = {};
                                                                        order.items.forEach(cartItem => {
                                                                            cartItem.producto.components.forEach(comp => {
                                                                                const key = comp.name.toLowerCase();
                                                                                requiredStock[key] = (requiredStock[key] || 0) + (comp.qty * cartItem.quantity);
                                                                            });
                                                                        });

                                                                        const missingItems: string[] = [];
                                                                        Object.entries(requiredStock).forEach(([name, qty]) => {
                                                                            const invItem = inventario.find(inv =>
                                                                                inv.name.toLowerCase().includes(name) ||
                                                                                name.includes(inv.name.toLowerCase())
                                                                            );
                                                                            if (!invItem || invItem.qty < qty) {
                                                                                const missing = qty - (invItem?.qty || 0);
                                                                                missingItems.push(`${name} (${missing.toFixed(0)}${invItem?.unit || 'g'})`);
                                                                            }
                                                                        });

                                                                        if (missingItems.length > 0) {
                                                                            setToast({
                                                                                message: `Stock insuficiente para confirmar: ${missingItems.join(", ")}`,
                                                                                type: "error"
                                                                            });
                                                                            return;
                                                                        }
                                                                    }

                                                                    updateOrderStatus(order.id, nextStatus);

                                                                    // logic for completing order
                                                                    if (nextStatus === "listo para entregar") {
                                                                        // 1. Create Income Transaction
                                                                        const newTransaction: Transaccion = {
                                                                            id: getNextId(transacciones, "T-SALE-"),
                                                                            type: "Ingreso",
                                                                            amount: order.total,
                                                                            description: `Venta Pedido #${order.id} - ${order.customerName}`,
                                                                            date: new Date().toLocaleDateString("es-AR")
                                                                        };
                                                                        setTransacciones([newTransaction, ...transacciones]);

                                                                        // 2. Deduct Stock (break down formulas if they are products)
                                                                        let itemsToDeduct: { name: string, qty: number, unit: string }[] = [];
                                                                        let updatedInv = [...inventario];

                                                                        order.items.forEach(cartItem => {
                                                                            const product = cartItem.producto;
                                                                            // Deduct each component of the product's formula
                                                                            product.components.forEach(comp => {
                                                                                const totalToDeduct = comp.qty * cartItem.quantity;
                                                                                const invIndex = updatedInv.findIndex(inv =>
                                                                                    inv.name.toLowerCase().includes(comp.name.toLowerCase()) ||
                                                                                    comp.name.toLowerCase().includes(inv.name.toLowerCase())
                                                                                );

                                                                                if (invIndex !== -1) {
                                                                                    updatedInv[invIndex] = {
                                                                                        ...updatedInv[invIndex],
                                                                                        qty: Math.max(0, updatedInv[invIndex].qty - totalToDeduct)
                                                                                    };
                                                                                    itemsToDeduct.push({
                                                                                        name: comp.name,
                                                                                        qty: totalToDeduct,
                                                                                        unit: comp.type === "Esencia" ? "g" : "un."
                                                                                    });
                                                                                }
                                                                            });
                                                                        });

                                                                        setInventario(updatedInv);
                                                                        setToast({
                                                                            message: `¡Pedido #${order.id} completado! Se registró el ingreso de $${order.total.toLocaleString()} y se descontaron los insumos del inventario.`,
                                                                            type: "success"
                                                                        });
                                                                    } else {
                                                                        setToast({
                                                                            message: `Pedido #${order.id} movido a ${stages.find(s => s.level === nextStatus)?.label}.`,
                                                                            type: "info"
                                                                        });
                                                                    }
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                                            >
                                                                Pasar a {stages.find(s => s.level === nextStatus)?.label}
                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Completado
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => setItemToDelete(order.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                            title="Eliminar pedido"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${order.status === "listo para entregar"
                                                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100"
                                                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-100"
                                                        }`}>
                                                        {stages.find(s => s.level === order.status)?.label || order.status}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Pedido"
                message="¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer."
                onConfirm={() => {
                    if (itemToDelete) {
                        deleteOrder(itemToDelete);
                        setItemToDelete(null);
                        setToast({ message: "Pedido eliminado correctamente.", type: "info" });
                    }
                }}
                onCancel={() => setItemToDelete(null)}
            />
        </div>
    );
}
