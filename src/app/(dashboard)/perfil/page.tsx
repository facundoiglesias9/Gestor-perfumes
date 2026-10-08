"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserRound, Users, UserPlus, KeyRound, Eye, EyeOff, Loader2, Check, X, LogOut, ShieldCheck, Power,
} from "lucide-react";
import { toast } from "sonner";
import { useAppContext, type Usuario } from "@/context/AppContext";
import { crearUsuarioEquipo, cambiarClaveUsuario, cambiarEstadoUsuario } from "@/lib/auth-actions";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const aparecer = {
    initial: { opacity: 0, y: -6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
    exit: { opacity: 0, transition: { duration: 0.12 } },
};

const USUARIO_VALIDO = /^[a-z0-9._-]{3,30}$/;
const MIN_CLAVE = 8;

const inicial = (nombre?: string) => (nombre || "?").charAt(0).toUpperCase();

const campo = "w-full h-11 px-3.5 rounded-xl bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] placeholder:text-[#2C2C2C]/40 dark:placeholder:text-[#F4EFEA]/35 focus:outline-none focus:border-[#7D9878] focus:ring-2 focus:ring-[#7D9878]/20 transition-[border-color,box-shadow] duration-150";
const etiqueta = "block text-xs font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 mb-1.5";
const botonPrimario = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#7D9878] text-white text-sm font-semibold shadow-sm shadow-[#7D9878]/25 hover:bg-[#6B8566] active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-60 disabled:pointer-events-none";
const botonSecundario = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] text-sm font-semibold text-[#2C2C2C]/75 dark:text-[#F4EFEA]/75 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.97] transition-[background-color,color,transform] duration-150";

function CampoClave({ id, label, value, onChange, autoFocus }: {
    id: string; label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
    const [ver, setVer] = useState(false);
    return (
        <div>
            <label htmlFor={id} className={etiqueta}>{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={ver ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete="new-password"
                    autoFocus={autoFocus}
                    className={`${campo} pr-11`}
                />
                <button
                    type="button"
                    onClick={() => setVer(v => !v)}
                    aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"
                >
                    {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

// Formulario para poner una contraseña nueva (propia o de otra persona del equipo)
function FormClave({ nombre, onGuardar, onCancelar }: {
    nombre: string;
    onGuardar: (clave: string) => Promise<void>;
    onCancelar: () => void;
}) {
    const [clave, setClave] = useState("");
    const [repetida, setRepetida] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const enviar = async (e: FormEvent) => {
        e.preventDefault();
        if (clave.length < MIN_CLAVE) return setError(`La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.`);
        if (clave !== repetida) return setError("Las dos contraseñas no coinciden.");
        setError(null);
        setGuardando(true);
        try {
            await onGuardar(clave);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <motion.form {...aparecer} onSubmit={enviar} className="mt-3 rounded-xl border border-[#E6DFD5] dark:border-[#353B33] bg-[#F9F6F0]/60 dark:bg-[#1B1D1A]/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Nueva contraseña para {nombre}</p>
            <div className="grid sm:grid-cols-2 gap-3">
                <CampoClave id={`clave-${nombre}`} label="Contraseña nueva" value={clave} onChange={setClave} autoFocus />
                <CampoClave id={`repetida-${nombre}`} label="Repetila" value={repetida} onChange={setRepetida} />
            </div>
            {error && <p role="alert" className="text-sm text-[#97604D] dark:text-[#DBA793]">{error}</p>}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancelar} className={botonSecundario}>Cancelar</button>
                <button type="submit" disabled={guardando} className={botonPrimario}>
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Guardar contraseña
                </button>
            </div>
        </motion.form>
    );
}

export default function PerfilPage() {
    const { currentUser, usuarios, recargarUsuarios, addSystemLog, logout } = useAppContext();

    const esYo = (u: Usuario) =>
        u.id === currentUser?.id || (u.username || "").toLowerCase() === (currentUser?.username || "").toLowerCase();

    const equipo = usuarios.filter(u => u.role === "admin");
    const cuentasViejas = usuarios.length - equipo.length;
    const activos = equipo.filter(u => u.status !== "Inactivo");
    const miUsuario = usuarios.find(esYo);

    const [creando, setCreando] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevaClave, setNuevaClave] = useState("");
    const [nuevaRepetida, setNuevaRepetida] = useState("");
    const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
    const [guardandoNuevo, setGuardandoNuevo] = useState(false);
    const [recienCreado, setRecienCreado] = useState<string | null>(null);

    const [claveAbierta, setClaveAbierta] = useState<string | null>(null);
    const [confirmarEstado, setConfirmarEstado] = useState<string | null>(null);

    const cerrarNuevo = () => {
        setCreando(false);
        setNuevoNombre("");
        setNuevaClave("");
        setNuevaRepetida("");
        setErrorNuevo(null);
    };

    const crearUsuario = async (e: FormEvent) => {
        e.preventDefault();
        const nombre = nuevoNombre.trim().toLowerCase();
        if (!USUARIO_VALIDO.test(nombre)) {
            return setErrorNuevo("El usuario tiene que tener entre 3 y 30 caracteres: letras, números, punto o guion, sin espacios.");
        }
        if (usuarios.some(u => (u.username || "").toLowerCase() === nombre)) {
            return setErrorNuevo(`Ya existe un usuario "${nombre}". Elegí otro nombre.`);
        }
        if (nuevaClave.length < MIN_CLAVE) return setErrorNuevo(`La contraseña tiene que tener al menos ${MIN_CLAVE} caracteres.`);
        if (nuevaClave !== nuevaRepetida) return setErrorNuevo("Las dos contraseñas no coinciden.");

        setErrorNuevo(null);
        setGuardandoNuevo(true);
        // El servidor la guarda cifrada y vuelve a revisar todo (nombre libre, largo, permiso)
        const r = await crearUsuarioEquipo(nombre, nuevaClave).catch(() => ({ ok: false as const, error: "Revisá la conexión y probá de nuevo." }));
        setGuardandoNuevo(false);
        if (!r.ok) return setErrorNuevo(r.error);

        await recargarUsuarios();
        addSystemLog("info", `Nuevo usuario creado: ${nombre}`);
        toast.success(`Listo: "${nombre}" ya puede entrar`, { description: "Usa su usuario y la contraseña que le pusiste." });
        setRecienCreado(nombre);
        cerrarNuevo();
    };

    const cambiarClave = async (u: Usuario, clave: string) => {
        const r = await cambiarClaveUsuario(u.id, clave).catch(() => ({ ok: false as const, error: "Probá de nuevo en un momento." }));
        if (!r.ok) {
            toast.error("No se pudo cambiar la contraseña", { description: r.error });
            return;
        }
        addSystemLog("info", `Contraseña cambiada: ${u.username}`);
        toast.success(esYo(u) ? "Tu contraseña se cambió" : `Se cambió la contraseña de ${u.username}`);
        setClaveAbierta(null);
    };

    const cambiarEstado = async (u: Usuario) => {
        const activar = u.status === "Inactivo";
        const r = await cambiarEstadoUsuario(u.id, activar).catch(() => ({ ok: false as const, error: "Probá de nuevo en un momento." }));
        setConfirmarEstado(null);
        if (!r.ok) {
            toast.error("No se pudo guardar el cambio", { description: r.error });
            return;
        }
        await recargarUsuarios();
        addSystemLog("info", activar ? `Usuario reactivado: ${u.username}` : `Usuario desactivado: ${u.username}`);
        toast.success(activar ? `${u.username} puede volver a entrar` : `${u.username} ya no puede entrar`);
    };

    return (
        <div className="space-y-6 pb-12">
            <header className="anim-entrada relative overflow-hidden bg-white dark:bg-[#242723] rounded-[2rem] px-6 py-9 md:px-10 md:py-10 border border-[#E6DFD5] dark:border-[#353B33] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-36 w-[760px] max-w-full h-72 rounded-full bg-[#7D9878]/[0.14] dark:bg-[#A3B69B]/[0.07] blur-3xl" />
                <div className="relative flex flex-col items-center text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] border border-[#7D9878]/20 text-[11px] font-bold tracking-widest uppercase">
                        <UserRound className="w-3.5 h-3.5" />
                        Tu cuenta
                    </span>
                    <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-[#2C2C2C] dark:text-[#F4EFEA] font-brand">
                        Mi perfil
                    </h1>
                    <p className="mt-3 max-w-xl text-base md:text-lg text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 leading-relaxed">
                        Tus datos y las personas del equipo que pueden entrar al sistema.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
                {/* Tu cuenta */}
                <section className="anim-entrada [animation-delay:60ms] bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm p-6">
                    <div className="flex items-center gap-4">
                        <span className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-[#8FA888] to-[#5A7356] text-white text-2xl font-bold flex items-center justify-center shadow-md shadow-[#7D9878]/25">
                            {inicial(currentUser?.username)}
                        </span>
                        <div className="min-w-0">
                            <p className="text-xl font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] capitalize truncate">{currentUser?.username}</p>
                            <p className="inline-flex items-center gap-1.5 text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                                <ShieldCheck className="w-4 h-4 text-[#7D9878] dark:text-[#A3B69B]" />
                                Administrador
                            </p>
                        </div>
                    </div>

                    <dl className="mt-6 space-y-3 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Usuario para entrar</dt>
                            <dd className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{currentUser?.username}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">Último ingreso</dt>
                            <dd className="font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">{miUsuario?.lastLogin || "—"}</dd>
                        </div>
                    </dl>

                    <AnimatePresence initial={false}>
                        {miUsuario && claveAbierta === miUsuario.id ? (
                            <FormClave
                                key="mi-clave"
                                nombre="vos"
                                onGuardar={(c) => cambiarClave(miUsuario, c)}
                                onCancelar={() => setClaveAbierta(null)}
                            />
                        ) : null}
                    </AnimatePresence>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {miUsuario && claveAbierta !== miUsuario.id && (
                            <button onClick={() => setClaveAbierta(miUsuario.id)} className={botonSecundario}>
                                <KeyRound className="w-4 h-4" />
                                Cambiar mi contraseña
                            </button>
                        )}
                        <button
                            onClick={async () => { await logout(); window.location.href = "/login"; }}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-[0.97] transition-[background-color,transform] duration-150"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar sesión
                        </button>
                    </div>
                </section>

                {/* Usuarios del equipo */}
                <section className="anim-entrada [animation-delay:120ms] lg:col-span-2 bg-white dark:bg-[#242723] rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] shadow-sm p-6">
                    <header className="flex flex-wrap items-start gap-3">
                        <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-[#7D9878]/15 text-[#5A7356] dark:bg-[#A3B69B]/15 dark:text-[#A3B69B]">
                            <Users className="w-[18px] h-[18px]" />
                        </span>
                        <div className="flex-1 min-w-[180px]">
                            <h2 className="text-[15px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] leading-tight">Usuarios del equipo</h2>
                            <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 mt-0.5">
                                Entran con la misma vista que vos y pueden ver y cambiar todo el sistema.
                            </p>
                        </div>
                        {!creando && (
                            <button onClick={() => setCreando(true)} className={botonPrimario}>
                                <UserPlus className="w-4 h-4" />
                                Nuevo usuario
                            </button>
                        )}
                    </header>

                    {/* Alta de usuario */}
                    <AnimatePresence initial={false}>
                        {creando && (
                            <motion.form
                                key="nuevo"
                                {...aparecer}
                                onSubmit={crearUsuario}
                                className="mt-5 rounded-xl border border-[#7D9878]/30 bg-[#7D9878]/[0.05] dark:bg-[#A3B69B]/[0.05] p-4 md:p-5 space-y-4"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-[#2C2C2C] dark:text-[#F4EFEA]">Nuevo usuario</p>
                                    <button type="button" onClick={cerrarNuevo} aria-label="Cerrar" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A]">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    <div>
                                        <label htmlFor="nuevo-usuario" className={etiqueta}>Usuario</label>
                                        <input
                                            id="nuevo-usuario"
                                            type="text"
                                            value={nuevoNombre}
                                            onChange={(e) => setNuevoNombre(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                                            placeholder="ej: milagros"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            autoComplete="off"
                                            spellCheck={false}
                                            autoFocus
                                            className={campo}
                                        />
                                    </div>
                                    <CampoClave id="nueva-clave" label="Contraseña" value={nuevaClave} onChange={setNuevaClave} />
                                    <CampoClave id="nueva-repetida" label="Repetila" value={nuevaRepetida} onChange={setNuevaRepetida} />
                                </div>
                                <p className="text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                    Mínimo {MIN_CLAVE} caracteres. Pasale el usuario y la contraseña a esa persona por un medio privado.
                                </p>
                                {errorNuevo && <p role="alert" className="text-sm text-[#97604D] dark:text-[#DBA793]">{errorNuevo}</p>}
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={cerrarNuevo} className={botonSecundario}>Cancelar</button>
                                    <button type="submit" disabled={guardandoNuevo} className={botonPrimario}>
                                        {guardandoNuevo ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Crear usuario
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Lista del equipo */}
                    <ul className="mt-5 divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70">
                        {equipo.length === 0 && (
                            <li className="py-6 text-sm text-center text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                                Todavía no hay usuarios cargados en la base.
                            </li>
                        )}
                        {equipo.map(u => {
                            const yo = esYo(u);
                            const inactivo = u.status === "Inactivo";
                            const ultimoActivo = !inactivo && activos.length <= 1;
                            return (
                                <li key={u.id} className={`py-4 ${(u.username || "").toLowerCase() === recienCreado ? "log-nuevo rounded-xl -mx-2 px-2" : ""}`}>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`w-10 h-10 shrink-0 rounded-xl text-sm font-bold flex items-center justify-center ${inactivo
                                            ? "bg-[#F4EFEA] dark:bg-[#1B1D1A] text-[#2C2C2C]/40 dark:text-[#F4EFEA]/35"
                                            : "bg-gradient-to-br from-[#8FA888] to-[#5A7356] text-white"}`}
                                        >
                                            {inicial(u.username)}
                                        </span>
                                        <div className="flex-1 min-w-[140px]">
                                            <p className="flex flex-wrap items-center gap-2">
                                                <span className={`text-sm font-semibold ${inactivo ? "text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45" : "text-[#2C2C2C] dark:text-[#F4EFEA]"}`}>{u.username}</span>
                                                {yo && <span className="px-1.5 py-px rounded-md text-[11px] font-semibold bg-[#7D9878]/15 text-[#5A7356] dark:text-[#A3B69B]">Vos</span>}
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[11px] font-semibold ${inactivo
                                                    ? "bg-[#C9866F]/15 text-[#97604D] dark:text-[#DBA793]"
                                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${inactivo ? "bg-[#C9866F]" : "bg-emerald-500"}`} />
                                                    {inactivo ? "No puede entrar" : "Activo"}
                                                </span>
                                            </p>
                                            <p className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 mt-0.5">
                                                {u.lastLogin ? `Último ingreso: ${u.lastLogin}` : "Todavía no entró"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {!yo && claveAbierta !== u.id && (
                                                <button
                                                    onClick={() => setClaveAbierta(u.id)}
                                                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A] active:scale-[0.96] transition-[background-color,color,transform] duration-150"
                                                >
                                                    <KeyRound className="w-4 h-4" />
                                                    Contraseña
                                                </button>
                                            )}
                                            {!yo && (
                                                confirmarEstado === u.id ? (
                                                    <span className="inline-flex items-center gap-1 text-xs">
                                                        <span className="text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 mr-1">
                                                            {inactivo ? "¿Dejarlo entrar?" : "¿Quitarle el acceso?"}
                                                        </span>
                                                        <button
                                                            onClick={() => cambiarEstado(u)}
                                                            className={`h-9 px-3 rounded-lg font-semibold text-white active:scale-[0.96] transition-transform duration-150 ${inactivo ? "bg-[#7D9878] hover:bg-[#6B8566]" : "bg-[#C9866F] hover:bg-[#B5735C]"}`}
                                                        >
                                                            Sí
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmarEstado(null)}
                                                            className="h-9 px-3 rounded-lg font-semibold text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:bg-[#F4EFEA] dark:hover:bg-[#1B1D1A]"
                                                        >
                                                            No
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmarEstado(u.id)}
                                                        disabled={ultimoActivo}
                                                        title={ultimoActivo ? "Tiene que quedar al menos un usuario que pueda entrar" : undefined}
                                                        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold active:scale-[0.96] transition-[background-color,color,transform] duration-150 disabled:opacity-40 disabled:pointer-events-none ${inactivo
                                                            ? "text-[#5A7356] dark:text-[#A3B69B] hover:bg-[#7D9878]/10"
                                                            : "text-[#2C2C2C]/65 dark:text-[#F4EFEA]/60 hover:text-[#97604D] dark:hover:text-[#DBA793] hover:bg-[#C9866F]/10"}`}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                        {inactivo ? "Activar" : "Desactivar"}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {!yo && claveAbierta === u.id && (
                                            <FormClave
                                                key={`clave-${u.id}`}
                                                nombre={u.username}
                                                onGuardar={(c) => cambiarClave(u, c)}
                                                onCancelar={() => setClaveAbierta(null)}
                                            />
                                        )}
                                    </AnimatePresence>
                                </li>
                            );
                        })}
                    </ul>

                    {cuentasViejas > 0 && (
                        <p className="mt-4 pt-4 border-t border-[#E6DFD5] dark:border-[#353B33] text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                            Además hay {cuentasViejas} {cuentasViejas === 1 ? "cuenta vieja de cliente" : "cuentas viejas de clientes"} de cuando existían
                            esas cuentas. No pueden entrar: el sistema es solo para el equipo.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}
