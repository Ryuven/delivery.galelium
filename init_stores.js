// ============================================================
//  init_stores.js — Инициализация коллекции stores в Firestore
//  Запустить ОДИН РАЗ через браузерную консоль или как ES-модуль
//  после подключения firebase.js
// ============================================================
//
//  Либо вручную создать документы в Firebase Console:
//  Firestore → stores → (новый документ)
//
//  Структура документа stores/{storeId}:
//  {
//    name:        string   — название магазина
//    description: string   — краткое описание
//    imageUrl:    string   — URL баннера 512×256
//    badge:       string   — текст бейджа (напр. "Новинка")
//    order:       number   — порядок отображения (1, 2, 3…)
//    active:      boolean  — показывать ли магазин
//    createdAt:   timestamp
//  }
//
//  Товары (products) должны иметь поле storeId = ID магазина

import { db } from './firebase.js';
import { collection, doc, setDoc, serverTimestamp } from
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const STORES = [
  {
    id:          'evar',
    name:        'Ёвар',
    description: 'Маҳсулоти сифатнок',
    imageUrl:    'https://delivery.galelium.com/storage/catalogs/evar_catalog.png',
    badge:       '',
    order:       1,
    active:      true,
  },
  {
    id:          'paykar',
    name:        'Пайкар',
    description: 'Беҳтарин интихоб',
    imageUrl:    'https://delivery.galelium.com/storage/catalogs/paykar_catalog.png',
    badge:       '',
    order:       2,
    active:      true,
  },
  {
    id:          'bi1',
    name:        'bi1',
    description: 'Тезу осон',
    imageUrl:    'https://delivery.galelium.com/storage/catalogs/bi1_catalog.png',
    badge:       '',
    order:       3,
    active:      true,
  },
];

async function initStores() {
  for (const store of STORES) {
    const { id, ...data } = store;
    await setDoc(doc(collection(db, 'stores'), id), {
      ...data,
      createdAt: serverTimestamp(),
    });
    console.log(`✅ Store "${store.name}" (${store.id}) created`);
  }
  console.log('🎉 All stores initialized!');
}

initStores().catch(console.error);
