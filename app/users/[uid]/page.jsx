"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "@/firebase/firestore";
import { auth } from "@/firebase/auth";
import Navbar from "@/components/Navbar";

export default function OtherUserProfile() {
  const { uid } = useParams();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          setCurrentUser({ uid: user.uid, ...docSnap.data() });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const loadUser = async () => {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({ uid, ...data });
      }
    };
    loadUser();
  }, [uid]);

  const fetchPosts = async () => {
    if (!uid) return;
    const postsRef = collection(db, "posts");
    let q = query(
      postsRef,
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snapshot = await getDocs(q);
    const newPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setPosts((prev) => [...prev, ...newPosts]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
  };

  useEffect(() => {
    if (uid) {
      fetchPosts();
    }
  }, [uid]);

  const lastPostElementRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          fetchPosts().finally(() => setLoadingMore(false));
        }
      });
      if (node) observer.current.observe(node);
    },
    [loadingMore, lastDoc]
  );

  const toggleLike = async (postId, likedBy) => {
    const postRef = doc(db, "posts", postId);
    const hasLiked = likedBy.includes(currentUser.uid);
    const updatedLikes = hasLiked
      ? likedBy.filter((uid) => uid !== currentUser.uid)
      : [...likedBy, currentUser.uid];
    await updateDoc(postRef, { likedBy: updatedLikes });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likedBy: updatedLikes } : p
      )
    );
  };

  const toggleBookmark = async (postId, bookmarks) => {
    const postRef = doc(db, "posts", postId);
    const hasBookmarked = bookmarks.includes(currentUser.uid);
    const updated = hasBookmarked
      ? bookmarks.filter((uid) => uid !== currentUser.uid)
      : [...bookmarks, currentUser.uid];
    await updateDoc(postRef, { bookmarks: updated });
    setPosts((prev) => (prev.map((p) => (p.id === postId ? { ...p, bookmarks: updated } : p))));
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
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...(p.comments || []), newComment] }
          : p
      )
    );
  };

  const handleFollowToggle = async () => {
    const currentRef = doc(db, "users", currentUser.uid);
    const viewedRef = doc(db, "users", uid);

    const isFollowing = userData?.followers?.includes(currentUser.uid);

    await updateDoc(currentRef, {
      following: isFollowing ? arrayRemove(uid) : arrayUnion(uid),
    });

    await updateDoc(viewedRef, {
      followers: isFollowing
        ? arrayRemove(currentUser.uid)
        : arrayUnion(currentUser.uid),
    });

    const updatedDoc = await getDoc(viewedRef);
    setUserData({ uid, ...updatedDoc.data() });
  };

  const isFollowing = userData?.followers?.includes(currentUser?.uid);
  const joinedDate = userData?.joinedAt?.toDate?.().toLocaleDateString?.() || "-";

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 bg-gray-50 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-white rounded shadow p-4 text-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {userData?.name || "User"}
          </h2>
          <p className="text-sm text-gray-500">@{userData?.username}</p>
          <p className="text-sm text-gray-600">
            {userData?.followers?.length || 0} Followers · {userData?.following?.length || 0} Following
          </p>
          <p className="text-xs text-gray-500">Joined {joinedDate}</p>
          {currentUser?.uid !== uid && (
            <button
              onClick={handleFollowToggle}
              className={`mt-2 px-4 py-2 rounded text-white ${isFollowing ? "bg-red-500" : "bg-blue-500"}`}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        <div className="w-full max-w-xl space-y-4">
          {posts.map((post, index) => {
            const hasLiked = post.likedBy?.includes(currentUser?.uid);
            const hasBookmarked = post.bookmarks?.includes(currentUser?.uid);
            const isLast = index === posts.length - 1;
            return (
              <div
                key={`${post.id}-${index}`}
                ref={isLast ? lastPostElementRef : null}
                className="bg-white p-4 rounded shadow border"
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
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <button onClick={() => toggleLike(post.id, post.likedBy || [])}>
                    {hasLiked ? "💙 Liked" : "❤️ Like"}
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
                      className="flex-1 border px-2 py-1 rounded text-sm"
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
        </div>
      </main>
    </>
  );
}