import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

let firebaseConfig: any = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

// Robust discovery for App Hosting
const configsToTry = ['FIREBASE_WEBAPP_CONFIG', 'FIREBASE_CONFIG'];
configsToTry.forEach(envKey => {
    const envVal = process.env[envKey];
    if (envVal) {
        try {
            const parsed = JSON.parse(envVal);
            // Merge but prioritize existing apiKey if found
            firebaseConfig = { ...parsed, ...firebaseConfig };
            // Ensure project ID is synced
            if (!firebaseConfig.projectId && parsed.projectId) firebaseConfig.projectId = parsed.projectId;
        } catch (e) {
            console.error(`Failed to parse ${envKey}`, e);
        }
    }
});

// Initialize Firebase only if we have a config (prevents build errors if keys are missing)
let app: any;
if (firebaseConfig.apiKey || firebaseConfig.projectId) {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (e) {
        console.error("Firebase init failed", e);
    }
}

const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;
const auth = app ? getAuth(app) : null;

export { app, db, storage, auth };
