import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ SIGN UP
  const signup = async (email, password, name) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", res.user.uid), {
      uid: res.user.uid,
      name,
      email,
      role: "user", // 🔥 default role
      createdAt: new Date()
    });
  };

  // ✅ LOGIN
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // ✅ LOGOUT
  const logout = () => signOut(auth);

  // ✅ GET USER PROFILE
  const getUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  };

  // ✅ AUTH LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          ...profile
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
