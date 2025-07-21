'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/firestore";
import Navbar from "@/components/Navbar";

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allResultsVisible, setAllResultsVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(storedHistory);
  }, []);

  const updateSearchHistory = (term) => {
    if (!term.trim()) return;

    const updated = [term, ...searchHistory.filter((t) => t !== term)].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const handleSearch = async (term) => {
    if (!term.trim()) return;

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const results = [];

    snapshot.forEach((doc) => {
      const user = doc.data();
      const match = user.username?.toLowerCase().includes(term.toLowerCase()) ||
                    user.name?.toLowerCase().includes(term.toLowerCase());

      if (match) {
        results.push({ uid: doc.id, ...user });
      }
    });

    updateSearchHistory(term);
    setSearchResults(results);
    setAllResultsVisible(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  const removeHistoryItem = (term) => {
    const updated = searchHistory.filter((t) => t !== term);
    setSearchHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  const visibleResults = allResultsVisible ? searchResults : searchResults.slice(0, 5);

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-6 bg-gray-50 text-gray-800 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">🔍 Explore Users</h1>

        <div className="w-full max-w-xl mb-6">
          <input
            type="text"
            placeholder="Search for users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(searchTerm)}
            className="w-full p-2 border rounded"
          />
          <button
            onClick={() => handleSearch(searchTerm)}
            className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {searchHistory.length > 0 && (
          <div className="w-full max-w-xl mb-6 bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-700">Search History</h2>
              <button
                onClick={clearHistory}
                className="text-sm text-red-500 hover:underline"
              >
                Clear All
              </button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {searchHistory.map((item, i) => (
                <li
                  key={item}
                  className="bg-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  <span
                    onClick={() => handleSearch(item)}
                    className="cursor-pointer hover:underline"
                  >
                    {item}
                  </span>
                  <button
                    onClick={() => removeHistoryItem(item)}
                    className="text-xs text-gray-500 hover:text-red-500"
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {visibleResults.length > 0 && (
          <div className="w-full max-w-xl bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-4 text-gray-700">Search Results</h2>
            <ul className="space-y-2">
              {visibleResults.map((user) => (
                <li
                  key={user.uid}
                  onClick={() => router.push(`/users/${user.uid}`)}
                  className="p-3 border rounded hover:bg-gray-100 cursor-pointer"
                >
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </li>
              ))}
            </ul>
            {searchResults.length > 5 && !allResultsVisible && (
              <button
                onClick={() => setAllResultsVisible(true)}
                className="mt-4 text-blue-600 hover:underline text-sm"
              >
                View all results
              </button>
            )}
          </div>
        )}

        {searchResults.length === 0 && (
          <p className="text-gray-500">No results found.</p>
        )}
      </main>
    </>
  );
}