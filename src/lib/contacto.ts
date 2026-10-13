// Datos de contacto públicos de Scenta: los usan el catálogo y las páginas legales.
export const WHATSAPP_NUMBER = "5491123529147";

export const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
