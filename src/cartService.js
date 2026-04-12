import { db } from "./firebaseService.js";

const CART_KEY = "teacraft-cart";

export function loadCart() {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export async function syncCartToUser(userId, cart) {
  if (!userId) return;
  await db.collection("carts").doc(userId).set({
    items: Object.values(cart),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

export async function loadCartFromUser(userId) {
  const snap = await db.collection("carts").doc(userId).get();
  if (!snap.exists) return {};
  const data = snap.data();
  const items = data.items || [];
  return items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}
