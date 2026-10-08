// Prepara una foto en el navegador antes de subirla: la achica a 1000 px de lado mayor y la
// guarda en WebP (o JPEG si el navegador no sabe). Una foto de celular de 4 MB queda en ~80 KB.

const LADO_MAX = 1000;

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo abrir esa imagen. Probá con una foto JPG o PNG.")); };
        img.src = url;
    });
}

const aBlob = (canvas: HTMLCanvasElement, tipo: string, calidad: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, calidad));

function aBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] ?? "");
        lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
        lector.readAsDataURL(blob);
    });
}

export async function prepararFoto(archivo: File): Promise<{ base64: string; tipo: string }> {
    if (!archivo.type.startsWith("image/")) throw new Error("El archivo elegido no es una imagen.");
    const img = await cargarImagen(archivo);

    const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const ancho = Math.max(1, Math.round(img.naturalWidth * escala));
    const alto = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la imagen.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, ancho, alto);

    let blob = await aBlob(canvas, "image/webp", 0.82);
    if (!blob || blob.type !== "image/webp") {
        // JPEG no tiene transparencia: fondo blanco para que no quede negro
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, ancho, alto);
        blob = await aBlob(canvas, "image/jpeg", 0.85);
    }
    if (!blob) throw new Error("No se pudo preparar la imagen.");
    return { base64: await aBase64(blob), tipo: blob.type };
}
