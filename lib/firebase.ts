"use client"

import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAWNcpxKR_hqwBiqFa0cg8L35LedxoPhaQ",
  authDomain: "gerador-de-oferta.firebaseapp.com",
  projectId: "gerador-de-oferta",
  storageBucket: "gerador-de-oferta.firebasestorage.app",
  messagingSenderId: "818658819468",
  appId: "1:818658819468:web:e5f7447dcedd42d90a2aa9",
  measurementId: "G-PQV7NGL01Q",
}

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)

export const db = getFirestore(app)

