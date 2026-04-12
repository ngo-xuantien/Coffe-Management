// services.js - Firebase service layer for TeaCraft

const FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(FirebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Authentication Services
class AuthService {
  static async signUp(name, email, password) {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.updateProfile({ displayName: name });

    await db.collection("users").doc(user.uid).set({
      name,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
      },
      loyalty: {
        points: 0,
        level: "Bronze",
      },
    });

    return user;
  }

  static async signIn(email, password) {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    await db.collection("users").doc(userCredential.user.uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return userCredential.user;
  }

  static async signOut() {
    await auth.signOut();
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
}

// User Services
class UserService {
  static async getUserData(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  }

  static async updateUserData(userId, data) {
    await db.collection("users").doc(userId).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async deleteUser(userId) {
    await db.collection("users").doc(userId).delete();
  }

  static async addToFavorites(userId, productId) {
    await db.collection("favorites").add({
      userId,
      productId,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async removeFromFavorites(userId, productId) {
    const query = db.collection("favorites").where("userId", "==", userId).where("productId", "==", productId);
    const snapshot = await query.get();
    snapshot.forEach(doc => doc.ref.delete());
  }

  static async getUserFavorites(userId) {
    const query = db.collection("favorites").where("userId", "==", userId);
    const snapshot = await query.get();
    const productIds = snapshot.docs.map(doc => doc.data().productId);
    if (productIds.length === 0) return [];

    const productsQuery = db.collection("products").where(firebase.firestore.FieldPath.documentId(), "in", productIds);
    const productsSnapshot = await productsQuery.get();
    return productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Product Services
class ProductService {
  static async getProducts(options = {}) {
    let query = db.collection("products").orderBy("createdAt", "desc");

    if (options.category && options.category !== "all") {
      query = query.where("category", "==", options.category);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getProduct(productId) {
    const doc = await db.collection("products").doc(productId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async createProduct(productData) {
    const docRef = await db.collection("products").add({
      ...productData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  static async updateProduct(productId, productData) {
    await db.collection("products").doc(productId).update({
      ...productData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async deleteProduct(productId) {
    await db.collection("products").doc(productId).delete();
  }

  static async searchProducts(searchTerm) {
    const query = db.collection("products").where("name", ">=", searchTerm).where("name", "<=", searchTerm + "\uf8ff");
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getFeaturedProducts() {
    const query = db.collection("products").where("featured", "==", true).limit(6);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Cart Services
class CartService {
  static async getUserCart(userId) {
    const cartDoc = await db.collection("carts").doc(userId).get();
    return cartDoc.exists ? cartDoc.data() : { items: [] };
  }

  static async updateUserCart(userId, cartItems) {
    await db.collection("carts").doc(userId).set({
      items: cartItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  static async clearUserCart(userId) {
    await db.collection("carts").doc(userId).delete();
  }

  static getLocalCart() {
    return JSON.parse(localStorage.getItem("teacraft-cart")) || {};
  }

  static saveLocalCart(cart) {
    localStorage.setItem("teacraft-cart", JSON.stringify(cart));
  }

  static clearLocalCart() {
    localStorage.removeItem("teacraft-cart");
  }
}

// Order Services
class OrderService {
  static async createOrder(orderData) {
    const docRef = await db.collection("orders").add({
      ...orderData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  static async getUserOrders(userId, options = {}) {
    let query = db.collection("orders").where("userId", "==", userId).orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getOrder(orderId) {
    const doc = await db.collection("orders").doc(orderId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  static async updateOrderStatus(orderId, status) {
    await db.collection("orders").doc(orderId).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async markOrderPickedUp(orderId) {
    await db.collection("orders").doc(orderId).update({
      "fulfillment.pickedUp": true,
      "fulfillment.pickedUpAt": firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async markOrderDelivered(orderId) {
    await db.collection("orders").doc(orderId).update({
      "fulfillment.delivered": true,
      "fulfillment.deliveredAt": firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async getAllOrders(options = {}) {
    let query = db.collection("orders").orderBy("createdAt", "desc");

    if (options.status) {
      query = query.where("status", "==", options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Newsletter Services
class NewsletterService {
  static async subscribe(email) {
    await db.collection("newsletter").doc(email).set({
      email,
      subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  static async unsubscribe(email) {
    await db.collection("newsletter").doc(email).delete();
  }

  static async getSubscribers() {
    const snapshot = await db.collection("newsletter").get();
    return snapshot.docs.map(doc => doc.data());
  }
}

// Storage Services
class StorageService {
  static async uploadImage(file, path) {
    const storageRef = storage.ref().child(path);
    const snapshot = await storageRef.put(file);
    return await snapshot.ref.getDownloadURL();
  }

  static async deleteImage(path) {
    const storageRef = storage.ref().child(path);
    await storageRef.delete();
  }

  static getImageUrl(path) {
    return storage.ref().child(path).getDownloadURL();
  }
}

// Analytics Services
class AnalyticsService {
  static async trackEvent(eventType, eventData) {
    await db.collection("analytics").add({
      eventType,
      eventData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userId: auth.currentUser?.uid || null,
    });
  }

  static async getAnalytics(options = {}) {
    let query = db.collection("analytics").orderBy("timestamp", "desc");

    if (options.eventType) {
      query = query.where("eventType", "==", options.eventType);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  }
}

// Utility Services
class UtilityService {
  static formatCurrency(amount) {
    return `$${Number(amount).toFixed(2)}`;
  }

  static formatDate(date) {
    return new Date(date).toLocaleDateString();
  }

  static formatDateTime(date) {
    return new Date(date).toLocaleString();
  }

  static generateOrderId() {
    return "TC" + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePhone(phone) {
    const re = /^\+?[\d\s\-\(\)]{10,}$/;
    return re.test(phone);
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Export services for use in other modules
window.AuthService = AuthService;
window.UserService = UserService;
window.ProductService = ProductService;
window.CartService = CartService;
window.OrderService = OrderService;
window.NewsletterService = NewsletterService;
window.StorageService = StorageService;
window.AnalyticsService = AnalyticsService;
window.UtilityService = UtilityService;