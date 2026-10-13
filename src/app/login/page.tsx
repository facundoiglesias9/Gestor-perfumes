"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MotionConfig, motion, AnimatePresence } from "framer-motion";
import { KeyRound, User, Eye, EyeOff, TriangleAlert, ArrowRight } from "lucide-react";
import { iniciarSesion, iniciarSesionConGoogle } from "@/lib/auth-actions";
import type { UsuarioSesion } from "@/lib/sesion";

import { useAppContext, type UserRole } from "@/context/AppContext";
import BotonLiquido, { type EstadoBotonLiquido } from "@/components/BotonLiquido";
import BotonGoogle from "@/components/BotonGoogle";

// Textura de grano muy suave para el fondo (ruido SVG, sin imágenes externas)
const GRANO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CAMPO = "campo-ingreso w-full h-12 rounded-xl bg-[#121411] border border-white/[0.08] pl-11 text-base sm:text-[15px] text-[#F4EFEA] placeholder:text-[#F4EFEA]/25 outline-none focus:border-[#A3B69B]/60 focus:ring-4 focus:ring-[#A3B69B]/10 transition-[border-color,box-shadow] duration-150";
const SALIDA = [0.23, 1, 0.32, 1] as const;

// Momentos de la pantalla:
//  cerrado  → solo el botón "Iniciar sesión"
//  abierto  → los campos salieron del botón y se completan
//  enviando → los campos se meten de vuelta en el botón mientras se revisan los datos
type Fase = "cerrado" | "abierto" | "enviando";

// Cuánto tardan los campos en meterse en el botón (se espera a que termine antes de mostrar el resultado)
const DURACION_UNION = 560;

export default function LoginPage() {
    const { login, addSystemLog, currentUser, mounted } = useAppContext();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fase, setFase] = useState<Fase>("cerrado");
    const [estado, setEstado] = useState<EstadoBotonLiquido>("reposo");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (mounted && currentUser) {
            router.replace("/lista-precios");
        }
    }, [currentUser, mounted, router]);

    // La contraseña se revisa en el servidor; si es correcta, el servidor abre la sesión (cookie).
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fase !== "abierto") { setFase("abierto"); return; }
        if (estado === "cargando" || estado === "listo") return;
        setFase("enviando");
        setEstado("cargando");
        setError(null);

        const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const usuario = email.trim();
        const [resultado] = await Promise.all([
            iniciarSesion(usuario, password),
            new Promise(r => setTimeout(r, sinMovimiento ? 0 : DURACION_UNION)),
        ]);

        if (!resultado.ok) {
            setError(resultado.error);
            setEstado("error");
            setFase("abierto");
            addSystemLog("auth", `Intento de inicio de sesión fallido para: ${usuario}`);
            return;
        }

        terminarIngreso(resultado.dato!);
    };

    // Ingreso con Google: no abre los campos; el botón de metal muestra "Ingresando…" y después la gota
    const entrarConGoogle = async (credencial: string) => {
        if (estado === "cargando" || estado === "listo") return;
        setEstado("cargando");
        setError(null);
        const resultado = await iniciarSesionConGoogle(credencial);
        if (!resultado.ok) {
            setError(resultado.error);
            setEstado("error");
            addSystemLog("auth", "Intento de ingreso con Google rechazado");
            return;
        }
        terminarIngreso(resultado.dato!);
    };

    const terminarIngreso = (u: UsuarioSesion) => {
        if (u.username.toLowerCase() !== "facundo") {
            addSystemLog("auth", `Inicio de sesión exitoso: ${u.username} (${u.role})`);
        }
        setEstado("listo");
        // Se deja ver la animación de la gota y recién ahí entra (sin animaciones, entra al instante)
        const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        setTimeout(() => {
            login({ id: u.id, username: u.username, role: u.role as UserRole, status: "Activo", lastLogin: u.lastLogin });
            // Recarga completa para que el sistema arranque con la sesión nueva
            window.location.href = "/lista-precios";
        }, sinMovimiento ? 0 : 1250);
    };

    const abierto = fase === "abierto";

    return (
        <MotionConfig reducedMotion="user">
            <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-[#121411] text-[#F4EFEA] px-4 py-6">
                {/* Escena: penumbra, grano y la luz de la lámpara */}
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,#252A24_0%,#151814_52%,#0D0F0C_100%)]" />
                <div aria-hidden className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none" style={{ backgroundImage: GRANO }} />
                <div aria-hidden className="login-luz absolute left-1/2 top-[14%] -translate-x-1/2 w-[640px] max-w-[140vw] h-[420px] rounded-full bg-[#F2D79B]/[0.08] blur-[90px] pointer-events-none" />

                <motion.main
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: SALIDA }}
                    className="relative w-full max-w-[400px]"
                >
                    {/* La lámpara: una luz cálida que late suave, con el logo adentro */}
                    <div className="relative z-10 flex justify-center -mb-8">
                        <div className="relative">
                            <span aria-hidden className="login-halo absolute -inset-5 rounded-full bg-[#F6E3B4]/45 blur-2xl" />
                            <motion.div
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 14 }}
                                className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(246,227,180,0.35)]"
                                style={{ background: "radial-gradient(circle at 38% 30%, #FFFDF5 0%, #F7E7BE 40%, #DDBB73 100%)" }}
                            >
                                <Image src="/logo-scenta.png" alt="" width={24} height={37} priority className="mix-blend-multiply opacity-85" />
                            </motion.div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.07] bg-[#1B1E1A]/90 backdrop-blur-xl shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] px-7 pt-12 pb-6 sm:px-9">
                        {/* La luz de la lámpara cae sobre la tarjeta */}
                        <div aria-hidden className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(242,215,155,0.14),transparent_70%)] pointer-events-none" />

                        <div className="relative text-center">
                            <h1 className="font-brand text-[28px] leading-tight font-bold tracking-tight">Scenta</h1>
                            <p className="mt-1 text-sm text-[#F4EFEA]/55">Ingresá para gestionar tu negocio</p>
                        </div>

                        <form onSubmit={handleLogin} className="relative mt-6">
                            {/* Los campos salen del botón al abrir y se vuelven a meter en él al ingresar */}
                            <AnimatePresence initial={false}>
                                {abierto && (
                                    <motion.div
                                        key="campos"
                                        id="campos-ingreso"
                                        initial={{ height: 0 }}
                                        animate={{ height: "auto", transition: { duration: 0.5, ease: SALIDA } }}
                                        exit={{ height: 0, transition: { duration: 0.42, delay: 0.14, ease: [0.65, 0, 0.35, 1] } }}
                                        className="overflow-hidden -mx-2 px-2"
                                    >
                                        <div className="space-y-3 pb-5">
                                            <Campo orden={0}>
                                                <label className="block">
                                                    <span className="mb-1 block text-[13px] font-medium text-[#F4EFEA]/70">Usuario</span>
                                                    <span className="relative block">
                                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#F4EFEA]/45 pointer-events-none" aria-hidden />
                                                        <input
                                                            type="text"
                                                            placeholder="Tu usuario"
                                                            value={email}
                                                            onChange={(e) => { setEmail(e.target.value); if (estado === "error") setEstado("reposo"); }}
                                                            autoCapitalize="none"
                                                            autoCorrect="off"
                                                            autoComplete="username"
                                                            spellCheck={false}
                                                            required
                                                            autoFocus={!email}
                                                            className={`${CAMPO} pr-4`}
                                                        />
                                                    </span>
                                                </label>
                                            </Campo>

                                            <Campo orden={1}>
                                                <label className="block">
                                                    <span className="mb-1 block text-[13px] font-medium text-[#F4EFEA]/70">Contraseña</span>
                                                    <span className="relative block">
                                                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#F4EFEA]/45 pointer-events-none" aria-hidden />
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            placeholder="••••••••"
                                                            value={password}
                                                            onChange={(e) => { setPassword(e.target.value); if (estado === "error") setEstado("reposo"); }}
                                                            autoComplete="current-password"
                                                            required
                                                            autoFocus={!!email && !password}
                                                            className={`${CAMPO} pr-12`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                                            title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#F4EFEA]/40 hover:text-[#F4EFEA] hover:bg-white/[0.06] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3B69B]/60"
                                                        >
                                                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                                        </button>
                                                    </span>
                                                </label>
                                            </Campo>

                                            {error && (
                                                <Campo orden={2}>
                                                    <p role="alert" className="flex items-center gap-2 rounded-xl bg-[#C9866F]/10 border border-[#C9866F]/25 px-3.5 py-2.5 text-[13px] text-[#E8B5A0]">
                                                        <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden />
                                                        {error}
                                                    </p>
                                                </Campo>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <BotonLiquido
                                estado={estado}
                                tipo={abierto ? "submit" : "button"}
                                onClick={abierto ? undefined : () => { setError(null); setEstado("reposo"); setFase("abierto"); }}
                                controla="campos-ingreso"
                                expandido={abierto}
                                textos={{ reposo: abierto ? "Ingresar" : "Iniciar sesión", cargando: "Ingresando…", listo: "Sesión iniciada" }}
                            />
                            <p className="sr-only" aria-live="polite">
                                {estado === "cargando" ? "Revisando tus datos" : estado === "listo" ? "Sesión iniciada, entrando al sistema" : ""}
                            </p>
                        </form>

                        {/* Con la tarjeta cerrada: la otra forma de entrar, con la cuenta de Google */}
                        <AnimatePresence initial={false}>
                            {fase === "cerrado" && estado !== "listo" && (
                                <motion.div
                                    key="google"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1, transition: { duration: 0.35, ease: SALIDA } }}
                                    exit={{ height: 0, opacity: 0, transition: { duration: 0.25 } }}
                                    className="relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 py-4 text-xs text-[#F4EFEA]/35" aria-hidden>
                                        <span className="h-px flex-1 bg-white/[0.08]" />
                                        o
                                        <span className="h-px flex-1 bg-white/[0.08]" />
                                    </div>
                                    <BotonGoogle onCredencial={entrarConGoogle} deshabilitado={estado === "cargando"} />
                                    {error && (
                                        <p role="alert" className="mt-3 flex items-center justify-center gap-2 text-[13px] text-[#E8B5A0] text-center">
                                            <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden />
                                            {error}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative mt-6 pt-5 border-t border-white/[0.06] text-center">
                            <a
                                href="/catalogo"
                                className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-[#A3B69B] hover:text-[#C5D6BF] transition-colors duration-150"
                            >
                                ¿Querés comprar? Mirá el catálogo
                                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                            </a>
                        </div>
                    </div>
                </motion.main>
            </div>
        </MotionConfig>
    );
}

/**
 * Un campo que sale del botón (que está debajo): sube, se ensancha y se aclara.
 * Al cerrarse hace el camino inverso, el de más abajo primero, como si el botón los absorbiera.
 */
function Campo({ orden, children }: { orden: number; children: React.ReactNode }) {
    return (
        <motion.div
            style={{ transformOrigin: "50% 100%" }}
            initial={{ opacity: 0, y: 34, scaleX: 0.72, filter: "blur(4px)" }}
            animate={{
                opacity: 1, y: 0, scaleX: 1, filter: "blur(0px)",
                transition: { delay: 0.1 + orden * 0.08, type: "spring", stiffness: 240, damping: 22, filter: { duration: 0.3, delay: 0.1 + orden * 0.08 } },
            }}
            exit={{
                opacity: 0, y: 40 + (2 - orden) * 12, scaleX: 0.55, filter: "blur(4px)",
                transition: { duration: 0.34, delay: (2 - orden) * 0.06, ease: [0.55, 0, 0.75, 0] },
            }}
        >
            {children}
        </motion.div>
    );
}
