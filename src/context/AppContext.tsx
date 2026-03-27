"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
};

export type UserRole = "admin" | "minorista" | "mayorista";
export type Usuario = { id: string; username: string; email?: string; password?: string; role: UserRole; status: "Activo" | "Inactivo"; lastLogin?: string; notas?: string };

export type PermissionLevel = "Editor" | "Solo lectura" | "Sin acceso";
export type CategoryPermissions = Record<string, PermissionLevel>;

export type OrderStatus = "solicitud recibida" | "pedido confirmado" | "en preparacion" | "listo para entregar" | "cancelado";
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
        price30g: row.price30g === null ? "consultar" : row.price30g,
        price100g: row.price100g === null ? "consultar" : row.price100g,
        price250g: row.price250g === null ? "consultar" : row.price250g,
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
        amount: row.amount,
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
    return {
        id: row.id,
        items: row.items ?? [],
        total: row.total ?? 0,
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
    isLoading: boolean;
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
    addSystemLog: (type: "info" | "error" | "db" | "auth" | "warn", message: string, details?: any) => void;
    usdRate: number;
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
        const { data, error } = await supabase
            .from('solicitudes_mayorista')
            .select('*')
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error al cargar solicitudes:", error);
        } else {
            setSolicitudesMinoristas(data || []);
        }
    };

    const eliminarSolicitudMinorista = async (id: number) => {
        setSolicitudesMinoristas(prev => prev.filter(s => s.id !== id));
        const { error } = await supabase.from('solicitudes_mayorista').delete().eq('id', id);
        
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
            const { data: requestData } = await supabase.from('solicitudes_mayorista').select('*').eq('id', requestId).single();
            
            const notasFormateadas = requestData ? 
                `--- SOLICITUD MAYORISTA APROBADA ---\nFecha: ${new Date().toLocaleDateString()}\nNombre: ${requestData.nombre} ${requestData.apellido}\nEmail: ${requestData.mail}\nCelular: ${requestData.celular}\nMotivo: ${requestData.motivo}\n-----------------------------------` 
                : "";

            // 2. Cambiar rol del usuario y añadir notas
            const { error: userError } = await supabase.from('usuarios').update({ 
                role: 'mayorista',
                notas: notasFormateadas 
            }).eq('id', userId);
            
            if (userError) throw userError;

            // 3. Marcar solicitud como aprobada
            const { error: reqError } = await supabase.from('solicitudes_mayorista').update({ estado: 'aprobada' }).eq('id', requestId);
            if (reqError) throw reqError;

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
            const { error } = await supabase.from('solicitudes_mayorista').update({ 
                estado: 'rechazada',
                motivo_rechazo: motivo,
                fecha_reintento: fechaReintento
            }).eq('id', requestId);
            
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
            const { data: newSolicitud, error: insertError } = await supabase.from('solicitudes_mayorista').insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                ...datos,
                estado: 'pendiente'
            }]).select('*').single();

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

    const [usdRate, setUsdRate] = useState<number>(1000); // Default placeholder
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch USD rate on mount
    useEffect(() => {
        fetch("https://dolarapi.com/v1/dolares/blue")
            .then(res => res.json())
            .then(data => {
                if (data && data.venta) {
                    setUsdRate(data.venta);
                }
            })
            .catch(() => console.error("Could not fetch dollar rate"));
    }, []);

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
                // 1. Auth check first - mandatory to know what to load
                const { data: { user } } = await supabase.auth.getUser();
                let resolvedUser: Usuario | null = null;

                // Get user record to know the role early
                if (user) {
                    const { data: userData } = await supabase.from("usuarios").select("*").eq("id", user.id).single();
                    if (userData) {
                        resolvedUser = dbToUsuario(userData);
                    } else {
                        // try by email if id failed (legacy)
                        const { data: userDataEmail } = await supabase.from("usuarios").select("*").ilike("username", user.email || "").single();
                        if (userDataEmail) resolvedUser = dbToUsuario(userDataEmail);
                    }
                } else {
                    const mock = localStorage.getItem("mockUser");
                    if (mock) resolvedUser = JSON.parse(mock);
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

                // Function with retry for large tables
                const fetchWithRetry = async (query: any, retries = 2) => {
                    for (let i = 0; i <= retries; i++) {
                        const res = await query;
                        if (!res.error) return res;
                        if (i < retries) {
                            addSystemLog("info", `Reintentando fetch (${i + 1}/${retries})...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            return res;
                        }
                    }
                };

                // 2. Parallel fetch essential vs admin data (Supabase Refetch)
                const essentialRequests = [
                    fetchWithRetry(supabase.from("categorias").select("*").order("name")),
                    fetchWithRetry(supabase.from("productos").select("*")),
                    fetchWithRetry(supabase.from("promociones").select("*")),
                ];

                const adminRequests = isAdmin ? [
                    supabase.from("proveedores").select("*").order("name"),
                    supabase.from("esencias").select("*").order("name"),
                    supabase.from("insumos").select("*").order("name"),
                    supabase.from("inventario").select("*").order("name"),
                    supabase.from("transacciones").select("*").order("created_at", { ascending: false }),
                    supabase.from("bases").select("*").order("name"),
                    supabase.from("usuarios").select("*").order("username"),
                    supabase.from("orders").select("*").order("date", { ascending: false }),
                    supabase.from("solicitudes_mayorista").select("*").eq('estado', 'pendiente').order('created_at', { ascending: false }),
                ] : [];

                const results = await Promise.all([...essentialRequests, ...adminRequests]);

                const [catResult, prodResult, promoResult] = results;
                const [
                    provResult, escResult, insResult, invResult, transResult, basesResult, usersResult, ordersResult, solicitudesResult
                ] = isAdmin ? results.slice(3) : [null, null, null, null, null, null, null, null, null];

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
                        console.error(`Error fetching ${lsKey} from Supabase:`, result.error);
                        addSystemLog("error", `Fallo en Supabase (${lsKey})`, {
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
                setPromotions(promoData.data);

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
                    const { data: personalReq } = await supabase
                        .from("solicitudes_mayorista")
                        .select("*")
                        .eq("user_id", resolvedUser.id)
                        .maybeSingle();
                    
                    if (personalReq) setSolicitudPropia(personalReq);

                    // Wholesalers/Retailers only need THEIR orders
                    // Use ilike for case-insensitive matching to avoid issues with typed vs stored names
                    const { data: ownOrders, error: ordersErr } = await supabase
                        .from("orders")
                        .select("*")
                        .ilike("customer_name", resolvedUser.username.trim())
                        .order("date", { ascending: false });

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

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const storedUsuarios = localStorage.getItem("usuarios");
                const allUsers: Usuario[] = storedUsuarios ? JSON.parse(storedUsuarios) : [];
                const found = allUsers.find(u =>
                    u.username.toLowerCase() === session.user.email?.toLowerCase() ||
                    u.id === session.user.id
                );
                if (found) setCurrentUser(found);
                if (found) setCurrentUser(found);
            } else {
                const mock = localStorage.getItem("mockUser");
                if (mock) {
                    // if possible let's just refresh next reload, but for now set mock
                    setCurrentUser(JSON.parse(mock));
                }
                else setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ── Real-time Notifications for Everyone ──────────────────────
    useEffect(() => {
        if (!currentUser || !mounted) return;

        const isUserAdmin = currentUser.role === "admin";
        const channel = supabase.channel('order_system_sync');
        channelRef.current = channel;

        // 1. Sincronizar los datos en silencio
        const handleOrderDataSync = (data: any) => {
            const { orderId, newStatus, reason } = data;
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    const nextStatus = (newStatus === "Cancelado" || newStatus === "cancelado") ? "cancelado" : newStatus;
                    // Limpiar la notificación de la campana si ya no es un pedido nuevo
                    if (nextStatus !== "solicitud recibida") {
                        setNotifications(prevNotif => prevNotif.filter(n => n.orderId !== orderId));
                    }
                    return { 
                        ...o, 
                        status: newStatus.toLowerCase().includes("pago") ? o.status : (nextStatus as any),
                        paymentStatus: (newStatus.toLowerCase().includes("pagado") || newStatus === "cancelado") ? (newStatus === "cancelado" ? "rechazado" : "pagado") : o.paymentStatus,
                        cancelationReason: reason || o.cancelationReason
                    };
                }
                return o;
            }));
        };

        // 2. Mostrar la notificación visual (Toast)
        const handleOrderNotification = (data: any) => {
            const { orderId, newStatus, customerName, reason, senderId } = data;
            
            console.log("🛎️ NOTIFICACION RECIBIDA:", { orderId, newStatus, senderId, me: currentUser?.id });

            // Si soy yo mismo quien hizo la accion (Admin cancelando su propio pedido por ej), no molesto con cartel
            if (senderId && senderId === currentUser?.id) {
                console.log("🚫 Notificación omitida por ser acción propia.");
                return;
            }

            // Normalización extrema para evitar fallos por espacios o mayúsculas
            const myName = String(currentUser?.username || "").trim().toLowerCase();
            const targetName = String(customerName || "").trim().toLowerCase();

            // REGLA DE ENVIO:
            // - Si soy admin, quiero ver TODO lo que pasa (menos lo mío)
            // - Si soy cliente, solo quiero ver lo que me pertenece
            const isRelevant = isUserAdmin || (targetName !== "" && targetName === myName);

            if (isRelevant) {
                console.log("✅ Mostrando Toast para pedido:", orderId);
                addSystemLog("info", `Realtime: Notificación de pedido recibida (#${orderId}) - Nuevo Estado: ${newStatus}${reason ? ` (Motivo: ${reason})` : ""}`);
                toast.info("Actualización de Pedido", {
                    id: `update-${orderId}-${newStatus}`,
                    description: `Pedido ${orderId}: ${newStatus}${reason ? ` - Motivo: ${reason}` : ""}`,
                    duration: 12000,
                    icon: "🔔"
                });
            }
        };

        const handleNewOrder = (orderData: any) => {
            if (!isUserAdmin) return;
            
            // Si el pedido lo cree yo mismo, no me notifico (evitar eco)
            if (orderData.senderId === currentUser?.id) return;

            const newOrder = dbToOrder(orderData);
            if (!newOrder.id) return;

            // Actualizar lista local si no esta
            setOrders(prev => {
                if (prev.some(n => n.id === newOrder.id)) return prev;
                return [newOrder, ...prev];
            });

            setNotifications(prev => {
                if (prev.some(n => n.orderId === newOrder.id)) return prev;
                const newNotif: AppNotification = {
                    id: `notif-${newOrder.id}-${Date.now()}`,
                    title: "Nuevo Pedido",
                    message: `Pedido de ${newOrder.customerName || 'Cliente'} por $${(newOrder.total || 0).toLocaleString("es-AR")}`,
                    date: new Date().toISOString(),
                    read: false,
                    orderId: newOrder.id
                };
                toast.success("Nuevo pedido recibido", {
                    id: `order-notif-${newOrder.id}`,
                    description: `De ${newOrder.customerName} - $${(newOrder.total || 0).toLocaleString("es-AR")}`,
                    action: { label: "Ver Pedido", onClick: () => window.location.href = "/pedidos-solicitud" },
                });
                return [newNotif, ...prev];
            });
        };

        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => handleNewOrder(payload.new))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updated = dbToOrder(payload.new);
                handleOrderDataSync({
                    orderId: updated.id,
                    newStatus: updated.status,
                    reason: updated.cancelationReason
                });
            })
            .on('broadcast', { event: 'order_created' }, ({ payload }) => handleNewOrder(payload))
            .on('broadcast', { event: 'order_updated' }, ({ payload }) => {
                handleOrderDataSync(payload);
                handleOrderNotification(payload);
            })
            .on('broadcast', { event: 'solicitud_mayorista' }, ({ payload }) => {
                if (isUserAdmin && payload.senderId !== currentUser?.id) {
                    toast.info("Nueva Solicitud Minorista", {
                        description: `${payload.username} ha enviado una postulación.`,
                        action: { label: "Ver Solicitudes", onClick: () => window.location.href = "/solicitudes-minoristas" },
                        duration: 10000,
                        icon: "🤝"
                    });
                    fetchSolicitudesMinoristas();
                }
            })
            .subscribe((status) => {
                if (status === 'TIMED_OUT') setTimeout(() => mounted && channel.subscribe(), 3000);
            });

        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.id, currentUser?.role, currentUser?.username, mounted]);

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
        await supabase.auth.signOut();
        localStorage.removeItem("mockUser");
        setCurrentUser(null);
    };

    // ── Productos ─────────────────────────────────────────────────
    const updateProducto = async (updated: Producto) => {
        setProductos(prev => prev.map(p => p.id === updated.id ? updated : p));
        await supabase.from("productos").upsert({
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
        });
    };

    const clearAllProductos = async () => {
        if (!confirm("¿ESTÁS COMPLETAMENTE SEGURO? Se borrarán todos los productos (lista de precios), incluyendo imágenes y stock configurado. Esta acción no se puede deshacer.")) {
            return;
        }
        setProductos([]);
        localStorage.removeItem("productos"); // Limpiamos memoria del navegador
        
        // Borramos en Supabase (filtro infalible: todos los menores de la Z o con ID)
        const { error } = await supabase.from("productos").delete().neq("id", "-1");
        
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
        await supabase.from("productos").delete().eq("id", id);
    };

    const addUsuario = async (user: Usuario) => {
        setUsuarios(prev => [user, ...prev]);
        await supabase.from("usuarios").insert({
            id: user.id,
            username: user.username,
            email: user.email,
            password: user.password,
            role: user.role,
            status: user.status,
            last_login: user.lastLogin || null,
        });
    };

    const updateUsuario = async (updated: Usuario) => {
        setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u));
        const { error } = await supabase.from("usuarios").upsert({
            id: updated.id,
            username: updated.username,
            email: updated.email,
            password: updated.password,
            role: updated.role,
            status: updated.status,
            last_login: updated.lastLogin || null,
        });
        if (error) {
            console.error("Error upserting usuario natively:", error);
            // Ignore missing column errors, but log others
        }
    };

    const deleteUsuario = async (id: string) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        await supabase.from("usuarios").delete().eq("id", id);
    };

    // ── Insumos e Inventario ──────────────────────────────────────
    const addInsumo = async (insumo: Insumo) => {
        setInsumos(prev => [insumo, ...prev]);
        await supabase.from("insumos").insert({
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
        await supabase.from("insumos").upsert({
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
        await supabase.from("insumos").delete().eq("id", id);
    };

    const addInventarioItem = async (item: InventarioItem) => {
        setInventario(prev => [item, ...prev]);
        const { error } = await supabase.from("inventario").insert({
            id: item.id,
            name: item.name,
            type: item.type,
            category: item.category,
            qty: item.qty,
            last_update: item.lastUpdate,
            unit: item.unit,
            gender: item.gender
        });
        if (error) {
            console.error("Error saving inventory item:", error);
            addSystemLog("error", "Error al guardar en inventario", error);
        }
    };

    const deleteInventarioItem = async (id: string) => {
        setInventario(prev => prev.filter(i => i.id !== id));
        await supabase.from("inventario").delete().eq("id", id);
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

        console.log("DEBUG: Sending order payload to Supabase:", payload);

        let { error } = await supabase.from("orders").insert(payload);

        // PGRST204: Column not found. Legacy schema fix.
        if (error && error.code === 'PGRST204') {
            const legacyPayload = { ...payload };
            delete (legacyPayload as any).payment_method;
            delete (legacyPayload as any).payment_status;
            const retryRes = await supabase.from("orders").insert(legacyPayload);
            error = retryRes.error;
        }

        if (error) {
            console.error("CRITICAL: Error inserting order into Supabase:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`Error crítico al guardar pedido en la base de datos.\n\nMensaje: ${error.message || 'Error desconocido'}\nCódigo: ${error.code || 'N/A'}`);

            // Rollback optimistic state
            setOrders(prev => prev.filter(o => o.id !== newId));

            addSystemLog("error", "Error crítico al guardar pedido", {
                orderId: newId,
                error
            });
        } else {
            addSystemLog("info", `Pedido ${newId} guardado correctamente en Supabase`);
            
            // Broadcast the event to all online users via Ref
            if (channelRef.current) {
                console.log("Broadcasting new order notification via persistent channel...");
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

        // Logical Trigger: Deduct stock when confirming
        if (order && status === "pedido confirmado" && order.status === "solicitud recibida") {
            const updatedInv = [...inventario];
            order.items.forEach(cartItem => {
                cartItem.producto.components.forEach(comp => {
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
                    }
                });
            });
            setInventario(updatedInv);
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        await supabase.from("orders").update({ status }).eq("id", orderId);
        
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
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus } : o));
        const { error } = await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
        
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
        
        const { error } = await supabase.from("orders").update({ 
            status: "cancelado",
            payment_status: "rechazado",
            cancelation_reason: reason 
        }).eq("id", orderId);

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
        await supabase.from("orders").delete().eq("id", orderId);
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
        await supabase.from("promociones").upsert({
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
        await supabase.from("promociones").delete().eq("id", id);
    };

    // ── Generate Products from Base ───────────────────────────────
    const generateProductsFromBase = async (baseId: string): Promise<{ created: number, updated: number }> => {
        return new Promise(async (resolve, reject) => {
            const base = bases.find(b => b.id === baseId);
            if (!base) return reject(new Error("Base no encontrada"));

            // OBTENER ESTADO FRESCO: Consultamos directamente para que el cálculo sea real
            const { data: dbProds, error: fetchErr } = await supabase.from("productos").select("*");
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
                        unitCost = source.cost / ((source as Insumo).qty || 1);
                    }

                    return acc + (unitCost * comp.qty);
                }, 0);

                const roundUpTo1000 = (num: number) => Math.ceil(num / 1000) * 1000;

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
                    cost,
                    price: isEsenciaConsultar ? 0 : roundUpTo1000(cost * margins.mayorista),
                    priceMinorista: isEsenciaConsultar ? 0 : roundUpTo1000(cost * margins.minorista),
                    stock: 0,
                    description: `Generado de base ${base.name}`,
                    gender: (isLimpiaPisos || isEsenciaAmbiente) ? (base.essenceGender || "Unisex") : (esc.gender || "Unisex"),
                    lastUpdate: lastUpdateStr,
                });
            });
            const toUpsert: any[] = [];
            let created = 0;
            let updated = 0;

            setProductos(prev => {
                const updatedList = [...prev];
                let nextIdNum = updatedList.reduce((max, p) => {
                    const num = parseInt(p.id);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0) + 1;

                newProductsGenerated.forEach(np => {
                    // Buscar esencia en el nuevo producto
                    const npEsc = np.components.find(c => c.type === "Esencia");
                    
                    // Buscar si ya existe un producto con esa misma base e ID de esencia
                    const existingIdx = currentProds.findIndex(p => {
                        const pEsc = p.components.find(c => c.type === "Esencia");
                        return p.baseId === np.baseId && pEsc && npEsc && pEsc.id === npEsc.id;
                    });

                    if (existingIdx >= 0) {
                        updated++;
                        const existing = currentProds[existingIdx];
                        const merged: Producto = {
                            ...np,
                            id: existing.id,
                            stock: (prev.find(p => p.id === existing.id)?.stock) || 0,
                            imageUrl: (prev.find(p => p.id === existing.id)?.imageUrl)
                        };
                        
                        const i = updatedList.findIndex(x => x.id === merged.id);
                        if (i >= 0) updatedList[i] = merged;
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

                const CHUNK_SIZE = 50;
                const uniqueUpsert = Object.values(toUpsert.reduce((acc, obj) => { acc[obj.id] = obj; return acc; }, {}));
                
                const processChunks = async () => {
                    for (let i = 0; i < uniqueUpsert.length; i += CHUNK_SIZE) {
                        const chunk = uniqueUpsert.slice(i, i + CHUNK_SIZE);
                        await supabase.from("productos").upsert(chunk);
                    }
                };

                processChunks();
                resolve({ created, updated });
                return updatedList;
            });
        });
    };

    // ── Sync state changes to Supabase ────────────────────────────
    const syncDiffToSupabase = (table: string, prev: any[], next: any[], mapFn: (item: any) => any) => {
        if (!mounted) return;

        // Create a map for O(1) lookups
        const prevMap = new Map(prev.map(p => [p.id, p]));
        const nextIds = new Set(next.map(n => n.id));

        const toDelete = prev.filter(p => !nextIds.has(p.id));
        const toUpsert = next.filter(n => {
            const p = prevMap.get(n.id);
            // If it doesn't exist, or reference changed and content changed
            if (!p) return true;
            if (p === n) return false;
            return JSON.stringify(p) !== JSON.stringify(n);
        });

        if (toDelete.length > 0) {
            supabase.from(table).delete().in("id", toDelete.map(d => d.id)).then(({ error }) => {
                if (error) {
                    console.error(`Delete ${table} error:`, error);
                    addSystemLog("error", `Error eliminando en ${table}`, { error });
                }
            });
        }
        if (toUpsert.length > 0) {
            const fullPayload = toUpsert.map(mapFn);
            supabase.from(table).upsert(fullPayload).then(async ({ error }) => {
                if (error) {
                    // Check if it's a missing column error (code: PGRST204 / 42703) BEFORE logging as error
                    // to avoid Next.js dev overlay from catching console.error for handled fallbacks.
                    if (error.code === 'PGRST204' || error.code === '42703') {
                        console.warn(`Attempting legacy fallback for ${table} due to missing columns...`);
                        const legacyPayload = fullPayload.map(item => {
                            const clone = { ...item };
                            delete clone.gender;
                            delete clone.last_update;
                            delete clone.payment_method;
                            delete clone.payment_status;
                            if (table === "bases") delete clone.category;
                            return clone;
                        });

                        const { error: retryError } = await supabase.from(table).upsert(legacyPayload);
                        if (!retryError) {
                            console.info(`Recovered ${table} upsert via legacy mode (some metadata might be lost). Please update DB schema.`);
                            return;
                        } else {
                            console.error(`Retry failed for ${table}:`, retryError);
                        }
                    } else {
                        console.error(`Upsert ${table} error:`, {
                            message: error.message,
                            code: error.code,
                            details: error.details,
                            table
                        });
                    }

                    addSystemLog("error", `Error guardando en ${table}`, {
                        error: error.message,
                        code: error.code,
                        table
                    });
                }
            });
        }
    };

    // Wrap state setters to sync diffs to Supabase
    const _setCategorias: typeof setCategorias = (value) => {
        setCategorias(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("categorias", prev, next, (c: Categoria) => ({ id: c.id, name: c.name, count: c.count }));
            return next;
        });
    };

    const _setProveedores: typeof setProveedores = (value) => {
        setProveedores(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("proveedores", prev, next, (p: Proveedor) => ({ id: p.id, name: p.name, contact: p.contact }));
            return next;
        });
    };

    const _setEsencias: typeof setEsencias = (value) => {
        setEsencias(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
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
            return next;
        });
    };

    const _setInsumos: typeof setInsumos = (value) => {
        setInsumos(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
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
            return next;
        });
    };

    const _setInventario: typeof setInventario = (value) => {
        setInventario(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("inventario", prev, next, (i: InventarioItem) => ({
                id: i.id,
                name: i.name,
                type: i.type,
                category: i.category,
                qty: i.qty,
                last_update: i.lastUpdate,
                unit: i.unit,
                gender: i.gender || null
            }));
            return next;
        });
    };

    const _setTransacciones: typeof setTransacciones = (value) => {
        setTransacciones(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("transacciones", prev, next, (t: Transaccion) => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                description: t.description,
                date: t.date,
            }));
            return next;
        });
    };

    const _setBases: typeof setBases = (value) => {
        setBases(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("bases", prev, next, (b: Base) => ({
                id: b.id,
                name: b.name,
                components: b.components,
                essence_gender: b.essenceGender ?? null,
                essence_grams: b.essenceGrams ?? null,
                category: b.category ?? null,
            }));
            return next;
        });
    };

    const _setProductos: typeof setProductos = (value) => {
        setProductos(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("productos", prev, next, (p: Producto) => ({
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
            }));
            return next;
        });
    };

    const _setUsuarios: typeof setUsuarios = (value) => {
        setUsuarios(prev => {
            const next = typeof value === "function" ? (value as any)(prev) : value;
            syncDiffToSupabase("usuarios", prev, next, (u: Usuario) => ({
                id: u.id,
                username: u.username,
                email: u.email,
                password: u.password,
                role: u.role,
                status: u.status,
                last_login: u.lastLogin || null,
            }));
            return next;
        });
    };

    // ── Scraper ───────────────────────────────────────────────────
    const runScraper = async () => {
        setScraperStatus(prev => ({ ...prev, status: "loading" }));
        try {
            const res = await fetch("/api/scrape");
            const data = await res.json();
            if (data.success) {
                const scrapedEsencias = (data.esencias as Esencia[]).map(e => ({ ...e, source: "scraped" as const }));

                _setEsencias(prev => {
                    // Limpieza agresiva nivel Dios: Normalizamos nombre quitando símbolos y espacios
                    const uniqueMap = new Map();
                    
                    const normalize = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

                    // Primero volcamos lo que ya tenemos
                    prev.forEach(e => {
                        const key = `${normalize(e.name)}_${(e.gender || "U").toUpperCase()}`;
                        uniqueMap.set(key, e);
                    });
                    
                    // Luego volcamos lo nuevo del scrapper (pisando duplicados por nombre normalizado)
                    scrapedEsencias.forEach(e => {
                        const key = `${normalize(e.name)}_${(e.gender || "U").toUpperCase()}`;
                        uniqueMap.set(key, e);
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
        const lastRunStr = scraperStatus.lastRun;
        const todayStr = new Date().toLocaleDateString(); // ej: "23/3/2026"
        
        // Solo corre si es un día distinto al guardado
        if (lastRunStr !== todayStr && scraperStatus.status === "idle") {
            runScraper();
        }
    }, [mounted, scraperStatus.lastRun, scraperStatus.status]);

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
        runScraper,
        login,
        currentUser,
        logout,
        generos,
        setGeneros,
        mounted,
        generateProductsFromBase,
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
