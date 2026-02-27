"use client";

import { Tags, Plus, Search, Layers, UserCheck, ShieldCheck, ShoppingBag, Eye, Lock, ShieldAlert, Store } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function CategoriasUsuariosPage() {
    const { usuarios } = useAppContext();

    const rolesInfo = [
        {
            id: "admin",
            name: "Administrador (Admin)",
            count: usuarios.filter(u => u.role === 'admin').length,
            permissions: ["Gestión Total", "Costos y Bases", "Caja Unificada", "Configuración de Sistema"],
            color: "bg-purple-500",
            icon: <ShieldAlert className="w-6 h-6" />
        },
        {
            id: "minorista",
            name: "Vendedor Minorista",
            count: usuarios.filter(u => u.role === 'minorista').length,
            permissions: ["Ventas Minoristas", "Ver Precios Minoristas", "Inventario Físico (Lectura)"],
            color: "bg-emerald-500",
            icon: <Store className="w-6 h-6" />
        },
        {
            id: "mayorista",
            name: "Vendedor Mayorista",
            count: usuarios.filter(u => u.role === 'mayorista').length,
            permissions: ["Ventas Mayoristas", "Ver Precios Mayoristas", "Pedidos Mayoristas"],
            color: "bg-blue-500",
            icon: <Tags className="w-6 h-6" />
        },
    ];

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Lock className="w-3.5 h-3.5" />
                        Roles del Sistema
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Categorías de Usuarios
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Definí los niveles de acceso para Admin, Minorista y Mayorista.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {rolesInfo.map((role) => (
                    <div key={role.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden flex flex-col min-h-[450px]">
                        {/* Status Light */}
                        <div className="absolute top-8 right-8 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${role.color} animate-pulse`}></div>
                            <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">{role.id}</span>
                        </div>

                        <div className={`w-16 h-16 rounded-2xl ${role.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                            <div className={`${role.color.replace('bg-', 'text-')} dark:text-white`}>
                                {role.icon}
                            </div>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{role.name}</h3>
                        <p className="text-sm font-bold text-slate-400 mb-8 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> {role.count} Usuarios activos en este rol
                        </p>

                        <div className="space-y-4 flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Capacidades del Perfil</p>
                            <div className="grid grid-cols-1 gap-2">
                                {role.permissions.map((perm, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group-hover:border-indigo-500/20 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                            {perm}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Inmutable del Sistema</span>
                            <div className="p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-not-allowed">
                                <Lock className="w-4 h-4 text-slate-200 dark:text-slate-800" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-[2rem] p-8 flex items-start gap-5">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-amber-500">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">Nota de Seguridad</h4>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                        Los roles de Administrador, Minorista y Mayorista son la base del sistema. Sus permisos están pre-configurados para asegurar el correcto flujo de costos y ventas.
                    </p>
                </div>
            </div>
        </div>
    );
}
