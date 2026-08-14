const CART_ENDPOINT = '/api/cart/update';

/**
 * Add a product to the user's cart.
 * @param {string|number} productId - The ID of the product to add.
 * @param {number} [quantity=1] - Quantity to add (default 1).
 * @param {number} [matchScore=1.0] - AI FAISS match score / similarity.
 */
export const addToCart = async (productId, quantity = 1, matchScore = 1.0) => {
  const payload = { productId, quantity, matchScore };
  const response = await fetch(CART_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cart update failed: ${response.status} ${errorText}`);
  }
  return response.json();
};
