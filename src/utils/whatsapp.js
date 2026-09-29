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

/**
 * Genera un link de WhatsApp para que el cliente avise al vendedor que ya
 * pagó una seña. Si ya tiene nombre/apellido guardados (mismo dispositivo,
 * ver senaBuyerStore), precarga el mensaje con esos datos; si no, deja un
 * placeholder para que el cliente lo complete antes de enviar.
 * @param {string} sellerNumber - Número de WhatsApp del vendedor (site_config.whatsapp_number)
 * @param {{ buyer_name?: string, buyer_lastname?: string }} [buyer]
 */
export function getSenaPaymentNoticeLink(sellerNumber, buyer) {
    const fullName = [buyer?.buyer_name, buyer?.buyer_lastname].filter(Boolean).join(' ').trim();
    const nombreLine = fullName ? fullName : '[Escribí acá tu nombre y apellido]';

    const message =
        `Hola! ✅ Acabo de reservar una mercadería con una seña y quería avisarte.\n\n` +
        `Mi nombre es: ${nombreLine}\n\n` +
        `¿Me confirmás que quedó registrado? ¡Gracias!`;

    return `https://wa.me/${sellerNumber}?text=${encodeURIComponent(message)}`;
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
