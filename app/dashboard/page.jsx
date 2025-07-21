'use client';

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  startAfter,
  limit,
} from "firebase/firestore";

import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import Navbar from "@/components/Navbar";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPost, setNewPost] = useState({ content: "", imageUrl: "" });
  const [commentText, setCommentText] = useState({});
  const loaderRef = useRef();
  const router = useRouter();

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

  const loadPosts = async () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(5));
    const snapshot = await getDocs(q);
    const postList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    setPosts(postList);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  };

  const loadMorePosts = async () => {
    if (!lastVisible) return;

    console.log("⏳ Loading more posts...");
    setLoadingMore(true);

    const nextQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(5)
    );
    const snapshot = await getDocs(nextQuery);
    const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (snapshot.docs.length > 0) {
      setPosts(prev => [...prev, ...newPosts]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } else {
      console.log("✅ No more posts to load");
      setLastVisible(null); // Prevent further calls
    }

    setLoadingMore(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore) {
          console.log("👀 Loader in view, fetching next batch...");
          loadMorePosts();
        }
      },
      { threshold: 1 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [loaderRef, loadingMore, lastVisible]);

  const handlePostSubmit = async () => {
    if (!newPost.content.trim()) return;

    await addDoc(collection(db, "posts"), {
      ...newPost,
      uid: currentUser.uid,
      name: currentUser.name || "Anonymous",
      likedBy: [],
      bookmarks: [],
      comments: [],
      createdAt: serverTimestamp(),
    });

    setNewPost({ content: "", imageUrl: "" });
    loadPosts();
  };

  const toggleLike = async (postId, likedBy) => {
    const postRef = doc(db, "posts", postId);
    const hasLiked = likedBy.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? likedBy.filter((uid) => uid !== currentUser.uid)
      : [...likedBy, currentUser.uid];
    await updateDoc(postRef, { likedBy: updatedLikes });
    loadPosts();
  };

  const toggleBookmark = async (postId, bookmarks) => {
    const postRef = doc(db, "posts", postId);
    const hasBookmarked = bookmarks.includes(currentUser.uid);
    const updatedBookmarks = hasBookmarked
      ? bookmarks.filter((uid) => uid !== currentUser.uid)
      : [...bookmarks, currentUser.uid];
    await updateDoc(postRef, { bookmarks: updatedBookmarks });
    loadPosts();
  };

  const handleCommentChange = (postId, text) => {
    setCommentText((prev) => ({ ...prev, [postId]: text }));
  };

  const handleCommentSubmit = async (postId) => {
    const postRef = doc(db, "posts", postId);
    const post = posts.find((p) => p.id === postId);
    const newComment = {
      uid: currentUser.uid,
      name: currentUser.name || "Anonymous",
      content: commentText[postId].trim(),
      createdAt: new Date(),
    };

    await updateDoc(postRef, {
      comments: [...(post.comments || []), newComment],
    });

    setCommentText((prev) => ({ ...prev, [postId]: "" }));
    loadPosts();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Welcome, {currentUser?.name || "Guest"} 👋
        </h1>

        {/* Post form */}
        <div className="w-full max-w-xl mb-8">
          <textarea
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            placeholder="What's happening?"
            className="w-full p-2 border border-gray-300 rounded mb-2 text-gray-800 placeholder-gray-500 resize-none"
            rows={3}
          />
          <input
            type="text"
            value={newPost.imageUrl}
            onChange={(e) => setNewPost({ ...newPost, imageUrl: e.target.value })}
            placeholder="Optional image URL"
            className="w-full p-2 border border-gray-300 rounded mb-2 text-gray-800 placeholder-gray-500"
          />
          <button
            onClick={handlePostSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Post
          </button>
        </div>

        {/* Posts List */}
        <div className="w-full max-w-xl space-y-4">
          {currentUser &&
            posts.map((post) => {
              const hasLiked = post.likedBy?.includes(currentUser.uid);
              const hasBookmarked = post.bookmarks?.includes(currentUser.uid);

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

                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">Comments</h4>
                    {post.comments?.map((c, i) => (
                      <div key={i} className="text-sm text-gray-800 bg-gray-100 p-2 my-1 rounded">
                        <span className="font-semibold">{c.name}</span>: {c.content}
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={commentText[post.id] || ""}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 border px-2 py-1 rounded text-sm text-gray-800 placeholder-gray-500"
                      />
                      <button
                        onClick={() => handleCommentSubmit(post.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Loader */}
          <div ref={loaderRef} className="py-6 mb-40 text-center text-gray-500">
            {loadingMore ? "Loading more posts..." : "Scroll to load more"}
          </div>
        </div>
      </main>
    </>
  );
}