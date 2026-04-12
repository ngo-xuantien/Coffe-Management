import { auth } from "./firebaseService.js";
import { db } from "./firebaseService.js";

export async function signUp(name, email, password) {
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;

  await user.updateProfile({ displayName: name });

  await db.collection("users").doc(user.uid).set({
    name,
    email,
    role: "user",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return user;
}

export async function signIn(email, password) {
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  await db.collection("users").doc(userCredential.user.uid).update({
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return userCredential.user;
}

export async function signOut() {
  await auth.signOut();
}

export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

export async function getUserProfile(uid) {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? doc.data() : null;
}
