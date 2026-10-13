"use client";

import { Plus, Filter, Layers, Trash2, Edit2, Download, Check } from "lucide-react";
import EncabezadoPagina, { BOTON_ENC_BORDE, BOTON_ENC } from "@/components/EncabezadoPagina";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import ConfirmModal from "@/components/ConfirmModal";
import { exportToExcel } from "@/lib/export-utils";
import Ventana from "@/components/Ventana";
import { PanelVentana, CabeceraVentana, CuerpoVentana, PieVentana, ETIQUETA_CAMPO, AYUDA_CAMPO, CAMPO, BOTON_PRINCIPAL, BOTON_SECUNDARIO } from "@/components/ventana-partes";
import { Selector } from "@/components/Desplegable";
import Buscador from "@/components/Buscador";

export default function InsumosPage() {
    const { insumos, setInsumos, categorias, proveedores, bases, setBases, productos, setProductos, getNextId } = useAppContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        provider: "",
        cost: "",
        qty: "",
        unit: "un." // Default a unidades
    });

    const getColorClass = (str: string, isBadge: boolean) => {
        if (!str) return isBadge ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : 'bg-slate-300 dark:bg-slate-600';

        const colorsMap = {
            blue: { bg: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
            emerald: { bg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
            amber: { bg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
            violet: { bg: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20' },
            indigo: { bg: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
            rose: { bg: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
            cyan: { bg: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20' },
            lime: { bg: 'bg-lime-500', badge: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/20' },
            fuchsia: { bg: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20' },
            orange: { bg: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' },
            teal: { bg: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' }
        };
        const colorList = Object.values(colorsMap);

        let colorObj;
        const s = str.toLowerCase();

        // Asignaciones fijas para categorías y proveedores conocidos
        if (s.includes('perfumer')) colorObj = colorsMap.violet;
        else if (s.includes('limpia pisos 1l') || s.includes('limpia pisos 1 l')) colorObj = colorsMap.indigo;
        else if (s.includes('limpia pisos 5l') || s.includes('limpia pisos 5 l')) colorObj = colorsMap.amber;
        else if (s.includes('limpia') || s.includes('piso')) colorObj = colorsMap.cyan;
        else if (s.includes('aromatizante') || s.includes('auto')) colorObj = colorsMap.orange;
        else if (s.includes('difusor')) colorObj = colorsMap.rose;
        else if (s.includes('textil')) colorObj = colorsMap.emerald;
        else if (s.includes('esencia')) colorObj = colorsMap.fuchsia;
        // Proveedores conocidos para evitar repetidos
        else if (s.includes('mercado libre') || s.includes('ml')) colorObj = colorsMap.blue;
        else if (s.includes('multi-envase') || s.includes('multienvase')) colorObj = colorsMap.lime;
        else if (s.includes('ezentie')) colorObj = colorsMap.teal;
        else if (s.includes('pura vida')) colorObj = colorsMap.fuchsia;
        else if (s.includes('van rossum')) colorObj = colorsMap.orange;
        else {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            hash = Math.abs(hash);
            colorObj = colorList[hash % colorList.length];
        }

        return isBadge ? colorObj.badge : colorObj.bg;
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const oldInsumo = insumos.find(i => i.id === editingId);
            const nameChanged = oldInsumo && oldInsumo.name !== formData.name;

            setInsumos(insumos.map(i => i.id === editingId ? {
                ...i,
                name: formData.name,
                category: formData.category,
                provider: formData.provider,
                cost: parseFloat(formData.cost),
                qty: parseFloat(formData.qty),
                unit: formData.unit
            } : i));

            if (nameChanged) {
                const updatedBases = bases.map(base => {
                    const hasComponent = base.components.some(c => c.type === "Insumo" && c.id === editingId);
                    if (!hasComponent) return base;
                    return {
                        ...base,
                        components: base.components.map(c =>
                            c.type === "Insumo" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setBases(updatedBases);

                const updatedProductos = productos.map(prod => {
                    const hasComponent = prod.components.some(c => c.type === "Insumo" && c.id === editingId);
                    if (!hasComponent) return prod;
                    return {
                        ...prod,
                        components: prod.components.map(c =>
                            c.type === "Insumo" && c.id === editingId ? { ...c, name: formData.name } : c
                        )
                    };
                });
                setProductos(updatedProductos);
            }

            setEditingId(null);
        } else {
            setInsumos([
                {
                    id: getNextId(insumos, "I-"),
                    name: formData.name,
                    category: formData.category,
                    provider: formData.provider,
                    cost: parseFloat(formData.cost),
                    qty: parseFloat(formData.qty),
                    stock: 0, // Inicia sin stock, se carga por inventario
                    unit: formData.unit
                },
                ...insumos
            ]);
        }

        setFormData({ name: "", category: "", provider: "", cost: "", qty: "", unit: "un." });
        setIsAddModalOpen(false);
    };

    const openEditModal = (item: any) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            category: item.category,
            provider: item.provider,
            cost: item.cost.toString(),
            qty: item.qty ? item.qty.toString() : "",
            unit: item.unit || "un."
        });
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingId(null);
        setFormData({ name: "", category: "", provider: "", cost: "", qty: "", unit: "un." });
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            setInsumos(insumos.filter(i => i.id !== itemToDelete));
            setItemToDelete(null);
        }
    };

    const handlePerformExport = () => {
        const excelData = insumos.map(i => ({
            "Insumo": i.name,
            "Categoría": i.category,
            "Proveedor": i.provider,
            "Cant. x Bulto": `${i.qty || 'N/A'} ${i.unit || 'un.'}`,
            "Costo / Bulto": `$${i.cost.toLocaleString('es-AR')}`
        }));
        exportToExcel(excelData, "Insumos_Scenta", "Scenta - Lista de Insumos");
    };

    return (
        <div className="space-y-8 pb-12 anim-entrada relative">
            <EncabezadoPagina icono={Layers} titulo="Insumos" descripcion="Frascos, tapas, etiquetas y todo lo que se usa para armar los productos.">
                <button onClick={handlePerformExport} className={BOTON_ENC_BORDE}>
                    <Download className="w-4 h-4" />
                    Exportar Excel
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className={BOTON_ENC}>
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    Agregar insumo
                </button>
            </EncabezadoPagina>

            <div className="bg-white dark:bg-[#242723] border border-[#E6DFD5] dark:border-[#353B33] rounded-[2.5rem] shadow-sm overflow-hidden transition-colors duration-300 relative min-h-[400px] flex flex-col">
                <div className="p-6 md:p-8 flex flex-col sm:flex-row gap-4 border-b border-[#E6DFD5] dark:border-[#353B33]">
                    <Buscador
                        valor={searchTerm}
                        onCambiar={v => setSearchTerm(v)}
                        placeholder="Buscar insumo o proveedor..."
                        alto="lg"
                        fondo="crema"
                        className="flex-1"
                    />
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-[#F9F6F0] dark:bg-[#1B1D1A] border-b border-[#E6DFD5] dark:border-[#353B33]">
                                <th className="px-6 py-6 text-left text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[30%]">Insumo</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[20%]">Categoría</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[20%]">Proveedor</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[12%]">Cant. x Bulto</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[13%]">Costo / Bulto</th>
                                <th className="px-6 py-6 text-center text-xs font-bold text-[#2C2C2C]/60 dark:text-[#F4EFEA]/60 uppercase tracking-widest w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD5] dark:divide-[#353B33]">
                            {insumos
                                .filter(item => 
                                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    (item.provider && item.provider.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                    (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
                                )
                                .map((item, idx) => (
                                <tr key={idx} className="group hover:bg-[#7D9878]/5 transition-colors cursor-pointer">
                                    <td className="px-6 py-6 text-left">
                                        <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-lg group-hover:text-[#7D9878] transition-colors line-clamp-2">{item.name}</p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[11px] uppercase tracking-wider border whitespace-nowrap w-max mx-auto ${getColorClass(item.category, true)}`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-[#F9F6F0] dark:bg-[#1B1D1A] border border-[#E6DFD5] dark:border-[#353B33] transition-colors">
                                            <span className={`w-2 h-2 rounded-full ${getColorClass(item.provider, false)} shadow-sm`}></span>
                                            <span className="text-[#2C2C2C] dark:text-[#F4EFEA] font-bold text-sm whitespace-nowrap">{item.provider}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <p className="text-[#2C2C2C] dark:text-[#F4EFEA] font-extrabold text-[15px]">{item.qty || 'N/A'} <span className="text-xs text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-bold">{item.unit}</span></p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <p className="text-[#7D9878] dark:text-[#A3B69B] font-black text-lg drop-shadow-sm font-brand">${item.cost.toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="flex items-center justify-center gap-1 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2.5 text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#7D9878] hover:bg-[#7D9878]/10 rounded-xl transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(item.id)}
                                                className="p-2.5 text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 hover:text-[#C9866F] hover:bg-[#C9866F]/10 rounded-xl transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {insumos.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-[#2C2C2C]/50 dark:text-[#F4EFEA]/50 font-medium">
                                        No hay insumos cargados. ¡Agregá tu primer insumo!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Eliminar Insumo"
                message="¿Estás seguro de que deseas eliminar este insumo? Esta acción no se puede deshacer."
                onConfirm={confirmDelete}
                onCancel={() => setItemToDelete(null)}
            />

            <Ventana abierta={isAddModalOpen} onCerrar={handleCloseModal} cerrarAlTocarFondo={false} etiqueta={editingId ? "Editar insumo" : "Nuevo insumo"}>
            {isAddModalOpen && (
                    <PanelVentana ancho="md">
                        <CabeceraVentana
                            etiqueta={editingId ? "Editar insumo" : "Nuevo insumo"}
                            titulo={formData.name.trim() || (editingId ? "Insumo" : "Nuevo insumo")}
                            descripcion="Frascos, tapas, etiquetas y todo lo que lleva cada producto."
                            icono={Layers}
                            onCerrar={handleCloseModal}
                        />

                        <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 min-h-0">
                            <CuerpoVentana className="space-y-5">
                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Nombre</span>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Frasco de vidrio 50 ml"
                                        className={CAMPO}
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Unidad</span>
                                        <Selector
                                            required
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            className={`${CAMPO} cursor-pointer`}
                                        >
                                            <option value="un.">Unidades (un.)</option>
                                            <option value="ml">Mililitros (ml)</option>
                                        </Selector>
                                    </label>

                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Cantidad del bulto</span>
                                        <span className="relative block">
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                value={formData.qty}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => setFormData({ ...formData, qty: e.target.value })}
                                                placeholder="100"
                                                className={`${CAMPO} pr-12 text-right tabular-nums`}
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">
                                                {formData.unit}
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <label className="block">
                                    <span className={ETIQUETA_CAMPO}>Costo del bulto</span>
                                    <span className="relative block">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#2C2C2C]/45 dark:text-[#F4EFEA]/45 pointer-events-none">$</span>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.cost}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                            placeholder="0"
                                            className={`${CAMPO} pl-8 tabular-nums`}
                                        />
                                    </span>
                                    <span className={`block ${AYUDA_CAMPO}`}>En pesos, lo que pagás por el bulto completo.</span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Presentación</span>
                                        <Selector
                                            required
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className={`${CAMPO} cursor-pointer`}
                                        >
                                            <option value="" disabled>Elegí una</option>
                                            <option value="Todas">Todas</option>
                                            {categorias.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))}
                                            {categorias.length === 0 && <option disabled>No hay categorías</option>}
                                        </Selector>
                                    </label>

                                    <label className="block">
                                        <span className={ETIQUETA_CAMPO}>Proveedor</span>
                                        <Selector
                                            required
                                            value={formData.provider}
                                            onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                            className={`${CAMPO} cursor-pointer`}
                                        >
                                            <option value="" disabled>Elegí uno</option>
                                            {proveedores.map(prov => (
                                                <option key={prov.id} value={prov.name}>{prov.name}</option>
                                            ))}
                                            {proveedores.length === 0 && <option disabled>No hay proveedores</option>}
                                        </Selector>
                                    </label>
                                </div>
                            </CuerpoVentana>

                            <PieVentana>
                                <button type="button" onClick={handleCloseModal} className={BOTON_SECUNDARIO}>
                                    Cancelar
                                </button>
                                <button type="submit" className={BOTON_PRINCIPAL}>
                                    <Check className="w-4 h-4" strokeWidth={2.5} />
                                    {editingId ? "Guardar cambios" : "Crear insumo"}
                                </button>
                            </PieVentana>
                        </form>
                    </PanelVentana>
            )}
            </Ventana>
        </div>
    );
}
