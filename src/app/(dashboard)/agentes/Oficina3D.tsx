"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Maximize2, Minimize2 } from "lucide-react";
import { clone as clonarConEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AGENTES, ASISTENTES, type IdAgente, type ResultadoAgente } from "@/lib/agentes-tipos";
import {
    ANCHO, ALTO, OFICINAS, OFICINAS_LIBRES, SALAS_EQUIPO, RECORRIDOS, MS_POR_PASO, SEGUNDOS_POR_TRAMO, Y_ESCRITORIO, Y_SILLA, PASILLO_Y,
    FRENTE_ARRIBA, FRENTE_ABAJO, DX_ASISTENTE, Y_MESA_ASISTENTE, Y_SILLA_ASISTENTE, centroOficina, puertaOficina, destinoDe, rutaDe,
    esAsistente, liderDe, ASISTENTES_DE, capacidadEnfrente, type IdPersona, type Punto, type SalaEquipo,
} from "./recorridos";

// Piso de oficinas de los agentes en 3D, como una maqueta de arquitecto (paredes bajas para ver
// adentro). Cada agente es líder de su área: tiene su oficina con escritorio y computadora, y dos
// asistentes (mini IA) que trabajan en escritorios chicos de la misma oficina y se reparten su
// trabajo. Hay dos salas de reuniones, sala de equipo, servidores, sala de descanso, recepción,
// oficinas libres, archivo y baños. Las personas son maniquíes 3D con animaciones de caminar,
// correr y estar parado; trabajan sentados, salen por el pasillo a las salas que revisan, se
// juntan en equipo cuando lo deciden (cada líder viene con sus asistentes) y, sin trabajo, hacen
// su vida: café, visitas a un compañero, archivo. Se puede girar 360° y acercar la cámara.

/** Reunión de equipo: quiénes se juntan, en qué sala y por qué */
export type Reunion = { id: string; sala: SalaEquipo; integrantes: IdAgente[]; motivo: string };

const MODELO = "/modelos/persona.glb";
useGLTF.preload(MODELO);

// Plano (píxeles, 100 = 1 m) → mundo 3D (metros, centro del piso en 0,0)
const mx = (x: number) => (x - ANCHO / 2) / 100;
const mz = (y: number) => (y - ALTO / 2) / 100;
const aMundo = (p: Punto) => new THREE.Vector3(mx(p.x), 0, mz(p.y));

// Ropa de cada agente: un tono sobrio de su color
const ROPA: Record<IdAgente, string> = {
    reposicion: "#6E8268", ventas: "#A88F64", catalogo: "#A8745F", logs: "#5F7884", marketing: "#8E6E84",
    costos: "#8A7750", revendedores: "#9C7150", compras: "#5D6D8F", tendencias: "#457A71", experiencia: "#77609A",
};
const nombreDe = (id: IdAgente) => AGENTES.find(a => a.id === id)!.nombre;
// Todas las personas de la oficina: cada líder y sus dos asistentes
const PERSONAS: IdPersona[] = AGENTES.flatMap(a => [a.id, ...ASISTENTES_DE(a.id)]);
const lugarCasa = (p: IdPersona) => (esAsistente(p) ? "mesa" : "escritorio");
const nombreAsistente = (p: IdPersona) => ASISTENTES[liderDe(p)][Number(p.split("#")[1])];

type EstadoPersona = { lugar: string; camino: Punto[]; version: number; burbuja: string | null; mira: number; sentado: boolean };

// Al abrir, todos sentados en su puesto
function estadoInicial(): Record<string, EstadoPersona> {
    const r: Record<string, EstadoPersona> = {};
    for (const p of PERSONAS) {
        const d = destinoDe(p, lugarCasa(p));
        r[p] = { lugar: lugarCasa(p), camino: [], version: 0, burbuja: null, mira: d.mira, sentado: d.sentado };
    }
    return r;
}

function resumen(r: ResultadoAgente | undefined) {
    if (!r) return "¡Listo!";
    const urg = r.hallazgos.filter(h => h.nivel === "urgente").length;
    const ate = r.hallazgos.filter(h => h.nivel === "atencion").length;
    if (urg) return `Listo: ${urg} ${urg === 1 ? "cosa urgente" : "cosas urgentes"}`;
    if (ate) return `Listo: ${ate} para mirar`;
    return "Listo: todo en orden";
}

// Sigue el modo oscuro del sistema (la clase "dark" del documento)
function useOscuro() {
    const [oscuro, setOscuro] = useState(false);
    useEffect(() => {
        const el = document.documentElement;
        const leer = () => setOscuro(el.classList.contains("dark"));
        leer();
        const obs = new MutationObserver(leer);
        obs.observe(el, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);
    return oscuro;
}

function useMenosMovimiento() {
    const [menos, setMenos] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setMenos(mq.matches);
        const f = () => setMenos(mq.matches);
        mq.addEventListener("change", f);
        return () => mq.removeEventListener("change", f);
    }, []);
    return menos;
}

export default function Oficina3D({ trabajando, reuniones, ultimos, elegido, onElegir }: {
    trabajando: Set<IdAgente>;
    reuniones: Reunion[];
    ultimos: Partial<Record<IdAgente, ResultadoAgente>>;
    elegido: IdAgente | null;
    onElegir: (id: IdAgente) => void;
}) {
    const oscuro = useOscuro();
    const menosMovimiento = useMenosMovimiento();
    const [personas, setPersonas] = useState(estadoInicial);
    const personasRef = useRef(personas);
    useEffect(() => { personasRef.current = personas; }, [personas]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});
    const antes = useRef<Set<IdAgente>>(new Set());
    // Quiénes están en una reunión de equipo (no se los manda a otro lado mientras tanto)
    const enReunion = useRef<Map<string, { reunion: Reunion; personas: IdPersona[] }>>(new Map());
    const ocupadoEnReunion = (p: IdPersona) => [...enReunion.current.values()].some(r => r.personas.includes(p));
    const ultimosRef = useRef(ultimos);
    useEffect(() => { ultimosRef.current = ultimos; }, [ultimos]);
    // Carteles: dónde está cada uno en la página y cada persona en 3D (los mueve el Proyector)
    const [registro] = useState<Registro>(() => ({ elementos: new Map(), personas: new Map() }));
    const [encima, setEncima] = useState<IdPersona | null>(null);
    const anotarPersona = useCallback((p: IdPersona, o: THREE.Object3D | null) => {
        if (o) registro.personas.set(p, o);
        else registro.personas.delete(p);
    }, [registro]);

    const irA = (p: IdPersona, hasta: string, burbuja: string | null) =>
        setPersonas(prev => {
            const a = prev[p];
            const d = destinoDe(p, hasta);
            return { ...prev, [p]: { lugar: hasta, camino: rutaDe(p, a.lugar, hasta), version: a.version + 1, burbuja, mira: d.mira, sentado: d.sentado } };
        });
    const decir = (p: IdPersona, burbuja: string | null) => setPersonas(prev => ({ ...prev, [p]: { ...prev[p], burbuja } }));
    const limpiar = (p: IdPersona) => { (timers.current[p] ?? []).forEach(clearTimeout); timers.current[p] = []; };
    const despues = (p: IdPersona, ms: number, fn: () => void) => { (timers.current[p] ??= []).push(setTimeout(fn, ms)); };

    // Empieza o termina de trabajar: el líder recorre sus salas y sus asistentes trabajan en su mesa,
    // cada uno con su parte; al final el líder vuelve a su oficina y cuenta lo que encontraron
    useEffect(() => {
        for (const a of AGENTES) {
            const ahora = trabajando.has(a.id);
            const estaba = antes.current.has(a.id);
            if (ahora && !estaba) {
                limpiar(a.id);
                RECORRIDOS[a.id].forEach((paso, i) => despues(a.id, i * MS_POR_PASO, () => irA(a.id, paso.sector, paso.texto)));
                ASISTENTES_DE(a.id).forEach((m, i) => {
                    if (ocupadoEnReunion(m)) return;
                    // Arrancan uno después del otro, para que no hablen los dos a la vez
                    limpiar(m);
                    despues(m, 600 + i * 2200, () => decir(m, `${ASISTENTES[a.id][i].tarea}…`));
                });
            } else if (!ahora && estaba) {
                limpiar(a.id);
                ASISTENTES_DE(a.id).forEach((m, i) => {
                    if (ocupadoEnReunion(m)) return;
                    limpiar(m);
                    decir(m, i === 0 ? `Listo, se lo pasé a ${nombreDe(a.id)}` : null);
                    despues(m, 4000, () => decir(m, null));
                });
                if (ocupadoEnReunion(a.id)) continue;
                irA(a.id, "escritorio", resumen(ultimosRef.current[a.id]));
                despues(a.id, 6000, () => decir(a.id, null));
            }
        }
        antes.current = new Set(trabajando);
    }, [trabajando]);  

    // Reuniones de equipo: cada líder viene con sus asistentes. Los líderes se sientan de un lado de
    // la mesa y los asistentes enfrente; al terminar, cada uno vuelve a su puesto
    useEffect(() => {
        const nuevas = reuniones.filter(r => !enReunion.current.has(r.id));
        const terminadas = [...enReunion.current.entries()].filter(([id]) => !reuniones.some(x => x.id === id));
        for (const [id, r] of terminadas) {
            enReunion.current.delete(id);
            r.personas.forEach(p => {
                if (ocupadoEnReunion(p)) return;
                if (!esAsistente(p) && antes.current.has(p as IdAgente)) return;
                limpiar(p);
                irA(p, lugarCasa(p), null);
            });
        }
        for (const r of nuevas) {
            const asistentes = r.integrantes.flatMap(ASISTENTES_DE).slice(0, capacidadEnfrente(r.sala));
            enReunion.current.set(r.id, { reunion: r, personas: [...r.integrantes, ...asistentes] });
            r.integrantes.forEach((id, i) => {
                limpiar(id);
                irA(id, `${r.sala}:${i}`, i === 0 ? `Reunión: ${r.motivo}` : null);
                if (i === 0) despues(id, 7000, () => decir(id, null));
            });
            asistentes.forEach((m, i) => {
                limpiar(m);
                irA(m, `${r.sala}:${i}`, null);
            });
        }
    }, [reuniones]);  

    // Libre albedrío: sin trabajo, cada líder hace su vida. Va a buscar un café, pasa a charlar a la
    // oficina de un compañero que está sentado o busca algo en el archivo, y después vuelve.
    useEffect(() => {
        if (menosMovimiento) return;
        const intervalo = setInterval(() => {
            const libre = (id: IdAgente) => !antes.current.has(id) && !ocupadoEnReunion(id) && !(timers.current[id]?.length);
            const libres = AGENTES.filter(a => libre(a.id) && personasRef.current[a.id].lugar === "escritorio");
            if (libres.length === 0 || Math.random() < 0.35) return;
            const a = libres[Math.floor(Math.random() * libres.length)];
            const dado = Math.random();
            const companeros = libres.filter(o => o.id !== a.id);
            if (dado < 0.4 && companeros.length > 0) {
                const otro = companeros[Math.floor(Math.random() * companeros.length)];
                irA(a.id, `visita:${otro.id}`, `Charlando con ${nombreDe(otro.id)}`);
                despues(a.id, 6000, () => decir(a.id, null));
                // El compañero no se va mientras tiene visita
                despues(otro.id, 16000, () => limpiar(otro.id));
                despues(a.id, 14000, () => irA(a.id, "escritorio", null));
            } else if (dado < 0.8) {
                irA(a.id, "descanso", null);
                despues(a.id, 11000, () => irA(a.id, "escritorio", null));
            } else {
                irA(a.id, "archivo", "Buscando unos papeles…");
                despues(a.id, 6000, () => decir(a.id, null));
                despues(a.id, 10000, () => irA(a.id, "escritorio", null));
            }
            despues(a.id, 20000, () => limpiar(a.id));
        }, 9000);
        return () => clearInterval(intervalo);
    }, [menosMovimiento]);  

    useEffect(() => () => { PERSONAS.forEach(p => limpiar(p)); document.body.style.cursor = ""; }, []);  

    // Pantalla completa: la oficina ocupa todo el monitor
    const caja = useRef<HTMLDivElement>(null);
    const [completa, setCompleta] = useState(false);
    useEffect(() => {
        const f = () => setCompleta(document.fullscreenElement === caja.current);
        document.addEventListener("fullscreenchange", f);
        return () => document.removeEventListener("fullscreenchange", f);
    }, []);
    const alternarCompleta = () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void caja.current?.requestFullscreen?.();
    };

    return (
        <div
            ref={caja}
            className={`relative w-full overflow-hidden bg-[#E9E2D6] dark:bg-[#141613] ${completa
                ? "h-screen"
                : "h-[calc(100dvh-200px)] min-h-[520px] rounded-[1.75rem] border border-[#D9CFBF] dark:border-[#2A2E29] shadow-[0_24px_60px_-28px_rgba(44,44,44,0.45)] dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.8)]"}`}
        >
            <Canvas
                shadows="soft"
                dpr={[1, 2]}
                camera={{ position: [0, 10.5, 8.4], fov: 38, near: 0.1, far: 120 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={[oscuro ? "#141613" : "#E9E2D6"]} />
                <Luces oscuro={oscuro} />
                {/* Mientras carga el modelo de las personas no se dibuja nada (la página ya avisa que está armando) */}
                <Suspense fallback={null}>
                    <Maqueta oscuro={oscuro} />
                    <Proyector registro={registro} />
                    {PERSONAS.map(p => {
                        const lider = liderDe(p);
                        return (
                            <Persona
                                key={p}
                                id={p}
                                lider={lider}
                                asistente={esAsistente(p)}
                                color={ROPA[lider]}
                                marca={AGENTES.find(a => a.id === lider)!.color}
                                estado={personas[p]}
                                elegido={elegido === lider && !esAsistente(p)}
                                onElegir={onElegir}
                                onEncima={setEncima}
                                onObjeto={anotarPersona}
                                menosMovimiento={menosMovimiento}
                            />
                        );
                    })}
                </Suspense>
                {/* Como un mapa: arrastrar mueve por el piso, clic derecho gira 360° y la rueda acerca
                    hacia donde está el mouse. En el celular: un dedo mueve, dos dedos acercan y giran */}
                <OrbitControls
                    makeDefault
                    target={[0, 0.3, 0]}
                    enablePan
                    screenSpacePanning={false}
                    zoomToCursor
                    mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
                    touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={2.5}
                    maxDistance={60}
                    minPolarAngle={0.12}
                    maxPolarAngle={1.32}
                />
                <Encuadre />
                <Limites />
            </Canvas>
            <Carteles registro={registro} personas={personas} encima={encima} ultimos={ultimos} trabajando={trabajando} reuniones={reuniones} />
            <button
                type="button"
                onClick={alternarCompleta}
                title={completa ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/80 dark:bg-[#1B1D1A]/80 backdrop-blur border border-black/5 dark:border-white/10 text-xs font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] cursor-pointer transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:hover:bg-white dark:[@media(hover:hover)]:hover:bg-[#242723] active:scale-[0.97]"
            >
                {completa ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {completa ? "Salir" : "Pantalla completa"}
            </button>
            <p className="pointer-events-none absolute bottom-3 right-4 text-[11px] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40">
                Arrastrá para moverte · clic derecho para girar · rueda para acercar · tocá a un agente
            </p>
        </div>
    );
}

// ── Cámara ───────────────────────────────────────────────────────────────────

// Acerca la cámara lo más posible sin que el piso se salga del cuadro, según el tamaño de la
// pantalla (en un monitor ancho la oficina ocupa todo el ancho). Se recalcula al cambiar el tamaño.
const ESQUINAS = [-1, 1].flatMap(sx => [-1, 1].flatMap(sz => [0, 1.1].map(y => new THREE.Vector3(sx * ANCHO / 200, y, sz * ALTO / 200))));
const INCLINACION = 0.48; // ángulo desde arriba (radianes): se ve el piso entero con algo de perspectiva

function Encuadre() {
    const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
    const size = useThree(s => s.size);
    const controls = useThree(s => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
    useEffect(() => {
        if (!controls) return;
        const objetivo = new THREE.Vector3(0, 0.3, 0);
        const dir = new THREE.Vector3(0, Math.cos(INCLINACION), Math.sin(INCLINACION));
        const p = new THREE.Vector3();
        const entra = (d: number) => {
            camera.position.copy(objetivo).addScaledVector(dir, d);
            camera.lookAt(objetivo);
            camera.updateMatrixWorld();
            return ESQUINAS.every(e => {
                p.copy(e).project(camera);
                return Math.abs(p.x) <= 1.0 && Math.abs(p.y) <= 0.97;
            });
        };
        // Búsqueda binaria de la distancia más corta en la que entra todo
        let cerca = 3, lejos = 60;
        for (let i = 0; i < 24; i++) {
            const medio = (cerca + lejos) / 2;
            if (entra(medio)) lejos = medio; else cerca = medio;
        }
        entra(lejos);
        controls.target.copy(objetivo);
        controls.update();
    }, [camera, controls, size.width, size.height]);
    return null;
}

// Al moverse por el piso, el punto que se mira no se puede ir afuera del edificio (la cámara lo sigue)
const MIN_OBJETIVO = new THREE.Vector3(-ANCHO / 200, 0.3, -ALTO / 200);
const MAX_OBJETIVO = new THREE.Vector3(ANCHO / 200, 0.3, ALTO / 200);
const _antes = new THREE.Vector3();

function Limites() {
    const camera = useThree(s => s.camera);
    const controls = useThree(s => s.controls) as unknown as (THREE.EventDispatcher<{ change: object }> & { target: THREE.Vector3 }) | null;
    useEffect(() => {
        if (!controls) return;
        const acotar = () => {
            _antes.copy(controls.target);
            controls.target.clamp(MIN_OBJETIVO, MAX_OBJETIVO);
            // Lo que se recortó del objetivo se le resta también a la cámara, para que no gire de golpe
            camera.position.add(_antes.sub(controls.target).negate());
        };
        controls.addEventListener("change", acotar);
        return () => controls.removeEventListener("change", acotar);
    }, [controls, camera]);
    return null;
}

// ── Personas ─────────────────────────────────────────────────────────────────

// Diferencia de ángulos por el camino más corto (para girar sin dar la vuelta entera)
const girarHacia = (a: number, b: number, t: number) => {
    const d = ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
};

// Postura sentada frente a la computadora: hacia dónde apunta cada hueso (mirando hacia +Z, la
// izquierda del maniquí es +X). Muslos hacia adelante, pantorrillas hacia abajo y manos al teclado.
const POSTURA_SENTADO: [string, string, THREE.Vector3][] = [
    ["LeftUpLeg", "LeftLeg", new THREE.Vector3(0.06, -0.12, 1)],
    ["RightUpLeg", "RightLeg", new THREE.Vector3(-0.06, -0.12, 1)],
    ["LeftLeg", "LeftFoot", new THREE.Vector3(0, -1, 0.1)],
    ["RightLeg", "RightFoot", new THREE.Vector3(0, -1, 0.1)],
    ["LeftFoot", "LeftToeBase", new THREE.Vector3(0, -0.4, 1)],
    ["RightFoot", "RightToeBase", new THREE.Vector3(0, -0.4, 1)],
    ["LeftArm", "LeftForeArm", new THREE.Vector3(0.16, -0.85, 0.4)],
    ["RightArm", "RightForeArm", new THREE.Vector3(-0.16, -0.85, 0.4)],
    ["LeftForeArm", "LeftHand", new THREE.Vector3(-0.22, -0.12, 1)],
    ["RightForeArm", "RightHand", new THREE.Vector3(0.22, -0.12, 1)],
];
/** Altura de la cadera cuando está sentado (el asiento de la silla está a 0,5 m) */
const CADERA_SENTADO = 0.56;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qMundo = new THREE.Quaternion();
const _qPadre = new THREE.Quaternion();
const _qCuerpo = new THREE.Quaternion();

// Gira un hueso para que apunte (hacia su hijo) en la dirección pedida, mezclando con la animación
function apuntar(hueso: THREE.Object3D, hijo: THREE.Object3D, dirMundo: THREE.Vector3, peso: number) {
    hueso.updateWorldMatrix(true, true);
    hueso.getWorldPosition(_a);
    hijo.getWorldPosition(_b);
    _b.sub(_a).normalize();
    _q.setFromUnitVectors(_b, dirMundo);
    hueso.getWorldQuaternion(_qMundo).premultiply(_q);
    hueso.parent!.getWorldQuaternion(_qPadre).invert();
    hueso.quaternion.slerp(_qPadre.multiply(_qMundo), peso);
}

// Asistentes (mini IA): un poco más chicos, de un tono claro y brillante del color de su líder
const ESCALA_ASISTENTE = 0.88;

function Persona({ id, lider, asistente, color, marca, estado, elegido, onElegir, onEncima, onObjeto, menosMovimiento }: {
    id: IdPersona; lider: IdAgente; asistente: boolean; color: string; marca: string; estado: EstadoPersona; elegido: boolean;
    onElegir: (id: IdAgente) => void; onEncima: (id: IdPersona | null) => void;
    onObjeto: (id: IdPersona, objeto: THREE.Object3D | null) => void; menosMovimiento: boolean;
}) {
    const { scene, animations } = useGLTF(MODELO);
    // Cada persona es una copia del modelo: los líderes con la ropa de su color y articulaciones
    // grafito; los asistentes en un tono claro con articulaciones del color del líder y un leve brillo
    const modelo = useMemo(() => {
        const copia = clonarConEsqueleto(scene);
        const claro = new THREE.Color(color).lerp(new THREE.Color("#F1F3F2"), 0.6);
        copia.traverse(o => {
            const malla = o as THREE.Mesh;
            if (!malla.isMesh) return;
            malla.castShadow = true;
            malla.receiveShadow = true;
            const m = (malla.material as THREE.MeshStandardMaterial).clone();
            if (/joint/i.test(m.name)) {
                m.color.set(asistente ? marca : "#2F3235");
                m.metalness = 0.35;
                m.roughness = 0.45;
                if (asistente) { m.emissive.set(marca); m.emissiveIntensity = 0.25; }
            } else {
                m.color.set(asistente ? claro : color);
                m.metalness = asistente ? 0.2 : 0.05;
                m.roughness = asistente ? 0.35 : 0.62;
            }
            malla.material = m;
        });
        return copia;
    }, [scene, color, marca, asistente]);
    const escala = asistente ? ESCALA_ASISTENTE : 1;
    const chispa = useRef<THREE.Mesh>(null);

    // Huesos que se acomodan para sentarse y a qué altura queda la cadera parado
    const huesos = useMemo(() => {
        const h = (n: string) => modelo.getObjectByName(`mixamorig${n}`);
        modelo.updateMatrixWorld(true);
        const cadera = h("Hips");
        const alturaCadera = cadera ? cadera.getWorldPosition(new THREE.Vector3()).y : 1;
        const postura = POSTURA_SENTADO
            .map(([hueso, hijo, dir]) => ({ hueso: h(hueso), hijo: h(hijo), dir }))
            .filter((p): p is { hueso: THREE.Object3D; hijo: THREE.Object3D; dir: THREE.Vector3 } => !!p.hueso && !!p.hijo);
        return { alturaCadera, postura };
    }, [modelo]);

    // Animaciones propias de cada agente (caminar, correr, parado)
    const mezclador = useMemo(() => new THREE.AnimationMixer(modelo), [modelo]);
    const acciones = useMemo(() => {
        const r: Record<string, THREE.AnimationAction> = {};
        for (const clip of animations) {
            if (clip.name === "idle" || clip.name === "walk" || clip.name === "run") r[clip.name] = mezclador.clipAction(clip);
        }
        return r;
    }, [mezclador, animations]);
    useEffect(() => {
        acciones.idle?.reset().play();
        return () => { mezclador.stopAllAction(); };
    }, [acciones, mezclador]);

    const grupo = useRef<THREE.Group>(null);
    const cuerpo = useRef<THREE.Group>(null);
    const casa = useMemo(() => destinoDe(id, lugarCasa(id)), [id]);
    const mov = useRef({ camino: [] as THREE.Vector3[], velocidad: 1.4, anim: "idle", mira: casa.mira, seSienta: true, sentado: 1 });
    const inicio = useMemo(() => aMundo(casa.punto), [casa]);
    // Se anota para que su cartel lo siga
    useEffect(() => {
        onObjeto(id, grupo.current);
        return () => onObjeto(id, null);
    }, [id, onObjeto]);

    // Camino nuevo: la velocidad se ajusta para tardar unos segundos (caminando o trotando)
    useEffect(() => {
        if (estado.version === 0) return;
        mov.current.mira = estado.mira;
        mov.current.seSienta = estado.sentado;
        const puntos = estado.camino.map(aMundo);
        const g = grupo.current;
        if (!g || puntos.length === 0) return;
        if (menosMovimiento) {
            g.position.copy(puntos[puntos.length - 1]);
            mov.current.camino = [];
            return;
        }
        let largo = 0;
        let previo = g.position.clone();
        for (const p of puntos) { largo += previo.distanceTo(p); previo = p; }
        mov.current.camino = puntos;
        mov.current.velocidad = THREE.MathUtils.clamp(largo / SEGUNDOS_POR_TRAMO, 1.2, 6.5);
    }, [estado.version]);

    useFrame((_, dt) => {
        const g = grupo.current;
        const c = cuerpo.current;
        if (!g || !c) return;
        const m = mov.current;
        const destino = m.camino[0];
        let quiere = "idle";
        if (destino) {
            const hacia = destino.clone().sub(g.position);
            hacia.y = 0;
            const distancia = hacia.length();
            const paso = m.velocidad * dt;
            if (distancia <= paso) {
                g.position.copy(destino);
                m.camino.shift();
            } else {
                g.position.addScaledVector(hacia.normalize(), paso);
            }
            if (distancia > 0.001) g.rotation.y = girarHacia(g.rotation.y, Math.atan2(hacia.x, hacia.z), 1 - Math.exp(-12 * dt));
            quiere = m.velocidad > 2.4 ? "run" : "walk";
        } else {
            // Llegó: mira hacia lo que revisa (o hacia la computadora si está en su oficina)
            g.rotation.y = girarHacia(g.rotation.y, m.mira, 1 - Math.exp(-6 * dt));
        }
        if (quiere !== m.anim) {
            acciones[m.anim]?.fadeOut(0.25);
            acciones[quiere]?.reset().fadeIn(0.25).play();
            m.anim = quiere;
        }
        // Que los pies acompañen la velocidad real
        acciones.walk?.setEffectiveTimeScale(m.velocidad / 1.4);
        acciones.run?.setEffectiveTimeScale(m.velocidad / 3.6);
        mezclador.update(dt);

        // Sentado cuando llegó a una silla (su oficina, una reunión, una visita); se para y se sienta suave
        const quiereSentado = !destino && m.seSienta ? 1 : 0;
        m.sentado = menosMovimiento ? quiereSentado : THREE.MathUtils.damp(m.sentado, quiereSentado, 7, dt);
        c.position.y = -(huesos.alturaCadera * escala - CADERA_SENTADO) * m.sentado;
        // El rombito del asistente gira rápido mientras trabaja (cuando tiene algo entre manos)
        if (chispa.current) chispa.current.rotation.y += dt * (estado.burbuja ? 7 : 1.6);
        if (m.sentado > 0.01) {
            g.getWorldQuaternion(_qCuerpo);
            for (const p of huesos.postura) {
                _dir.copy(p.dir).normalize().applyQuaternion(_qCuerpo);
                apuntar(p.hueso, p.hijo, _dir, m.sentado);
            }
        }
    });

    return (
        <group
            ref={grupo}
            position={inicio}
            rotation-y={casa.mira}
            onClick={e => { e.stopPropagation(); onElegir(lider); }}
            onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = "pointer"; onEncima(id); }}
            onPointerOut={() => { document.body.style.cursor = ""; onEncima(null); }}
        >
            <group ref={cuerpo}>
                <group scale={escala}>
                    <primitive object={modelo} />
                </group>
                {/* Los asistentes (mini IA) llevan un rombito luminoso que gira sobre la cabeza */}
                {asistente && (
                    <mesh ref={chispa} position-y={1.86}>
                        <octahedronGeometry args={[0.07, 0]} />
                        <meshStandardMaterial color={marca} emissive={marca} emissiveIntensity={1.4} />
                    </mesh>
                )}
            </group>
            {elegido && (
                <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
                    <ringGeometry args={[0.36, 0.44, 48]} />
                    <meshBasicMaterial color={marca} transparent opacity={0.95} />
                </mesh>
            )}
            {/* El cartel queda siempre puesto (sacarlo y ponerlo de golpe hace fallar a React); solo cambia su texto */}
        </group>
    );
}

// ── Luces ────────────────────────────────────────────────────────────────────

// Plafones: uno por oficina y uno por sala
const LUCES_TECHO: Punto[] = [
    ...AGENTES.map(a => ({ x: centroOficina(a.id), y: OFICINAS[a.id].abajo ? ALTO - Y_ESCRITORIO : Y_ESCRITORIO })),
    ...OFICINAS_LIBRES.map(o => ({ x: (o.x1 + o.x2) / 2, y: ALTO - Y_ESCRITORIO })),
    { x: 300, y: 280 }, { x: 3120, y: 245 }, { x: 1780, y: 875 }, { x: 220, y: 880 }, { x: 590, y: 900 },
    { x: 1130, y: 900 }, { x: 2960, y: 900 },
];

function Luces({ oscuro }: { oscuro: boolean }) {
    return (
        <>
            <hemisphereLight args={[oscuro ? "#A9B6C8" : "#FFF7EA", oscuro ? "#3A2E24" : "#B79B78", oscuro ? 1.05 : 1.2]} />
            <ambientLight intensity={oscuro ? 0.3 : 0.25} />
            {/* Sol que entra por los ventanales del fondo, con sombras suaves */}
            <directionalLight
                position={[-7, 16, -10]}
                intensity={oscuro ? 0.9 : 2.3}
                color={oscuro ? "#B9C8E6" : "#FFF1DC"}
                castShadow
                shadow-mapSize={[4096, 4096]}
                shadow-bias={-0.0004}
                shadow-normalBias={0.02}
                shadow-camera-left={-23}
                shadow-camera-right={23}
                shadow-camera-top={9}
                shadow-camera-bottom={-9}
                shadow-camera-near={1}
                shadow-camera-far={50}
            />
            {LUCES_TECHO.map((p, i) => (
                <pointLight key={i} position={[mx(p.x), 2.2, mz(p.y)]} intensity={oscuro ? 7 : 1.1} distance={6.5} decay={2} color="#FFD9A0" />
            ))}
        </>
    );
}

// ── Materiales y texturas (dibujadas por código, sin imágenes externas) ──────

// Números al azar pero siempre iguales (así la madera no cambia en cada carga)
function semilla(n: number) {
    return () => {
        n |= 0; n = (n + 0x6d2b79f5) | 0;
        let t = Math.imul(n ^ (n >>> 15), 1 | n);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function texturaTablas(oscuro: boolean) {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d")!;
    const r = semilla(7);
    const alto = 64;
    for (let fila = 0; fila < 1024 / alto; fila++) {
        let x = -Math.floor(r() * 300);
        while (x < 1024) {
            const largo = 260 + r() * 340;
            const tono = oscuro ? 22 + r() * 9 : 64 + r() * 10;
            g.fillStyle = `hsl(${30 + r() * 6}, ${oscuro ? 22 : 38}%, ${tono}%)`;
            g.fillRect(x, fila * alto, largo, alto);
            // Veta
            for (let v = 0; v < 9; v++) {
                g.strokeStyle = `rgba(${oscuro ? "0,0,0" : "90,60,30"}, ${0.05 + r() * 0.08})`;
                g.lineWidth = 1 + r() * 1.5;
                g.beginPath();
                const y0 = fila * alto + 4 + r() * (alto - 8);
                g.moveTo(x, y0);
                g.bezierCurveTo(x + largo * 0.3, y0 + (r() - 0.5) * 8, x + largo * 0.7, y0 + (r() - 0.5) * 8, x + largo, y0 + (r() - 0.5) * 4);
                g.stroke();
            }
            // Junta entre tablas
            g.fillStyle = oscuro ? "rgba(0,0,0,0.55)" : "rgba(70,45,25,0.35)";
            g.fillRect(x, fila * alto, 2, alto);
            x += largo;
        }
        g.fillStyle = oscuro ? "rgba(0,0,0,0.6)" : "rgba(70,45,25,0.4)";
        g.fillRect(0, fila * alto + alto - 2, 1024, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

function texturaRuido(base: string, oscuro: boolean, tam = 512, grano = 2400, lineas = false) {
    const c = document.createElement("canvas");
    c.width = c.height = tam;
    const g = c.getContext("2d")!;
    const r = semilla(tam + grano);
    g.fillStyle = base;
    g.fillRect(0, 0, tam, tam);
    for (let i = 0; i < grano; i++) {
        g.fillStyle = `rgba(${oscuro ? "255,255,255" : "0,0,0"}, ${r() * 0.05})`;
        g.fillRect(r() * tam, r() * tam, 1 + r() * 2, 1 + r() * 2);
    }
    if (lineas) {
        g.strokeStyle = oscuro ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.08)";
        g.lineWidth = 2;
        g.strokeRect(0, 0, tam, tam);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function useMateriales(oscuro: boolean) {
    return useMemo(() => {
        const tablas = texturaTablas(oscuro);
        tablas.repeat.set(8, 3);
        const cemento = texturaRuido(oscuro ? "#30332F" : "#D3CEC4", oscuro, 512, 6000, true);
        cemento.repeat.set(3, 3);
        const azulejo = texturaRuido(oscuro ? "#3A3D3A" : "#E6E3DD", oscuro, 128, 600, true);
        azulejo.repeat.set(8, 8);
        const alfombra = texturaRuido(oscuro ? "#46523F" : "#B4C3A9", oscuro, 256, 9000);
        alfombra.repeat.set(2, 2);
        const alfombraArena = texturaRuido(oscuro ? "#4F4535" : "#D9C8A8", oscuro, 256, 9000);
        alfombraArena.repeat.set(2, 2);
        return {
            piso: new THREE.MeshStandardMaterial({ map: tablas, roughness: 0.72, metalness: 0 }),
            cemento: new THREE.MeshStandardMaterial({ map: cemento, roughness: 0.9 }),
            azulejo: new THREE.MeshStandardMaterial({ map: azulejo, roughness: 0.35 }),
            alfombra: new THREE.MeshStandardMaterial({ map: alfombra, roughness: 1 }),
            alfombraArena: new THREE.MeshStandardMaterial({ map: alfombraArena, roughness: 1 }),
            pared: new THREE.MeshStandardMaterial({ color: oscuro ? "#3A3E39" : "#EEE8DD", roughness: 0.95 }),
            paredTope: new THREE.MeshStandardMaterial({ color: oscuro ? "#262925" : "#D8CDBB", roughness: 0.9 }),
            madera: new THREE.MeshStandardMaterial({ color: oscuro ? "#6A4E36" : "#9C7652", roughness: 0.55 }),
            maderaClara: new THREE.MeshStandardMaterial({ color: oscuro ? "#7D6045" : "#C2A27C", roughness: 0.5 }),
            marmol: new THREE.MeshStandardMaterial({ color: oscuro ? "#C9C5BD" : "#F4F1EB", roughness: 0.22, metalness: 0.02 }),
            metal: new THREE.MeshStandardMaterial({ color: "#6E7479", roughness: 0.35, metalness: 0.75 }),
            metalOscuro: new THREE.MeshStandardMaterial({ color: "#2D3034", roughness: 0.4, metalness: 0.6 }),
            aluminio: new THREE.MeshStandardMaterial({ color: oscuro ? "#5A5F63" : "#A7ABAE", roughness: 0.3, metalness: 0.8 }),
            negro: new THREE.MeshStandardMaterial({ color: "#1E2023", roughness: 0.5, metalness: 0.2 }),
            tela: new THREE.MeshStandardMaterial({ color: oscuro ? "#2E322D" : "#3D433C", roughness: 0.95 }),
            telaSalvia: new THREE.MeshStandardMaterial({ color: oscuro ? "#56664F" : "#8DA285", roughness: 0.95 }),
            telaArena: new THREE.MeshStandardMaterial({ color: oscuro ? "#7A6A50" : "#D2BE98", roughness: 0.95 }),
            blanco: new THREE.MeshStandardMaterial({ color: "#F7F6F2", roughness: 0.4 }),
            ceramica: new THREE.MeshStandardMaterial({ color: "#FBFBF8", roughness: 0.15 }),
            archivo: new THREE.MeshStandardMaterial({ color: oscuro ? "#5C625F" : "#B9BDB8", roughness: 0.45, metalness: 0.4 }),
            libros: ["#7D9878", "#C9A877", "#C9866F", "#5F7884", "#E6DCCB", "#3D433C"].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })),
            maceta: new THREE.MeshStandardMaterial({ color: "#B4704F", roughness: 0.8 }),
            hoja: new THREE.MeshStandardMaterial({ color: oscuro ? "#3F5A3A" : "#557A4C", roughness: 0.7 }),
            hojaClara: new THREE.MeshStandardMaterial({ color: oscuro ? "#4E6B47" : "#6E9461", roughness: 0.7 }),
            pantalla: new THREE.MeshStandardMaterial({ color: "#10161C", emissive: oscuro ? "#3A6A8C" : "#2C4A60", emissiveIntensity: oscuro ? 1.3 : 0.8, roughness: 0.3 }),
            vidrio: new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", transmission: 0.92, roughness: 0.05, thickness: 0.02, ior: 1.45, transparent: true, opacity: 0.35 }),
            // Tabiques vidriados: transparentes y livianos de dibujar
            vidrioPared: new THREE.MeshStandardMaterial({ color: oscuro ? "#9FB4B8" : "#CFE0DF", transparent: true, opacity: oscuro ? 0.16 : 0.24, roughness: 0.05, metalness: 0.1, depthWrite: false }),
            luzVerde: new THREE.MeshBasicMaterial({ color: "#2BD18F" }),
            luzAmbar: new THREE.MeshBasicMaterial({ color: "#E8B04E" }),
            lampara: new THREE.MeshStandardMaterial({ color: "#F6E7C8", emissive: "#FFD58A", emissiveIntensity: oscuro ? 2.2 : 0.8 }),
        };
    }, [oscuro]);
}
type Materiales = ReturnType<typeof useMateriales>;

// Caja en coordenadas de plano: x1,y1 → x2,y2 (píxeles), con altura y elevación en metros
function Bloque({ x1, y1, x2, y2, alto, desde = 0, material, redondeo = 0, sombra = true }: {
    x1: number; y1: number; x2: number; y2: number; alto: number; desde?: number; material: THREE.Material; redondeo?: number; sombra?: boolean;
}) {
    const w = (x2 - x1) / 100;
    const d = (y2 - y1) / 100;
    const pos: [number, number, number] = [mx((x1 + x2) / 2), desde + alto / 2, mz((y1 + y2) / 2)];
    if (redondeo > 0) {
        return <RoundedBox args={[w, alto, d]} radius={Math.min(redondeo, w / 2, d / 2, alto / 2)} smoothness={3} position={pos} material={material} castShadow={sombra} receiveShadow />;
    }
    return (
        <mesh position={pos} material={material} castShadow={sombra} receiveShadow>
            <boxGeometry args={[w, alto, d]} />
        </mesh>
    );
}

function Cilindro({ x, y, r, alto, desde = 0, material, r2, lados = 28 }: { x: number; y: number; r: number; alto: number; desde?: number; material: THREE.Material; r2?: number; lados?: number }) {
    return (
        <mesh position={[mx(x), desde + alto / 2, mz(y)]} material={material} castShadow receiveShadow>
            <cylinderGeometry args={[r2 ?? r, r, alto, lados]} />
        </mesh>
    );
}

// Rectángulo apoyado en el piso (alfombras, pisos de otro material)
function Piso({ x1, y1, x2, y2, material, alto = 0.004 }: { x1: number; y1: number; x2: number; y2: number; material: THREE.Material; alto?: number }) {
    return (
        <mesh rotation-x={-Math.PI / 2} position={[mx((x1 + x2) / 2), alto, mz((y1 + y2) / 2)]} material={material} receiveShadow>
            <planeGeometry args={[(x2 - x1) / 100, (y2 - y1) / 100]} />
        </mesh>
    );
}

// ── Edificio: piso, paredes, tabiques vidriados y ventanales ─────────────────

// Los materiales se arman una sola vez (y de nuevo solo al cambiar a modo oscuro)
function Maqueta({ oscuro }: { oscuro: boolean }) {
    const m = useMateriales(oscuro);
    return (
        <>
            <Edificio m={m} />
            <SalaReuniones m={m} />
            <SalaReuniones2 m={m} />
            {/* Las de abajo son las mismas oficinas, giradas (la ventana queda del lado de adelante) */}
            {AGENTES.map(a => <OficinaPrivada key={a.id} m={m} x1={OFICINAS[a.id].x1} x2={OFICINAS[a.id].x2} abajo={OFICINAS[a.id].abajo} />)}
            {OFICINAS_LIBRES.map(o => <OficinaPrivada key={o.x1} m={m} x1={o.x1} x2={o.x2} abajo />)}
            <Servidores m={m} />
            <SalaDescanso m={m} />
            <Recepcion m={m} />
            <SalaEquipo m={m} />
            <Archivo m={m} />
            <Banos m={m} />
            {/* Plantas en las puntas del pasillo y junto a las paredes */}
            {[{ x: 60, y: PASILLO_Y }, { x: ANCHO - 60, y: PASILLO_Y }, { x: 720, y: 650 }, { x: 1540, y: 650 }, { x: 2400, y: 650 }, { x: 3060, y: 650 }].map((p, i) => (
                <Planta key={i} m={m} x={p.x} y={p.y} grande={i < 2} />
            ))}
        </>
    );
}

const ALTO_PARED = 1.05;

function Pared({ x1, y1, x2, y2, m, alto = ALTO_PARED }: { x1: number; y1: number; x2: number; y2: number; m: Materiales; alto?: number }) {
    return (
        <group>
            <Bloque x1={x1} y1={y1} x2={x2} y2={y2} alto={alto} material={m.pared} />
            <Bloque x1={x1} y1={y1} x2={x2} y2={y2} alto={0.03} desde={alto} material={m.paredTope} sombra={false} />
        </group>
    );
}

// Tabique de vidrio con perfil de aluminio arriba, abajo y en las puntas
function Vidriado({ x1, x2, y, m }: { x1: number; x2: number; y: number; m: Materiales }) {
    if (x2 - x1 < 8) return null;
    return (
        <group>
            <Bloque x1={x1} y1={y - 3} x2={x2} y2={y + 3} alto={ALTO_PARED} material={m.vidrioPared} sombra={false} />
            <Bloque x1={x1} y1={y - 4} x2={x2} y2={y + 4} alto={0.05} material={m.aluminio} sombra={false} />
            <Bloque x1={x1} y1={y - 4} x2={x2} y2={y + 4} alto={0.03} desde={ALTO_PARED} material={m.aluminio} sombra={false} />
            {[x1, x2 - 5].map(x => <Bloque key={x} x1={x} y1={y - 4} x2={x + 5} y2={y + 4} alto={ALTO_PARED} material={m.aluminio} sombra={false} />)}
        </group>
    );
}

function Edificio({ m }: { m: Materiales }) {
    const y = FRENTE_ARRIBA;
    const yAbajo = FRENTE_ABAJO;
    // Paredes macizas: perímetro (la de adelante, del lado de la cámara, más baja para ver adentro)
    // y divisiones entre oficinas y salas
    const macizas: [number, number, number, number, number?][] = [
        [0, 0, 24, ALTO], [ANCHO - 24, 0, ANCHO, ALTO], [0, ALTO - 24, ANCHO, ALTO, 0.35],
        ...[620, 1000, 1380, 1760, 2140, 2520, 2840, 3380, 3760].map(x => [x - 4, 24, x + 4, y - 4] as [number, number, number, number]),
        ...[760, 1500, 2060, 2440, 2820, 3100, 3380, 3760].map(x => [x - 4, yAbajo + 4, x + 4, ALTO - 24] as [number, number, number, number]),
        // Frente de las salas de abajo (con las aberturas de las puertas; la recepción queda abierta)
        [24, yAbajo - 4, 300, yAbajo + 4], [380, yAbajo - 4, 764, yAbajo + 4],
        [2816, yAbajo - 4, 2930, yAbajo + 4], [2990, yAbajo - 4, 3104, yAbajo + 4],
        [3104, yAbajo - 4, 3180, yAbajo + 4], [3240, yAbajo - 4, 3384, yAbajo + 4],
    ];
    // Oficinas de abajo (de agentes y libres): su puerta queda a la izquierda del vidrio
    const oficinasAbajo = [...AGENTES.filter(a => OFICINAS[a.id].abajo).map(a => OFICINAS[a.id]), ...OFICINAS_LIBRES];
    // Frentes vidriados, dejando la puerta
    const vidriados: [number, number, number][] = [
        [24, 530, y], [590, 616, y],
        ...AGENTES.filter(a => !OFICINAS[a.id].abajo).map(a => [OFICINAS[a.id].x1 + 4, puertaOficina(a.id) - 32, y] as [number, number, number]),
        [2524, 2650, y], [2710, 2836, y],
        [2844, 2870, y], [2930, 3376, y],
        // Abajo: sala de equipo y oficinas
        [1504, 1980, yAbajo], [2040, 2056, yAbajo],
        ...oficinasAbajo.map(o => [o.x1 + 80, o.x2 - 4, yAbajo] as [number, number, number]),
    ];
    return (
        <group>
            <mesh rotation-x={-Math.PI / 2} material={m.piso} receiveShadow>
                <planeGeometry args={[ANCHO / 100, ALTO / 100]} />
            </mesh>
            <Piso x1={2524} y1={24} x2={2836} y2={476} material={m.cemento} />
            <Piso x1={3104} y1={684} x2={3376} y2={1136} material={m.azulejo} />
            <Piso x1={24} y1={684} x2={210} y2={1136} material={m.azulejo} />
            {/* Pared del fondo: zócalo macizo, ventanal corrido con parantes y dintel */}
            <Bloque x1={0} y1={0} x2={ANCHO} y2={24} alto={0.42} material={m.pared} />
            <Bloque x1={0} y1={6} x2={ANCHO} y2={18} alto={0.6} desde={0.42} material={m.vidrio} sombra={false} />
            <Bloque x1={0} y1={0} x2={ANCHO} y2={24} alto={0.06} desde={1.02} material={m.paredTope} sombra={false} />
            {Array.from({ length: Math.floor(ANCHO / 120) + 1 }).map((_, i) => (
                <Bloque key={i} x1={i * 120 - 3} y1={4} x2={i * 120 + 3} y2={20} alto={0.6} desde={0.42} material={m.aluminio} sombra={false} />
            ))}
            {macizas.map(([x1, y1, x2, y2, alto], i) => <Pared key={i} x1={x1} y1={y1} x2={x2} y2={y2} m={m} alto={alto} />)}
            {vidriados.map(([x1, x2, yy]) => <Vidriado key={`${x1}-${yy}`} x1={x1} x2={x2} y={yy} m={m} />)}
            {/* Puerta de los baños, cerrada */}
            <Bloque x1={3180} y1={yAbajo - 3} x2={3240} y2={yAbajo + 3} alto={0.98} material={m.maderaClara} />
        </group>
    );
}

// ── Oficinas y salas ─────────────────────────────────────────────────────────

// Oficina privada. Se dibuja como las de arriba (ventana al fondo, puerta a la derecha); las de
// abajo son la misma oficina girada media vuelta sobre su centro.
function OficinaPrivada({ m, x1, x2, abajo = false }: { m: Materiales; x1: number; x2: number; abajo?: boolean }) {
    const cx = (x1 + x2) / 2;
    const libros = useMemo(() => {
        const r = semilla(x1 + (abajo ? 7 : 0));
        const filas: { y: number; alto: number; nivel: number; i: number }[] = [];
        for (const nivel of [0.08, 0.48, 0.88, 1.28]) {
            let y = 72;
            while (y < 318) {
                const ancho = 4 + Math.floor(r() * 4);
                if (r() > 0.12) filas.push({ y, alto: 0.2 + r() * 0.12, nivel, i: Math.floor(r() * 6) });
                y += ancho + 1;
            }
        }
        return filas;
    }, [x1, abajo]);
    const contenido = (
        <group>
            <Piso x1={x1 + 60} y1={70} x2={x2 - 80} y2={340} material={m.alfombra} />
            {/* Aparador contra la ventana, detrás de la silla */}
            <Bloque x1={cx - 80} y1={30} x2={cx + 60} y2={72} alto={0.7} material={m.madera} redondeo={0.015} />
            <Cilindro x={cx - 55} y={50} r={0.07} r2={0.09} alto={0.2} desde={0.7} material={m.maceta} />
            <Bloque x1={cx + 10} y1={44} x2={cx + 40} y2={56} alto={0.05} desde={0.7} material={m.libros[0]} />
            <Escritorio m={m} x={cx} y={Y_ESCRITORIO} />
            <Silla m={m} x={cx} y={Y_SILLA - 4} angulo={0} oficina />
            {/* Puestos de los dos asistentes (mini IA): escritorio chico, pantalla y silla */}
            {DX_ASISTENTE.map(dx => <PuestoAsistente key={dx} m={m} x={x1 + dx} />)}
            {/* Biblioteca contra la pared, con libros */}
            <Bloque x1={x1 + 6} y1={66} x2={x1 + 38} y2={324} alto={1.65} material={m.madera} />
            {[0.06, 0.46, 0.86, 1.26].map(n => <Bloque key={n} x1={x1 + 38} y1={68} x2={x1 + 40} y2={322} alto={0.02} desde={n} material={m.maderaClara} sombra={false} />)}
            {libros.map((l, i) => (
                <mesh key={i} position={[mx(x1 + 46), l.nivel + l.alto / 2, mz(l.y + 2)]} material={m.libros[l.i]} castShadow>
                    <boxGeometry args={[0.16, l.alto, 0.04]} />
                </mesh>
            ))}
            {/* Lámpara de pie en la esquina */}
            <Cilindro x={x1 + 40} y={460} r={0.12} alto={0.02} material={m.metalOscuro} />
            <Cilindro x={x1 + 40} y={460} r={0.012} alto={1.45} material={m.metalOscuro} />
            <Cilindro x={x1 + 40} y={460} r={0.15} r2={0.09} alto={0.18} desde={1.42} material={m.lampara} />
            <Planta m={m} x={x2 - 40} y={58} grande={false} />
        </group>
    );
    if (!abajo) return contenido;
    // Media vuelta: el centro de la oficina de arriba (y = 250) pasa al centro de la de abajo
    const yCentro = (FRENTE_ABAJO + 4 + ALTO - 24) / 2;
    return (
        <group position={[mx(cx), 0, mz(yCentro)]} rotation-y={Math.PI}>
            <group position={[-mx(cx), 0, -mz(250)]}>{contenido}</group>
        </group>
    );
}

function Escritorio({ m, x, y }: { m: Materiales; x: number; y: number }) {
    return (
        <group>
            {/* Tapa de madera, patas metálicas y panel de frente */}
            <Bloque x1={x - 80} y1={y - 38} x2={x + 80} y2={y + 38} alto={0.04} desde={0.73} material={m.madera} redondeo={0.012} />
            {[-78, 74].map(dx => <Bloque key={dx} x1={x + dx} y1={y - 35} x2={x + dx + 4} y2={y + 35} alto={0.73} material={m.metalOscuro} />)}
            <Bloque x1={x - 74} y1={y + 31} x2={x + 74} y2={y + 34} alto={0.4} desde={0.3} material={m.madera} />
            {/* Monitor mirando hacia la silla */}
            <mesh position={[mx(x), 1.07, mz(y + 18)]} material={m.negro} castShadow>
                <boxGeometry args={[0.62, 0.37, 0.025]} />
            </mesh>
            <mesh position={[mx(x), 1.07, mz(y + 18) - 0.014]} rotation-y={Math.PI} material={m.pantalla}>
                <planeGeometry args={[0.58, 0.33]} />
            </mesh>
            <Bloque x1={x - 3} y1={y + 16} x2={x + 3} y2={y + 22} alto={0.16} desde={0.77} material={m.metal} />
            <Bloque x1={x - 12} y1={y + 12} x2={x + 12} y2={y + 26} alto={0.01} desde={0.77} material={m.metal} />
            {/* Teclado, mouse, taza, papeles y lámpara */}
            <Bloque x1={x - 22} y1={y - 24} x2={x + 22} y2={y - 11} alto={0.015} desde={0.77} material={m.blanco} redondeo={0.004} />
            <Bloque x1={x + 30} y1={y - 22} x2={x + 36} y2={y - 13} alto={0.02} desde={0.77} material={m.blanco} redondeo={0.008} />
            <Cilindro x={x - 52} y={y - 16} r={0.04} alto={0.1} desde={0.77} material={m.blanco} />
            <Bloque x1={x + 44} y1={y - 8} x2={x + 65} y2={y + 22} alto={0.01} desde={0.77} material={m.blanco} sombra={false} />
            <Cilindro x={x - 62} y={y + 20} r={0.06} alto={0.02} desde={0.77} material={m.metalOscuro} />
            <Cilindro x={x - 62} y={y + 20} r={0.01} alto={0.35} desde={0.77} material={m.metalOscuro} />
            <Cilindro x={x - 62} y={y + 20} r={0.09} r2={0.04} alto={0.1} desde={1.08} material={m.lampara} />
        </group>
    );
}

// Puesto de un asistente: escritorio chico contra el vidrio del frente, pantalla mirando a la silla
function PuestoAsistente({ m, x }: { m: Materiales; x: number }) {
    const y = Y_MESA_ASISTENTE;
    return (
        <group>
            <Bloque x1={x - 50} y1={y - 28} x2={x + 50} y2={y + 28} alto={0.04} desde={0.72} material={m.maderaClara} redondeo={0.01} />
            {[-48, 44].map(dx => <Bloque key={dx} x1={x + dx} y1={y - 25} x2={x + dx + 4} y2={y + 25} alto={0.72} material={m.aluminio} />)}
            <mesh position={[mx(x), 1.0, mz(y - 10)]} material={m.negro} castShadow>
                <boxGeometry args={[0.46, 0.28, 0.02]} />
            </mesh>
            <mesh position={[mx(x), 1.0, mz(y - 10) + 0.012]} material={m.pantalla}>
                <planeGeometry args={[0.42, 0.24]} />
            </mesh>
            <Bloque x1={x - 2} y1={y - 12} x2={x + 2} y2={y - 8} alto={0.12} desde={0.76} material={m.metal} />
            <Bloque x1={x - 18} y1={y + 6} x2={x + 18} y2={y + 16} alto={0.015} desde={0.76} material={m.blanco} redondeo={0.004} />
            <Silla m={m} x={x} y={Y_SILLA_ASISTENTE + 4} angulo={Math.PI} oficina />
        </group>
    );
}

// Pantalla grande colgada de una pared lateral (mirando hacia +x o −x)
function Tele({ m, x, y, haciaDerecha }: { m: Materiales; x: number; y: number; haciaDerecha: boolean }) {
    const giro = haciaDerecha ? Math.PI / 2 : -Math.PI / 2;
    return (
        <group>
            <mesh position={[mx(x), 1.15, mz(y)]} rotation-y={giro} material={m.negro} castShadow>
                <boxGeometry args={[1.2, 0.7, 0.04]} />
            </mesh>
            <mesh position={[mx(x) + (haciaDerecha ? 0.022 : -0.022), 1.15, mz(y)]} rotation-y={giro} material={m.pantalla}>
                <planeGeometry args={[1.14, 0.64]} />
            </mesh>
        </group>
    );
}

function SalaReuniones({ m }: { m: Materiales }) {
    const barras = [0.22, 0.38, 0.3, 0.5, 0.44, 0.62, 0.55, 0.7];
    const colores = useMemo(() => ["#C9A877", "#7D9878", "#C9A877", "#7D9878", "#C9866F", "#7D9878", "#C9A877", "#7D9878"].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })), []);
    return (
        <group>
            <Piso x1={70} y1={175} x2={530} y2={430} material={m.alfombraArena} />
            {/* Pizarra con un gráfico de barras (los agentes se paran delante) */}
            <Bloque x1={150} y1={34} x2={450} y2={40} alto={1.0} desde={0.75} material={m.blanco} />
            <Bloque x1={148} y1={32} x2={452} y2={42} alto={0.03} desde={1.75} material={m.aluminio} />
            {[154, 446].map(x => <Bloque key={x} x1={x - 3} y1={34} x2={x + 3} y2={40} alto={0.75} material={m.aluminio} />)}
            {barras.map((h, i) => (
                <mesh key={i} position={[mx(190 + i * 32), 0.88 + h / 2, mz(41)]} material={colores[i]}>
                    <boxGeometry args={[0.2, h, 0.01]} />
                </mesh>
            ))}
            {/* Mesa larga para diez con sillas */}
            <Bloque x1={120} y1={250} x2={480} y2={350} alto={0.04} desde={0.73} material={m.madera} redondeo={0.015} />
            {[150, 450].map(x => <Bloque key={x} x1={x - 3} y1={275} x2={x + 3} y2={325} alto={0.73} material={m.metalOscuro} />)}
            {[160, 230, 300, 370, 440].map(x => (
                <group key={x}>
                    <Silla m={m} x={x} y={226} angulo={0} />
                    <Silla m={m} x={x} y={374} angulo={Math.PI} />
                </group>
            ))}
            <Silla m={m} x={96} y={300} angulo={Math.PI / 2} />
            <Silla m={m} x={504} y={300} angulo={-Math.PI / 2} />
            {/* Mueble con pantalla contra la pared */}
            <Bloque x1={30} y1={120} x2={66} y2={420} alto={0.65} material={m.madera} />
            <Tele m={m} x={56} y={270} haciaDerecha />
            <Planta m={m} x={580} y={50} grande={false} />
            <Planta m={m} x={60} y={450} grande />
        </group>
    );
}

// Sala de reuniones 2 (arriba a la derecha): mesa para ocho y pantalla
function SalaReuniones2({ m }: { m: Materiales }) {
    const s = SALAS_EQUIPO.chica;
    return (
        <group>
            <Piso x1={2950} y1={140} x2={3300} y2={370} material={m.alfombraArena} />
            {/* Pizarra (la usan los agentes del lado derecho del piso) */}
            <Bloque x1={2990} y1={34} x2={3230} y2={40} alto={1.0} desde={0.75} material={m.blanco} />
            <Bloque x1={2988} y1={32} x2={3232} y2={42} alto={0.03} desde={1.75} material={m.aluminio} />
            {[2994, 3226].map(x => <Bloque key={x} x1={x - 3} y1={34} x2={x + 3} y2={40} alto={0.75} material={m.aluminio} />)}
            <Bloque x1={2980} y1={200} x2={3260} y2={290} alto={0.04} desde={0.73} material={m.maderaClara} redondeo={0.015} />
            {[3005, 3235].map(x => <Bloque key={x} x1={x - 3} y1={225} x2={x + 3} y2={265} alto={0.73} material={m.metalOscuro} />)}
            {s.asientos.map(x => (
                <group key={x}>
                    <Silla m={m} x={x} y={s.ySilla} angulo={0} oficina />
                    <Silla m={m} x={x} y={314} angulo={Math.PI} oficina />
                </group>
            ))}
            <Bloque x1={3330} y1={150} x2={3370} y2={340} alto={0.6} material={m.madera} />
            <Tele m={m} x={3364} y={245} haciaDerecha={false} />
            <Planta m={m} x={3340} y={440} grande />
            <Planta m={m} x={2880} y={50} grande={false} />
        </group>
    );
}

// Sala de equipo (abajo): mesa larga donde se juntan los equipos que arman los agentes
function SalaEquipo({ m }: { m: Materiales }) {
    const s = SALAS_EQUIPO.equipo;
    return (
        <group>
            <Piso x1={1540} y1={740} x2={2020} y2={1010} material={m.alfombraArena} />
            <Bloque x1={1600} y1={830} x2={1960} y2={920} alto={0.04} desde={0.73} material={m.madera} redondeo={0.015} />
            {[1630, 1930].map(x => <Bloque key={x} x1={x - 3} y1={855} x2={x + 3} y2={895} alto={0.73} material={m.metalOscuro} />)}
            {s.asientos.map(x => (
                <group key={x}>
                    <Silla m={m} x={x} y={s.ySilla} angulo={0} oficina />
                    <Silla m={m} x={x} y={944} angulo={Math.PI} oficina />
                </group>
            ))}
            <Silla m={m} x={1576} y={875} angulo={Math.PI / 2} oficina />
            <Silla m={m} x={1984} y={875} angulo={-Math.PI / 2} oficina />
            <Tele m={m} x={1510} y={875} haciaDerecha />
            {/* Aparador contra la pared con una planta */}
            <Bloque x1={1620} y1={1090} x2={1940} y2={1130} alto={0.7} material={m.madera} />
            <Cilindro x={1660} y={1110} r={0.07} r2={0.09} alto={0.2} desde={0.7} material={m.maceta} />
            <Planta m={m} x={2020} y={1095} grande />
        </group>
    );
}

function Servidores({ m }: { m: Materiales }) {
    return (
        <group>
            {[2540, 2590, 2640, 2690, 2740].map((x, i) => (
                <group key={x}>
                    <Bloque x1={x} y1={40} x2={x + 42} y2={102} alto={1.9} material={m.metalOscuro} redondeo={0.02} />
                    {/* Frente: servidores con lucecitas */}
                    {Array.from({ length: 7 }).map((_, j) => (
                        <group key={j}>
                            <mesh position={[mx(x + 21), 0.2 + j * 0.24, mz(103)]} material={m.negro}>
                                <boxGeometry args={[0.36, 0.18, 0.01]} />
                            </mesh>
                            <mesh position={[mx(x + 35), 0.24 + j * 0.24, mz(104)]} material={(i + j) % 4 === 0 ? m.luzAmbar : m.luzVerde}>
                                <sphereGeometry args={[0.014, 8, 8]} />
                            </mesh>
                        </group>
                    ))}
                </group>
            ))}
            {/* Aire acondicionado de precisión y equipo de energía */}
            <Bloque x1={2800} y1={260} x2={2834} y2={340} alto={1.8} material={m.blanco} redondeo={0.02} />
            <Bloque x1={2532} y1={300} x2={2582} y2={380} alto={1.0} material={m.negro} redondeo={0.02} />
        </group>
    );
}

function SalaDescanso({ m }: { m: Materiales }) {
    return (
        <group>
            {/* Cocina contra la pared: mesada con bacha, cafetera, tazas, microondas y heladera */}
            <Bloque x1={28} y1={700} x2={92} y2={960} alto={0.9} material={m.madera} redondeo={0.015} />
            <Bloque x1={26} y1={698} x2={96} y2={962} alto={0.04} desde={0.9} material={m.marmol} redondeo={0.01} />
            <Bloque x1={40} y1={720} x2={80} y2={770} alto={0.02} desde={0.935} material={m.metal} sombra={false} />
            <Bloque x1={36} y1={808} x2={84} y2={852} alto={0.4} desde={0.94} material={m.metal} redondeo={0.03} />
            <Bloque x1={42} y1={812} x2={78} y2={824} alto={0.07} desde={1.18} material={m.negro} />
            {[866, 884].map(y => <Cilindro key={y} x={60} y={y} r={0.04} alto={0.08} desde={0.94} material={m.ceramica} />)}
            <Bloque x1={34} y1={904} x2={88} y2={952} alto={0.3} desde={0.94} material={m.blanco} redondeo={0.02} />
            <Bloque x1={28} y1={972} x2={94} y2={1042} alto={1.85} material={m.aluminio} redondeo={0.03} />
            {/* Mesa redonda para comer, con cuatro sillas */}
            <Cilindro x={250} y={1040} r={0.45} alto={0.04} desde={0.73} material={m.maderaClara} lados={40} />
            <Cilindro x={250} y={1040} r={0.05} alto={0.73} material={m.metalOscuro} />
            <Cilindro x={250} y={1040} r={0.25} alto={0.02} material={m.metalOscuro} />
            <Silla m={m} x={250} y={976} angulo={0} />
            <Silla m={m} x={250} y={1104} angulo={Math.PI} />
            <Silla m={m} x={186} y={1040} angulo={Math.PI / 2} />
            <Silla m={m} x={314} y={1040} angulo={-Math.PI / 2} />
            {/* Living: alfombra, sillón grande, otro sillón contra la pared, sillón individual y mesa ratona */}
            <Piso x1={440} y1={720} x2={754} y2={1130} material={m.alfombraArena} />
            <Bloque x1={680} y1={730} x2={750} y2={980} alto={0.42} material={m.telaSalvia} redondeo={0.05} />
            <Bloque x1={732} y1={730} x2={752} y2={980} alto={0.82} material={m.telaSalvia} redondeo={0.05} />
            {[730, 962].map(y => <Bloque key={y} x1={680} y1={y} x2={750} y2={y + 18} alto={0.6} material={m.telaSalvia} redondeo={0.05} />)}
            {[788, 855, 922].map(y => <Bloque key={y} x1={686} y1={y - 32} x2={732} y2={y + 32} alto={0.08} desde={0.42} material={m.telaArena} redondeo={0.03} />)}
            <Bloque x1={470} y1={1066} x2={670} y2={1132} alto={0.42} material={m.telaSalvia} redondeo={0.05} />
            <Bloque x1={470} y1={1112} x2={670} y2={1132} alto={0.82} material={m.telaSalvia} redondeo={0.05} />
            <Bloque x1={560} y1={810} x2={630} y2={960} alto={0.04} desde={0.38} material={m.maderaClara} redondeo={0.01} />
            {[[564, 814], [622, 814], [564, 952], [622, 952]].map(([x, y], i) => <Bloque key={i} x1={x} y1={y} x2={x + 4} y2={y + 4} alto={0.38} material={m.metalOscuro} />)}
            <Cilindro x={595} y={870} r={0.05} alto={0.12} desde={0.42} material={m.ceramica} />
            <Bloque x1={466} y1={850} x2={512} y2={904} alto={0.42} material={m.telaArena} redondeo={0.05} />
            <Bloque x1={462} y1={850} x2={474} y2={904} alto={0.8} material={m.telaArena} redondeo={0.04} />
            <Planta m={m} x={715} y={1095} grande />
            <Planta m={m} x={420} y={720} grande={false} />
        </group>
    );
}

// Vidrio de los frascos en tonos naturales
const TONOS_FRASCO = ["#D8C3A0", "#C9D3CE", "#E2D3BE", "#BFC8BD", "#D6C9C2", "#CBB8A6", "#C4CDD2"];

function Recepcion({ m }: { m: Materiales }) {
    const frascos = useMemo(() => TONOS_FRASCO.map(t => new THREE.MeshPhysicalMaterial({
        color: t, transmission: 0.6, roughness: 0.08, thickness: 0.05, ior: 1.5, transparent: true, opacity: 0.85, clearcoat: 1,
    })), []);
    return (
        <group>
            <Piso x1={800} y1={720} x2={1460} y2={1060} material={m.alfombra} alto={0.003} />
            {/* Mostrador de recepción con computadora y su silla */}
            <Bloque x1={846} y1={758} x2={1024} y2={806} alto={1.0} material={m.madera} redondeo={0.02} />
            <Bloque x1={842} y1={754} x2={1028} y2={770} alto={0.04} desde={1.0} material={m.marmol} redondeo={0.01} />
            <Bloque x1={852} y1={770} x2={1018} y2={804} alto={0.03} desde={0.73} material={m.maderaClara} />
            <mesh position={[mx(935), 0.98, mz(784)]} material={m.negro} castShadow>
                <boxGeometry args={[0.5, 0.3, 0.02]} />
            </mesh>
            <mesh position={[mx(935), 0.98, mz(784) + 0.012]} material={m.pantalla}>
                <planeGeometry args={[0.46, 0.26]} />
            </mesh>
            <Silla m={m} x={935} y={842} angulo={Math.PI} oficina />
            {/* Exhibidor de perfumes contra la pared: mueble bajo, estantes de vidrio y frascos */}
            <Bloque x1={900} y1={1090} x2={1400} y2={1132} alto={0.42} material={m.madera} />
            <Bloque x1={900} y1={1124} x2={1400} y2={1132} alto={1.25} desde={0.42} material={m.maderaClara} />
            {[0.82, 1.22].map(n => <Bloque key={n} x1={904} y1={1096} x2={1396} y2={1124} alto={0.02} desde={n} material={m.vidrio} sombra={false} />)}
            {[0.42, 0.84, 1.24].map((n, k) => Array.from({ length: 14 }).map((_, j) => {
                const x = 922 + j * 35;
                return (
                    <group key={`${k}-${j}`}>
                        <Cilindro x={x} y={1108} r={0.045} alto={0.15} desde={n} material={frascos[(k * 4 + j) % frascos.length]} />
                        <Cilindro x={x} y={1108} r={0.02} alto={0.05} desde={n + 0.15} material={m.metalOscuro} />
                    </group>
                );
            }))}
            {/* Espera: cuatro sillones enfrentados y mesita */}
            {[1300, 1400].map(x => (
                <group key={x}>
                    <Bloque x1={x - 28} y1={740} x2={x + 28} y2={792} alto={0.42} material={m.tela} redondeo={0.05} />
                    <Bloque x1={x - 28} y1={726} x2={x + 28} y2={740} alto={0.78} material={m.tela} redondeo={0.04} />
                    <Bloque x1={x - 28} y1={870} x2={x + 28} y2={922} alto={0.42} material={m.tela} redondeo={0.05} />
                    <Bloque x1={x - 28} y1={922} x2={x + 28} y2={936} alto={0.78} material={m.tela} redondeo={0.04} />
                </group>
            ))}
            <Cilindro x={1350} y={831} r={0.32} alto={0.03} desde={0.45} material={m.marmol} />
            <Cilindro x={1350} y={831} r={0.04} alto={0.45} material={m.metalOscuro} />
            <Planta m={m} x={800} y={1095} grande />
            <Planta m={m} x={1460} y={1095} grande />
            <Planta m={m} x={1460} y={720} grande={false} />
        </group>
    );
}

function Archivo({ m }: { m: Materiales }) {
    const cajonera = (x1: number, y1: number, x2: number, y2: number, frente: "abajo" | "izq" | "der") => (
        <group>
            <Bloque x1={x1} y1={y1} x2={x2} y2={y2} alto={1.32} material={m.archivo} redondeo={0.01} />
            {[0.2, 0.52, 0.84, 1.16].map(h => {
                const pos: [number, number, number] =
                    frente === "abajo" ? [mx((x1 + x2) / 2), h, mz(y1) - 0.006]
                        : frente === "izq" ? [mx(x2) + 0.006, h, mz((y1 + y2) / 2)]
                            : [mx(x1) - 0.006, h, mz((y1 + y2) / 2)];
                const largo = (frente === "abajo" ? x2 - x1 : y2 - y1) / 100 - 0.06;
                return (
                    <mesh key={h} position={pos} rotation-y={frente === "abajo" ? 0 : Math.PI / 2} material={m.metalOscuro}>
                        <boxGeometry args={[largo, 0.015, 0.01]} />
                    </mesh>
                );
            })}
        </group>
    );
    return (
        <group>
            {cajonera(2840, 1090, 3080, 1132, "abajo")}
            {cajonera(2826, 720, 2866, 990, "izq")}
            {cajonera(3054, 720, 3094, 990, "der")}
        </group>
    );
}

function Banos({ m }: { m: Materiales }) {
    return (
        <group>
            {/* Mesada con tres bachas */}
            <Bloque x1={3108} y1={720} x2={3162} y2={960} alto={0.85} material={m.madera} />
            <Bloque x1={3106} y1={718} x2={3166} y2={962} alto={0.04} desde={0.85} material={m.marmol} />
            {[770, 840, 910].map(y => <Cilindro key={y} x={3136} y={y} r={0.15} alto={0.06} desde={0.86} material={m.ceramica} />)}
            {/* Dos cubículos con inodoro */}
            {[3240, 3310].map(x => <Bloque key={x} x1={x - 3} y1={990} x2={x + 3} y2={1136} alto={1.0} material={m.pared} />)}
            {[3275, 3343].map(x => (
                <group key={x}>
                    <Cilindro x={x} y={1095} r={0.17} r2={0.2} alto={0.42} material={m.ceramica} />
                    <Bloque x1={x - 18} y1={1120} x2={x + 18} y2={1132} alto={0.75} material={m.ceramica} />
                </group>
            ))}
        </group>
    );
}

// Silla: angulo = hacia dónde mira quien se sienta (radianes, 0 = hacia la cámara)
function Silla({ m, x, y, angulo, oficina = false }: { m: Materiales; x: number; y: number; angulo: number; oficina?: boolean }) {
    return (
        <group position={[mx(x), 0, mz(y)]} rotation={[0, angulo, 0]}>
            <mesh position={[0, 0.46, 0]} material={m.tela} castShadow receiveShadow>
                <boxGeometry args={[0.44, 0.07, 0.42]} />
            </mesh>
            <mesh position={[0, oficina ? 0.8 : 0.7, -0.21]} material={m.tela} castShadow>
                <boxGeometry args={[0.42, oficina ? 0.6 : 0.42, 0.05]} />
            </mesh>
            {oficina ? (
                <>
                    <mesh position={[0, 0.22, 0]} material={m.metalOscuro} castShadow>
                        <cylinderGeometry args={[0.025, 0.025, 0.42, 12]} />
                    </mesh>
                    {[0, 72, 144, 216, 288].map(a => (
                        <mesh key={a} position={[Math.sin((a * Math.PI) / 180) * 0.15, 0.04, Math.cos((a * Math.PI) / 180) * 0.15]} rotation={[0, (a * Math.PI) / 180, 0]} material={m.metalOscuro} castShadow>
                            <boxGeometry args={[0.04, 0.03, 0.3]} />
                        </mesh>
                    ))}
                </>
            ) : (
                [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].map(([dx, dz], i) => (
                    <mesh key={i} position={[dx, 0.215, dz]} material={m.metalOscuro} castShadow>
                        <boxGeometry args={[0.03, 0.43, 0.03]} />
                    </mesh>
                ))
            )}
        </group>
    );
}

function Planta({ m, x, y, grande }: { m: Materiales; x: number; y: number; grande: boolean }) {
    const hojas = useMemo(() => {
        const r = semilla(Math.round(x * 7 + y));
        return Array.from({ length: grande ? 9 : 6 }).map(() => ({
            dx: (r() - 0.5) * 0.4, dz: (r() - 0.5) * 0.4, dy: 0.55 + r() * (grande ? 0.8 : 0.45), s: 0.16 + r() * 0.12, clara: r() > 0.5,
        }));
    }, [x, y, grande]);
    return (
        <group>
            <Cilindro x={x} y={y} r={0.17} r2={0.21} alto={0.45} material={m.maceta} />
            {hojas.map((h, i) => (
                <mesh key={i} position={[mx(x) + h.dx, h.dy, mz(y) + h.dz]} material={h.clara ? m.hojaClara : m.hoja} castShadow>
                    <icosahedronGeometry args={[h.s, 1]} />
                </mesh>
            ))}
        </group>
    );
}

// Nombres de las salas (en el piso del pasillo, frente a cada puerta) y el cartel de cada oficina
const NOMBRES_SALAS: { texto: string; x: number; y: number }[] = [
    { texto: "Sala de reuniones", x: 300, y: 512 }, { texto: "Servidores", x: 2600, y: 512 },
    { texto: "Sala de reuniones 2", x: 3110, y: 512 },
    { texto: "Sala de descanso", x: 170, y: 650 }, { texto: "Recepción", x: 1000, y: 650 },
    { texto: "Sala de equipo", x: 1760, y: 650 }, { texto: "Archivo", x: 2965, y: 650 }, { texto: "Baños", x: 3290, y: 650 },
    { texto: "Oficina libre", x: 3990, y: 650 },
];
// Donde va el cartel "En reunión": delante de la mesa (del lado de la cámara), para no tapar a nadie
const CENTRO_SALA: Record<SalaEquipo, Punto> = { equipo: { x: 1780, y: 1000 }, chica: { x: 3120, y: 380 } };

// ── Carteles ─────────────────────────────────────────────────────────────────
// Los carteles son elementos comunes de la página, encima del dibujo 3D. En cada cuadro se calcula
// en qué punto de la pantalla cae su lugar en 3D y se los mueve ahí (achicándolos con la distancia).
// Así no hace falta un React aparte por cartel, que era lo que hacía protestar a React al desarmarlos.

/** Punto 3D de un cartel: fijo, o encima de una persona (que se mueve) */
type Ancla = { punto?: THREE.Vector3; persona?: IdPersona; alto?: number; factor: number };

const ANCLAS = new Map<string, Ancla>([
    ...NOMBRES_SALAS.map(e => [`sala:${e.texto}:${e.x}`, { punto: new THREE.Vector3(mx(e.x), 0.02, mz(e.y)), factor: 15 }] as const),
    ...(Object.keys(CENTRO_SALA) as SalaEquipo[]).map(s => [`reunion:${s}`, { punto: new THREE.Vector3(mx(CENTRO_SALA[s].x), 0.9, mz(CENTRO_SALA[s].y)), factor: 15 }] as const),
    // Cartel de cada oficina sobre su vidrio del frente (las de abajo tienen el frente del lado del pasillo)
    ...AGENTES.map(a => [`oficina:${a.id}`, {
        punto: OFICINAS[a.id].abajo
            ? new THREE.Vector3(mx(centroOficina(a.id) + 30), 1.2, mz(FRENTE_ABAJO))
            : new THREE.Vector3(mx(centroOficina(a.id) - 30), 1.2, mz(FRENTE_ARRIBA)),
        factor: 16,
    }] as const),
    ...PERSONAS.map(p => [`persona:${p}`, { persona: p, alto: esAsistente(p) ? 1.95 : 2.15, factor: 15 }] as const),
]);

/** Dónde están los carteles (elementos de la página) y las personas (objetos 3D) para ubicarlos */
type Registro = { elementos: Map<string, HTMLElement>; personas: Map<string, THREE.Object3D> };

// Dentro del dibujo 3D: en cada cuadro mueve cada cartel a su lugar en la pantalla
function Proyector({ registro }: { registro: Registro }) {
    const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
    const size = useThree(s => s.size);
    useFrame(() => {
        const altoVista = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        // Carteles con texto que compiten por lugar (los vacíos no ocupan espacio)
        const visibles: { el: HTMLElement; x: number; y: number; w: number; h: number; prioridad: number }[] = [];
        for (const [clave, el] of registro.elementos) {
            const a = ANCLAS.get(clave);
            if (!a) continue;
            if (a.persona) {
                const o = registro.personas.get(a.persona);
                if (!o) continue;
                o.getWorldPosition(_v);
                _v.y += a.alto ?? 0;
            } else if (a.punto) _v.copy(a.punto);
            const distancia = camera.position.distanceTo(_v);
            _v.project(camera);
            if (_v.z < -1 || _v.z > 1) {
                el.style.setProperty("visibility", "hidden");
                continue;
            }
            const x = (_v.x * 0.5 + 0.5) * size.width;
            const y = (-_v.y * 0.5 + 0.5) * size.height;
            // Se agrandan un poco al acercarse, pero nunca quedan tan chicos que no se lean
            const escala = THREE.MathUtils.clamp(Math.sqrt(a.factor / (altoVista * distancia)), 0.9, 1.45);
            el.style.setProperty("transform", `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${escala.toFixed(3)})`);
            if (el.dataset.vacio === "1") {
                el.style.setProperty("visibility", "visible");
                continue;
            }
            visibles.push({ el, x, y, w: el.offsetWidth * escala, h: el.offsetHeight * escala, prioridad: Number(el.dataset.prioridad) || 0 });
        }
        // Que no se pisen: se ubican del más importante al menos; si uno choca con otro ya ubicado,
        // se esconde hasta que haya lugar (al moverse las personas o la cámara)
        visibles.sort((a, b) => b.prioridad - a.prioridad);
        const ubicados: { x1: number; y1: number; x2: number; y2: number }[] = [];
        const margen = 4;
        for (const v of visibles) {
            const r = { x1: v.x - v.w / 2 - margen, y1: v.y - v.h / 2 - margen, x2: v.x + v.w / 2 + margen, y2: v.y + v.h / 2 + margen };
            const choca = ubicados.some(u => r.x1 < u.x2 && r.x2 > u.x1 && r.y1 < u.y2 && r.y2 > u.y1);
            v.el.style.setProperty("visibility", choca ? "hidden" : "visible");
            if (!choca) ubicados.push(r);
        }
    });
    return null;
}
const _v = new THREE.Vector3();

// Fuera del dibujo 3D: los carteles en sí (nombres de salas, oficinas, reuniones y lo que dice cada uno)
function Carteles({ registro, personas, encima, ultimos, trabajando, reuniones }: {
    registro: Registro;
    personas: Record<string, EstadoPersona>;
    encima: IdPersona | null;
    ultimos: Partial<Record<IdAgente, ResultadoAgente>>;
    trabajando: Set<IdAgente>;
    reuniones: Reunion[];
}) {
    // Cada cartel se anota en el registro al aparecer (para que el Proyector lo mueva)
    const anotar = (clave: string) => (el: HTMLElement | null) => {
        if (el) registro.elementos.set(clave, el);
        else registro.elementos.delete(clave);
    };
    const lugar = "absolute left-0 top-0 invisible will-change-transform";
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
            {NOMBRES_SALAS.map(e => (
                <div key={`${e.texto}-${e.x}`} ref={anotar(`sala:${e.texto}:${e.x}`)} data-prioridad={10} className={`${lugar} z-[1]`}>
                    <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 whitespace-nowrap [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">{e.texto}</span>
                </div>
            ))}
            {/* Cartel de cada oficina sobre el vidrio del frente, con el estado del agente */}
            {AGENTES.map(a => {
                const r = ultimos[a.id];
                const urg = r?.hallazgos.filter(h => h.nivel === "urgente").length ?? 0;
                const ate = r?.hallazgos.filter(h => h.nivel === "atencion").length ?? 0;
                const color = trabajando.has(a.id) ? "#1baf7a" : urg ? "#C9866F" : ate ? "#C9A877" : r ? "#7D9878" : "#9A9A9A";
                return (
                    <div key={a.id} ref={anotar(`oficina:${a.id}`)} data-prioridad={50} className={`${lugar} z-[2]`}>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 dark:bg-[#1B1D1A]/90 border border-black/5 dark:border-white/10 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)] text-[14px] font-semibold text-[#2C2C2C] dark:text-[#F4EFEA] whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                            {a.nombre}
                        </span>
                    </div>
                );
            })}
            {/* "En reunión" delante de la mesa de cada sala ocupada */}
            {(Object.keys(CENTRO_SALA) as SalaEquipo[]).map(sala => {
                const r = reuniones.find(x => x.sala === sala);
                return (
                    <div key={sala} ref={anotar(`reunion:${sala}`)} data-prioridad={90} data-vacio={r ? "0" : "1"} className={`${lugar} z-[3]`}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1B1D1A]/85 dark:bg-[#F4EFEA]/90 text-[13px] font-semibold text-white dark:text-[#1B1D1A] whitespace-nowrap transition-opacity duration-200 ${r ? "opacity-100" : "opacity-0"}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1baf7a] animate-pulse" />
                            {r ? `En reunión · ${r.integrantes.map(nombreDe).join(", ")}` : ""}
                        </span>
                    </div>
                );
            })}
            {/* Lo que dice cada líder, o quién es cualquiera al pasar el mouse. Los asistentes no
                hablan solos (serían demasiados carteles): se ve que trabajan por su rombito */}
            {PERSONAS.map(p => {
                const lider = liderDe(p);
                const asistente = esAsistente(p);
                const conMouse = encima === p;
                const texto = conMouse
                    ? (asistente ? `${nombreAsistente(p).nombre} · ${nombreAsistente(p).tarea.toLowerCase()}` : nombreDe(lider))
                    : asistente ? null : personas[p].burbuja;
                const marca = AGENTES.find(a => a.id === lider)!.color;
                return (
                    <div key={p} ref={anotar(`persona:${p}`)} data-prioridad={conMouse ? 100 : 80} data-vacio={texto ? "0" : "1"} className={`${lugar} ${conMouse ? "z-[6]" : "z-[4]"}`}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1B1D1A]/85 dark:bg-[#F4EFEA]/90 ${asistente ? "text-[13px]" : "text-[14px]"} font-medium text-white dark:text-[#1B1D1A] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)] whitespace-nowrap transition-opacity duration-200 ${texto ? "opacity-100" : "opacity-0"}`}>
                            <span className={`w-1.5 h-1.5 ${asistente ? "rotate-45 rounded-[1px]" : "rounded-full"}`} style={{ background: marca }} />
                            {texto ?? ""}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
