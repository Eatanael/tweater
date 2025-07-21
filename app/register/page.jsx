'use client';

import { useState } from "react";
import { auth } from "@/firebase/auth";
import { db } from "@/firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const DEFAULT_AVATAR = "https://source.unsplash.com/100x100/?face";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    dob: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const { name, username, email, dob, password, confirmPassword } = form;
    const age = new Date().getFullYear() - new Date(dob).getFullYear();

    if (!name || name.length < 6) return "Name must be at least 6 characters.";
    if (!username) return "Username is required.";
    if (!email.includes("@")) return "Invalid email format.";
    if (!dob) return "Date of birth is required.";
    if (age < 17) return "You must be at least 16 years old.";
    if (!password) return "Password is required.";
    if (password !== confirmPassword) return "Passwords do not match.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) return setError(validationError);

    const { name, username, email, dob, password } = form;

    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        username,
        email,
        dob,
        profilePic: DEFAULT_AVATAR,
        createdAt: new Date(),
      });

      alert("Account created! Redirecting to login...");
      window.location.href = "/login";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-black">
        <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <Input name="name" placeholder="Full Name" onChange={handleChange} />
        <Input name="username" placeholder="Username" onChange={handleChange} />
        <Input name="email" type="email" placeholder="Email" onChange={handleChange} />
        <Input name="dob" type="date" placeholder="Date of Birth" onChange={handleChange} />
        <Input name="password" type="password" placeholder="Password" onChange={handleChange} />
        <Input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handleChange} />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded mt-4 hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-sm mt-3 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </p>
      </form>
    </main>
  );
}

function Input({ name, type = "text", placeholder, onChange }) {
  return (
    <input
      name={name}
      type={type}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full mb-4 px-4 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      required
    />
  );
}