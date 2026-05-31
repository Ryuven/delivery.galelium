import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, 
  query, where, orderBy, onSnapshot, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjIAMFuwLKwmjChCuiz-MHLv5WZOczAAE",
  authDomain: "delivery-galelium.firebaseapp.com",
  projectId: "delivery-galelium",
  storageBucket: "delivery-galelium.firebasestorage.app",
  messagingSenderId: "982466555080",
  appId: "1:982466555080:web:c77ccbff0e71e540ddc9fd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Коллекции (автоматически создадутся при первом добавлении)
const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';
const COURIERS_COLLECTION = 'couriers';

export { 
  db, auth, 
  collection, addDoc, getDocs, doc, updateDoc, 
  query, where, orderBy, onSnapshot, Timestamp,
  ORDERS_COLLECTION, PRODUCTS_COLLECTION, COURIERS_COLLECTION,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
};
