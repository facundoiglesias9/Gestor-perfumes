// Ingreso con Google: el "ID de cliente" del proyecto Scenta en Google Cloud.
// No es secreto (Google lo muestra en la página de ingreso de cualquier sitio); sirve para que
// Google sepa qué aplicación pide el ingreso y para comprobar que el aviso de Google es para Scenta.
export const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "422676254360-oetths1aod6glrcednphnfcfkpu1cd5p.apps.googleusercontent.com";
