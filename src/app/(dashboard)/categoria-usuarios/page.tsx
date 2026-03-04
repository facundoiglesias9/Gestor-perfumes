"use client";

import { Shield, ShieldCheck, Store, Tags, Lock, Eye, Edit3, Save, ChevronRight, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAppContext, UserRole, PermissionLevel } from "@/context/AppContext";

export default function CategoriaUsuariosPage() {
    const { globalPermissions, updatePermissions, usuarios } = useAppContext();
    const [selectedRole, setSelectedRole] = useState<UserRole>("minorista");
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const roles: { id: UserRole, label: string, icon: any, color: string, description: string }[] = [
        {
            id: "admin",
            label: "Administrador",
            icon: ShieldCheck,
            color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10",
            description: "Acceso total a todas las funciones del sistema, inventario, finanzas y configuración."
        },
        {
            id: "mayorista",
            label: "Revendedor Mayorista",
            icon: Tags,
            color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
            description: "Perfil orientado a revendedores que compran por volumen. Acceso a dashboard de ventas y notas."
        },
        {
            id: "minorista",
            label: "Cliente Minorista",
            icon: Store,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
            description: "Acceso limitado a lista de precios minorista y realización de pedidos de consumo final."
        }
    ];

    const currentPerms = globalPermissions[selectedRole];
    const userCount = usuarios.filter(u => u.role === selectedRole).length;

    const handlePermissionChange = (module: string, level: PermissionLevel) => {
        const newPerms = { ...currentPerms, [module]: level };
        updatePermissions(selectedRole, newPerms);
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API delay as it saves to localStorage/context
        setTimeout(() => {
            setIsSaving(false);
            setSuccessMessage(`Permisos para ${selectedRole} actualizados correctamente.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        }, 800);
    };

    const getPermissionIcon = (level: PermissionLevel) => {
        switch (level) {
            case "Editor": return <Edit3 className="w-4 h-4 text-indigo-500" />;
            case "Solo lectura": return <Eye className="w-4 h-4 text-emerald-500" />;
            case "Sin acceso": return <Lock className="w-4 h-4 text-slate-400" />;
        }
    };

    const getPermissionBg = (level: PermissionLevel) => {
        switch (level) {
            case "Editor": return "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20";
            case "Solo lectura": return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20";
            case "Sin acceso": return "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800";
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
                        <Shield className="w-3.5 h-3.5" />
                        Seguridad y Roles
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 transition-colors">
                        Categoría de Usuarios
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl leading-relaxed font-medium transition-colors">
                        Gestioná los niveles de acceso y permisos para cada tipo de usuario en el sistema.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Roles Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Tipos de Usuario</h2>
                    {roles.map((role) => {
                        const Icon = role.icon;
                        const isSelected = selectedRole === role.id;

                        return (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full text-left p-6 rounded-[2rem] border transition-all duration-300 group relative overflow-hidden ${isSelected
                                        ? "bg-white dark:bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500"
                                        : "bg-white/50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                            >
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className={`p-4 rounded-2xl transition-transform duration-500 ${role.color} ${isSelected ? "scale-110" : "group-hover:scale-110"}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`font-black text-lg ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                                                {role.label}
                                            </h3>
                                            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSelected ? "translate-x-0 opacity-100 text-indigo-500" : "-translate-x-2 opacity-0"}`} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Users className="w-3 h-3" />
                                            {usuarios.filter(u => u.role === role.id).length} Usuarios
                                        </p>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Permissions Panel */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Panel de Permisos</h2>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${roles.find(r => r.id === selectedRole)?.color}`}>
                                        {selectedRole}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                                    {roles.find(r => r.id === selectedRole)?.description}
                                </p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving || selectedRole === "admin"}
                                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
                            >
                                {isSaving ? "Guardando..." : "Guardar Cambios"}
                                <Save className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedRole === "admin" && (
                            <div className="p-8 m-10 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 flex items-start gap-5">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-indigo-600">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-indigo-900 dark:text-indigo-300 font-black text-lg">Rol Inalterable</h4>
                                    <p className="text-indigo-700 dark:text-indigo-400/80 font-medium leading-relaxed">
                                        El rol de Administrador tiene acceso total por defecto y no puede ser modificado para evitar bloqueos accidentales del sistema.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="p-8 overflow-y-auto max-h-[500px] custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(currentPerms).map(([module, level]) => (
                                    <div
                                        key={module}
                                        className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${getPermissionBg(level as PermissionLevel)}`}
                                    >
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white capitalize mb-1">{module}</h4>
                                            <div className="flex items-center gap-2">
                                                {getPermissionIcon(level as PermissionLevel)}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {level}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedRole !== "admin" && (
                                            <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 p-1.5 rounded-2xl border border-white/50 dark:border-white/5">
                                                {(["Sin acceso", "Solo lectura", "Editor"] as PermissionLevel[]).map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => handlePermissionChange(module, p)}
                                                        className={`p-2 rounded-xl transition-all ${level === p
                                                                ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 ring-1 ring-slate-200 dark:ring-slate-700"
                                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            }`}
                                                        title={p}
                                                    >
                                                        {p === "Sin acceso" ? <Lock className="w-4 h-4" /> : p === "Solo lectura" ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {successMessage && (
                            <div className="p-4 mx-8 mb-8 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-bold">{successMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
