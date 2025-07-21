"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";
import { auth } from "@/firebase/auth";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ uid: user.uid, ...userData });
          setFollowing(userData.following || []);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!following.length) return;
    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("uid", "in", following), orderBy("createdAt", "desc"), limit(10));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notifs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const post = docSnap.data();
          const userSnap = await getDoc(doc(db, "users", post.uid));
          const user = userSnap.data();
          return {
            id: docSnap.id,
            content: post.content,
            imageUrl: post.imageUrl,
            createdAt: post.createdAt?.toDate().toLocaleString(),
            user: {
              uid: post.uid,
              name: user?.name || "User",
              username: user?.username || "",
              photoURL: user?.photoURL || null,
            },
          };
        })
      );
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [following]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-4 flex justify-center">
        <div className="w-full max-w-2xl space-y-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet.</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded shadow p-4 flex items-start gap-4"
              >
                {notif.user.photoURL ? (
                  <img
                    src={notif.user.photoURL}
                    alt="User"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300" />
                )}
                <div className="flex-1">
                  <Link
                    href={`/users/${notif.user.uid}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {notif.user.name}
                  </Link>
                  <p className="text-sm text-gray-700">
                    posted: {notif.imageUrl ? notif.content?.slice(0, 50) + "..." : notif.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{notif.createdAt}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
} 