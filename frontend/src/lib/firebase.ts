
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
 
const firebaseConfig = {
  apiKey: "AIzaSyDUZkejbsL0cbB7H8vfsyDNKWMzKLEihXY",
  authDomain: "e-commerce-ce363.firebaseapp.com",
  projectId: "e-commerce-ce363",
  storageBucket: "e-commerce-ce363.firebasestorage.app",
  messagingSenderId: "390518404397",
  appId: "1:390518404397:web:57699a2d57ba485a708fa4",
  measurementId: "G-E73BJ0YHC6",
};
 

// Only initialize Firebase on the client side
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== "undefined") {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
}

export { auth };
export default app!;
