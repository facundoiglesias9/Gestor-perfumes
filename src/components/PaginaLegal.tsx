import type { ReactNode } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/contacto";

export type SeccionLegal = { titulo: string; contenido: ReactNode };

const PAGINAS = [
    { href: "/terminos", titulo: "Términos y condiciones" },
    { href: "/privacidad", titulo: "Política de privacidad" },
] as const;

// Página legal pública con la misma estética del catálogo: encabezado con el logo,
// selector entre las dos páginas y las secciones numeradas.
export default function PaginaLegal({ actual, titulo, actualizacion, intro, secciones }: {
    actual: (typeof PAGINAS)[number]["href"];
    titulo: string;
    actualizacion: string;
    intro: ReactNode;
    secciones: SeccionLegal[];
}) {
    return (
        <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#1B1D1A] text-[#2C2C2C] dark:text-[#F4EFEA] font-sans">
            <header className="border-b border-[#E6DFD5] dark:border-[#353B33] bg-white/70 dark:bg-[#242723]/70 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <a href="/catalogo" className="justify-self-start inline-flex items-center gap-1.5 rounded-full px-3 py-2 -ml-3 text-sm font-semibold text-[#2C2C2C]/70 dark:text-[#F4EFEA]/65 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA] hover:bg-[#7D9878]/10 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Catálogo</span>
                    </a>
                    <a href="/catalogo" className="flex items-center gap-3">
                        <img src="/logo-scenta.png" alt="" className="h-10 w-auto object-contain dark:invert dark:brightness-200" />
                        <div className="text-left">
                            <p className="font-brand text-xl sm:text-2xl font-bold tracking-[0.25em] leading-none">SCENTA</p>
                            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#7D9878] dark:text-[#A3B69B] mt-1">Fragancias naturales</p>
                        </div>
                    </a>
                    <div />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#7D9878] dark:text-[#A3B69B]">Legales</p>
                <h1 className="font-brand text-3xl sm:text-5xl font-bold leading-tight mt-3">{titulo}</h1>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2C2C2C]/45 dark:text-[#F4EFEA]/40 mt-3">
                    Última actualización: {actualizacion}
                </p>

                <nav aria-label="Páginas legales" className="mt-8 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F4EFEA] dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33]">
                    {PAGINAS.map(p => {
                        const activa = p.href === actual;
                        return (
                            <a
                                key={p.href}
                                href={p.href}
                                aria-current={activa ? "page" : undefined}
                                className={`h-11 rounded-xl flex items-center justify-center px-2 text-center text-xs sm:text-sm font-semibold leading-tight transition-colors duration-150 ${activa
                                    ? "bg-white dark:bg-[#353B33] shadow-sm ring-1 ring-[#E6DFD5]/80 dark:ring-white/[0.04] text-[#2C2C2C] dark:text-[#F4EFEA]"
                                    : "text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                            >
                                {p.titulo}
                            </a>
                        );
                    })}
                </nav>

                <div className="mt-10 text-[15px] leading-relaxed text-[#2C2C2C]/80 dark:text-[#F4EFEA]/75">{intro}</div>

                <ol className="mt-4">
                    {secciones.map((s, i) => (
                        <li key={s.titulo} className="py-7 border-b border-[#E6DFD5] dark:border-[#353B33] last:border-b-0">
                            <h2 className="flex items-baseline gap-3">
                                <span className="font-brand text-sm font-bold tabular-nums text-[#7D9878] dark:text-[#A3B69B]">{String(i + 1).padStart(2, "0")}</span>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#5A7356] dark:text-[#A3B69B]">{s.titulo}</span>
                            </h2>
                            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#2C2C2C]/80 dark:text-[#F4EFEA]/75 [&_a]:font-semibold [&_a]:text-[#5A7356] dark:[&_a]:text-[#A3B69B] [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-[#2C2C2C] dark:[&_strong]:text-[#F4EFEA]">
                                {s.contenido}
                            </div>
                        </li>
                    ))}
                </ol>

                <section className="mt-10 rounded-3xl border border-[#E6DFD5] dark:border-[#353B33] bg-white dark:bg-[#242723] p-6 sm:p-8 text-center">
                    <p className="font-brand text-xl font-bold">¿Te quedó alguna duda?</p>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 mt-2">Escribinos y te respondemos por WhatsApp.</p>
                    <a
                        href={whatsappUrl("¡Hola Scenta! Quería hacerles una consulta.")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#7D9878] hover:bg-[#6B8566] text-white px-5 py-2.5 text-sm font-bold transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" /> Escribinos por WhatsApp
                    </a>
                </section>

                <footer className="mt-16 pt-8 border-t border-[#E6DFD5] dark:border-[#353B33] flex flex-col items-center gap-3 text-center">
                    <img src="/logo-scenta.png" alt="Scenta" className="h-12 w-auto object-contain opacity-80 dark:invert dark:brightness-200" />
                    <p className="font-brand text-sm tracking-[0.25em]">SCENTA</p>
                    <nav aria-label="Legales" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                        <a href="/catalogo" className="hover:text-[#7D9878] transition-colors">Catálogo</a>
                        {PAGINAS.map(p => (
                            <a key={p.href} href={p.href} className="hover:text-[#7D9878] transition-colors">{p.titulo}</a>
                        ))}
                    </nav>
                    <p className="text-[11px] text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35">© {new Date().getFullYear()} Scenta. Todos los derechos reservados.</p>
                </footer>
            </main>
        </div>
    );
}
