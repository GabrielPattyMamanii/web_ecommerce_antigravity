// ============================================================
// Número de WhatsApp del negocio (con código de país, sin +)
// Ejemplo Argentina: 5491112345678
// ============================================================
const WHATSAPP_NUMBER = '5491134656584'; // <-- Cambia aquí tu número

/**
 * Genera un link de WhatsApp con mensaje automático para consultar el precio de un producto.
 * @param {string} productName - Nombre del producto
 * @param {string} productId   - ID del producto (para construir el link)
 * @returns {string} URL de WhatsApp lista para abrir el chat
 */
export function getWhatsAppLink(productName, productId) {
    const productUrl = `${window.location.origin}/catalog/${productId}`;
    const message = `Hola! 👋 Me interesa este producto y quería consultar el precio:\n\n` +
        `*${productName}*\n` +
        `🔗 ${productUrl}\n\n` +
        `¿Me podés pasar la cotización? ¡Muchas gracias!`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppQuoteCartLink(items) {
    const origin = window.location.origin;
    const lines = items.map((item, i) => {
        let line = `${i + 1}. *${item.name}*`;
        if (item.quantity > 1) line += ` (x${item.quantity})`;
        if (item.size && item.size !== 'N/A') line += ` — Talle: ${item.size}`;
        if (item.color && item.color !== 'N/A') line += ` — Color: ${item.color}`;
        line += `\n   🔗 ${origin}/catalog/${item.id}`;
        return line;
    });
    const message =
        `Hola! 👋 Me gustaría pedir cotización para los siguientes productos:\n\n` +
        lines.join('\n\n') +
        `\n\n¿Me podés pasar los precios? ¡Muchas gracias!`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
