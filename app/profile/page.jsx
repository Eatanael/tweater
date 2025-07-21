'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { auth } from '@/firebase/auth';
import { db } from '@/firebase/firestore';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [viewing, setViewing] = useState('posted'); // 'posted' or 'liked'
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const router = useRouter();
  const observerRef = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
      } else {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserData({ uid: user.uid, ...docSnap.data() });
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPosts = useCallback(async () => {
    if (!userData) return;

    const baseQuery =
      viewing === 'posted'
        ? query(
            collection(db, 'posts'),
            where('uid', '==', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(5),
            ...(lastDoc ? [startAfter(lastDoc)] : [])
          )
        : query(
            collection(db, 'posts'),
            where('likedBy', 'array-contains', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(5),
            ...(lastDoc ? [startAfter(lastDoc)] : [])
          );

    const snapshot = await getDocs(baseQuery);
    const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

    if (newPosts.length === 0) {
      setHasMore(false);
    }

    setPosts((prev) => {
  const combined = [...prev, ...newPosts];
  const uniqueMap = new Map();
  combined.forEach((post) => uniqueMap.set(post.id, post));
  return [...uniqueMap.values()];
});
  }, [userData, viewing, lastDoc]);

  useEffect(() => {
  if (userData) {
    fetchPosts();
  }
  }, [fetchPosts, userData]);


  useEffect(() => {
    if (userData) fetchPosts();
  }, [fetchPosts, userData]);

  const observer = useRef();
  const lastPostRef = useCallback(
    (node) => {
      if (!hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchPosts, hasMore]
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
        <div className="bg-white shadow rounded p-6 w-full max-w-2xl mb-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800">{userData?.name}</h2>
          <p className="text-gray-600">@{userData?.username}</p>
          <p className="text-gray-600">
            {userData?.followers?.length || 0} Followers · {userData?.following?.length || 0} Following
          </p>
          <p className="text-gray-500 text-sm">Joined {formatDate(userData?.createdAt)}</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setViewing('posted')}
            className={`px-4 py-2 rounded ${
              viewing === 'posted' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            My Posts
          </button>
          <button
            onClick={() => setViewing('liked')}
            className={`px-4 py-2 rounded ${
              viewing === 'liked' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Liked Posts
          </button>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id}
              ref={index === posts.length - 1 ? lastPostRef : null}
              className="bg-white p-4 rounded shadow"
            >
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span className="font-medium">{post.name}</span>
                <span>{post.createdAt?.toDate().toLocaleString()}</span>
              </div>
              <p className="text-gray-800 mb-2">{post.content}</p>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-full rounded border mb-2 object-cover max-h-96"
                />
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>💙 {post.likedBy?.length || 0} like(s)</span>
                <span>💬 {post.comments?.length || 0} comment(s)</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}