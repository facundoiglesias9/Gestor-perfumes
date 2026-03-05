/**
 * Convierte una URL estándar de Supabase Public Storage en una URL de renderizado/transformación.
 * Esto permite descargar versiones pequeñas (thumbnails) en lugar de la imagen original pesada.
 */
export function getOptimizedImageUrl(url: string | undefined, size: number = 400) {
    if (!url) return undefined;

    // Si la URL no es de Supabase Storage, retornarla tal cual
    if (!url.includes('supabase.co/storage/v1/object/public/')) {
        return url;
    }

    // Reemplazar 'object/public' por 'render/image/public'
    // Y añadir parámetros de transformación
    const optimizedUrl = url.replace('/object/public/', '/render/image/public/');
    return `${optimizedUrl}?width=${size}&height=${size}&resize=contain&quality=75`;
}
