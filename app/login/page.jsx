'use client';

import { useState } from "react";
import { auth } from "@/firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full max-w-md text-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <Input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm mt-3 text-center">
          Don’t have an account?{" "}
          <a href="/register" className="text-blue-600 hover:underline">Register</a>
        </p>
      </form>
    </main>
  );
}

function Input({ name, type, placeholder, onChange }) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      onChange={onChange}
      required
      className="w-full mb-4 px-4 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}