"use client";

import { FlaskConical, Package, Plus, ChevronDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CAMPO } from "@/components/ventana-partes";
import { Selector } from "@/components/Desplegable";
import Buscador from "@/components/Buscador";

interface SelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    type: "Esencia" | "Insumo";
    onSelect: (item: any) => void;
}

export default function SelectorModal({ isOpen, onClose, title, items, type, onSelect }: SelectorModalProps) {
    const { generos, proveedores, categorias } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [esenciaTab, setEsenciaTab] = useState<"Perfumería" | "Limpia Pisos">("Perfumería");
    const [genderFilter, setGenderFilter] = useState("Todos");
    const [providerFilter, setProviderFilter] = useState("Todos");
    const [categoryFilter, setCategoryFilter] = useState("Todos");

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (type !== "Esencia") return matchesSearch;

            const isLP = item.gender?.toLowerCase() === "limpia pisos" || item.category?.toLowerCase()?.includes("limpia pisos");
            if (esenciaTab === "Perfumería" && isLP) return false;
            if (esenciaTab === "Limpia Pisos" && !isLP) return false;

            if (esenciaTab === "Limpia Pisos") {
                const matchesCat = categoryFilter === "Todos" || item.category?.toLowerCase() === categoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
            }

            const matchesGender = genderFilter === "Todos" || item.gender === genderFilter;
            const matchesProvider = providerFilter === "Todos" || item.provider === providerFilter;
            return matchesSearch && matchesGender && matchesProvider;
        });
    }, [items, searchTerm, type, esenciaTab, genderFilter, providerFilter, categoryFilter]);

    const handleTabChange = (tab: "Perfumería" | "Limpia Pisos") => {
        setEsenciaTab(tab);
        setGenderFilter("Todos");
        setProviderFilter("Todos");
        setCategoryFilter("Todos");
    };

    // Campos un poco más bajos para la barra de filtros
    const campoFiltro = CAMPO.replace("h-11", "h-10");
    const selectFiltro = `${campoFiltro.replace("w-full", "w-auto")} pr-9 appearance-none cursor-pointer`;

    return (
        <Ventana abierta={isOpen} onCerrar={onClose} etiqueta={title}>
            <PanelVentana ancho="lg">
                <CabeceraVentana
                    etiqueta={type === "Esencia" ? "Elegir esencia" : "Elegir insumo"}
                    titulo={title}
                    icono={type === "Esencia" ? FlaskConical : Package}
                    onCerrar={onClose}
                >
                    {/* Perfumería o limpia pisos (solo esencias) */}
                    {type === "Esencia" && (
                        <div role="tablist" className="mt-5 inline-flex p-1 rounded-xl bg-[#F4EFEA] dark:bg-[#1B1D1A]">
                            {(["Perfumería", "Limpia Pisos"] as const).map(tab => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={esenciaTab === tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`h-9 px-4 rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow] duration-150 ${esenciaTab === tab
                                        ? "bg-white dark:bg-[#353B33] text-[#2C2C2C] dark:text-[#F4EFEA] shadow-sm"
                                        : "text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50 hover:text-[#2C2C2C] dark:hover:text-[#F4EFEA]"}`}
                                >
                                    {tab === "Perfumería" ? "Perfumería fina" : "Limpia pisos"}
                                </button>
                            ))}
                        </div>
                    )}
                </CabeceraVentana>

                {/* Buscador y filtros */}
                <div className="px-7 pt-5 pb-3 flex flex-wrap gap-2 shrink-0">
                    <Buscador
                        valor={searchTerm}
                        onCambiar={v => setSearchTerm(v)}
                        placeholder={`Buscar ${type.toLowerCase()}…`}
                        aria-label={`Buscar ${type.toLowerCase()}`}
                        autoFocus
                        fondo="crema"
                        className="flex-1 min-w-[200px]"
                    />

                    {type === "Esencia" && esenciaTab === "Perfumería" && (
                        <>
                            <div className="relative">
                                <Selector aria-label="Género" value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className={selectFiltro}>
                                    <option value="Todos">Todos los géneros</option>
                                    {generos.filter(g => g.toLowerCase() !== "limpia pisos").map((g, idx) => (
                                        <option key={idx} value={g}>{g}</option>
                                    ))}
                                </Selector>
                            </div>
                            <div className="relative">
                                <Selector aria-label="Proveedor" value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className={selectFiltro}>
                                    <option value="Todos">Todos los proveedores</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.name}>{p.name}</option>
                                    ))}
                                </Selector>
                            </div>
                        </>
                    )}

                    {type === "Esencia" && esenciaTab === "Limpia Pisos" && (
                        <div className="relative">
                            <Selector aria-label="Categoría" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectFiltro}>
                                <option value="Todos">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </Selector>
                        </div>
                    )}
                </div>

                {/* Lista: tocar una fila la elige */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 pb-6">
                    {filteredItems.length > 0 ? (
                        <ul className="rounded-2xl border border-[#E6DFD5] dark:border-[#353B33] divide-y divide-[#E6DFD5]/70 dark:divide-[#353B33]/70 overflow-hidden">
                            {filteredItems.map(item => {
                                const isLP = type === "Esencia" && (item.gender?.toLowerCase() === "limpia pisos" || item.category?.toLowerCase()?.includes("limpia pisos"));
                                const detalle = [item.provider, item.category, !isLP ? item.gender : null].filter(Boolean).join(" · ");
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(item)}
                                            className="group w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#7D9878]/[0.06] dark:hover:bg-[#7D9878]/[0.1] transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#7D9878]/[0.08]"
                                        >
                                            <span className="w-9 h-9 rounded-lg bg-[#7D9878]/10 text-[#5A7356] dark:text-[#A3B69B] flex items-center justify-center shrink-0">
                                                {type === "Esencia" ? <FlaskConical className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-sm font-medium text-[#2C2C2C] dark:text-[#F4EFEA] truncate">{item.name}</span>
                                                {detalle && <span className="block text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/45 truncate">{detalle}</span>}
                                            </span>
                                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[#2C2C2C]/35 dark:text-[#F4EFEA]/35 group-hover:text-[#5A7356] dark:group-hover:text-[#A3B69B] group-hover:bg-[#7D9878]/10 transition-colors duration-150">
                                                <Plus className="w-4 h-4" />
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-[#E6DFD5] dark:border-[#353B33] px-4 py-10 text-center text-sm text-[#2C2C2C]/55 dark:text-[#F4EFEA]/50">
                            No se encontraron resultados.
                        </p>
                    )}
                </div>
            </PanelVentana>
        </Ventana>
    );
}
