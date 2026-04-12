import { db } from "./firebaseService.js";

export async function fetchProducts() {
  const snapshot = await db.collection("products").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getProductById(id) {
  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function createProduct(product) {
  const id = product.id || product.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  await db.collection("products").doc(id).set({
    ...product,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return id;
}

export async function updateProduct(id, product) {
  await db.collection("products").doc(id).update({
    ...product,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteProduct(id) {
  await db.collection("products").doc(id).delete();
}

export async function seedProducts(data) {
  const snapshot = await db.collection("products").limit(1).get();
  if (!snapshot.empty) return false;

  const batch = db.batch();
  data.forEach((product) => {
    const doc = db.collection("products").doc(product.id);
    batch.set(doc, product);
  });

  await batch.commit();
  return true;
}
