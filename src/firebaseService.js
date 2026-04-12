import { FIREBASE_CONFIG } from "./constants.js";

firebase.initializeApp(FIREBASE_CONFIG);

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

export async function initializeFirebaseAndSeed() {
  if (!window.firebase) {
    throw new Error("Firebase SDK not loaded");
  }
  return true;
}
