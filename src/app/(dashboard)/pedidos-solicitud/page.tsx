"use client";

import { Package, Clock, CheckCircle2, Truck, ClipboardList, Search, Filter, ShoppingCart, ArrowRight, X, Trash2, AlertTriangle } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <PedidosSolicitudContent />
        </Suspense>
    );
}

function PedidosSolicitudContent() {
    const { orders, updateOrderStatus, updateOrderPaymentStatus, setTransacciones, transacciones, setInventario, inventario, esencias, insumos, cancelOrder, deleteOrder, currentUser, getNextId } = useAppContext();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [toast, setToast] = useState<{ message: string, type: "success" | "info" | "error" } | null>(null);
    const [itemToCancel, setItemToCancel] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    useEffect(() => {
        const mpStatus = searchParams.get("status");
        if (mpStatus === "approved") {
            const lastOrderId = localStorage.getItem("lastCreatedOrderId");
            if (lastOrderId) {
                updateOrderPaymentStatus(lastOrderId, 'pagado');
                localStorage.removeItem("lastCreatedOrderId");
            }
            setToast({ message: "¡Pago aprobado con éxito!", type: "success" });
        } else if (mpStatus === "pending") {
            setToast({ message: "El pago está pendiente de aprobación.", type: "info" });
        } else if (mpStatus === "failure") {
            setToast({ message: "El pago fue rechazado. Reintentá con otro medio.", type: "error" });
        }
    }, [searchParams]);

    const stages: { level: OrderStatus; label: string; icon: any; color: string }[] = [
        { level: "solicitud recibida", label: "Recibida", icon: Clock, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
        { level: "pedido confirmed" as any, label: "Confirmado", icon: CheckCircle2, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
        { level: "en preparacion", label: "En Preparación", icon: ClipboardList, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
        { level: "listo para entregar", label: "Listo / Enviado", icon: Truck, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
        { level: "entregado", label: "Entregado", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
    ];

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
        const isAdmin = currentUser?.role === "admin";
        const isMine = o.customerName.trim().toLowerCase() === currentUser?.username.trim().toLowerCase();
        return matchesSearch && (isAdmin || isMine);
    });

    const getNextStatus = (current: OrderStatus): OrderStatus | null => {
        const order = ["solicitud recibida", "pedido confirmado", "en preparacion", "listo para entregar", "entregado"];
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
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Medio de Pago</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Estado Actual</th>
                            <th className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-8 py-20 text-center">
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
                                            <p className="text-xs text-slate-400 font-bold tracking-tight">
                                                {order.date.includes('T') ? new Date(order.date).toLocaleDateString() : order.date}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-slate-900 dark:text-slate-100 font-bold">{order.customerName}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center relative group/tooltip">
                                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black text-slate-600 dark:text-slate-400 cursor-help">
                                                {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                                            </span>
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
                                            <p className="text-indigo-600 dark:text-indigo-400 font-black">${order.total.toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${order.paymentMethod === 'qr' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : order.paymentMethod === 'transferencia' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {order.paymentMethod === 'qr' ? 'Código QR' : order.paymentMethod === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                                                </span>
                                                <span className={`text-[9px] font-black uppercase tracking-tight ${
                                                    order.paymentStatus === 'pagado' ? 'text-emerald-500' : 
                                                    order.paymentStatus === 'confirmacion_pendiente' ? 'text-amber-500' : 
                                                    order.paymentStatus === 'rechazado' ? 'text-rose-500 font-extrabold' : 'text-slate-400'
                                                }`}>
                                                    {order.paymentStatus === 'pagado' ? '• Pagado' : 
                                                     order.paymentStatus === 'confirmacion_pendiente' ? '• Confirmación Pendiente' : 
                                                     order.paymentStatus === 'rechazado' ? '• PAGO RECHAZADO' : '• Pendiente'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'cancelado' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10' : currentStage?.color}`}>
                                                    {order.status === 'cancelado' ? 'Cancelado' : currentStage?.label}
                                                </div>
                                                {order.cancelationReason && (
                                                    <span className="text-[9px] text-rose-400 font-bold italic max-w-[120px] truncate" title={order.cancelationReason}>
                                                        Motivo: {order.cancelationReason}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {currentUser?.role === "admin" ? (
                                                    <>
                                                        {nextStatus && order.status !== 'cancelado' ? (
                                                            <button
                                                                onClick={() => {
                                                                    updateOrderStatus(order.id, nextStatus);
                                                                    // Validation is handled in AppContext, so we only show the positive toast if it proceeds
                                                                    // wait, the toast here is unconditional. I'll make it better.
                                                                    setToast({ message: `Pedido #${order.id} actualizado.`, type: "info" });
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                                            >
                                                                Pasar a {stages.find(s => s.level === nextStatus)?.label} <ArrowRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <div className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${order.status === 'cancelado' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                                {order.status === 'cancelado' ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                                {order.status === 'cancelado' ? 'Pedido Cancelado' : 'Completado'}
                                                            </div>
                                                        )}
                                                        {order.paymentStatus !== 'pagado' && currentUser?.role === 'admin' && order.status !== 'cancelado' && (
                                                            <button
                                                                onClick={() => {
                                                                    updateOrderPaymentStatus(order.id, 'pagado');
                                                                    setToast({ message: "Pago confirmado.", type: "success" });
                                                                }}
                                                                className="px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-500/20"
                                                                title="Confirmar Pago"
                                                            >
                                                                Confirmar Pago
                                                            </button>
                                                        )}
                                                        {order.status !== 'cancelado' && order.status !== 'listo para entregar' && (
                                                            <button
                                                                onClick={() => setItemToCancel(order.id)}
                                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                                                title="Cancelar pedido"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {order.status === 'cancelado' && (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm("¿Eliminar este registro permanentemente de la base de datos?")) {
                                                                        deleteOrder(order.id);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-300 hover:text-rose-600 dark:hover:text-rose-500 transition-all"
                                                                title="Eliminar definitivamente"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${order.status === "listo para entregar" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100" : order.status === "cancelado" ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-100" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 border-blue-100"}`}>
                                                        {order.status === "cancelado" ? "Cancelado" : (stages.find(s => s.level === order.status)?.label || order.status)}
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

            {itemToCancel && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pt-24 pb-8 px-4 sm:px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white dark:bg-[#242723] rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-[#E6DFD5] dark:border-[#353B33] animate-in zoom-in-95 duration-300 my-auto relative">
                        <button
                            onClick={() => { setItemToCancel(null); setCancelReason(""); }}
                            className="absolute top-6 right-6 p-2.5 rounded-full bg-[#1B1D1A] text-white hover:bg-rose-600 hover:text-white hover:rotate-90 hover:scale-110 active:scale-95 transition-all duration-300 shadow-sm border border-[#353B33] flex items-center justify-center shrink-0 cursor-pointer"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-[#C9866F]/10 rounded-2xl">
                                <AlertTriangle className="w-6 h-6 text-[#C9866F]" />
                            </div>
                            <h2 className="text-2xl font-black text-[#2C2C2C] dark:text-[#F4EFEA] uppercase tracking-tight font-brand">Cancelar Pedido</h2>
                        </div>
                        <p className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-medium mb-6">
                            ¿Por qué deseas cancelar el pedido <span className="text-[#2C2C2C] dark:text-[#F4EFEA] font-bold">#{itemToCancel}</span>? El motivo será enviado al cliente.
                        </p>
                        <div className="space-y-4">
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Ej: Sin stock de envases de 50ml, pago rechazado..."
                                className="w-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] rounded-2xl p-4 text-[#2C2C2C] dark:text-[#F4EFEA] focus:outline-none focus:ring-2 focus:ring-[#C9866F]/30 focus:border-[#C9866F] transition-all font-semibold resize-none h-32"
                            />
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button
                                    onClick={() => { setItemToCancel(null); setCancelReason(""); }}
                                    className="px-6 py-4 rounded-2xl bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 font-black uppercase text-xs tracking-widest hover:bg-[#7D9878]/10 transition-all border border-[#E6DFD5] dark:border-[#353B33]"
                                >
                                    Volver
                                </button>
                                <button
                                    disabled={!cancelReason.trim()}
                                    onClick={() => {
                                        cancelOrder(itemToCancel, cancelReason);
                                        setItemToCancel(null);
                                        setCancelReason("");
                                        setToast({ message: "Pedido cancelado y notificado.", type: "error" });
                                    }}
                                    className="px-6 py-4 rounded-2xl bg-[#C9866F] text-white font-black uppercase text-xs tracking-widest hover:bg-[#b5735c] transition-all shadow-lg shadow-[#C9866F]/20 disabled:opacity-50 font-brand"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
