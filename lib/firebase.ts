"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyAWNcpxKR_hqwBiqFa0cg8L35LedxoPhaQ",
  authDomain: "gerador-de-oferta.firebaseapp.com",
  projectId: "gerador-de-oferta",
  storageBucket: "gerador-de-oferta.firebasestorage.app",
  messagingSenderId: "818658819468",
  appId: "1:818658819468:web:e5f7447dcedd42d90a2aa9",
  measurementId: "G-PQV7NGL01Q",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

let analytics
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app)
      } catch (error) {
        console.warn("Analytics not initialized:", error)
      }
    }
  }).catch(console.error)
}

export { db, app, analytics }
