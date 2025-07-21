import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDVrQwd7J4TRmqYbvx-piGI5lTJHw9Xh8U",
  authDomain: "tweater-fp.firebaseapp.com",
  projectId: "tweater-fp",
  storageBucket: "tweater-fp.firebasestorage.app", // keep it here even if not using for now
  messagingSenderId: "1059380270390",
  appId: "1:1059380270390:web:bd30c6cccfd61d74f7cf97"
};

export const app = initializeApp(firebaseConfig);