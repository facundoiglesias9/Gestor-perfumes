// Mientras carga una sección. Aparece recién a los 300 ms: si la página abre rápido no se ve
// nada (antes parpadeaba un cartel grande de "Cargando Scenta" en cada cambio de página).
export default function Loading() {
    return (
        <div role="status" aria-label="Cargando" className="carga-demorada flex min-h-[60vh] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <span className="w-9 h-9 rounded-full border-[3px] border-[#7D9878]/20 border-t-[#7D9878] dark:border-[#A3B69B]/20 dark:border-t-[#A3B69B] animate-spin" />
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45">
                    Cargando
                </p>
            </div>
        </div>
    );
}
