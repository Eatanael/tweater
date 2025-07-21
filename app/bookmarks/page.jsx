'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  startAfter,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import Navbar from "@/components/Navbar";

export default function BookmarksPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const loaderRef = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
      } else {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setCurrentUser({ uid: user.uid, ...docSnap.data() });
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const loadBookmarkedPosts = async () => {
    if (!currentUser) return;

    const q = query(
      collection(db, "posts"),
      where("bookmarks", "array-contains", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBookmarkedPosts(posts);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
  };

  const loadMoreBookmarkedPosts = async () => {
    if (!lastVisible || !currentUser) return;

    setLoadingMore(true);
    const nextQ = query(
      collection(db, "posts"),
      where("bookmarks", "array-contains", currentUser.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(5)
    );

    const snapshot = await getDocs(nextQ);
    const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBookmarkedPosts(prev => [...prev, ...newPosts]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (currentUser) loadBookmarkedPosts();
  }, [currentUser]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMoreBookmarkedPosts();
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => loaderRef.current && observer.unobserve(loaderRef.current);
  }, [loaderRef, loadingMore, currentUser]);

  const toggleLike = async (postId, likedBy) => {
    const postRef = doc(db, "posts", postId);
    const hasLiked = likedBy.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? likedBy.filter((uid) => uid !== currentUser.uid)
      : [...likedBy, currentUser.uid];
    await updateDoc(postRef, { likedBy: updatedLikes });
    loadBookmarkedPosts();
  };

  const toggleBookmark = async (postId, bookmarks) => {
    const postRef = doc(db, "posts", postId);
    const hasBookmarked = bookmarks.includes(currentUser.uid);
    const updatedBookmarks = hasBookmarked
      ? bookmarks.filter((uid) => uid !== currentUser.uid)
      : [...bookmarks, currentUser.uid];
    await updateDoc(postRef, { bookmarks: updatedBookmarks });
    loadBookmarkedPosts();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Your Bookmarks 🔖
        </h1>

        <div className="w-full max-w-xl space-y-4">
          {bookmarkedPosts.map((post) => {
            const hasLiked = post.likedBy?.includes(currentUser?.uid);
            const hasBookmarked = post.bookmarks?.includes(currentUser?.uid);

            return (
              <div key={post.id} className="bg-white p-4 rounded shadow border">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span className="font-medium">{post.name}</span>
                  <span>{post.createdAt?.toDate?.().toLocaleString()}</span>
                </div>
                <p className="text-gray-800 mb-2">{post.content}</p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full rounded border mb-2 object-cover max-h-96"
                  />
                )}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <button onClick={() => toggleLike(post.id, post.likedBy || [])}>
                    {hasLiked ? "💙 Liked" : "🤍 Like"}
                  </button>
                  <button onClick={() => toggleBookmark(post.id, post.bookmarks || [])}>
                    {hasBookmarked ? "🔖 Bookmarked" : "📄 Bookmark"}
                  </button>
                  <span>{post.likedBy?.length || 0} like(s)</span>
                  <span>{post.comments?.length || 0} comment(s)</span>
                </div>

                {/* Comments */}
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-700">Comments</h4>
                  {post.comments?.map((c, i) => (
                    <div
                      key={i}
                      className="text-sm bg-gray-100 text-gray-900 p-2 my-1 rounded"
                    >
                      <span className="font-semibold text-gray-800">{c.name}</span>:{" "}
                      {c.content}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Infinite Scroll Loader */}
          <div ref={loaderRef} className="py-6 mb-40 text-center text-gray-500">
            {loadingMore ? "Loading more bookmarks..." : "Scroll to load more"}
          </div>
        </div>
      </main>
    </>
  );
}