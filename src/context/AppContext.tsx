"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { fetchTable, upsertRecord, upsertRecords, deleteRecord, deleteRecords, clearTable } from "@/lib/db-actions";

export type Categoria = { id: string; name: string; count: number };
export type Proveedor = { id: string; name: string; contact: string };
export type Esencia = {
    id: string;
    name: string;
    category: string;
    provider: string;
    cost: number;
    costUsd?: number;
    qty: number;
    price30g?: number | "consultar";
    price100g?: number | "consultar";
    price250g?: number | "consultar";
    price100gUsd?: number;
    price250gUsd?: number;
    lastUpdate?: string;
    gender?: string;
    source?: "manual" | "scraped" | "captured";
};
export type Insumo = { id: string; name: string; category: string; provider: string; cost: number; qty: number; stock: number; unit: string };
export type InventarioItem = { id: string; name: string; type: string; category: string; qty: number; lastUpdate: string; unit: string; gender?: string };
export type AvailabilityStatus = "disponible" | "demora" | "no-disponible";
export type Transaccion = { id: string; type: "Ingreso" | "Egreso"; amount: number; description: string; date: string };

export type BaseComponent = { id: string; name: string; qty: number; type: "Insumo" | "Esencia" };
export type Base = { id: string; name: string; components: BaseComponent[]; essenceGender?: string; essenceGrams?: number; category?: string };
export type Producto = {
    id: string;
    name: string;
    category: string;
    baseId: string;
    components: BaseComponent[];
    cost: number;
    price: number; // Mayorista
    priceMinorista: number;
    stock: number;
    description: string;
    gender: string;
    lastUpdate?: string;
    imageUrl?: string;
    availabilityStatus?: AvailabilityStatus;
    deliveryDays?: number;
};

export type UserRole = "admin" | "minorista" | "mayorista";
export type Usuario = { id: string; username: string; email?: string; password?: string; role: UserRole; status: "Activo" | "Inactivo"; lastLogin?: string; notas?: string };

export type PermissionLevel = "Editor" | "Solo lectura" | "Sin acceso";
export type CategoryPermissions = Record<string, PermissionLevel>;

export type OrderStatus = "solicitud recibida" | "pedido confirmado" | "en preparacion" | "listo para entregar" | "entregado" | "cancelado";
export type CartItem = { producto: Producto; quantity: number; priceType: "mayorista" | "minorista"; customPrice?: number };
export type Order = {
    id: string;
    items: CartItem[];
    total: number;
    status: OrderStatus;
    customerName: string;
    date: string;
    paymentMethod: "qr" | "transferencia" | "efectivo" | "otro";
    paymentStatus: "pendiente" | "pagado" | "confirmacion_pendiente" | "rechazado";
    cancelationReason?: string;
};

export type ScraperStatus = {
    lastRun: string;
    status: "idle" | "loading" | "success" | "failure";
    message?: string;
};

export type Promotion = {
    id: string;
    productId: string | null;
    discountPercentage: number;
    isActive: boolean;
    endDate?: string;
};

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
    orderId?: string;
};

// ─── Mapping helpers ────────────────────────────────────────────
function dbToEsencia(row: any): Esencia {
    return {
        id: row.id,
        name: row.name,
        category: row.category ?? "Perfumería Fina",
        gender: row.gender ?? "Femenino",
        provider: row.provider ?? "Van Rossum",
        cost: row.cost ?? 0,
        qty: row.qty ?? 0,
        price30g: row.price30g === null ? "consultar" : (isNaN(parseFloat(row.price30g)) ? "consultar" : parseFloat(row.price30g)),
        price100g: row.price100g === null ? "consultar" : (isNaN(parseFloat(row.price100g)) ? "consultar" : parseFloat(row.price100g)),
        price250g: row.price250g === null ? "consultar" : (isNaN(parseFloat(row.price250g)) ? "consultar" : parseFloat(row.price250g)),
        price100gUsd: row.price100g_usd ?? undefined,
        price250gUsd: row.price250g_usd ?? undefined,
        lastUpdate: row.last_update ?? undefined,
        costUsd: row.cost_usd ?? undefined,
        source: row.source ?? "manual",
    };
}

function dbToInsumo(row: any): Insumo {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        provider: row.provider,
        cost: row.cost,
        qty: row.qty,
        stock: row.stock ?? 0,
        unit: row.unit ?? "un.",
    };
}

function dbToBase(row: any): Base {
    return {
        id: row.id,
        name: row.name,
        components: row.components ?? [],
        essenceGender: row.essence_gender ?? undefined,
        essenceGrams: row.essence_grams ?? undefined,
        category: row.category ?? undefined,
    };
}

function dbToProducto(row: any): Producto {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        baseId: row.base_id ?? "",
        components: row.components ?? [],
        cost: row.cost ?? 0,
        price: row.price ?? 0,
        priceMinorista: row.price_minorista ?? 0,
        stock: row.stock ?? 0,
        description: row.description ?? "",
        gender: row.gender ?? "Unisex",
        lastUpdate: row.last_update ?? undefined,
        imageUrl: row.image_url ?? undefined,
        availabilityStatus: row.availability_status ?? "disponible",
        deliveryDays: row.delivery_days ?? 0,
    };
}

function dbToInventario(row: any): InventarioItem {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        qty: row.qty ?? 0,
        lastUpdate: row.last_update ?? "",
        unit: row.unit ?? "un.",
        gender: row.gender ?? undefined,
    };
}

function dbToTransaccion(row: any): Transaccion {
    return {
        id: row.id,
        type: row.type,
        amount: Number(row.amount) || 0,
        description: row.description,
        date: row.date,
    };
}

function dbToUsuario(row: any): Usuario {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        role: row.role,
        status: row.status,
        lastLogin: row.last_login ?? undefined,
        notas: row.notas ?? undefined
    };
}

function dbToOrder(row: any): Order {
    let parsedItems = row.items;
    if (typeof parsedItems === 'string') {
        try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
    }
    return {
        id: row.id,
        items: parsedItems ?? [],
        total: Number(row.total) ?? 0,
        status: row.status ?? "solicitud recibida",
        customerName: row.customer_name ?? "",
        date: row.date ?? "",
        paymentMethod: row.payment_method ?? "efectivo",
        paymentStatus: row.payment_status ?? "pendiente",
        cancelationReason: row.cancelation_reason ?? undefined,
    };
}

// ─── Context Interface ───────────────────────────────────────────
interface AppContextProps {
    categorias: Categoria[];
    setCategorias: React.Dispatch<React.SetStateAction<Categoria[]>>;
    proveedores: Proveedor[];
    setProveedores: React.Dispatch<React.SetStateAction<Proveedor[]>>;
    esencias: Esencia[];
    setEsencias: React.Dispatch<React.SetStateAction<Esencia[]>>;
    insumos: Insumo[];
    setInsumos: React.Dispatch<React.SetStateAction<Insumo[]>>;
    inventario: InventarioItem[];
    setInventario: React.Dispatch<React.SetStateAction<InventarioItem[]>>;
    transacciones: Transaccion[];
    setTransacciones: React.Dispatch<React.SetStateAction<Transaccion[]>>;
    bases: Base[];
    setBases: React.Dispatch<React.SetStateAction<Base[]>>;
    productos: Producto[];
    setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
    usuarios: Usuario[];
    setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
    globalPermissions: Record<UserRole, CategoryPermissions>;
    cart: CartItem[];
    orders: Order[];
    scraperStatus: ScraperStatus;
    setScraperStatus: React.Dispatch<React.SetStateAction<ScraperStatus>>;
    currentUser: Usuario | null;
    mounted: boolean;
    updateProducto: (updated: Producto) => void;
    deleteProducto: (id: string) => void;
    addUsuario: (user: Usuario) => void;
    updateUsuario: (updated: Usuario) => void;
    deleteUsuario: (id: string) => void;
    updatePermissions: (role: UserRole, perms: CategoryPermissions) => void;
    addToCart: (producto: Producto, priceType: "mayorista" | "minorista") => void;
    removeFromCart: (productId: string, priceType: "mayorista" | "minorista") => void;
    updateCartQuantity: (productId: string, priceType: "mayorista" | "minorista", quantity: number) => void;
    updateCartItemPrice: (productId: string, priceType: "mayorista" | "minorista", customPrice: number | undefined) => void;
    clearCart: () => void;
    createOrder: (customerName: string, paymentMethod?: "qr" | "transferencia" | "efectivo" | "otro", cartType?: "mayorista" | "minorista") => void;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateOrderPaymentStatus: (orderId: string, status: Order["paymentStatus"]) => Promise<void>;
    cancelOrder: (orderId: string, reason: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    addInsumo: (insumo: Insumo) => Promise<void>;
    updateInsumo: (insumo: Insumo) => Promise<void>;
    deleteInsumo: (id: string) => Promise<void>;
    addInventarioItem: (item: InventarioItem) => Promise<void>;
    deleteInventarioItem: (id: string) => Promise<void>;
    updateInventarioItem: (id: string, qty: number) => Promise<void>;
    runScraper: () => Promise<void>;
    login: (user: Usuario) => void;
    logout: () => void;
    generos: string[];
    setGeneros: React.Dispatch<React.SetStateAction<string[]>>;
    generateProductsFromBase: (baseId: string, targetCategory?: string) => Promise<{ created: number, updated: number } | undefined>;
    getNextId: (items: any[], prefix: string) => string;
    categoryMargins: Record<string, { mayorista: number; minorista: number }>;
    setCategoryMargins: React.Dispatch<React.SetStateAction<Record<string, { mayorista: number; minorista: number }>>>;
    promotions: Promotion[];
    addPromotion: (promo: Promotion) => Promise<void>;
    deletePromotion: (id: string) => Promise<void>;
    paymentInfo: { alias: string; cbu: string; banco: string; mpAccessToken: string };
    setPaymentInfo: (info: { alias: string; cbu: string; banco: string; mpAccessToken: string }) => void;
    clearAllProductos: () => Promise<void>;
    usdRate: number;
    usdLastUpdate: string;
    syncUsdRate: () => Promise<{ rate: number, date: string } | null>;
    addSystemLog: (type: "info" | "error" | "db" | "auth" | "warn", message: string, details?: any) => void;
    isLoading: boolean;
    notifications: AppNotification[];
    unreadCount: number;
    markNotificationAsRead: (id: string) => void;
    clearNotifications: () => void;
    enviarSolicitudMayorista: (datos: {
        nombre: string;
        apellido: string;
        mail: string;
        celular: string;
        motivo: string;
    }) => Promise<{ success: boolean; error?: string }>;
    solicitudesMinoristas: any[];
    fetchSolicitudesMinoristas: () => Promise<void>;
    eliminarSolicitudMinorista: (id: number) => Promise<void>;
    aprobarSolicitudMinorista: (requestId: number, userId: string) => Promise<void>;
    rechazarSolicitudMinorista: (requestId: number, motivo: string, fechaReintento: string) => Promise<void>;
    solicitudPropia: any | null;
    removeDuplicateProducts: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const initialGlobalPermissions: Record<UserRole, CategoryPermissions> = {
    admin: {
        mayorista: "Editor", minorista: "Editor", bases: "Editor", pedidos: "Editor",
        inventario: "Editor", insumos: "Editor", esencias: "Editor", caja: "Editor",
        proveedores: "Editor", categorias: "Editor", usuarios: "Editor", roles: "Editor", permisos: "Editor"
    },
    minorista: {
        mayorista: "Sin acceso", minorista: "Editor", bases: "Sin acceso", pedidos: "Sin acceso",
        inventario: "Solo lectura", insumos: "Sin acceso", esencias: "Sin acceso", caja: "Editor",
        proveedores: "Sin acceso", categorias: "Sin acceso", usuarios: "Sin acceso", roles: "Sin acceso", permisos: "Sin acceso"
    },
    mayorista: {
        mayorista: "Editor", minorista: "Sin acceso", bases: "Sin acceso", pedidos: "Editor",
        inventario: "Solo lectura", insumos: "Sin acceso", esencias: "Sin acceso", caja: "Editor",
        proveedores: "Sin acceso", categorias: "Sin acceso", usuarios: "Sin acceso", roles: "Sin acceso", permisos: "Sin acceso"
    }
};

// ─── Helper: generate a short unique ID ──────────────────────────
function genId(prefix = "") {
    return prefix + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function getNextSequenceId(items: any[], prefix: string) {
    let max = 0;
    for (const item of items) {
        if (!item.id || !item.id.startsWith(prefix)) continue;
        const numPart = item.id.replace(prefix, '');
        const num = parseInt(numPart, 10);
        if (!isNaN(num) && num > max) {
            max = num;
        }
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

// ─── Provider ────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [esencias, setEsencias] = useState<Esencia[]>([]);
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [inventario, setInventario] = useState<InventarioItem[]>([]);
    const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
    const [bases, setBases] = useState<Base[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [globalPermissions, setGlobalPermissions] = useState<Record<UserRole, CategoryPermissions>>(initialGlobalPermissions);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [scraperStatus, setScraperStatus] = useState<ScraperStatus>({ lastRun: "-", status: "idle" });
    const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
        if (typeof window !== "undefined") {
            const mock = localStorage.getItem("mockUser");
            if (mock) {
                try { return JSON.parse(mock); } catch (e) { return null; }
            }
        }
        return null;
    });
    const [generos, setGeneros] = useState<string[]>(["Femenino", "Masculino", "Unisex"]);
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { mayorista: number; minorista: number }>>({});
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [paymentInfo, setPaymentInfoState] = useState({
        alias: "SCENTA.PERFUMES",
        cbu: "0000003100012345678901",
        banco: "Galicia",
        mpAccessToken: "APP_USR-155495615252903-022714-99162d4f5251c6825a4e8a791ba32942-691652994"
    });

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [solicitudesMinoristas, setSolicitudesMinoristas] = useState<any[]>([]);
    const [solicitudPropia, setSolicitudPropia] = useState<any | null>(null);
    const processedOrdersRef = useRef<Set<string>>(new Set());
    const channelRef = useRef<any>(null);
    const unreadCount = React.useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const markNotificationAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const fetchSolicitudesMinoristas = async () => {
        const { data, error } = await fetchTable('solicitudes_mayorista', { 
            filter: { estado: 'pendiente' },
            orderBy: 'created_at',
            orderDir: 'desc'
        });
        
        if (error) {
            console.error("Error al cargar solicitudes:", error);
        } else {
            setSolicitudesMinoristas(data || []);
        }
    };

    const eliminarSolicitudMinorista = async (id: number) => {
        setSolicitudesMinoristas(prev => prev.filter(s => s.id !== id));
        const { error } = await deleteRecord('solicitudes_mayorista', id);
        
        if (error) {
            console.error("Error al borrar solicitud:", error);
            fetchSolicitudesMinoristas();
        } else {
            addSystemLog('info', `Solicitud minorista #${id} eliminada.`);
        }
    };

    const aprobarSolicitudMinorista = async (requestId: number, userId: string) => {
        try {
            // 1. Obtener datos de la solicitud para guardar como notas
            const { data: results } = await fetchTable('solicitudes_mayorista', { filter: { id: requestId } });
            const requestData = results?.[0];
            
            const notasFormateadas = requestData ? 
                `--- SOLICITUD MAYORISTA APROBADA ---\nFecha: ${new Date().toLocaleDateString()}\nNombre: ${requestData.nombre} ${requestData.apellido}\nEmail: ${requestData.mail}\nCelular: ${requestData.celular}\nMotivo: ${requestData.motivo}\n-----------------------------------` 
                : "";

            // 2. Cambiar rol del usuario y añadir notas
            const { error: userError } = await upsertRecord('usuarios', { 
                id: userId,
                role: 'mayorista',
                notas: notasFormateadas 
            });
            
            if (userError) throw new Error(userError);

            // 3. Marcar solicitud como aprobada
            const { error: reqError } = await upsertRecord('solicitudes_mayorista', { id: requestId, estado: 'aprobada' });
            if (reqError) throw new Error(reqError);

            // 4. Actualizar estados locales
            setSolicitudesMinoristas(prev => prev.filter(s => s.id !== requestId));
            setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: 'mayorista', notas: notasFormateadas } : u));
            
            addSystemLog('info', `Usuario ${userId} ascendido a Mayorista.`);
            toast.success("¡Solicitud Aprobada!", { description: "El usuario ahora es Mayorista y se guardaron sus notas." });
        } catch (error: any) {
            toast.error("Error al aprobar solicitud: " + error.message);
        }
    };

    const rechazarSolicitudMinorista = async (requestId: number, motivo: string, fechaReintento: string) => {
        try {
            const { error } = await upsertRecord('solicitudes_mayorista', { 
                id: requestId,
                estado: 'rechazada',
                motivo_rechazo: motivo,
                fecha_reintento: fechaReintento
            });
            
            if (error) throw error;

            setSolicitudesMinoristas(prev => prev.filter(s => s.id !== requestId));
            addSystemLog('info', `Solicitud #${requestId} rechazada.`);
            toast.info("Solicitud Rechazada", { description: "Se notificó el motivo al usuario." });
        } catch (error: any) {
            toast.error("Error al rechazar: " + error.message);
        }
    };

    const enviarSolicitudMayorista = async (datos: {
        nombre: string;
        apellido: string;
        mail: string;
        celular: string;
        motivo: string;
    }) => {
        if (!currentUser) return { success: false, error: "No hay usuario activo" };

        try {
            // Guardado silencioso en base de datos
            const { data: newSolicitud, error: insertError } = await upsertRecord('solicitudes_mayorista', {
                user_id: currentUser.id,
                username: currentUser.username,
                ...datos,
                estado: 'pendiente'
            });

            if (!insertError && newSolicitud) {
                setSolicitudPropia(newSolicitud);
            }

            // Notificación Real-time al admin con evento dedicado
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'solicitud_mayorista',
                    payload: {
                        username: currentUser.username,
                        senderId: currentUser.id
                    }
                });
            }

            // Recargar localmente si somos admin para ver el cambio instantáneo
            if (currentUser.role === 'admin') fetchSolicitudesMinoristas();

            addSystemLog('info', `Solicitud de mayorista de ${currentUser.username} enviada.`);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const [usdRate, setUsdRate] = useState<number>(1000); 
    const [usdLastUpdate, setUsdLastUpdate] = useState<string>("");
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch USD rate from API and sync to DB
    const syncUsdRate = async () => {
        try {
            const res = await fetch("https://dolarapi.com/v1/dolares/blue");
            const data = await res.json();
            
            if (data && data.venta) {
                const newRate = data.venta;
                const now = new Date().toISOString();
                
                setUsdRate(newRate);
                setUsdLastUpdate(now);
                
                // Persist to DB config
                await upsertRecord("config", { key: "usd_rate", value: newRate.toString(), updated_at: now });
                await upsertRecord("config", { key: "usd_last_update", value: now, updated_at: now });
                
                addSystemLog("info", `Dólar Blue actualizado: $${newRate}`, { source: "DolarAPI" });
                return { rate: newRate, date: now };
            }
        } catch (error) {
            console.error("Could not fetch dollar rate:", error);
            addSystemLog("error", "Error al sincronizar dólar", { error });
        }
        return null;
    };

    // Auto-sync effect once a day
    useEffect(() => {
        if (!mounted) return;
        
        const checkAndSync = async () => {
            const lastUpdate = usdLastUpdate;
            const today = new Date().toLocaleDateString();
            
            // Si nunca se actualizó o no fue hoy
            if (!lastUpdate || new Date(lastUpdate).toLocaleDateString() !== today) {
                console.log("USD Rate outdated, syncing...");
                await syncUsdRate();
            }
        };
        
        checkAndSync();
    }, [mounted, usdLastUpdate]);

    // Keep USD costs in sync with the DolarAPI rate
    useEffect(() => {
        if (!mounted || !usdRate || esencias.length === 0) return;

        let shouldUpdate = false;
        const updatedEsencias = esencias.map(item => {
            let itemChanged = false;
            let newItem = { ...item };

            if (newItem.costUsd) {
                const targetCost = newItem.costUsd * usdRate;
                if (Math.abs(newItem.cost - targetCost) > 0.1) {
                    itemChanged = true;
                    newItem.cost = targetCost;
                }
            }
            if (newItem.price100gUsd) {
                const targetCost = newItem.price100gUsd * usdRate;
                if (Math.abs((newItem.price100g as number || 0) - targetCost) > 0.1) {
                    itemChanged = true;
                    newItem.price100g = targetCost;
                }
            }
            if (newItem.price250gUsd) {
                const targetCost = newItem.price250gUsd * usdRate;
                if (Math.abs((newItem.price250g as number || 0) - targetCost) > 0.1) {
                    itemChanged = true;
                    newItem.price250g = targetCost;
                }
            }

            if (itemChanged) shouldUpdate = true;
            return newItem;
        });

        if (shouldUpdate) {
            setEsencias(updatedEsencias);
            
            // Trigger products update separately to avoid nested setter calls
            setTimeout(() => {
                setProductos(prevProducts => {
                    let anyProductChanged = false;
                    const nextProducts = prevProducts.map(prod => {
                        let prodChanged = false;
                        const updatedComponents = prod.components.map(comp => {
                            if (comp.type === "Esencia") {
                                const esc = updatedEsencias.find(e => e.id === comp.id);
                                if (esc && esc.cost !== (esencias.find(e => e.id === comp.id)?.cost)) {
                                    prodChanged = true;
                                }
                            }
                            return comp;
                        });

                        if (prodChanged) {
                            anyProductChanged = true;
                            const newCost = updatedComponents.reduce((acc, comp) => {
                                const source = comp.type === "Esencia" 
                                    ? updatedEsencias.find(e => e.id === comp.id)
                                    : insumos.find(i => i.id === comp.id);
                                if (!source) return acc;
                                
                                let unitCost = 0;
                                if (comp.type === "Esencia") {
                                    const e = source as Esencia;
                                    const p100 = parseFloat(e.price100g as any);
                                    const p250 = parseFloat(e.price250g as any);
                                    if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                                    else if (!isNaN(p250) && p250 > 0) unitCost = p250 / 250;
                                    else unitCost = e.cost / (e.qty || 1);
                                } else {
                                    unitCost = source.cost / (source.qty || 1);
                                }
                                return acc + (unitCost * comp.qty);
                            }, 0);

                            const targetCategory = prod.category || "Perfumería Fina";
                            const margins = categoryMargins[targetCategory] || { mayorista: 1.5, minorista: 2.0 };
                            const roundUpTo1000 = (num: number) => Math.ceil(num / 1000) * 1000;

                            return {
                                ...prod,
                                cost: newCost,
                                price: prod.price === 0 ? 0 : roundUpTo1000(newCost * margins.mayorista),
                                priceMinorista: prod.priceMinorista === 0 ? 0 : roundUpTo1000(newCost * margins.minorista),
                                lastUpdate: new Date().toISOString()
                            };
                        }
                        return prod;
                    });

                    if (anyProductChanged) {
                        // Persist immediately since we can't easily wait for state here
                        const toUpsert = nextProducts
                            .filter((n, i) => JSON.stringify(n) !== JSON.stringify(prevProducts[i]))
                            .map(p => ({
                                id: p.id,
                                name: p.name,
                                category: p.category,
                                base_id: p.baseId,
                                components: p.components,
                                cost: p.cost,
                                price: p.price,
                                price_minorista: p.priceMinorista,
                                stock: p.stock,
                                description: p.description,
                                gender: p.gender,
                                last_update: p.lastUpdate ?? null,
                                image_url: p.imageUrl ?? null
                            }));
                        
                        if (toUpsert.length > 0) {
                            upsertRecords("productos", toUpsert);
                        }
                    }
                    return nextProducts;
                });
            }, 0);
        }
    }, [usdRate, mounted]);

    // Shared log channel to avoid creating thousands of connections
    const logChannelRef = useRef<any>(null);

    const addSystemLog = (type: "info" | "error" | "db" | "auth" | "warn", message: string, details?: any) => {
        const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            type,
            message,
            details: details ? JSON.parse(JSON.stringify(details)) : null 
        };

        try {
            const currentLogs = JSON.parse(localStorage.getItem("system_logs") || "[]");
            const updatedLogs = [newLog, ...currentLogs].slice(0, 100);
            localStorage.setItem("system_logs", JSON.stringify(updatedLogs));
        } catch (e) { }

        // Emit log via the dedicated realtime channel if available
        if (channelRef.current && channelRef.current.state === 'joined') {
            channelRef.current.send({
                type: 'broadcast',
                event: 'new_log',
                payload: newLog
            });
        }

        if ((window as any).__onNewLog) (window as any).__onNewLog(newLog);
    };

    // Export to window for non-react parts / debugging
    useEffect(() => {
        (window as any).__addSystemLog = addSystemLog;
        return () => { delete (window as any).__addSystemLog; };
    }, []);

    // ── Load all data: Supabase first, localStorage fallback ────────
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const { data: configRows } = await fetchTable("config");
                if (configRows) {
                    const rateRow = configRows.find((r: any) => r.key === "usd_rate");
                    const updateRow = configRows.find((r: any) => r.key === "usd_last_update");
                    if (rateRow) setUsdRate(parseFloat(rateRow.value));
                    if (updateRow) setUsdLastUpdate(updateRow.value);
                }

                // 1. Auth check - only from local storage mock for now
                let resolvedUser: Usuario | null = null;
                const mock = localStorage.getItem("mockUser");
                if (mock) {
                    try { 
                        const parsed = JSON.parse(mock);
                        // Re-verify against DB to get latest role/status
                        const { data: usersData } = await fetchTable("usuarios", { filter: { id: parsed.id } });
                        if (usersData?.[0]) {
                            resolvedUser = dbToUsuario(usersData[0]);
                            localStorage.setItem("mockUser", JSON.stringify(resolvedUser));
                        } else {
                            resolvedUser = parsed;
                        }
                    } catch (e) { 
                        resolvedUser = null; 
                    }
                }
                setCurrentUser(resolvedUser);

                const isAdmin = resolvedUser?.role === "admin";

                // Optimistic Load from LocalStorage (Stale-While-Revalidate)
                let localProductsLoaded = false;
                try {
                    const localCat = localStorage.getItem("categorias");
                    if (localCat) setCategorias(JSON.parse(localCat));

                    const localProd = localStorage.getItem("productos");
                    if (localProd) {
                        setProductos(JSON.parse(localProd));
                        localProductsLoaded = true;
                        // Only release UI once we have user context too, or if no user is coming
                        if (resolvedUser || !localStorage.getItem("mockUser")) {
                            setIsLoading(false);
                        }
                    }

                    const localPromo = localStorage.getItem("promociones");
                    if (localPromo) setPromotions(JSON.parse(localPromo));
                } catch (e) { }

                // 2. Parallel fetch essential vs admin data (Xata Refetch)
                const startTime = performance.now();
                console.log("🚀 Iniciando sincronización de datos...");

                const essentialRequests = [
                    fetchTable("categorias", { orderBy: "name" }),
                    fetchTable("productos", { columns: ["id", "name", "category", "base_id", "components", "cost", "price", "price_minorista", "stock", "description", "gender", "last_update", "availability_status", "delivery_days"] }),
                    fetchTable("promociones"),
                    fetchTable("config"),
                ];
                
                const adminRequests = isAdmin ? [
                    fetchTable("proveedores", { orderBy: "name" }),
                    fetchTable("esencias", { orderBy: "name" }),
                    fetchTable("insumos", { orderBy: "name" }),
                    fetchTable("inventario", { orderBy: "name" }),
                    fetchTable("transacciones", { orderBy: "created_at", orderDir: "desc" }),
                    fetchTable("bases", { orderBy: "name" }),
                    fetchTable("usuarios", { orderBy: "username" }),
                    fetchTable("orders", { orderBy: "date", orderDir: "desc" }),
                    fetchTable("solicitudes_mayorista", { filter: { estado: 'pendiente' }, orderBy: 'created_at', orderDir: 'desc' }),
                ] : [];

                const results = await Promise.all([...essentialRequests, ...adminRequests]);
                const endTime = performance.now();
                console.log(`✅ Sincronización completada en ${((endTime - startTime) / 1000).toFixed(2)}s`);

                const [catResult, prodResult, promoResult, configResult] = results;
                const [
                    provResult, escResult, insResult, invResult, transResult, basesResult, usersResult, ordersResult, solicitudesResult
                ] = isAdmin ? results.slice(4) : [null, null, null, null, null, null, null, null, null];

                // Apply config (USD Rate, etc)
                if (configResult && configResult.data) {
                    const usdRow = configResult.data.find((r: any) => r.key === 'usd_rate');
                    const lastUpdateRow = configResult.data.find((r: any) => r.key === 'usd_last_update');
                    if (usdRow) setUsdRate(parseFloat(usdRow.value) || 1000);
                    if (lastUpdateRow) setUsdLastUpdate(lastUpdateRow.value);
                }

                // Diagnostic log for results array
                addSystemLog("info", "Sincronización inicial completada", {
                    tablas_cargadas: {
                        categorias: catResult?.data?.length || 0,
                        productos: prodResult?.data?.length || 0,
                        promociones: promoResult?.data?.length || 0,
                        proveedores: provResult?.data?.length || 0,
                        esencias: escResult?.data?.length || 0,
                        insumos: insResult?.data?.length || 0,
                        inventario: invResult?.data?.length || 0,
                        transacciones: transResult?.data?.length || 0,
                        usuarios: usersResult?.data?.length || 0,
                        pedidos: ordersResult?.data?.length || 0
                    },
                    errores: results.filter(r => r?.error).map(r => r?.error?.message),
                    contexto_admin: isAdmin
                });

                // Helper: use Supabase if available, else localStorage. Returns {data, fromLS}
                const resolve = <T,>(result: { data: any[] | null; error: any } | null, lsKey: string, mapper: (r: any) => T, fallback: T[] = []): { data: T[]; fromLS: boolean } => {

                    if (result && !result.error && result.data !== null) {
                        return { data: result.data.map(mapper), fromLS: false };
                    }

                    if (result?.error) {
                        console.error(`Error fetching ${lsKey} from Database:`, result.error);
                        addSystemLog("error", `Fallo en Base de Datos (${lsKey})`, {
                            message: result.error?.message || "Error desconocido",
                            code: result.error?.code,
                        });
                    }

                    const stored = localStorage.getItem(lsKey);
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            return { data: parsed as T[], fromLS: true };
                        } catch (e) {
                        }
                    }

                    return { data: fallback, fromLS: false };
                };

                // Essential data Revalidation
                const catRes = resolve(catResult, "categorias", (r) => ({ id: r.id, name: r.name, count: r.count ?? 0 } as Categoria), [{ id: "1", name: "Perfumería Fina", count: 0 }]);
                const rawProdsRes = resolve(prodResult, "productos", dbToProducto, []);
                const promoData = resolve(promoResult, "promociones", (r) => ({ id: r.id, productId: r.product_id, discountPercentage: r.discount_percentage, isActive: r.is_active, endDate: r.end_date } as Promotion), []);

                const sanitizedProducts = rawProdsRes.data.map((p, index) => ({
                    ...p,
                    id: p.id || (index + 1).toString().padStart(3, "0"),
                    priceMinorista: p.priceMinorista ?? (p.price * 1.5)
                }));

                // Actualizar DB sobre el render optimista
                setCategorias(catRes.data);
                setProductos(sanitizedProducts);
                localStorage.setItem("productos", JSON.stringify(sanitizedProducts));
                setPromotions(promoData.data);

                    // LAZY LOAD IMAGES: Fetch images in the background
                    setTimeout(async () => {
                        const { data: imgData, error: imgError } = await fetchTable("productos", { columns: ["id", "image_url"] });
                        if (!imgError && imgData) {
                            setProductos(prev => {
                                return prev.map(p => {
                                    const row = imgData.find((r: any) => r.id === p.id);
                                    return row && row.image_url ? { ...p, imageUrl: row.image_url } : p;
                                });
                            });
                        }
                    }, 500);

                // Admin-only data
                if (isAdmin) {
                    const provRes = resolve(provResult, "proveedores", (r) => ({ id: r.id, name: r.name, contact: r.contact ?? "" } as Proveedor), []);
                    const escRes = resolve(escResult, "esencias", dbToEsencia, []);
                    const insRes = resolve(insResult, "insumos", dbToInsumo, []);
                    const invRes = resolve(invResult, "inventario", dbToInventario, []);
                    const transRes = resolve(transResult, "transacciones", dbToTransaccion, []);
                    const basesRes = resolve(basesResult, "bases", dbToBase, []);
                    const usersRes = resolve(usersResult, "usuarios", dbToUsuario, []);
                    const ordersRes = resolve(ordersResult, "orders", dbToOrder, []);

                    setProveedores(provRes.data);
                    setEsencias(escRes.data);
                    setInsumos(insRes.data);
                    setInventario(invRes.data);
                    setTransacciones(transRes.data);
                    setBases(basesRes.data);
                    setUsuarios(usersRes.data);
                    setOrders(ordersRes.data);
                    
                    if (solicitudesResult && !solicitudesResult.error) {
                        setSolicitudesMinoristas(solicitudesResult.data || []);
                    }
                } else if (!isAdmin && resolvedUser) {
                    // Cargar solicitud propia si es minorista
                    const { data: requests } = await fetchTable("solicitudes_mayorista", { filter: { user_id: resolvedUser.id } });
                    const personalReq = requests?.[0];
                    if (personalReq) setSolicitudPropia(personalReq);

                    // Wholesalers/Retailers only need THEIR orders
                    const { data: ownOrders, error: ordersErr } = await fetchTable("orders", { 
                        filter: { customer_name: resolvedUser.username.trim() },
                        orderBy: "date",
                        orderDir: "desc"
                    });

                    if (ordersErr) {
                        console.error("Error fetching own orders:", ordersErr);
                    } else if (ownOrders) {
                        setOrders(ownOrders.map(dbToOrder));
                    }
                }

                // Load ephemeral/local settings
                const storedCart = localStorage.getItem(`cart_${resolvedUser?.id || 'guest'}`);
                if (storedCart) setCart(JSON.parse(storedCart));
                const storedPerms = localStorage.getItem("globalPermissions");
                if (storedPerms) setGlobalPermissions(JSON.parse(storedPerms));
                const storedGeneros = localStorage.getItem("generos");
                if (storedGeneros) setGeneros(JSON.parse(storedGeneros));
                const storedMargins = localStorage.getItem("categoryMargins");
                if (storedMargins) setCategoryMargins(JSON.parse(storedMargins));
                const storedPaymentInfo = localStorage.getItem("paymentInfo");
                if (storedPaymentInfo) {
                    const parsed = JSON.parse(storedPaymentInfo);
                    setPaymentInfoState(prev => ({ ...prev, ...parsed }));
                }
                const storedScraper = localStorage.getItem("scraperStatus");
                if (storedScraper) {
                    const parsed = JSON.parse(storedScraper);
                    // Solo cargamos la fecha, el status siempre arranca en idle al recargar
                    setScraperStatus({ ...parsed, status: "idle" });
                }

            } finally {
                setIsLoading(false); // Terminar el flag normal para la base de datos completa.
            }

            setMounted(true);
        };

        initializeApp();
    }, []);

    // --- Realtime Replacement: Interval Refresh for Admin & Users ---
    useEffect(() => {
        if (!mounted || !currentUser) return;

        const isUserAdmin = currentUser.role === "admin";
        
        const refreshData = async () => {
            console.log("Refreshing data (Realtime substitute)...");
            if (isUserAdmin) {
                const { data } = await fetchTable("orders", { orderBy: "date", orderDir: "desc" });
                if (data) setOrders(data.map(dbToOrder));
                await fetchSolicitudesMinoristas();
            } else {
                const { data } = await fetchTable("orders", { 
                    filter: { customer_name: currentUser.username.trim() },
                    orderBy: "date",
                    orderDir: "desc"
                });
                if (data) setOrders(data.map(dbToOrder));
            }
        };

        const interval = setInterval(refreshData, 30000); // Poll every 30s
        
        return () => clearInterval(interval);
    }, [mounted, currentUser?.id, currentUser?.role]);

    // Persist notifications & Initial Load from Orders
    useEffect(() => {
        if (mounted && currentUser?.role === "admin") {
            const stored = localStorage.getItem("app_notifications");
            let hasValidStored = false;
            
            if (stored) {
                try { 
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setNotifications(parsed);
                        hasValidStored = true;
                    }
                } catch (e) {}
            }

            if (!hasValidStored && orders.length > 0) {
                console.log("Realtime: Inicializando notificaciones desde historial...");
                const pendingOrders = orders
                    .filter(o => o.status === "solicitud recibida")
                    .slice(0, 15)
                    .map(o => ({
                        id: `init-${o.id}-${Date.now()}`,
                        title: "Pedido Pendiente",
                        message: `Pedido de ${o.customerName} espera confirmación ($${o.total.toLocaleString()})`,
                        date: o.date || new Date().toISOString(),
                        read: false,
                        orderId: o.id
                    }));
                setNotifications(pendingOrders);
            }
        }
    }, [mounted, orders.length, currentUser?.id]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("app_notifications", JSON.stringify(notifications));
        }
    }, [notifications, mounted]);

    // ── Update persistence for ephemeral objects ──────────────────
    useEffect(() => {
        if (mounted) {
            localStorage.setItem(`cart_${currentUser?.id || 'guest'}`, JSON.stringify(cart));
        }
    }, [cart, mounted, currentUser?.id]);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("paymentInfo", JSON.stringify(paymentInfo));
        }
    }, [paymentInfo, mounted]);

    useEffect(() => {
        if (!mounted) return;
        try {
            localStorage.setItem("globalPermissions", JSON.stringify(globalPermissions));
        } catch (e) {
            console.warn("Storage quota exceeded for permissions");
        }
    }, [globalPermissions, mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("generos", JSON.stringify(generos));
    }, [generos, mounted]);

    useEffect(() => {
        if (!mounted) return;
        try {
            localStorage.setItem("categoryMargins", JSON.stringify(categoryMargins));
        } catch (e) { }
    }, [categoryMargins, mounted]);

    useEffect(() => {
        if (!mounted) return;
        try { localStorage.setItem("usuarios", JSON.stringify(usuarios)); } catch (e) { }
        try { 
            // Limpiamos los productos de URLs Base64 pesadas antes de guardar en localStorage
            const strippedProducts = productos.map(p => ({
                ...p,
                imageUrl: (p.imageUrl?.startsWith('data:')) ? undefined : p.imageUrl
            }));
            localStorage.setItem("productos", JSON.stringify(strippedProducts)); 
        } catch (e) { }
        try { localStorage.setItem("categorias", JSON.stringify(categorias)); } catch (e) { }
        try { localStorage.setItem("promociones", JSON.stringify(promotions)); } catch (e) { }
    }, [usuarios, productos, categorias, promotions, mounted]);

    // ── Auth ──────────────────────────────────────────────────────
    const login = (user: Usuario) => {
        localStorage.setItem("mockUser", JSON.stringify(user));
        setCurrentUser(user);
    };

    const logout = async () => {
        localStorage.removeItem("mockUser");
        setCurrentUser(null);
    };

    // ── Productos ─────────────────────────────────────────────────
    const updateProducto = async (updated: Producto) => {
        setProductos(prev => prev.map(p => p.id === updated.id ? updated : p));
        await upsertRecord("productos", {
            id: updated.id,
            name: updated.name,
            category: updated.category,
            base_id: updated.baseId,
            components: updated.components,
            cost: updated.cost,
            price: updated.price,
            price_minorista: updated.priceMinorista,
            stock: updated.stock,
            description: updated.description,
            gender: updated.gender,
            last_update: updated.lastUpdate,
            image_url: updated.imageUrl,
            availability_status: updated.availabilityStatus,
            delivery_days: updated.deliveryDays
        });
    };

    const clearAllProductos = async () => {
        if (!confirm("¿ESTÁS COMPLETAMENTE SEGURO? Se borrarán todos los productos (lista de precios), incluyendo imágenes y stock configurado. Esta acción no se puede deshacer.")) {
            return;
        }
        setProductos([]);
        localStorage.removeItem("productos");
        
        const { error } = await clearTable("productos");
        
        if (error) {
            addSystemLog("error", "Error al vaciar productos", error);
            alert("Error al vaciar la base de datos.");
        } else {
            addSystemLog("info", "Catálogo de productos vaciado por el usuario.");
            alert("Catálogo vaciado con éxito.");
        }
    };

    const deleteProducto = async (id: string) => {
        setProductos(prev => prev.filter(p => p.id !== id));
        await deleteRecord("productos", id);
    };

    const removeDuplicateProducts = async () => {
        const uniqueProducts = new Map<string, Producto>();
        const toDelete: string[] = [];
        
        // Criterio de unicidad: Nombre + ID Esencia
        productos.forEach(p => {
            const pEsc = p.components.find(c => c.type === "Esencia");
            const essenceId = pEsc ? pEsc.id : "no-esc";
            const key = `${(p.name || "").trim().toUpperCase()}_${essenceId}`;
            
            if (uniqueProducts.has(key)) {
                // Ya existe, marcar este para borrar
                // Priorizar quedarnos con el que tenga stock o imagen si uno tiene y el otro no
                const existing = uniqueProducts.get(key)!;
                if ((!existing.imageUrl && p.imageUrl) || (existing.stock === 0 && p.stock > 0)) {
                    toDelete.push(existing.id);
                    uniqueProducts.set(key, p);
                } else {
                    toDelete.push(p.id);
                }
            } else {
                uniqueProducts.set(key, p);
            }
        });

        if (toDelete.length === 0) {
            alert("No se encontraron productos duplicados basados en Nombre y Esencia.");
            return;
        }

        if (confirm(`Se encontraron ${toDelete.length} productos duplicados (mismo nombre y esencia). ¿Deseas eliminarlos de la base de datos definitivamente?\n\nTotal actual: ${productos.length} -> Total final: ${productos.length - toDelete.length}`)) {
            const newList = productos.filter(p => !toDelete.includes(p.id));
            setProductos(newList);
            
            try {
                // Borrar en chunks para no saturar
                for (let i = 0; i < toDelete.length; i += 50) {
                    const chunk = toDelete.slice(i, i + 50);
                    await deleteRecords("productos", chunk);
                }
                addSystemLog("info", `Limpieza exitosa: ${toDelete.length} duplicados eliminados.`);
                alert(`¡Limpieza completada! ${toDelete.length} productos eliminados.`);
            } catch (err) {
                console.error("Error al limpiar duplicados:", err);
                alert("Ocurrió un error al borrar de la base de datos.");
            }
        }
    };

    const addUsuario = async (user: Usuario) => {
        setUsuarios(prev => [user, ...prev]);
        const { error } = await upsertRecord("usuarios", {
            id: user.id,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            status: user.status,
            last_login: user.lastLogin || null,
            notas: user.notas || null
        });
        
        if (error) {
            addSystemLog("error", "Error al crear usuario en DB", { error, user: user.username });
            throw new Error(error);
        } else {
            addSystemLog("info", `Nuevo usuario creado: ${user.username}`);
        }
    };

    const updateUsuario = async (updated: Usuario) => {
        setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u));
        
        // If updating the current user, keep the state in sync
        if (currentUser && currentUser.id === updated.id) {
            setCurrentUser(updated);
        }

        const { error } = await upsertRecord("usuarios", {
            id: updated.id,
            username: updated.username,
            email: updated.email,
            password: updated.password,
            role: updated.role,
            status: updated.status,
            last_login: updated.lastLogin || null,
            notas: updated.notas || null
        });
        
        if (error) {
            console.error("Error updating usuario natively:", error);
            addSystemLog("error", "Error al actualizar usuario en DB", { error, user: updated.username });
            throw new Error(error);
        } else {
            addSystemLog("info", `Usuario actualizado: ${updated.username}`);
        }
    };

    const deleteUsuario = async (id: string) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        await deleteRecord("usuarios", id);
    };

    // ── Insumos e Inventario ──────────────────────────────────────
    const addInsumo = async (insumo: Insumo) => {
        setInsumos(prev => [insumo, ...prev]);
        await upsertRecord("insumos", {
            id: insumo.id,
            name: insumo.name,
            category: insumo.category,
            provider: insumo.provider,
            cost: insumo.cost,
            qty: insumo.qty,
            stock: insumo.stock,
            unit: insumo.unit
        });
    };

    const updateInsumo = async (updated: Insumo) => {
        setInsumos(prev => prev.map(i => i.id === updated.id ? updated : i));
        await upsertRecord("insumos", {
            id: updated.id,
            name: updated.name,
            category: updated.category,
            provider: updated.provider,
            cost: updated.cost,
            qty: updated.qty,
            stock: updated.stock,
            unit: updated.unit
        });
    };

    const deleteInsumo = async (id: string) => {
        setInsumos(prev => prev.filter(i => i.id !== id));
        await deleteRecord("insumos", id);
    };

    const addInventarioItem = async (item: InventarioItem) => {
        // 1. Update master records (Esencias or Insumos)
        if (item.type === "Esencia") {
            _setEsencias(prev => prev.map(e => e.name === item.name ? { ...e, qty: Number(e.qty || 0) + item.qty } : e));
        } else if (item.type === "Insumo") {
            _setInsumos(prev => prev.map(i => i.name === item.name ? { ...i, stock: Number(i.stock || 0) + item.qty } : i));
        }

        // 2. Update Inventario (Physical List) with Upsert logic
        _setInventario(prev => {
            const existingIdx = prev.findIndex(i => i.name === item.name && i.type === item.type && i.unit === item.unit);
            if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    qty: Number(updated[existingIdx].qty || 0) + item.qty,
                    lastUpdate: item.lastUpdate
                };
                return updated;
            }
            return [item, ...prev];
        });
        
        addSystemLog("info", `Ingreso de stock: ${item.name} (${item.qty} ${item.unit})`);
    };

    const updateInventarioItem = async (id: string, qty: number) => {
        let itemName = "";
        let itemType = "";

        // 1. Update Inventario (Physical List)
        setInventario(prev => {
            const idx = prev.findIndex(i => i.id === id);
            if (idx === -1) return prev;
            
            const updated = [...prev];
            itemName = updated[idx].name;
            itemType = updated[idx].type;
            
            updated[idx] = {
                ...updated[idx],
                qty: qty,
                lastUpdate: new Date().toLocaleDateString("es-AR")
            };
            return updated;
        });

        // 2. Sync to DB
        await upsertRecord("inventario", { id, qty, last_update: new Date().toLocaleDateString("es-AR") });

        // 3. Keep Master records in sync
        if (itemType === "Esencia") {
            _setEsencias(prev => prev.map(e => e.name === itemName ? { ...e, qty: qty } : e));
        } else if (itemType === "Insumo") {
            _setInsumos(prev => prev.map(i => i.name === itemName ? { ...i, stock: qty } : i));
        }

        addSystemLog("info", `Ajuste manual de stock: ${itemName} a ${qty}`);
    };

    const deleteInventarioItem = async (id: string) => {
        setInventario(prev => prev.filter(i => i.id !== id));
        await deleteRecord("inventario", id);
    };

    // ── Permissions (localStorage only) ──────────────────────────
    const updatePermissions = (role: UserRole, perms: CategoryPermissions) => {
        setGlobalPermissions(prev => ({ ...prev, [role]: perms }));
    };

    // ── Cart (local only) ─────────────────────────────────────────
    const addToCart = (producto: Producto, priceType: "mayorista" | "minorista") => {
        // Validation: If user is minorista, they shouldn't be adding mayorista items and vice versa
        // but we'll allow it at context level and just ensure the cart IS isolated.
        setCart(prev => {
            const existing = prev.find(item => item.producto.id === producto.id && item.priceType === priceType);
            if (existing) {
                return prev.map(item => item.producto.id === producto.id && item.priceType === priceType
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            }
            return [...prev, { producto, quantity: 1, priceType }];
        });
    };

    const removeFromCart = (productId: string, priceType: "mayorista" | "minorista") => {
        setCart(prev => prev.filter(item => !(item.producto.id === productId && item.priceType === priceType)));
    };

    const updateCartQuantity = (productId: string, priceType: "mayorista" | "minorista", quantity: number) => {
        if (quantity <= 0) { removeFromCart(productId, priceType); return; }
        setCart(prev => prev.map(item =>
            (item.producto.id === productId && item.priceType === priceType) ? { ...item, quantity } : item
        ));
    };

    const updateCartItemPrice = (productId: string, priceType: "mayorista" | "minorista", customPrice: number | undefined) => {
        setCart(prev => prev.map(item =>
            (item.producto.id === productId && item.priceType === priceType) ? { ...item, customPrice } : item
        ));
    };

    const clearCart = () => setCart([]);

    const createOrder = async (customerName: string, paymentMethod: "qr" | "transferencia" | "efectivo" | "otro" = "efectivo", cartType?: "mayorista" | "minorista") => {
        const itemsToCheckout = cartType ? cart.filter(c => c.priceType === cartType) : cart;

        if (itemsToCheckout.length === 0) return;

        let total = itemsToCheckout.reduce((acc, item) => {
            const price = item.customPrice !== undefined ? item.customPrice : (item.priceType === "mayorista" ? item.producto.price : item.producto.priceMinorista);
            return acc + (price * item.quantity);
        }, 0);

        // Apply +10% surcharge for MP QR code
        if (paymentMethod === 'qr') {
            total = total * 1.1;
        }

        const finalCustomerName = (currentUser && currentUser.role !== "admin")
            ? currentUser.username
            : customerName;

        const newId = genId("ORD-");
        const newOrder: Order = {
            id: newId,
            items: [...itemsToCheckout],
            total,
            customerName: finalCustomerName,
            status: "solicitud recibida",
            date: new Date().toISOString(),
            paymentMethod,
            paymentStatus: paymentMethod === 'transferencia' ? 'confirmacion_pendiente' : 'pendiente'
        };
        localStorage.setItem("lastCreatedOrderId", newId);
        setOrders(prev => [newOrder, ...prev]);

        // Only clear from the cart those items that we are checking out
        setCart(prev => prev.filter(c => cartType ? c.priceType !== cartType : false));

        const payload = {
            id: newId,
            items: newOrder.items,
            total: newOrder.total,
            customer_name: String(newOrder.customerName || "Venta Manual").trim(),
            status: newOrder.status,
            date: newOrder.date,
            payment_method: newOrder.paymentMethod,
            payment_status: newOrder.paymentStatus
        };

        console.log("DEBUG: Sending order payload to Xata:", payload);

        const { error } = await upsertRecord("orders", payload);

        if (error) {
            console.error("CRITICAL: Error inserting order into Xata:", error);
            alert(`Error crítico al guardar pedido en la base de datos.`);
            setOrders(prev => prev.filter(o => o.id !== newId));
            addSystemLog("error", "Error crítico al guardar pedido", { orderId: newId, error });
        } else {
            addSystemLog("info", `Pedido ${newId} guardado correctamente en Xata`);
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'order_created',
                    payload: { ...payload, senderId: currentUser?.id }
                });
            }
        }
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Requirement 5: Check stock before ANY transition (except cancellation or revert to received)
        if (status !== "solicitud recibida" && status !== "cancelado" && order.status !== "entregado") {
            const requiredStock: Record<string, number> = {};
            order.items.forEach(cartItem => {
                cartItem.producto.components.forEach(comp => {
                    const key = comp.name.toLowerCase();
                    requiredStock[key] = (requiredStock[key] || 0) + (comp.qty * cartItem.quantity);
                });
            });

            const missingItems: string[] = [];
            Object.entries(requiredStock).forEach(([name, qty]) => {
                const invItem = inventario.find(inv => inv.name.toLowerCase().includes(name) || name.includes(inv.name.toLowerCase()));
                if (!invItem || (Number(invItem.qty || 0)) < qty) {
                    const missing = qty - (Number(invItem?.qty || 0));
                    missingItems.push(`${name} (Faltan ${missing.toFixed(0)}${invItem?.unit || 'g/un'})`);
                }
            });

            if (missingItems.length > 0) {
                toast.error("Stock insuficiente", {
                    description: `No se puede avanzar el pedido. Faltan: ${missingItems.join(", ")}`
                });
                return;
            }
        }

        // Requirement 6: Deduct stock ONLY when moving to "entregado"
        if (order && status === "entregado" && order.status !== "entregado") {
            // We use functional updates to ensure we are using the ABSOLUTE LATEST state
            // to avoid race conditions and inadvertent state reverts.
            
            // 1. Update Esencias
            _setEsencias(prev => {
                const updated = [...prev];
                order.items.forEach(cartItem => {
                    cartItem.producto.components.forEach(comp => {
                        if (comp.type === "Esencia") {
                            const totalToDeduct = comp.qty * cartItem.quantity;
                            const idx = updated.findIndex(e => e.id === comp.id || e.name.toLowerCase().includes(comp.name.toLowerCase()) || comp.name.toLowerCase().includes(e.name.toLowerCase()));
                            if (idx !== -1) {
                                updated[idx] = {
                                    ...updated[idx],
                                    qty: Math.max(0, Number(updated[idx].qty || 0) - totalToDeduct)
                                };
                            }
                        }
                    });
                });
                return updated;
            });

            // 2. Update Insumos
            _setInsumos(prev => {
                const updated = [...prev];
                order.items.forEach(cartItem => {
                    cartItem.producto.components.forEach(comp => {
                        if (comp.type === "Insumo") {
                            const totalToDeduct = comp.qty * cartItem.quantity;
                            const idx = updated.findIndex(i => i.id === comp.id || i.name.toLowerCase().includes(comp.name.toLowerCase()) || comp.name.toLowerCase().includes(i.name.toLowerCase()));
                            if (idx !== -1) {
                                updated[idx] = {
                                    ...updated[idx],
                                    stock: Math.max(0, Number(updated[idx].stock || 0) - totalToDeduct)
                                };
                            }
                        }
                    });
                });
                return updated;
            });


            
            addSystemLog("info", `Stock descontado para pedido #${orderId}`, { items: order.items.length });
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        await upsertRecord("orders", { id: orderId, status });
        
        // Notificar al cliente vía el canal central
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'order_updated',
                payload: { orderId, newStatus: status, customerName: order?.customerName, senderId: currentUser?.id }
            });
            addSystemLog("info", `Broadcast de estado enviado para #${orderId} (estado: ${status})`);
        }
    };

    const updateOrderPaymentStatus = async (orderId: string, paymentStatus: Order["paymentStatus"]) => {
        const order = orders.find(o => o.id === orderId);

        // Logical Trigger: Create transaction when marked as paid
        if (order && paymentStatus === 'pagado' && order.paymentStatus !== 'pagado') {
            const newTransaction: Transaccion = {
                id: getNextSequenceId(transacciones, "T-SALE-"),
                type: "Ingreso",
                amount: order.total,
                description: `${order.items.map(i => i.producto.name).join(", ")} - Cliente: ${order.customerName}`,
                date: new Date().toLocaleDateString("es-AR")
            };
            setTransacciones(prev => [newTransaction, ...prev]);
            await upsertRecord("transacciones", {
                id: newTransaction.id,
                type: newTransaction.type,
                amount: newTransaction.amount,
                description: newTransaction.description,
                date: newTransaction.date
            });
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus } : o));
        const { error } = await upsertRecord("orders", { id: orderId, payment_status: paymentStatus });
        
        if (error) {
            addSystemLog("error", "Error actualizando pago", error);
        } else {
            // Notificar al cliente vía el canal central
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'order_updated',
                    payload: { orderId, newStatus: `Pago ${paymentStatus}`, customerName: order?.customerName, senderId: currentUser?.id }
                });
                addSystemLog("info", `Broadcast de pago enviado para #${orderId} (pago: ${paymentStatus})`);
            }
        }
    };

    const cancelOrder = async (orderId: string, reason: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelado", paymentStatus: "rechazado", cancelationReason: reason } : o));
        
        const { error } = await upsertRecord("orders", { 
            id: orderId,
            status: "cancelado",
            payment_status: "rechazado",
            cancelation_reason: reason 
        });

        if (!error) {
            addSystemLog("info", `Pedido ${orderId} cancelado localmente. Motivo: ${reason}`);
            
            // Avisar por el canal central
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'order_updated',
                    payload: { orderId, newStatus: "Cancelado", customerName: order.customerName, reason: reason, senderId: currentUser?.id }
                });
                addSystemLog("info", `Broadcast de cancelación enviado para #${orderId}`);
            }
        } else {
            console.error("Error al cancelar en DB:", error);
            addSystemLog("error", "Fallo al cancelar pedido en Base de Datos", error);
            toast.error("Error al guardar en la base de datos. Verifica los logs.");
            
            // Revertir el estado local para no confundir al usuario
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: order.status, cancelationReason: order.cancelationReason } : o));
        }
    };

    const deleteOrder = async (orderId: string) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        await deleteRecord("orders", orderId);
    };

    const addPromotion = async (promo: Promotion) => {
        let updatedPromos: Promotion[] = [];
        setPromotions(prev => {
            const existing = prev.find(p => p.id === promo.id || (p.productId === promo.productId && p.productId !== null));
            if (existing) {
                updatedPromos = prev.map(p => (p.id === promo.id || p.productId === promo.productId) ? promo : p);
            } else {
                updatedPromos = [promo, ...prev];
            }
            localStorage.setItem("promociones", JSON.stringify(updatedPromos));
            return updatedPromos;
        });
        await upsertRecord("promociones", {
            id: promo.id,
            product_id: promo.productId,
            discount_percentage: promo.discountPercentage,
            is_active: promo.isActive,
            end_date: promo.endDate
        });
    };

    const deletePromotion = async (id: string) => {
        setPromotions(prev => {
            const next = prev.filter(p => p.id !== id);
            localStorage.setItem("promociones", JSON.stringify(next));
            return next;
        });
        await deleteRecord("promociones", id);
    };

    // ── Generate Products from Base ───────────────────────────────
    const generateProductsFromBase = async (baseId: string): Promise<{ created: number, updated: number }> => {
        return new Promise(async (resolve, reject) => {
            const base = bases.find(b => b.id === baseId);
            if (!base) return reject(new Error("Base no encontrada"));

            // OBTENER ESTADO FRESCO
            const { data: dbProds, error: fetchErr } = await fetchTable("productos");
            const currentProds = dbProds ? (dbProds as any[]).map(r => ({
                id: r.id,
                name: r.name,
                category: r.category,
                baseId: r.base_id,
                price: r.price,
                priceMinorista: r.price_minorista,
                cost: r.cost,
                components: r.components || [],
                gender: r.gender,
                imageUrl: r.image_url,
            } as Producto)) : [];

            // Filtramos por categoría diferenciando entre Limpia Pisos y Ambiente (Auto/Difusores)
            const baseCategoryStr = (base.category || "").toLowerCase().trim();
            const baseNameStr = (base.name || "").toLowerCase().trim();
            
            const isLimpiaPisos = baseCategoryStr.includes("limpia") || baseNameStr.includes("limpia");
            const isEsenciaAmbiente = baseCategoryStr.includes("ambiente") || 
                                     baseCategoryStr.includes("auto") ||
                                     baseCategoryStr.includes("difusor") ||
                                     baseCategoryStr.includes("aromatizante") ||
                                     baseNameStr.includes("ambiente") ||
                                     baseNameStr.includes("auto") ||
                                     baseNameStr.includes("difusor") ||
                                     baseNameStr.includes("aromatizante");
            
            const validEsencias = esencias.filter(e => {
                const essenceCat = (e.category || "Perfumería Fina").toLowerCase().trim();
                
                // Si es Limpia Pisos, buscamos esencias de Limpia
                if (isLimpiaPisos) return essenceCat.includes("limpia");
                
                // Si es DIFUSOR/AROMATIZANTE/AUTO, buscamos cualquiera de esas en la esencia (lo que pidió el cliente)
                if (isEsenciaAmbiente) {
                    return essenceCat.includes("ambiente") || 
                           essenceCat.includes("auto") || 
                           essenceCat.includes("difusor") || 
                           essenceCat.includes("aromatizante");
                }
                
                // Si no, comparación exacta (Perfumería Fina por defecto)
                return essenceCat === baseCategoryStr || (baseCategoryStr === "" && essenceCat === "perfumería fina");
            });

            // REGLA DE GÉNERO:
            // - Limpia Pisos / Ambiente / Auto: Ignoramos el filtro de género de la base para buscar esencias
            // - Perfumería: SÍ lo usamos
            const bypassGender = isLimpiaPisos || isEsenciaAmbiente || !base.essenceGender || base.essenceGender === "Todos";

            const targetEsencias = bypassGender
                ? validEsencias
                : validEsencias.filter(e => {
                    if (!e.gender) return false;
                    return e.gender.toLowerCase() === base.essenceGender?.toLowerCase();
                });
            
            // Log para debug
            if (isLimpiaPisos || isEsenciaAmbiente) {
                console.log(`Generación Especial: Tomando TODAS las ${targetEsencias.length} esencias sin filtrar género.`);
            }

            if (targetEsencias.length === 0) {
                return reject(new Error(`No hay productos de género '${base.essenceGender}' en la categoría '${base.category || 'Perfumería Fina'}'`));
            }

            const newProductsGenerated: Producto[] = [];
            const lastUpdateStr = new Date().toISOString();

            targetEsencias.forEach(esc => {
                const formula: BaseComponent[] = [
                    ...base.components,
                    { id: esc.id, name: esc.name, qty: base.essenceGrams || 10, type: "Esencia" }
                ];

                const cost = formula.reduce((acc, comp) => {
                    const source = comp.type === "Esencia"
                        ? (esencias.find(e => e.id === comp.id) || esencias.find(e => e.name.toLowerCase() === comp.name.toLowerCase()))
                        : (insumos.find(i => i.id === comp.id) || insumos.find(i => i.name.toLowerCase() === comp.name.toLowerCase()));
                    if (!source) return acc;

                    let unitCost = 0;
                    if (comp.type === "Esencia") {
                        const e = source as Esencia;
                        const p100 = parseFloat(e.price100g as any);
                        const p250 = parseFloat(e.price250g as any);
                        const p30 = parseFloat(e.price30g as any);

                        if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
                        else if (!isNaN(p250) && p250 > 0) unitCost = p250 / 250;
                        else if (!isNaN(p30) && p30 > 0) unitCost = p30 / 30;
                        else unitCost = e.cost / (e.qty || 1);
                    } else {
                        unitCost = (source.cost || 0) / ((source as Insumo).qty || 1);
                    }
                    if (isNaN(unitCost)) unitCost = 0;

                    return acc + (unitCost * comp.qty);
                }, 0);

                const roundUpTo100 = (num: number) => Math.ceil(num / 100) * 100;

                let cleanName = esc.name
                    .replace(/X\s*KG/gi, "")
                    .replace(/\([FfMmUu]\)/g, "")
                    .replace(/\s+[FfMmUu](\s|$)/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
                    .toUpperCase();

                if (isLimpiaPisos) {
                    const is5L = base.name.includes("5L");
                    cleanName += is5L ? " 5L" : " 1L";
                }

                const targetCategory = base.category || "Perfumería Fina";
                const margins = categoryMargins[targetCategory] || { mayorista: 1.5, minorista: 2.0 };

                // REGLA: Si la esencia no tiene ningún precio válido (p100, p250, p30 ni cost), el producto final será 'Consultar' (Precio 0)
                const p100Esc = parseFloat(esc.price100g as any);
                const p250Esc = parseFloat(esc.price250g as any);
                const p30Esc = parseFloat(esc.price30g as any);
                
                const hasValidPrice = (!isNaN(p100Esc) && p100Esc > 0) || 
                                     (!isNaN(p250Esc) && p250Esc > 0) ||
                                     (!isNaN(p30Esc) && p30Esc > 0) || 
                                     (esc.cost > 0);
                                     
                const isEsenciaConsultar = !hasValidPrice;

                newProductsGenerated.push({
                    id: "", // Se asignará luego numéricamente si es nuevo
                    name: cleanName,
                    category: targetCategory,
                    baseId: base.id,
                    components: formula,
                    cost: isNaN(cost) ? 0 : cost,
                    price: (isEsenciaConsultar || isNaN(cost) || cost <= 0) ? 0 : roundUpTo100(cost * margins.mayorista),
                    priceMinorista: (isEsenciaConsultar || isNaN(cost) || cost <= 0) ? 0 : roundUpTo100(cost * margins.minorista),
                    stock: 0,
                    description: `Generado de base ${base.name}`,
                    gender: (isLimpiaPisos || isEsenciaAmbiente) ? (base.essenceGender || "Unisex") : (esc.gender || "Unisex"),
                    lastUpdate: lastUpdateStr,
                });
            });
            const toUpsert: any[] = [];
            let created = 0;
            let updated = 0;

            const updatedList = [...currentProds];
            let nextIdNum = updatedList.reduce((max, p) => {
                const num = parseInt(p.id);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0) + 1;

            newProductsGenerated.forEach(np => {
                const npEsc = np.components.find(c => c.type === "Esencia");
                const existingIdx = currentProds.findIndex(p => {
                    const pEsc = p.components.find(c => c.type === "Esencia");
                    const sameEssence = pEsc && npEsc && pEsc.id.toString() === npEsc.id.toString();
                    const sameBase = p.baseId === np.baseId;
                    const sameName = (p.name || "").trim().toUpperCase() === (np.name || "").trim().toUpperCase();
                    
                    // Si coincide nombre y esencia, ES el mismo producto aunque no tenga baseId guardado
                    // O si coincide el baseId y la esencia.
                    return sameEssence && (sameBase || sameName);
                });

                if (existingIdx >= 0) {
                    updated++;
                    const existing = currentProds[existingIdx];
                    const merged: Producto = {
                        ...np,
                        id: existing.id,
                        stock: existing.stock || 0,
                        imageUrl: existing.imageUrl
                    };
                    
                    const idxInList = updatedList.findIndex(x => x.id === merged.id);
                    if (idxInList >= 0) updatedList[idxInList] = merged;
                    else updatedList.push(merged);

                    toUpsert.push({
                        id: merged.id,
                        name: merged.name,
                        category: merged.category,
                        base_id: merged.baseId,
                        components: merged.components,
                        cost: merged.cost,
                        price: merged.price,
                        price_minorista: merged.priceMinorista,
                        stock: merged.stock,
                        description: merged.description,
                        gender: merged.gender,
                        last_update: merged.lastUpdate,
                        image_url: merged.imageUrl,
                    });
                } else {
                    created++;
                    const newId = (nextIdNum++).toString().padStart(3, "0");
                    const newProd = { ...np, id: newId };
                    updatedList.push(newProd);
                    toUpsert.push({
                        id: newId,
                        name: newProd.name,
                        category: newProd.category,
                        base_id: newProd.baseId,
                        components: newProd.components,
                        cost: newProd.cost,
                        price: newProd.price,
                        price_minorista: newProd.priceMinorista,
                        stock: newProd.stock,
                        description: newProd.description,
                        gender: newProd.gender,
                        last_update: newProd.lastUpdate,
                        image_url: newProd.imageUrl,
                    });
                }
            });

            setProductos(updatedList);

            const uniqueUpsert = Object.values(toUpsert.reduce((acc, obj) => { acc[obj.id] = obj; return acc; }, {}));
            const CHUNK_SIZE = 50;

            try {
                for (let i = 0; i < uniqueUpsert.length; i += CHUNK_SIZE) {
                    const chunk = uniqueUpsert.slice(i, i + CHUNK_SIZE);
                    await upsertRecords("productos", chunk);
                }
                resolve({ created, updated });
            } catch (err) {
                console.error("Error updating DB in generateProductsFromBase:", err);
                reject(err);
            }
        });
    };

    // ── Sync state changes to Supabase ────────────────────────────
    const syncDiffToSupabase = async (table: string, prev: any[], next: any[], mapFn: (item: any) => any) => {
        if (!mounted) return;

        const prevMap = new Map(prev.map(p => [p.id, p]));
        const nextIds = new Set(next.map(n => n.id));

        const toDelete = prev.filter(p => !nextIds.has(p.id));
        const toUpsert = next.filter(n => {
            const p = prevMap.get(n.id);
            if (!p) return true;
            if (p === n) return false;
            return JSON.stringify(p) !== JSON.stringify(n);
        });

        if (toDelete.length > 0) {
            const { error } = await deleteRecords(table, toDelete.map(d => d.id));
            if (error) {
                console.error(`Delete ${table} error:`, error);
                addSystemLog("error", `Error eliminando en ${table}`, { error });
            }
        }
        
        if (toUpsert.length > 0) {
            const fullPayload = toUpsert.map(mapFn);
            
            for (let i = 0; i < fullPayload.length; i += 50) {
                const chunk = fullPayload.slice(i, i + 50);
                const { error } = await upsertRecords(table, chunk);
                
                if (error) {
                     console.error(`Upsert ${table} error en chunk ${i}:`, {
                        message: error,
                        table
                    });

                    addSystemLog("error", `Error guardando en ${table} (chunk ${i})`, {
                        error,
                        table
                    });
                }
            }
        }
    };

    // Wrap state setters to sync diffs to Supabase
    const _setCategorias: typeof setCategorias = (value) => {
        setCategorias(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("categorias", prev, next, (c: Categoria) => ({ id: c.id, name: c.name, count: c.count })), 0);
            return next;
        });
    };

    const _setProveedores: typeof setProveedores = (value) => {
        setProveedores(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("proveedores", prev, next, (p: Proveedor) => ({ id: p.id, name: p.name, contact: p.contact })), 0);
            return next;
        });
    };

    const _setEsencias: typeof setEsencias = (value) => {
        setEsencias(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => {
                syncDiffToSupabase("esencias", prev, next, (e: Esencia) => ({
                    id: e.id,
                    name: e.name,
                    category: e.category ?? "Perfumería Fina",
                    gender: e.gender ?? "Femenino",
                    provider: e.provider ?? "Van Rossum",
                    cost: e.cost ?? 0,
                    qty: e.qty ?? 0,
                    price30g: e.price30g === "consultar" ? null : (e.price30g ?? null),
                    price100g: e.price100g === "consultar" ? null : (e.price100g ?? null),
                    price250g: e.price250g === "consultar" ? null : (e.price250g ?? null),
                    price100g_usd: e.price100gUsd ?? null,
                    price250g_usd: e.price250gUsd ?? null,
                    last_update: e.lastUpdate ?? null,
                    source: e.source ?? "manual",
                }));
                
                // Keep Inventario in sync with Master records
                _setInventario(invPrev => {
                    let changed = false;
                    const nextInv = invPrev.map(invItem => {
                        const matchingNext = (next as Esencia[]).find(e => e.id === invItem.id || (invItem.type === "Esencia" && (e.name.toLowerCase().includes(invItem.name.toLowerCase()) || invItem.name.toLowerCase().includes(e.name.toLowerCase()))));
                        if (matchingNext) {
                          if (invItem.qty !== matchingNext.qty || invItem.name !== matchingNext.name) {
                            changed = true;
                            return { ...invItem, qty: matchingNext.qty, name: matchingNext.name, lastUpdate: new Date().toLocaleDateString("es-AR") };
                          }
                        }
                        return invItem;
                    });
                    return changed ? nextInv : invPrev;
                });
            }, 0);
            return next;
        });
    };

    const _setInsumos: typeof setInsumos = (value) => {
        setInsumos(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => {
                syncDiffToSupabase("insumos", prev, next, (i: Insumo) => ({
                    id: i.id,
                    name: i.name,
                    category: i.category,
                    provider: i.provider,
                    cost: i.cost,
                    qty: i.qty,
                    stock: i.stock ?? 0,
                    unit: i.unit ?? "un.",
                }));

                // Keep Inventario in sync with Master records
                _setInventario(invPrev => {
                    let changed = false;
                    const nextInv = invPrev.map(invItem => {
                        const matchingNext = (next as Insumo[]).find(i => i.id === invItem.id || (invItem.type === "Insumo" && (i.name.toLowerCase().includes(invItem.name.toLowerCase()) || invItem.name.toLowerCase().includes(i.name.toLowerCase()))));
                        if (matchingNext) {
                            if (invItem.qty !== matchingNext.stock || invItem.name !== matchingNext.name) {
                                changed = true;
                                return { ...invItem, qty: matchingNext.stock, name: matchingNext.name, lastUpdate: new Date().toLocaleDateString("es-AR") };
                            }
                        }
                        return invItem;
                    });
                    return changed ? nextInv : invPrev;
                });
            }, 0);
            return next;
        });
    };

    const _setInventario: typeof setInventario = (value) => {
        setInventario(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("inventario", prev, next, (i: InventarioItem) => ({
                id: i.id,
                name: i.name,
                type: i.type,
                category: i.category,
                qty: i.qty,
                last_update: i.lastUpdate,
                unit: i.unit,
                gender: i.gender || null
            })), 0);
            return next;
        });
    };

    const _setTransacciones: typeof setTransacciones = (value) => {
        setTransacciones(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("transacciones", prev, next, (t: Transaccion) => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                date: t.date,
            })), 0);
            return next;
        });
    };

    const _setBases: typeof setBases = (value) => {
        setBases(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("bases", prev, next, (b: Base) => ({
                id: b.id,
                name: b.name,
                components: b.components,
                essence_gender: b.essenceGender ?? null,
                essence_grams: b.essenceGrams ?? null,
                category: b.category ?? null,
            })), 0);
            return next;
        });
    };

    const _setProductos: typeof setProductos = (value) => {
        setProductos(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("productos", prev, next, (p: Producto) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                base_id: p.baseId,
                components: p.components,
                cost: p.cost,
                price: p.price,
                price_minorista: p.priceMinorista,
                stock: p.stock,
                description: p.description,
                gender: p.gender,
                last_update: p.lastUpdate ?? null,
                image_url: p.imageUrl ?? null,
            })), 0);
            return next;
        });
    };

    const _setUsuarios: typeof setUsuarios = (value) => {
        setUsuarios(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            setTimeout(() => syncDiffToSupabase("usuarios", prev, next, (u: Usuario) => ({
                id: u.id,
                username: u.username,
                email: u.email,
                password: u.password,
                role: u.role,
                status: u.status,
                last_login: u.lastLogin || null,
            })), 0);
            return next;
        });
    };

    const runScraper = async () => {
        setScraperStatus(prev => ({ ...prev, status: "loading" }));
        try {
            const res = await fetch("/api/scrape");
            const data = await res.json();
            if (data.success) {
                const scrapedEsencias = (data.esencias as Esencia[]).map(e => ({ ...e, source: "scraped" as const }));

                _setEsencias(prev => {
                    const uniqueMap = new Map();
                    const normalize = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

                    // 1. Maintain ALL existing items to prevent accidental deletions (especially Limpia Pisos, Ambiente)
                    prev.forEach(e => {
                        const key = `${normalize(e.name)}_${(e.gender || "U").toUpperCase()}`;
                        uniqueMap.set(key, e);
                    });
                    
                    // 2. Overwrite / merge scraped updates
                    scrapedEsencias.forEach(e => {
                        const key = `${normalize(e.name)}_${(e.gender || "U").toUpperCase()}`;
                        const existing = uniqueMap.get(key);
                        if (existing) {
                            // Preserve critical manual logic like QTY, manual Categories, original IDs
                            uniqueMap.set(key, {
                                ...existing,
                                name: e.name, // in case of minor casing updates
                                price30g: e.price30g,
                                price100g: e.price100g,
                                cost: typeof e.price30g === "number" ? e.price30g : (existing.cost || 0),
                                source: "scraped",
                                lastUpdate: new Date().toLocaleDateString()
                            });
                        } else {
                            uniqueMap.set(key, e);
                        }
                    });
                    
                    return Array.from(uniqueMap.values());
                });

                const newStatus: ScraperStatus = { lastRun: new Date().toLocaleDateString(), status: "success" };
                setScraperStatus(newStatus);
                localStorage.setItem("scraperStatus", JSON.stringify(newStatus));
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            const newStatus: ScraperStatus = { lastRun: new Date().toLocaleDateString(), status: "failure", message: error.message };
            setScraperStatus(newStatus);
            localStorage.setItem("scraperStatus", JSON.stringify(newStatus));
        }
    };

    useEffect(() => {
        if (!mounted) return;

        const checkSync = () => {
            const currentStatus = JSON.parse(localStorage.getItem("scraperStatus") || "{}");
            const lastRunStr = currentStatus.lastRun || scraperStatus.lastRun;
            const todayStr = new Date().toLocaleDateString();
            
            if (lastRunStr !== todayStr && currentStatus.status !== "loading") {
                runScraper();
            }
        };

        checkSync(); // Correr al inicio
        const intervalId = setInterval(checkSync, 60000); // Revisar cada minuto en el fondo (útil si dejan la pestaña abierta 24/7)

        return () => clearInterval(intervalId);
    }, [mounted]); // Removemos las dependencias excesivas para evitar loops, leer de localstorage es seguro aqui

    const contextValue = React.useMemo(() => ({
        categorias, setCategorias: _setCategorias,
        proveedores, setProveedores: _setProveedores,
        esencias, setEsencias: _setEsencias,
        insumos, setInsumos: _setInsumos,
        inventario, setInventario: _setInventario,
        transacciones, setTransacciones: _setTransacciones,
        bases, setBases: _setBases,
        productos, setProductos: _setProductos,
        usuarios, setUsuarios: _setUsuarios,
        globalPermissions,
        cart,
        orders,
        scraperStatus,
        setScraperStatus,
        updateProducto,
        deleteProducto,
        addUsuario,
        updateUsuario,
        deleteUsuario,
        updatePermissions,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartItemPrice,
        clearCart,
        createOrder,
        updateOrderStatus,
        updateOrderPaymentStatus,
        cancelOrder,
        deleteOrder,
        addInsumo,
        updateInsumo,
        deleteInsumo,
        addInventarioItem,
        deleteInventarioItem,
        updateInventarioItem,
        runScraper,
        login,
        currentUser,
        logout,
        generos,
        setGeneros,
        mounted,
        generateProductsFromBase,
        removeDuplicateProducts,
        getNextId: getNextSequenceId,
        categoryMargins,
        setCategoryMargins,
        promotions,
        addPromotion,
        deletePromotion,
        paymentInfo,
        setPaymentInfo: setPaymentInfoState,
        isLoading,
        addSystemLog,
        clearAllProductos,
        usdRate,
        usdLastUpdate,
        syncUsdRate,
        notifications,
        unreadCount,
        markNotificationAsRead,
        clearNotifications,
        enviarSolicitudMayorista,
        solicitudesMinoristas,
        fetchSolicitudesMinoristas,
        eliminarSolicitudMinorista,
        aprobarSolicitudMinorista,
        rechazarSolicitudMinorista,
        solicitudPropia
    }), [
        categorias, proveedores, esencias, insumos, inventario, transacciones,
        bases, productos, usuarios, globalPermissions, cart, orders,
        scraperStatus, currentUser, generos, mounted, categoryMargins,
        promotions, paymentInfo, isLoading, usdRate, notifications, unreadCount,
        solicitudesMinoristas, solicitudPropia
    ]);

    if (!mounted) {
        return <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]"></div>;
    }

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
}
