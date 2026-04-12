import { db } from "./firebaseService.js";

export async function createOrder(orderData) {
  const docRef = await db.collection("orders").add({
    ...orderData,
    status: orderData.status || "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function fetchOrders(limit = 100) {
  const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function updateOrderStatus(orderId, status) {
  await db.collection("orders").doc(orderId).update({
    status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

export async function addOrderFulfillment(orderId, fulfillment) {
  await db.collection("orders").doc(orderId).update({
    fulfillment: firebase.firestore.FieldValue.arrayUnion(fulfillment),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

export async function cancelOrder(orderId) {
  await updateOrderStatus(orderId, "cancelled");
}
