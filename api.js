// ============================================================
//  api.js — Delivery Service Firebase API
//  Firebase v9 (modular SDK) + Firestore
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  limit,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// ─── Firebase Config ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCjIAMFuwLKwmjChCuiz-MHLv5WZOczAAE",
  authDomain: "delivery-galelium.firebaseapp.com",
  projectId: "delivery-galelium",
  storageBucket: "delivery-galelium.firebasestorage.app",
  messagingSenderId: "982466555080",
  appId: "1:982466555080:web:c77ccbff0e71e540ddc9fd",
};

const app       = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// ─── Collection Names ─────────────────────────────────────────
const COL = {
  USERS:    "users",
  PRODUCTS: "products",
  ORDERS:   "orders",
  CART:     "cart",
  COURIERS: "couriers",
  REVIEWS:  "reviews",
  CATEGORIES: "categories",
};

// ─── Roles ───────────────────────────────────────────────────
export const ROLES = {
  CLIENT:  "client",
  COURIER: "courier",
  ADMIN:   "admin",
};

// ─── ORDER STATUS ─────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING:    "pending",      // Ожидает подтверждения
  CONFIRMED:  "confirmed",    // Подтверждён
  PREPARING:  "preparing",    // Готовится
  DELIVERING: "delivering",   // В доставке
  DELIVERED:  "delivered",    // Доставлен
  CANCELLED:  "cancelled",    // Отменён
};

// ================================================================
//  AUTH API
// ================================================================

/**
 * Регистрация нового пользователя
 * Автоматически создаёт документ в коллекции users
 */
export async function registerUser({ email, password, displayName, phone = "", role = ROLES.CLIENT }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid  = cred.user.uid;

  await updateProfile(cred.user, { displayName });

  const userDoc = {
    uid,
    email,
    displayName,
    phone,
    role,
    address: "",
    avatarUrl: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, COL.USERS, uid), userDoc);

  // Если курьер — создаём запись в couriers
  if (role === ROLES.COURIER) {
    await setDoc(doc(db, COL.COURIERS, uid), {
      uid,
      displayName,
      phone,
      isActive: false,
      currentOrderId: null,
      rating: 0,
      totalDeliveries: 0,
      createdAt: serverTimestamp(),
    });
  }

  return cred.user;
}

/**
 * Авторизация
 * Возвращает { user, userData } — userData из Firestore
 */
export async function loginUser(email, password) {
  const cred     = await signInWithEmailAndPassword(auth, email, password);
  const userData = await getUserData(cred.user.uid);
  return { user: cred.user, userData };
}

/** Выход */
export async function logoutUser() {
  await signOut(auth);
}

/**
 * Слушатель состояния авторизации
 * callback(user) — user == null если не авторизован
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Текущий пользователь */
export function getCurrentUser() {
  return auth.currentUser;
}

// ================================================================
//  USERS API
// ================================================================

/** Получить данные пользователя из Firestore */
export async function getUserData(uid) {
  const snap = await getDoc(doc(db, COL.USERS, uid));
  if (!snap.exists()) throw new Error("User not found");
  return snap.data();
}

/** Обновить профиль пользователя */
export async function updateUserProfile(uid, updates) {
  const allowed = ["displayName", "phone", "address", "avatarUrl"];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  filtered.updatedAt = serverTimestamp();
  await updateDoc(doc(db, COL.USERS, uid), filtered);

  if (updates.displayName) {
    await updateProfile(auth.currentUser, { displayName: updates.displayName });
  }
}

/** Загрузить аватар и сохранить URL */
export async function uploadAvatar(uid, file) {
  const storageRef = ref(storage, `avatars/${uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, COL.USERS, uid), { avatarUrl: url, updatedAt: serverTimestamp() });
  return url;
}

// ================================================================
//  CATALOG / PRODUCTS API
// ================================================================

/** Получить все продукты (с фильтром по категории) */
export async function getProducts({ categoryId = null, search = "" } = {}) {
  let q = collection(db, COL.PRODUCTS);

  const constraints = [orderBy("name")];
  if (categoryId) constraints.push(where("categoryId", "==", categoryId));

  const snap = await getDocs(query(q, ...constraints));
  let products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (search) {
    const s = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(s));
  }

  return products;
}

/** Получить один продукт */
export async function getProduct(productId) {
  const snap = await getDoc(doc(db, COL.PRODUCTS, productId));
  if (!snap.exists()) throw new Error("Product not found");
  return { id: snap.id, ...snap.data() };
}

/** Добавить продукт (admin) */
export async function addProduct({ name, description, price, categoryId, imageUrl = "", available = true }) {
  return await addDoc(collection(db, COL.PRODUCTS), {
    name,
    description,
    price: Number(price),
    categoryId,
    imageUrl,
    available,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Обновить продукт (admin) */
export async function updateProduct(productId, updates) {
  updates.updatedAt = serverTimestamp();
  await updateDoc(doc(db, COL.PRODUCTS, productId), updates);
}

/** Удалить продукт (admin) */
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, COL.PRODUCTS, productId));
}

/** Получить категории */
export async function getCategories() {
  const snap = await getDocs(query(collection(db, COL.CATEGORIES), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Добавить категорию (admin) */
export async function addCategory(name, iconUrl = "") {
  return await addDoc(collection(db, COL.CATEGORIES), {
    name,
    iconUrl,
    createdAt: serverTimestamp(),
  });
}

// ================================================================
//  CART API
// ================================================================

/** Получить корзину пользователя */
export async function getCart(uid) {
  const snap = await getDocs(collection(db, COL.USERS, uid, "cart"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Добавить/обновить товар в корзине */
export async function addToCart(uid, product, quantity = 1) {
  const cartRef = doc(db, COL.USERS, uid, "cart", product.id);
  const snap    = await getDoc(cartRef);

  if (snap.exists()) {
    await updateDoc(cartRef, { quantity: increment(quantity), updatedAt: serverTimestamp() });
  } else {
    await setDoc(cartRef, {
      productId:  product.id,
      name:       product.name,
      price:      product.price,
      imageUrl:   product.imageUrl || "",
      quantity,
      addedAt:    serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });
  }
}

/** Изменить количество товара в корзине */
export async function updateCartItem(uid, productId, quantity) {
  if (quantity <= 0) return removeFromCart(uid, productId);
  await updateDoc(doc(db, COL.USERS, uid, "cart", productId), {
    quantity,
    updatedAt: serverTimestamp(),
  });
}

/** Удалить товар из корзины */
export async function removeFromCart(uid, productId) {
  await deleteDoc(doc(db, COL.USERS, uid, "cart", productId));
}

/** Очистить корзину */
export async function clearCart(uid) {
  const snap  = await getDocs(collection(db, COL.USERS, uid, "cart"));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

/** Посчитать итог корзины */
export function calcCartTotal(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ================================================================
//  ORDERS API
// ================================================================

/**
 * Создать заказ из корзины
 * cartItems — массив из getCart()
 */
export async function createOrder(uid, { cartItems, address, comment = "", paymentMethod = "cash" }) {
  if (!cartItems.length) throw new Error("Cart is empty");

  const total = calcCartTotal(cartItems);

  const orderData = {
    clientId:      uid,
    items:         cartItems,
    total,
    address,
    comment,
    paymentMethod,
    status:        ORDER_STATUS.PENDING,
    courierId:     null,
    courierName:   null,
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COL.ORDERS), orderData);
  await clearCart(uid);
  return ref.id;
}

/** Получить заказы клиента */
export async function getClientOrders(uid) {
  const q    = query(
    collection(db, COL.ORDERS),
    where("clientId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Получить один заказ */
export async function getOrder(orderId) {
  const snap = await getDoc(doc(db, COL.ORDERS, orderId));
  if (!snap.exists()) throw new Error("Order not found");
  return { id: snap.id, ...snap.data() };
}

/** Отменить заказ клиентом */
export async function cancelOrder(orderId) {
  await updateDoc(doc(db, COL.ORDERS, orderId), {
    status:    ORDER_STATUS.CANCELLED,
    updatedAt: serverTimestamp(),
  });
}

/** Realtime слушатель заказов клиента */
export function listenClientOrders(uid, callback) {
  const q = query(
    collection(db, COL.ORDERS),
    where("clientId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Realtime слушатель одного заказа (статус) */
export function listenOrder(orderId, callback) {
  return onSnapshot(doc(db, COL.ORDERS, orderId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// ================================================================
//  COURIER API
// ================================================================

/** Получить все новые заказы (для курьера) */
export async function getNewOrders() {
  const q    = query(
    collection(db, COL.ORDERS),
    where("status", "==", ORDER_STATUS.CONFIRMED),
    where("courierId", "==", null),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Realtime слушатель новых заказов (для курьера) */
export function listenNewOrders(callback) {
  const q = query(
    collection(db, COL.ORDERS),
    where("status", "==", ORDER_STATUS.CONFIRMED),
    where("courierId", "==", null),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Курьер берёт заказ */
export async function acceptOrder(orderId, courierId, courierName) {
  await updateDoc(doc(db, COL.ORDERS, orderId), {
    courierId,
    courierName,
    status:    ORDER_STATUS.DELIVERING,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COL.COURIERS, courierId), {
    currentOrderId: orderId,
    isActive:       true,
  });
}

/** Курьер обновляет статус заказа */
export async function updateOrderStatus(orderId, status, courierId = null) {
  await updateDoc(doc(db, COL.ORDERS, orderId), {
    status,
    updatedAt: serverTimestamp(),
  });

  if (status === ORDER_STATUS.DELIVERED && courierId) {
    await updateDoc(doc(db, COL.COURIERS, courierId), {
      currentOrderId:  null,
      isActive:        false,
      totalDeliveries: increment(1),
    });
  }
}

/** Получить активные заказы курьера */
export async function getCourierActiveOrders(courierId) {
  const q    = query(
    collection(db, COL.ORDERS),
    where("courierId", "==", courierId),
    where("status", "in", [ORDER_STATUS.DELIVERING, ORDER_STATUS.PREPARING])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** История доставок курьера */
export async function getCourierHistory(courierId) {
  const q    = query(
    collection(db, COL.ORDERS),
    where("courierId", "==", courierId),
    where("status", "==", ORDER_STATUS.DELIVERED),
    orderBy("updatedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================================================================
//  ADMIN API
// ================================================================

/** Получить все заказы (admin) */
export async function getAllOrders({ status = null } = {}) {
  const constraints = [orderBy("createdAt", "desc")];
  if (status) constraints.push(where("status", "==", status));

  const snap = await getDocs(query(collection(db, COL.ORDERS), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Подтвердить заказ (admin) */
export async function confirmOrder(orderId) {
  await updateDoc(doc(db, COL.ORDERS, orderId), {
    status:    ORDER_STATUS.CONFIRMED,
    updatedAt: serverTimestamp(),
  });
}

/** Получить всех пользователей (admin) */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, COL.USERS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================================================================
//  REVIEWS API
// ================================================================

/** Оставить отзыв на заказ */
export async function addReview(uid, orderId, { rating, comment }) {
  await addDoc(collection(db, COL.REVIEWS), {
    uid,
    orderId,
    rating:    Number(rating),
    comment,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COL.ORDERS, orderId), { reviewed: true });
}

/** Получить отзывы */
export async function getReviews(orderId = null) {
  const constraints = [orderBy("createdAt", "desc")];
  if (orderId) constraints.push(where("orderId", "==", orderId));

  const snap = await getDocs(query(collection(db, COL.REVIEWS), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ================================================================
//  UTILITY HELPERS
// ================================================================

/** Форматировать цену */
export function formatPrice(amount) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);
}

/** Метка статуса на русском */
export function statusLabel(status) {
  const map = {
    [ORDER_STATUS.PENDING]:    "⏳ Ожидает",
    [ORDER_STATUS.CONFIRMED]:  "✅ Подтверждён",
    [ORDER_STATUS.PREPARING]:  "👨‍🍳 Готовится",
    [ORDER_STATUS.DELIVERING]: "🚴 В пути",
    [ORDER_STATUS.DELIVERED]:  "🎉 Доставлен",
    [ORDER_STATUS.CANCELLED]:  "❌ Отменён",
  };
  return map[status] || status;
}

/** Цвет статуса (CSS-переменная / hex) */
export function statusColor(status) {
  const map = {
    [ORDER_STATUS.PENDING]:    "#f59e0b",
    [ORDER_STATUS.CONFIRMED]:  "#3b82f6",
    [ORDER_STATUS.PREPARING]:  "#8b5cf6",
    [ORDER_STATUS.DELIVERING]: "#06b6d4",
    [ORDER_STATUS.DELIVERED]:  "#10b981",
    [ORDER_STATUS.CANCELLED]:  "#ef4444",
  };
  return map[status] || "#6b7280";
}
