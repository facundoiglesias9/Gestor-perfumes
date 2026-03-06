"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Categoria = { id: string; name: string; count: number };
export type Proveedor = { id: string; name: string; contact: string };
export type Esencia = {
    id: string;
    name: string;
    category: string;
    provider: string;
    cost: number;
    qty: number;
    price30g?: number | "consultar";
    price100g?: number | "consultar";
    lastUpdate?: string;
    gender?: string;
    source?: "manual" | "scraped" | "captured";
};
export type Insumo = { id: string; name: string; category: string; provider: string; cost: number; qty: number; stock: number; unit: string };
export type InventarioItem = { id: string; name: string; type: string; category: string; qty: number; lastUpdate: string; unit: string; gender?: string };
export type Transaccion = { id: string; type: "Ingreso" | "Egreso"; amount: number; description: string; date: string };

export type BaseComponent = { id: string; name: string; qty: number; type: "Insumo" | "Esencia" };
export type Base = { id: string; name: string; components: BaseComponent[]; essenceGender?: string; essenceGrams?: number };
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
export type Usuario = { id: string; username: string; password?: string; role: UserRole; status: "Activo" | "Inactivo" };

export type PermissionLevel = "Editor" | "Solo lectura" | "Sin acceso";
export type CategoryPermissions = Record<string, PermissionLevel>;

export type OrderStatus = "solicitud recibida" | "pedido confirmado" | "en preparacion" | "listo para entregar";
export type CartItem = { producto: Producto; quantity: number; priceType: "mayorista" | "minorista" };
export type Order = {
    id: string;
    items: CartItem[];
    total: number;
    status: OrderStatus;
    customerName: string;
    date: string;
    paymentMethod: "qr" | "transferencia" | "efectivo" | "otro";
    paymentStatus: "pendiente" | "pagado" | "confirmacion_pendiente" | "rechazado";
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
        lastUpdate: row.last_update ?? undefined,
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
        password: row.password,
        role: row.role,
        status: row.status,
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
    clearCart: () => void;
    createOrder: (customerName: string, paymentMethod?: "qr" | "transferencia" | "efectivo") => void;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateOrderPaymentStatus: (orderId: string, status: Order["paymentStatus"]) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    runScraper: () => Promise<void>;
    login: (user: Usuario) => void;
    logout: () => void;
    generos: string[];
    setGeneros: React.Dispatch<React.SetStateAction<string[]>>;
    generateProductsFromBase: (baseId: string, targetCategory: string) => Promise<{ created: number, updated: number } | undefined>;
    getNextId: (items: any[], prefix: string) => string;
    categoryMargins: Record<string, { mayorista: number; minorista: number }>;
    setCategoryMargins: React.Dispatch<React.SetStateAction<Record<string, { mayorista: number; minorista: number }>>>;
    promotions: Promotion[];
    addPromotion: (promo: Promotion) => Promise<void>;
    deletePromotion: (id: string) => Promise<void>;
    paymentInfo: { alias: string; cbu: string; banco: string; mpAccessToken: string };
    setPaymentInfo: (info: { alias: string; cbu: string; banco: string; mpAccessToken: string }) => void;
    addSystemLog: (type: "info" | "error" | "db" | "auth", message: string, details?: any) => void;
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
    const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
    const [generos, setGeneros] = useState<string[]>(["Femenino", "Masculino", "Unisex"]);
    const [categoryMargins, setCategoryMargins] = useState<Record<string, { mayorista: number; minorista: number }>>({});
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [paymentInfo, setPaymentInfoState] = useState({
        alias: "SCENTA.PERFUMES",
        cbu: "0000003100012345678901",
        banco: "Galicia",
        mpAccessToken: "APP_USR-155495615252903-022714-99162d4f5251c6825a4e8a791ba32942-691652994"
    });

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // ── Global Logger with Realtime Broadcast ──────────────────────
    const addSystemLog = (type: "info" | "error" | "db" | "auth", message: string, details?: any) => {
        const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            details: details ? JSON.parse(JSON.stringify(details)) : null // Ensure serializable
        };

        // 1. Store locally for this machine
        try {
            const currentLogs = JSON.parse(localStorage.getItem("system_logs") || "[]");
            const updatedLogs = [newLog, ...currentLogs].slice(0, 100);
            localStorage.setItem("system_logs", JSON.stringify(updatedLogs));
        } catch (e) { }

        // 2. Broadcast via Supabase Realtime (Live Monitoring)
        const channel = supabase.channel('system_logs_broadcast', {
            config: { broadcast: { self: true } }
        });
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'new_log',
                    payload: newLog
                });
            }
        });

        // 3. Trigger UI update if on Logs page (internal state sync)
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

                // 2. Parallel fetch essential vs admin data
                const essentialRequests = [
                    supabase.from("categorias").select("*").order("name"),
                    supabase.from("productos").select("*").order("name"),
                    supabase.from("promociones").select("*"),
                ];

                const adminRequests = isAdmin ? [
                    supabase.from("proveedores").select("*").order("name"),
                    supabase.from("esencias").select("*").order("name"),
                    supabase.from("insumos").select("*").order("name"),
                    supabase.from("inventario").select("*").order("name"),
                    supabase.from("transacciones").select("*").order("created_at", { ascending: false }),
                    supabase.from("bases").select("*").order("name"),
                    supabase.from("usuarios").select("*").order("username"),
                    supabase.from("orders").select("*").order("created_at", { ascending: false }),
                ] : [];

                const results = await Promise.all([...essentialRequests, ...adminRequests]);

                const [catResult, prodResult, promoResult] = results;
                const [
                    provResult, escResult, insResult, invResult, transResult, basesResult, usersResult, ordersResult
                ] = isAdmin ? results.slice(3) : [null, null, null, null, null, null, null, null];

                // Diagnostic log for results array
                addSystemLog("info", "Resultados de peticiones paralelas recibidos", {
                    total_requests: results.length,
                    isAdmin_context: isAdmin
                });

                // Helper: use Supabase if available, else localStorage. Returns {data, fromLS}
                const resolve = <T,>(result: { data: any[] | null; error: any } | null, lsKey: string, mapper: (r: any) => T, fallback: T[] = []): { data: T[]; fromLS: boolean } => {

                    if (result && !result.error && result.data !== null) {
                        addSystemLog("db", `Carga exitosa: ${lsKey} de Supabase`, { count: result.data.length });
                        return { data: result.data.map(mapper), fromLS: false };
                    }

                    if (result?.error) {
                        console.error(`Error fetching ${lsKey} from Supabase:`, result.error);
                        addSystemLog("error", `Fallo en Supabase (${lsKey})`, {
                            message: result.error?.message || "Error desconocido",
                            code: result.error?.code,
                            details: result.error?.details
                        });
                    } else if (result && result.data === null) {
                        addSystemLog("error", `Supabase devolvió DATA NULL para ${lsKey}`);
                    }

                    const stored = localStorage.getItem(lsKey);
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            addSystemLog("info", `Cargando ${lsKey} desde LocalStorage (fallback)`);
                            return { data: parsed as T[], fromLS: true };
                        } catch (e) {
                            addSystemLog("error", `Error parseando LocalStorage para ${lsKey}`, e);
                        }
                    }

                    addSystemLog("info", `Usando fallback vacío para ${lsKey}`);
                    return { data: fallback, fromLS: false };
                };

                // Essential data
                const catRes = resolve(catResult, "categorias", (r) => ({ id: r.id, name: r.name, count: r.count ?? 0 } as Categoria), [{ id: "1", name: "Perfumería Fina", count: 0 }, { id: "2", name: "Perfumes de Ambiente", count: 0 }]);
                const rawProdsRes = resolve(prodResult, "productos", dbToProducto, []);
                const promoData = resolve(promoResult, "promociones", (r) => ({ id: r.id, productId: r.product_id, discountPercentage: r.discount_percentage, isActive: r.is_active, endDate: r.end_date } as Promotion), []);

                const sanitizedProducts = rawProdsRes.data.map((p, index) => ({
                    ...p,
                    id: p.id || (index + 1).toString().padStart(3, "0"),
                    priceMinorista: p.priceMinorista ?? (p.price * 1.5)
                }));

                setCategorias(catRes.data);
                setProductos(sanitizedProducts);
                setPromotions(promoData.data);

                // Admin-only data (load if admin, else use empty/local)
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
                } else if (!isAdmin && resolvedUser) {
                    // Wholesalers/Retailers only need THEIR orders
                    const { data: ownOrders } = await supabase.from("orders").select("*").eq("customer_name", resolvedUser.username).order("created_at", { ascending: false });
                    if (ownOrders) setOrders(ownOrders.map(dbToOrder));
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

            } finally {
                setIsLoading(false);
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
        localStorage.setItem("globalPermissions", JSON.stringify(globalPermissions));
    }, [globalPermissions, mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("generos", JSON.stringify(generos));
    }, [generos, mounted]);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("categoryMargins", JSON.stringify(categoryMargins));
    }, [categoryMargins, mounted]);

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

    const deleteProducto = async (id: string) => {
        setProductos(prev => prev.filter(p => p.id !== id));
        await supabase.from("productos").delete().eq("id", id);
    };

    // ── Usuarios ──────────────────────────────────────────────────
    const addUsuario = async (user: Usuario) => {
        setUsuarios(prev => [user, ...prev]);
        await supabase.from("usuarios").insert({
            id: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            status: user.status,
        });
    };

    const updateUsuario = async (updated: Usuario) => {
        setUsuarios(prev => prev.map(u => u.id === updated.id ? updated : u));
        await supabase.from("usuarios").upsert({
            id: updated.id,
            username: updated.username,
            password: updated.password,
            role: updated.role,
            status: updated.status,
        });
    };

    const deleteUsuario = async (id: string) => {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        await supabase.from("usuarios").delete().eq("id", id);
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

    const clearCart = () => setCart([]);

    const createOrder = async (customerName: string, paymentMethod: "qr" | "transferencia" | "efectivo" | "otro" = "efectivo") => {
        const total = cart.reduce((acc, item) => {
            const price = item.priceType === "mayorista" ? item.producto.price : item.producto.priceMinorista;
            return acc + (price * item.quantity);
        }, 0);

        const finalCustomerName = (currentUser && currentUser.role !== "admin")
            ? currentUser.username
            : customerName;

        const newId = genId("ORD-");
        const newOrder: Order = {
            id: newId,
            items: [...cart],
            total,
            customerName: finalCustomerName,
            status: "solicitud recibida",
            date: new Date().toLocaleDateString(),
            paymentMethod,
            paymentStatus: paymentMethod === 'transferencia' ? 'confirmacion_pendiente' : 'pendiente'
        };
        localStorage.setItem("lastCreatedOrderId", newId);
        setOrders(prev => [newOrder, ...prev]);
        clearCart();

        await supabase.from("orders").insert({
            id: newId,
            items: newOrder.items,
            total: newOrder.total,
            customer_name: newOrder.customerName,
            status: newOrder.status,
            date: newOrder.date,
            payment_method: newOrder.paymentMethod,
            payment_status: newOrder.paymentStatus
        });
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
            _setInventario(updatedInv);
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        await supabase.from("orders").update({ status }).eq("id", orderId);
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
            _setTransacciones(prev => [newTransaction, ...prev]);
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus } : o));
        await supabase.from("orders").update({ payment_status: paymentStatus }).eq("id", orderId);
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
    const generateProductsFromBase = async (baseId: string, targetCategory: string) => {
        const base = bases.find(b => b.id === baseId);
        if (!base) return;

        // Filtramos esencias válidas. Para Limpia Pisos, checkeamos costo>0. Para otros, price100g>0
        const validEsencias = esencias.filter(e => {
            if (base.essenceGender?.toLowerCase() === "limpia pisos") {
                return e.cost && e.cost > 0;
            }
            const p = parseFloat(e.price100g as any);
            return !isNaN(p) && p > 0;
        });

        const targetEsencias = base.essenceGender && base.essenceGender !== "Todos"
            ? validEsencias.filter(e => {
                if (base.essenceGender?.toLowerCase() === "limpia pisos") {
                    const expectedCategory = base.name.includes("5L") ? "limpia pisos 5l" : "limpia pisos 1l";
                    return e.category?.toLowerCase() === expectedCategory;
                }
                return e.gender === base.essenceGender;
            })
            : validEsencias;

        const now = new Date();
        const lastUpdateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;

        const newProductsGenerated: Producto[] = [];

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
                    const p30 = parseFloat(e.price30g as any);
                    if (!isNaN(p100) && p100 > 0) unitCost = p100 / 100;
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
                .trim();

            if (base.essenceGender?.toLowerCase() === "limpia pisos") {
                const is5L = base.name.includes("5L");
                cleanName += is5L ? " 5L" : " 1L";
            }

            const margins = categoryMargins[targetCategory] || { mayorista: 1.5, minorista: 2.0 };

            newProductsGenerated.push({
                id: "", // will be assigned below
                name: cleanName,
                category: targetCategory,
                baseId: base.id,
                components: formula,
                cost,
                price: roundUpTo1000(cost * margins.mayorista),
                priceMinorista: roundUpTo1000(cost * margins.minorista),
                stock: 0,
                description: `Generado de base ${base.name}`,
                gender: esc.gender || "Unisex",
                lastUpdate: lastUpdateStr,
            });
        });

        // Merge with existing, upsert to Supabase
        return new Promise<{ created: number, updated: number }>((resolve) => {
            setProductos(prev => {
                const updatedList = [...prev];
                let nextIdNum = updatedList.reduce((max, p) => {
                    const num = parseInt(p.id);
                    return isNaN(num) ? max : Math.max(max, num);
                }, 0) + 1;

                const toUpsert: any[] = [];
                let created = 0;
                let updated = 0;

                newProductsGenerated.forEach(np => {
                    const normStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    const npName = normStr(np.name);
                    const npCat = normStr(np.category);
                    const npGen = normStr(np.gender);

                    const existingIdx = updatedList.findIndex(p =>
                        normStr(p.name) === npName &&
                        normStr(p.category) === npCat &&
                        normStr(p.gender) === npGen
                    );

                    if (existingIdx >= 0) {
                        updated++;
                        const existing = updatedList[existingIdx];
                        const merged = {
                            ...existing,
                            components: np.components,
                            cost: np.cost,
                            baseId: np.baseId,
                            gender: np.gender,
                            lastUpdate: np.lastUpdate
                        };
                        updatedList[existingIdx] = merged;
                        toUpsert.push({
                            id: merged.id,
                            name: merged.name,
                            category: merged.category,
                            base_id: merged.baseId,
                            components: merged.components,
                            cost: merged.cost,
                            price: merged.price, // Keep existing user-edited prices
                            price_minorista: merged.priceMinorista, // Keep existing user-edited prices
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

                // Fire-and-forget upsert
                if (toUpsert.length > 0) {
                    supabase.from("productos").upsert(toUpsert).then(({ error }) => {
                        if (error) console.error("Error saving productos:", error);
                    });
                }

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
                if (error) console.error(`Delete ${table} error:`, error);
            });
        }
        if (toUpsert.length > 0) {
            supabase.from(table).upsert(toUpsert.map(mapFn)).then(({ error }) => {
                if (error) console.error(`Upsert ${table} error:`, error);
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
                password: u.password,
                role: u.role,
                status: u.status,
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
                    const existingNonScraped = prev.filter(e => e.source !== "scraped" && !e.id.startsWith("VR-"));
                    return [...scrapedEsencias, ...existingNonScraped];
                });

                const newStatus: ScraperStatus = { lastRun: new Date().toLocaleString(), status: "success" };
                setScraperStatus(newStatus);
                localStorage.setItem("scraperStatus", JSON.stringify(newStatus));
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            const newStatus: ScraperStatus = { lastRun: new Date().toLocaleString(), status: "failure", message: error.message };
            setScraperStatus(newStatus);
            localStorage.setItem("scraperStatus", JSON.stringify(newStatus));
        }
    };

    useEffect(() => {
        if (!mounted) return;
        const lastDate = scraperStatus.lastRun ? new Date(scraperStatus.lastRun).toLocaleDateString() : "";
        const today = new Date().toLocaleDateString();
        if (lastDate !== today && scraperStatus.status === "idle") {
            runScraper();
        }
    }, [mounted, scraperStatus.lastRun, scraperStatus.status]);

    if (!mounted) {
        return <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]"></div>;
    }

    return (
        <AppContext.Provider value={{
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
            clearCart,
            createOrder,
            updateOrderStatus,
            updateOrderPaymentStatus,
            deleteOrder,
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
            addSystemLog
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useAppContext must be used within an AppProvider");
    }
    return context;
}
