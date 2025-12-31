import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDgUj8F_LtrFQv4YIgrSe1P9WV_bA8diuQ",
    authDomain: "ai-iztro.firebaseapp.com",
    projectId: "ai-iztro",
    storageBucket: "ai-iztro.firebasestorage.app",
    messagingSenderId: "265368973836",
    appId: "1:265368973836:web:b8df8957005aa570a17429",
    measurementId: "G-6RGSJLEWW0"
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;

try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized");
} catch (error) {
    // Using console.error might be too noisy if failure is expected in some regions
    // e.g., if the user wants it completely silent, we might strip this, 
    // but usually a debug log is helpful.
    // The user said "fail silently", which usually implies no crash.
    // I will log a debug message just in case.
    console.debug("Firebase initialization failed:", error);
}

if (app) {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.debug("Firebase Analytics initialization failed:", error);
    }
}

export { app, analytics };
