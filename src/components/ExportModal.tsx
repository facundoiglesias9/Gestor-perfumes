"use client";

import { Check, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Producto } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, TituloGrupo, TodoNada, FilaInterruptor, opcion, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (filteredData: Producto[], format: "excel" | "pdf") => void | Promise<void>;
    productos: Producto[];
    categorias: { id: string; name: string }[];
    generos: string[];
    initialFilters: {
        category?: string;
        gender?: string;
        showOutOfStock?: boolean;
        showConsult?: boolean;
    };
    type: "excel" | "pdf";
    /** Nombre de la lista que se exporta (Minorista o Mayorista) */
    lista?: string;
}

export default function ExportModal({ 
    isOpen, 
    onClose, 
    onExport, 
    productos, 
    categorias, 
    generos,
    initialFilters,
    type,
    lista
}: ExportModalProps) {
    const [generando, setGenerando] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
    const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
    const [incluirSinPrecio, setIncluirSinPrecio] = useState(false);

    const availableCategories = useMemo(() => {
        const catMap = new Map<string, string>();
        
        const addCat = (c: string) => {
            const trimmed = c.trim();
            if (!trimmed) return;
            const lower = trimmed.toLowerCase();
            // Conservar la versión que tenga mayúsculas si ya existe una todo en minúsculas
            if (!catMap.has(lower) || (trimmed !== lower && catMap.get(lower) === lower)) {
                catMap.set(lower, trimmed);
            }
        };

        productos.forEach(p => {
            if (p.category) addCat(p.category);
        });
        categorias.forEach(c => addCat(c.name));
        
        return Array.from(catMap.values()).sort();
    }, [productos, categorias]);

    const availableGenders = useMemo(() => {
        return generos.filter(g => {
            // Siempre mantener los estándares
            if (["Femenino", "Masculino", "Unisex", "Ambiente"].includes(g)) return true;
            
            // Filtrar si es redundante con alguna categoría (ej: "Limpia pisos" vs "Limpia pisos 5L", "Auto" vs "Auto")
            const gLower = g.toLowerCase();
            const isRedundant = availableCategories.some(c => 
                c.toLowerCase().includes(gLower) || gLower.includes(c.toLowerCase())
            );
            return !isRedundant;
        });
    }, [generos, availableCategories]);

    // Al abrir, arranca con los filtros que tiene la página. Se usan los valores sueltos (no el
    // objeto entero) para que lo elegido no se reinicie cada vez que la página se actualiza.
    const { category: catInicial, gender: generoInicial, showOutOfStock: sinStockInicial, showConsult: sinPrecioInicial } = initialFilters;
    useEffect(() => {
        if (isOpen) {
            if (catInicial && catInicial !== "Todas") {
                setSelectedCategories([catInicial]);
            } else {
                setSelectedCategories(availableCategories);
            }

            if (generoInicial && generoInicial !== "Todos") {
                setSelectedGenders([generoInicial]);
            } else {
                setSelectedGenders(availableGenders);
            }

            setIncludeOutOfStock(sinStockInicial || false);
            setIncluirSinPrecio(sinPrecioInicial || false);
        }
    }, [isOpen, catInicial, generoInicial, sinStockInicial, sinPrecioInicial, availableCategories, availableGenders]);

    const filteredData = useMemo(() => {
        return productos.filter(p => {
            const productCat = (p.category || "").trim().toUpperCase();
            const productGender = (p.gender || "UNISEX").trim().toUpperCase();
            
            // Normalize selected arrays for safe comparison
            const selectedCatsUpper = selectedCategories.map(c => c.trim().toUpperCase());
            const selectedGendersUpper = selectedGenders.map(g => g.trim().toUpperCase());

            const matchesCat = selectedCatsUpper.includes(productCat);
            
            // Intelligence: If it's an ambient category, it usually only has "Unisex" or no gender.
            // We should allow it if the category is selected, even if the gender filter is active for perfumes.
            const isAmbient = productCat.includes("DIFUSOR") || 
                             productCat.includes("AUTO") || 
                             productCat.includes("LIMPIA") || 
                             productCat.includes("AMBIENTE");

            let matchesGender = selectedGendersUpper.includes(productGender);
            
            if (isAmbient) {
                // Si seleccionó la categoría explícitamente, ignoramos el género (que suele estar mal cargado como 'Auto' o 'Muestrario')
                if (matchesCat) {
                    matchesGender = true;
                }
                // Si seleccionó el filtro general de "AMBIENTE", incluimos todos los ambientales
                else if (selectedGendersUpper.includes("AMBIENTE")) {
                    matchesGender = true;
                }
                // Si el producto es Unisex y hay *algún* género seleccionado, lo dejamos pasar por defecto
                else if (productGender === "UNISEX" && selectedGendersUpper.length > 0) {
                    matchesGender = true;
                }
            }

            const matchesStock = includeOutOfStock ? true : p.availabilityStatus !== "no-disponible";

            // Sin precio cargado sale como "Consultar": solo si se pide
            const precio = Number(lista === "Mayorista" ? p.price : p.priceMinorista);
            const matchesPrecio = incluirSinPrecio || (Number.isFinite(precio) && precio > 0);

            return matchesCat && matchesGender && matchesStock && matchesPrecio;
        });
    }, [productos, selectedCategories, selectedGenders, includeOutOfStock, incluirSinPrecio, lista]);

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => 
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const toggleGender = (gen: string) => {
        setSelectedGenders(prev => 
            prev.includes(gen) ? prev.filter(g => g !== gen) : [...prev, gen]
        );
    };

    const selectAllCats = () => setSelectedCategories(availableCategories);
    const deselectAllCats = () => setSelectedCategories([]);
    const selectAllGenders = () => setSelectedGenders(availableGenders);
    const deselectAllGenders = () => setSelectedGenders([]);

    const exportar = async () => {
        if (generando) return;
        setGenerando(true);
        try {
            await onExport(filteredData, type);
        } finally {
            setGenerando(false);
        }
    };

    return (
        <Ventana abierta={isOpen} onCerrar={generando ? undefined : onClose} etiqueta="Exportar lista de precios">
            <PanelVentana ancho="lg">
                <CabeceraVentana
                    etiqueta={type === "excel" ? "Exportar a Excel" : "Exportar a PDF"}
                    titulo={lista ? `Lista ${lista.toLowerCase()}` : "Lista de precios"}
                    descripcion={type === "excel"
                        ? "Planilla ordenada por categoría, con filtros y los precios como números para poder hacer cuentas."
                        : "Documento listo para mandar: portada con tu WhatsApp, índice y productos agrupados por categoría."}
                    icono={type === "excel" ? FileSpreadsheet : FileText}
                    tono={type === "excel" ? "salvia" : "terracota"}
                    onCerrar={onClose}
                    cerrarDeshabilitado={generando}
                />

                <CuerpoVentana className="space-y-7">
                    <section>
                        <TituloGrupo derecha={<TodoNada onTodo={selectAllCats} onNada={deselectAllCats} />}>Categorías</TituloGrupo>
                        <div className="flex flex-wrap gap-2">
                            {availableCategories.map(cat => {
                                const elegida = selectedCategories.includes(cat);
                                return (
                                    <button key={cat} type="button" aria-pressed={elegida} onClick={() => toggleCategory(cat)} className={opcion(elegida)}>
                                        {elegida && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <TituloGrupo derecha={<TodoNada onTodo={selectAllGenders} onNada={deselectAllGenders} />}>Géneros</TituloGrupo>
                        <div className="flex flex-wrap gap-2">
                            {availableGenders.map(gen => {
                                const elegido = selectedGenders.includes(gen);
                                return (
                                    <button key={gen} type="button" aria-pressed={elegido} onClick={() => toggleGender(gen)} className={opcion(elegido)}>
                                        {elegido && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                        {gen}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <TituloGrupo>Incluir también</TituloGrupo>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                            <FilaInterruptor
                                titulo="Productos sin stock"
                                descripcion="Salen marcados como sin stock"
                                activo={includeOutOfStock}
                                onCambiar={setIncludeOutOfStock}
                            />
                            <FilaInterruptor
                                titulo="Productos sin precio"
                                descripcion="Salen como «Consultar»"
                                activo={incluirSinPrecio}
                                onCambiar={setIncluirSinPrecio}
                            />
                        </div>
                    </section>
                </CuerpoVentana>

                <PieVentana>
                    <p className="text-sm text-[#2C2C2C]/60 dark:text-[#F4EFEA]/55">
                        <span className="font-semibold tabular-nums text-[#2C2C2C] dark:text-[#F4EFEA]">{filteredData.length}</span>
                        {filteredData.length === 1 ? " producto" : " productos"}
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} disabled={generando} className={BOTON_SECUNDARIO}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={exportar}
                            disabled={filteredData.length === 0 || generando}
                            aria-busy={generando}
                            className={BOTON_PRINCIPAL}
                        >
                            {generando
                                ? <LoaderCircle className="w-4 h-4 animate-spin" />
                                : type === "excel" ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            {generando ? "Generando…" : type === "excel" ? "Descargar Excel" : "Descargar PDF"}
                        </button>
                    </div>
                </PieVentana>
            </PanelVentana>
        </Ventana>
    );
}
