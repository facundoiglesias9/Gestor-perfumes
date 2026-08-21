/**
 * Convierte una URL estándar de Supabase Public Storage en una URL de renderizado/transformación.
 * Esto permite descargar versiones pequeñas (thumbnails) en lugar de la imagen original pesada.
 */
export function getOptimizedImageUrl(url: string | undefined, size: number = 400): string {
    if (!url) return "";

    // Supabase Image Transformation is a paid feature (Pro). 
    // If getting 403, we must use the original public URL.
    return url;
}
