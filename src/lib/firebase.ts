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
    let envVal = process.env[envKey];
    if (envVal) {
        envVal = envVal.trim();
        try {
            const parsed = JSON.parse(envVal);
            // Merge: only overwrite with non-empty values
            Object.keys(parsed).forEach(key => {
                if (parsed[key]) {
                    firebaseConfig[key] = parsed[key];
                }
            });
        } catch (e: any) {
            console.error(`Failed to parse ${envKey}`, {
                error: e.message,
                valLength: envVal.length,
                prefix: envVal.substring(0, 10),
                suffix: envVal.substring(envVal.length - 10)
            });
        }
    }
});

// Final fallback/debug logging (keys are safe to log existence of)
if (process.env.NODE_ENV === 'production') {
    console.log("Firebase discovery:", {
        hasApiKey: !!firebaseConfig.apiKey,
        hasProjectId: !!firebaseConfig.projectId,
        projectId: firebaseConfig.projectId
    });
}

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
