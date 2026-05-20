"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Redirect to homepage after successful login
        router.push("/");
        router.refresh(); // Refresh the router to update layout and state
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
      </div>
      <div 
        className="app-container" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh",
          padding: "2rem"
        }}
      >
        <div 
          className="panel-card" 
          style={{ 
            maxWidth: "400px", 
            width: "100%", 
            textAlign: "center",
            padding: "2.5rem"
          }}
        >
          <div className="brand-icon-pink" style={{ margin: "0 auto 1.5rem auto", width: "3.5rem", height: "3.5rem", fontSize: "1.75rem" }}>
            ✦
          </div>
          <h1 className="hero-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
            Welcome Back
          </h1>
          <p className="hero-subtitle" style={{ marginBottom: "2rem" }}>
            Enter your passphrase to access Purrpaw Image.
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="textarea-wrapper">
              <input
                type="password"
                className="prompt-textarea"
                placeholder="Passphrase..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ 
                  minHeight: "auto", 
                  padding: "1rem", 
                  textAlign: "center", 
                  letterSpacing: "0.1em" 
                }}
              />
            </div>

            {error && (
              <div style={{ color: "var(--accent-rose)", fontSize: "0.85rem", fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="generate-btn" 
              disabled={loading || !password}
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Authenticating..." : "Enter Void"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
