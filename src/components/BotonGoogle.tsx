"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { GOOGLE_CLIENT_ID } from "@/lib/google";

// Botón oficial "Continuar con Google" (lo dibuja Google; así cumple sus reglas de marca).
// Al elegir la cuenta, Google devuelve un aviso firmado que se manda al servidor para comprobarlo.

type GoogleIdentidad = {
    initialize: (opciones: Record<string, unknown>) => void;
    renderButton: (lugar: HTMLElement, opciones: Record<string, unknown>) => void;
};
const identidad = () => (window as unknown as { google?: { accounts?: { id?: GoogleIdentidad } } }).google?.accounts?.id;

export default function BotonGoogle({ onCredencial, deshabilitado }: {
    onCredencial: (credencial: string) => void;
    deshabilitado?: boolean;
}) {
    const lugar = useRef<HTMLDivElement>(null);
    const aviso = useRef(onCredencial);
    const [cargado, setCargado] = useState(false);

    useEffect(() => { aviso.current = onCredencial; }, [onCredencial]);

    useEffect(() => {
        const id = identidad();
        if (!cargado || !id || !lugar.current) return;
        id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (respuesta: { credential?: string }) => { if (respuesta.credential) aviso.current(respuesta.credential); },
            ux_mode: "popup",
            auto_select: false,
            context: "signin",
        });
        const ancho = Math.round(Math.min(400, Math.max(200, lugar.current.parentElement?.offsetWidth ?? 320)));
        id.renderButton(lugar.current, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            shape: "pill",
            text: "continue_with",
            logo_alignment: "left",
            locale: "es",
            width: ancho,
        });
    }, [cargado]);

    return (
        <>
            <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setCargado(true)} />
            <div className={`flex justify-center min-h-11 transition-opacity duration-200 ${deshabilitado ? "pointer-events-none opacity-40" : ""}`} aria-busy={!cargado}>
                <div ref={lugar} />
            </div>
        </>
    );
}
