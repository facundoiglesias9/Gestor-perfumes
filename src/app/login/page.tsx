"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { KeyRound, User, Loader2 } from "lucide-react";
import Link from "next/link";

import { useAppContext } from "@/context/AppContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
    const { login, usuarios } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Check App Context Users
        if (usuarios && usuarios.length > 0) {
            const foundUser = usuarios.find((u: any) =>
                (u.username || "").toLowerCase() === email.toLowerCase() &&
                u.password === password
            );

            if (foundUser) {
                if (foundUser.status === "Inactivo") {
                    setError("Tu cuenta está inactiva. Contactá al administrador.");
                    setLoading(false);
                    return;
                }

                // Calculate their specific redirect path based on their role
                let targetPath = "/";
                if (foundUser.role === "admin") targetPath = "/dashboard";
                else if (foundUser.role === "mayorista") targetPath = "/lista-mayorista";
                else if (foundUser.role === "minorista") targetPath = "/minorista";

                // Actualiza el estado GLOBAL de la app antes de navegar
                login(foundUser);
                setLoading(false);

                // Forzamos recarga para que el AppContext levante la nueva sesión limpiamente
                window.location.href = targetPath;
                return;
            }
        }

        // 2. Fallback for primary admin 'facundo' if not in list
        if (email === "facundo" && password === "admin123") {
            const adminUser = { id: "admin-facu", username: "facundo", role: "admin" as const, status: "Activo" as const };
            login(adminUser);
            setLoading(false);
            window.location.href = "/dashboard";
            return;
        }

        // 3. Try searching the custom 'usuarios' table (for non-admin users on new machines)
        try {
            const { data: dbUser, error: dbError } = await supabase
                .from("usuarios")
                .select("*")
                .ilike("username", email)
                .eq("password", password)
                .single();

            if (!dbError && dbUser) {
                if (dbUser.status === "Inactivo") {
                    setError("Tu cuenta está inactiva. Contactá al administrador.");
                    setLoading(false);
                    return;
                }

                const foundUser = {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role as any,
                    status: dbUser.status as any
                };

                // Calculate their specific redirect path based on their role
                let targetPath = "/";
                if (foundUser.role === "admin") targetPath = "/dashboard";
                else if (foundUser.role === "mayorista") targetPath = "/lista-mayorista";
                else if (foundUser.role === "minorista") targetPath = "/minorista";

                login(foundUser);
                setLoading(false);

                // Forzamos recarga para inicializar AppContext con el nuevo usuario
                window.location.href = targetPath;
                return;
            }
        } catch (err) {
            console.error("Error searching custom table:", err);
        }

        // 4. Try Supabase Auth as last resort (for production users)
        try {
            const { data, error: sbError } = await supabase.auth.signInWithPassword({
                email, // Supabase expects email format
                password,
            });

            if (!sbError) {
                // Supabase flow will trigger onAuthStateChange in AppContext
                window.location.href = "/dashboard"; // Fallback to let middleware/layout handle it
                return;
            }

            // If it reached here and didn't find a mock user, it's a real failure
            setError("Credenciales incorrectas.");
        } catch (err) {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-[#0f172a] transition-colors duration-500">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

            {/* Theme Toggle in Corner */}
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl z-10 mx-4 transition-all flex flex-col gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600" />

                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
                        Scenta <span className="text-indigo-600">Admin</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Acceso al Sistema Gestión</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Usuario</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Ingresá tu usuario"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/50 rounded-2xl text-rose-500 text-xs font-black uppercase tracking-wider text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ingresar"}
                    </button>
                </form>

                <div className="space-y-4 pt-2">
                    <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        ¿No tenés cuenta? <Link href="/registrarse" className="text-indigo-600 dark:text-indigo-400 hover:underline">Registrate gratis</Link>
                    </p>

                    <Link
                        href="/"
                        className="w-full py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-center gap-3 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all opacity-80"
                    >
                        Ver Catálogo Público
                    </Link>
                </div>
            </div>
        </div>
    );
}
