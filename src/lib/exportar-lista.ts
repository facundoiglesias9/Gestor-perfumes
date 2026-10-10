// Exportar la Lista de Precios a Excel y a PDF con la imagen de Scenta.
// Las librerías se cargan recién al exportar, así la página abre más rápido.

import type { Producto } from "@/context/AppContext";

type Lista = "Minorista" | "Mayorista";
type Opciones = { lista: Lista; productos: Producto[] };
type RGB = [number, number, number];

const WHATSAPP = "+54 9 11 2352-9147";
const OLIVA: RGB = [36, 39, 35];
const SALVIA: RGB = [125, 152, 120];
const SALVIA_OSC: RGB = [90, 115, 86];
const ARENA: RGB = [249, 246, 240];
const BORDE: RGB = [230, 223, 213];
const GRIS: RGB = [127, 125, 116];
const TERRACOTA: RGB = [181, 101, 74];
const TEXTO: RGB = [44, 44, 44];
const ORDEN_GENERO = ["Femenino", "Masculino", "Unisex", "Ambiente"];

const argb = ([r, g, b]: RGB) => `FF${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

const precioDe = (p: Producto, lista: Lista) => {
    const v = Number(lista === "Minorista" ? p.priceMinorista : p.price);
    return Number.isFinite(v) && v > 0 ? v : 0;
};
const pesos = (v: number) => `$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(v)}`;
const hoyLargo = () => new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
const hoyCorto = () => new Date().toLocaleDateString("es-AR");
const hoyArchivo = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function estadoDe(p: Producto): { tipo: "disponible" | "demora" | "sin-stock"; texto: string } {
    if (p.availabilityStatus === "no-disponible") return { tipo: "sin-stock", texto: "Sin stock" };
    if (p.availabilityStatus === "demora") {
        const dias = Number(p.deliveryDays) || 0;
        return { tipo: "demora", texto: dias > 0 ? `Demora ${dias} ${dias === 1 ? "día" : "días"}` : "Con demora" };
    }
    return { tipo: "disponible", texto: "Disponible" };
}

const generoDe = (p: Producto) => (p.gender || "Unisex").trim() || "Unisex";
const categoriaDe = (p: Producto) => (p.category || "Sin categoría").trim() || "Sin categoría";
const posGenero = (g: string) => {
    const i = ORDEN_GENERO.findIndex(x => x.toLowerCase() === g.toLowerCase());
    return i === -1 ? ORDEN_GENERO.length : i;
};

// Por categoría, después por género (Femenino, Masculino, Unisex…) y por nombre
function agrupar(productos: Producto[]) {
    const ordenados = [...productos].sort((a, b) =>
        categoriaDe(a).localeCompare(categoriaDe(b), "es", { numeric: true, sensitivity: "base" })
        || posGenero(generoDe(a)) - posGenero(generoDe(b))
        || generoDe(a).localeCompare(generoDe(b), "es")
        || (a.name || "").localeCompare(b.name || "", "es", { numeric: true, sensitivity: "base" })
    );
    const grupos: { categoria: string; items: Producto[] }[] = [];
    for (const p of ordenados) {
        const c = categoriaDe(p);
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.categoria === c) ultimo.items.push(p);
        else grupos.push({ categoria: c, items: [p] });
    }
    return { ordenados, grupos };
}

function descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

async function imagenBase64(src: string): Promise<string | null> {
    try {
        const r = await fetch(src);
        if (!r.ok) return null;
        const blob = await r.blob();
        return await new Promise(resolve => {
            const lector = new FileReader();
            lector.onload = () => resolve(String(lector.result));
            lector.onerror = () => resolve(null);
            lector.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

// ── Excel ────────────────────────────────────────────────────────────────────

export async function exportarListaExcel({ lista, productos }: Opciones) {
    const mod: any = await import("exceljs");
    const ExcelJS = mod.Workbook ? mod : mod.default;
    const { ordenados } = agrupar(productos);
    const conEstado = ordenados.some(p => estadoDe(p).tipo !== "disponible");

    const libro = new ExcelJS.Workbook();
    libro.creator = "Scenta";
    libro.created = new Date();

    const FILA_TITULOS = 4;
    const hoja = libro.addWorksheet(`Lista ${lista}`, {
        views: [{ state: "frozen", ySplit: FILA_TITULOS, showGridLines: false }],
        pageSetup: {
            paperSize: 9,
            orientation: "portrait",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            horizontalCentered: true,
            margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 },
            printTitlesRow: `${FILA_TITULOS}:${FILA_TITULOS}`,
        },
        headerFooter: { oddFooter: `&L&8Scenta · Lista ${lista} · ${hoyCorto()}&R&8Página &P de &N` },
    });

    const columnas = ["Producto", "Categoría", "Género", "Precio", ...(conEstado ? ["Disponibilidad"] : [])];
    const n = columnas.length;
    const bordeFino = { style: "thin", color: { argb: argb(BORDE) } };

    // Fila 1: título (con el logo a la izquierda) · Fila 2: datos de contacto · Fila 3: aclaración
    hoja.mergeCells(1, 1, 1, n);
    hoja.mergeCells(2, 1, 2, n);
    hoja.mergeCells(3, 1, 3, n);
    const titulo = hoja.getCell(1, 1);
    titulo.value = `Lista de Precios ${lista}`;
    titulo.font = { name: "Calibri", size: 20, bold: true, color: { argb: argb(OLIVA) } };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    hoja.getRow(1).height = 48;

    const contacto = hoja.getCell(2, 1);
    contacto.value = `SCENTA · Fragancias naturales  —  Actualizada el ${hoyLargo()}  —  Pedidos por WhatsApp: ${WHATSAPP}`;
    contacto.font = { name: "Calibri", size: 10, color: { argb: argb(SALVIA_OSC) }, bold: true };
    contacto.alignment = { horizontal: "center", vertical: "middle" };
    hoja.getRow(2).height = 20;

    const aclaracion = hoja.getCell(3, 1);
    aclaracion.value = "Precios en pesos argentinos, sujetos a cambios sin previo aviso.";
    aclaracion.font = { name: "Calibri", size: 9, italic: true, color: { argb: argb(GRIS) } };
    aclaracion.alignment = { horizontal: "center", vertical: "top" };
    hoja.getRow(3).height = 22;

    for (let f = 1; f <= 3; f++) {
        hoja.getCell(f, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(ARENA) } };
    }

    const logo = await imagenBase64("/logo-scenta.png");
    if (logo) {
        const id = libro.addImage({ base64: logo, extension: "png" });
        hoja.addImage(id, { tl: { col: 0.15, row: 0.1 }, ext: { width: 34, height: 52 }, editAs: "oneCell" });
    }

    // Fila de títulos de columna, con filtros
    const filaTitulos = hoja.getRow(FILA_TITULOS);
    filaTitulos.values = columnas;
    filaTitulos.height = 24;
    filaTitulos.eachCell((celda: any, col: number) => {
        celda.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(SALVIA) } };
        celda.alignment = { vertical: "middle", horizontal: columnas[col - 1] === "Precio" ? "right" : "left", indent: 1 };
    });
    hoja.autoFilter = { from: { row: FILA_TITULOS, column: 1 }, to: { row: FILA_TITULOS, column: n } };

    const COLOR_ESTADO = { disponible: "FF3F7A4A", demora: "FFB7791F", "sin-stock": argb(TERRACOTA) } as const;

    ordenados.forEach((p, i) => {
        const precio = precioDe(p, lista);
        const estado = estadoDe(p);
        const fila = hoja.addRow([
            p.name,
            categoriaDe(p),
            generoDe(p),
            precio > 0 ? precio : "Consultar",
            ...(conEstado ? [estado.texto] : []),
        ]);
        fila.height = 19;
        fila.eachCell({ includeEmpty: true }, (celda: any, col: number) => {
            celda.font = { name: "Calibri", size: 10, color: { argb: argb(TEXTO) } };
            celda.alignment = { vertical: "middle", indent: 1 };
            celda.border = { bottom: bordeFino };
            if (i % 2 === 1) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBF9F5" } };
            if (col === 4) {
                celda.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
                if (precio > 0) {
                    celda.numFmt = '"$" #,##0';
                    celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: argb(OLIVA) } };
                } else {
                    celda.font = { name: "Calibri", size: 10, italic: true, color: { argb: argb(GRIS) } };
                }
            }
            if (col === 5) celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR_ESTADO[estado.tipo] } };
        });
        if (estado.tipo === "sin-stock") hoja.getCell(fila.number, 1).font = { name: "Calibri", size: 10, color: { argb: argb(GRIS) } };
    });

    // Total al pie
    const pie = hoja.addRow([]);
    pie.height = 8;
    const total = hoja.addRow([`${ordenados.length} ${ordenados.length === 1 ? "producto" : "productos"}`]);
    total.getCell(1).font = { name: "Calibri", size: 9, bold: true, color: { argb: argb(GRIS) } };
    total.getCell(1).alignment = { indent: 1 };

    // Anchos según el contenido
    const largo = (i: number) => Math.max(columnas[i].length, ...ordenados.map(p => String([p.name, categoriaDe(p), generoDe(p), "", estadoDe(p).texto][i] ?? "").length));
    hoja.getColumn(1).width = Math.min(Math.max(largo(0) + 4, 30), 64);
    hoja.getColumn(2).width = Math.min(largo(1) + 4, 30);
    hoja.getColumn(3).width = Math.max(largo(2) + 4, 12);
    hoja.getColumn(4).width = 15;
    if (conEstado) hoja.getColumn(5).width = Math.max(largo(4) + 4, 16);

    const buffer = await libro.xlsx.writeBuffer();
    descargar(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Lista_Precios_${lista}_Scenta_${hoyArchivo()}.xlsx`,
    );
}

// ── PDF ──────────────────────────────────────────────────────────────────────

// Las letras de la PDF no tienen emojis ni símbolos raros: se sacan para que no salgan cuadraditos
const limpiar = (s: string) =>
    String(s ?? "").normalize("NFC").replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•…€]/g, "");

export async function exportarListaPDF({ lista, productos }: Opciones) {
    const { jsPDF } = await import("jspdf");
    const modTabla: any = await import("jspdf-autotable");
    const autoTable = modTabla.autoTable ?? modTabla.default;

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const W = 210;
    const H = 297;
    const M = 16;
    const ARRIBA = 26;
    const [logo, wa] = await Promise.all([cargarImagen("/logo-scenta.png"), cargarImagen("/whatsapp.png")]);
    const { ordenados, grupos } = agrupar(productos);

    // Texto con espacio entre letras, centrado a mano (jsPDF no centra bien con espaciado)
    const espaciado = (texto: string, y: number, espacio: number) => {
        const ancho = doc.getTextWidth(texto) + espacio * (texto.length - 1);
        doc.text(texto, (W - ancho) / 2, y, { charSpace: espacio });
    };

    // ── Portada ──
    doc.setFillColor(...ARENA);
    doc.rect(0, 0, W, H, "F");
    doc.setDrawColor(...BORDE);
    doc.setLineWidth(0.4);
    doc.roundedRect(10, 10, W - 20, H - 20, 5, 5, "S");

    const alto = 56;
    if (logo) {
        const ancho = (logo.naturalWidth / logo.naturalHeight) * alto;
        doc.addImage(logo, "PNG", (W - ancho) / 2, 34, ancho, alto, "logo", "FAST");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...OLIVA);
    espaciado("SCENTA", 110, 3.2);
    doc.setFontSize(8);
    doc.setTextColor(...SALVIA);
    espaciado("FRAGANCIAS NATURALES", 117, 1.8);

    doc.setDrawColor(...SALVIA);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - 14, 127, W / 2 + 14, 127);

    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    espaciado("LISTA DE PRECIOS", 140, 2.2);
    doc.setFontSize(34);
    doc.setTextColor(...OLIVA);
    doc.text(lista, W / 2, 155, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...GRIS);
    doc.text(`Actualizada el ${hoyLargo()}`, W / 2, 165, { align: "center" });
    doc.setFontSize(9.5);
    doc.text(`${ordenados.length} productos  ·  ${grupos.length} ${grupos.length === 1 ? "categoría" : "categorías"}`, W / 2, 172, { align: "center" });

    // Contacto
    const textoWa = WHATSAPP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const anchoPildora = doc.getTextWidth(textoWa) + (wa ? 28 : 20);
    const xPildora = (W - anchoPildora) / 2;
    const yPildora = 254;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDE);
    doc.setLineWidth(0.4);
    doc.roundedRect(xPildora, yPildora, anchoPildora, 16, 8, 8, "FD");
    doc.setTextColor(...OLIVA);
    if (wa) {
        doc.addImage(wa, "PNG", xPildora + 8, yPildora + 3.5, 9, 9, "whatsapp", "FAST");
        doc.text(textoWa, xPildora + 20, yPildora + 10.3);
    } else {
        doc.text(textoWa, W / 2, yPildora + 10.3, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text("Pedidos y consultas por WhatsApp", W / 2, yPildora - 4, { align: "center" });
    doc.setFontSize(7.5);
    doc.text("Precios en pesos argentinos, sujetos a cambios sin previo aviso.", W / 2, 280, { align: "center" });

    // ── Productos: cada categoría empieza en una hoja nueva ──
    const paginaDe: { categoria: string; cantidad: number; pagina: number }[] = [];
    for (const grupo of grupos) {
        doc.addPage();
        paginaDe.push({ categoria: grupo.categoria, cantidad: grupo.items.length, pagina: doc.getNumberOfPages() });

        const generos = new Set(grupo.items.map(generoDe));
        const conSubtitulos = generos.size > 1;
        const cuerpo: any[] = [];
        let generoActual = "";
        for (const p of grupo.items) {
            const g = generoDe(p);
            if (conSubtitulos && g !== generoActual) {
                generoActual = g;
                const cantidad = grupo.items.filter(x => generoDe(x) === g).length;
                cuerpo.push([{
                    content: `${limpiar(g).toUpperCase()}   ·   ${cantidad}`,
                    colSpan: 2,
                    styles: {
                        fillColor: [239, 244, 237],
                        textColor: SALVIA_OSC,
                        fontStyle: "bold",
                        fontSize: 7.5,
                        cellPadding: { top: 2.6, bottom: 2.6, left: 4, right: 4 },
                    },
                }]);
            }
            const precio = precioDe(p, lista);
            const estado = estadoDe(p);
            const nombre = limpiar(p.name) + (estado.tipo === "demora" ? `   (${estado.texto.toLowerCase()})` : "");
            cuerpo.push([
                { content: nombre, styles: estado.tipo === "sin-stock" ? { textColor: GRIS } : {} },
                estado.tipo === "sin-stock"
                    ? { content: "Sin stock", styles: { textColor: TERRACOTA, fontStyle: "bold", fontSize: 8 } }
                    : precio > 0
                        ? { content: pesos(precio) }
                        : { content: "Consultar", styles: { textColor: GRIS, fontStyle: "italic", fontSize: 8.5 } },
            ]);
        }

        autoTable(doc, {
            startY: ARRIBA + 2,
            margin: { top: ARRIBA, bottom: 20, left: M, right: M },
            theme: "plain",
            showHead: "everyPage",
            rowPageBreak: "avoid",
            head: [[
                { content: limpiar(grupo.categoria).toUpperCase(), styles: { halign: "left" } },
                { content: `${grupo.items.length} ${grupo.items.length === 1 ? "producto" : "productos"}`, styles: { halign: "right", fontStyle: "normal", fontSize: 8, textColor: [205, 214, 201] } },
            ]],
            body: cuerpo,
            headStyles: {
                fillColor: OLIVA,
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 10,
                cellPadding: { top: 3.6, bottom: 3.6, left: 4, right: 4 },
            },
            bodyStyles: {
                fontSize: 9,
                textColor: TEXTO,
                cellPadding: { top: 2.2, bottom: 2.2, left: 4, right: 4 },
                lineColor: BORDE,
                lineWidth: { bottom: 0.15 },
                valign: "middle",
            },
            alternateRowStyles: { fillColor: [251, 249, 245] },
            columnStyles: {
                0: { cellWidth: "auto" },
                1: { cellWidth: 34, halign: "right", fontStyle: "bold", textColor: OLIVA },
            },
        });
    }

    // ── Encabezado y pie de cada hoja de productos ──
    const total = doc.getNumberOfPages();
    for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        if (logo) {
            const alto = 10;
            doc.addImage(logo, "PNG", M, 7, (logo.naturalWidth / logo.naturalHeight) * alto, alto, "logo", "FAST");
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...OLIVA);
        doc.text("SCENTA", M + 9, 12.2, { charSpace: 1.4 });
        doc.setFontSize(5.5);
        doc.setTextColor(...SALVIA);
        doc.text("FRAGANCIAS NATURALES", M + 9, 15.6, { charSpace: 0.8 });

        doc.setFontSize(9);
        doc.setTextColor(...OLIVA);
        doc.text(`Lista ${lista}`, W - M, 11.8, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS);
        doc.text(`Actualizada el ${hoyCorto()}`, W - M, 15.6, { align: "right" });

        doc.setDrawColor(...BORDE);
        doc.setLineWidth(0.3);
        doc.line(M, 19.5, W - M, 19.5);
        doc.line(M, H - 13, W - M, H - 13);

        doc.setFontSize(7.5);
        doc.setTextColor(...GRIS);
        doc.text(`Pedidos por WhatsApp: ${WHATSAPP}`, M, H - 8.5);
        doc.text(`Página ${i - 1} de ${total - 1}`, W - M, H - 8.5, { align: "right" });
    }

    // ── Índice en la portada (con la hoja donde empieza cada categoría) ──
    if (paginaDe.length > 0 && paginaDe.length <= 6) {
        doc.setPage(1);
        const filas = paginaDe.length;
        const yCaja = 186;
        const xCaja = 40;
        const anchoCaja = W - 2 * xCaja;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDE);
        doc.setLineWidth(0.3);
        doc.roundedRect(xCaja, yCaja, anchoCaja, 14 + filas * 7.5, 4, 4, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...SALVIA_OSC);
        doc.text("CONTENIDO", xCaja + 8, yCaja + 8, { charSpace: 1.2 });
        paginaDe.forEach((c, i) => {
            const y = yCaja + 15.5 + i * 7.5;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(...OLIVA);
            const nombre = limpiar(c.categoria);
            doc.text(nombre, xCaja + 8, y);
            const anchoNombre = doc.getTextWidth(nombre);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(...GRIS);
            const derecha = `${c.cantidad} prod.   ·   pág. ${c.pagina - 1}`;
            doc.text(derecha, xCaja + anchoCaja - 8, y, { align: "right" });
            // Puntitos entre el nombre y la página
            const desde = xCaja + 8 + anchoNombre + 3;
            const hasta = xCaja + anchoCaja - 8 - doc.getTextWidth(derecha) - 3;
            doc.setFillColor(...BORDE);
            for (let x = desde; x < hasta; x += 1.6) doc.circle(x, y - 0.9, 0.2, "F");
        });
    }

    doc.save(`Lista_Precios_${lista}_Scenta_${hoyArchivo()}.pdf`);
}
