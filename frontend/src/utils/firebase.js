import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewagent-6cf1d.firebaseapp.com",
  projectId: "interviewagent-6cf1d",
  storageBucket: "interviewagent-6cf1d.firebasestorage.app",
  messagingSenderId: "644561855983",
  appId: "1:644561855983:web:9ac218fceab076594c021a"
};

const app = initializeApp(firebaseConfig);

const auth= getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider }