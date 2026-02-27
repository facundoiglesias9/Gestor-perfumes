"use client";

import { Shield, Save, CheckCircle2, AlertCircle, ShieldAlert, Store, Tags, Lock, Eye, Edit3 } from "lucide-react";
import { useState } from "react";
import { useAppContext, UserRole, PermissionLevel, CategoryPermissions } from "@/context/AppContext";

const sections = [
    { key: "mayorista", label: "Lista Mayorista" },
    { key: "minorista", label: "Lista Minorista" },
    { key: "bases", label: "Bases de Productos" },
    { key: "pedidos", label: "Pedido Mayorista" },
    { key: "inventario", label: "Inventario Físico" },
    { key: "insumos", label: "Insumos" },
    { key: "esencias", label: "Esencias" },
    { key: "caja", label: "Caja Unificada" },
    { key: "proveedores", label: "Proveedores" },
    { key: "categorias", label: "Categorías" },
    { key: "usuarios", label: "Gestión de Usuarios" },
    { key: "roles", label: "Categoría de Usuarios" },
    { key: "permisos", label: "Lista de Permisos" },
];

export default function ListaPermisosPage() {
    const { globalPermissions, updatePermissions } = useAppContext();
    const [successMessage, setSuccessMessage] = useState(false);

    const handleLevelChange = (role: UserRole, sectionKey: string, level: PermissionLevel) => {
        const currentPerms = { ...globalPermissions[role] };
        currentPerms[sectionKey] = level;
        updatePermissions(role, currentPerms);

        setSuccessMessage(true);
        setTimeout(() => setSuccessMessage(false), 2000);
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case "admin": return <ShieldAlert className="w-5 h-5 text-purple-500" />;
            case "minorista": return <Store className="w-5 h-5 text-emerald-500" />;
            case "mayorista": return <Tags className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Lock className="w-3.5 h-3.5" />
                        Seguridad y Accesos
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Lista de Permisos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Configurá qué secciones son solo de lectura o editables para cada rol.
                    </p>
                </div>

                {successMessage && (
                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold animate-in fade-in slide-in-from-right-4">
                        <CheckCircle2 className="w-5 h-5" />
                        Cambios guardados
                    </div>
                )}
            </header>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-10 py-8 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sección / Pestaña</th>
                            {(["admin", "minorista", "mayorista"] as UserRole[]).map(role => (
                                <th key={role} className="px-10 py-8 text-center min-w-[200px]">
                                    <div className="flex flex-col items-center gap-2">
                                        {getRoleIcon(role)}
                                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{role}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sections.map((section) => (
                            <tr key={section.key} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                <td className="px-10 py-6">
                                    <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">{section.label}</p>
                                    <p className="text-xs text-slate-400 font-medium tracking-tight">Clave: {section.key}</p>
                                </td>
                                {(["admin", "minorista", "mayorista"] as UserRole[]).map(role => {
                                    const currentLevel = globalPermissions[role][section.key] || "Sin acceso";
                                    return (
                                        <td key={role} className="px-6 py-6 text-center">
                                            <div className="flex justify-center">
                                                <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
                                                    <button
                                                        onClick={() => handleLevelChange(role, section.key, "Sin acceso")}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all ${currentLevel === "Sin acceso"
                                                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            }`}
                                                    >
                                                        <Lock className="w-3.5 h-3.5" />
                                                        BLOQUEO
                                                    </button>
                                                    <button
                                                        onClick={() => handleLevelChange(role, section.key, "Solo lectura")}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all ${currentLevel === "Solo lectura"
                                                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            }`}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        LECTURA
                                                    </button>
                                                    <button
                                                        onClick={() => handleLevelChange(role, section.key, "Editor")}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all ${currentLevel === "Editor"
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            }`}
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        EDITOR
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-[2rem] p-8 flex items-start gap-6">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-indigo-500">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Funcionamiento de Permisos</h4>
                    <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-3xl">
                        Los permisos definen si el usuario puede realizar acciones de escritura (crear, editar, borrar) o si solamente tiene acceso visual a los datos. Los cambios se aplican globalmente a todos los usuarios del rol seleccionado de forma inmediata.
                    </p>
                </div>
            </div>
        </div>
    );
}
