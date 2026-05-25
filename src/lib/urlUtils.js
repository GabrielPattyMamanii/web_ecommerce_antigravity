
/**
 * Generates the consistent URL for a product detail page.
 * @param {string|number} id - The product ID.
 * @returns {string} The relative URL path.
 */
export const getProductUrl = (id) => {
    return `/catalog/${id}`;
};
