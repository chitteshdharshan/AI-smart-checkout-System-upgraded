import React, { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  // Trigger brief cart badge animation
  const triggerBadgeAnimate = () => {
    setCartBadgeAnimate(true);
    setTimeout(() => setCartBadgeAnimate(false), 400);
  };

  // Add single product or array of AI detections to cart
  const addToCart = (input) => {
    if (!input) return;
    triggerBadgeAnimate();

    setCartItems((prevItems) => {
      const newCart = [...prevItems];

      // Handle single product item object
      if (!Array.isArray(input) && typeof input === "object") {
        const name = input.name || "Unknown Product";
        const price = input.price !== undefined ? input.price : 20.0;
        const brand = input.brand || "Generic";
        const category = input.category || "General";
        const similarity = input.similarity !== undefined ? input.similarity : 1.0;
        const productId = input.product || input.productId || input._id || null;

        const existingIdx = newCart.findIndex(
          (item) => item.name.toLowerCase() === name.toLowerCase() || (productId && item.product === productId)
        );

        if (existingIdx >= 0) {
          newCart[existingIdx].quantity += (input.quantity || 1);
        } else {
          newCart.push({
            product: productId,
            name,
            brand,
            price,
            quantity: input.quantity || 1,
            similarity,
            category,
            status: input.status || "Match Confirmed",
          });
        }
        return newCart;
      }

      // Handle array of detections
      const detections = Array.isArray(input) ? input : [];
      const validDetections = detections.filter((det) => det.match && det.match.matched);
      if (validDetections.length === 0) return newCart;

      validDetections.forEach((det) => {
        const matchData = det.match || {};
        const vlmData = det.vlm || {};
        const name = matchData.name || vlmData.product_name || det.class_name || "Unknown Product";
        const price = matchData.price !== undefined ? matchData.price : 20.0;
        const brand = matchData.brand || vlmData.brand || "Generic";
        const category = matchData.category || vlmData.category || "General";
        const similarity = matchData.similarity !== undefined ? matchData.similarity : 1.0;
        const productId = matchData.product_id || matchData.productId || null;

        const existingIdx = newCart.findIndex(
          (item) => item.name.toLowerCase() === name.toLowerCase()
        );

        if (existingIdx >= 0) {
          newCart[existingIdx].quantity += 1;
        } else {
          newCart.push({
            product: productId,
            name,
            brand,
            price,
            quantity: 1,
            similarity,
            category,
            status: matchData.status || "Match Confirmed",
          });
        }
      });

      return newCart;
    });
  };

  const updateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    setCartItems(updated);
  };

  const removeItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const subtotal = Number(
    cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0).toFixed(2)
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        totalCount,
        subtotal,
        cartBadgeAnimate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
