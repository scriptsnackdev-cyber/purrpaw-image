"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";

const LOADING_STEPS = [
  "Connecting to Google Cloud Vertex AI API...",
  "Analyzing standard facial structures & backgrounds...",
  "Running content safety filters...",
  "Applying high-definition sticker filters...",
  "Composing bold outline pop-anime typography...",
  "Aligning red inner textures to dialogue text...",
  "Enhancing outline contrasts and shadows...",
  "Formatting generated base64 buffer...",
];

export default function CharacterTalkPage() {
  const [images, setImages] = useState<string[]>([]);
  const [characterName, setCharacterName] = useState("");
  const [talkText, setTalkText] = useState("");
  const [theme, setTheme] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);


  // Cycling loading step messages
  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(LOADING_STEPS[0]);
      let stepIdx = 0;
      interval = setInterval(() => {
        stepIdx = (stepIdx + 1) % LOADING_STEPS.length;
        setLoadingStep(LOADING_STEPS[stepIdx]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileUpload = (file: File, idx: number) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    
    const maxBytes = 4 * 1024 * 1024; // 4MB limit
    if (file.size > maxBytes) {
      alert("Image size exceeds the 4MB limit. Please choose a smaller image.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        setImages(prev => {
          const next = [...prev];
          next[idx] = result;
          return next.filter(Boolean);
        });
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0 || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setResultImage(null);

    try {
      const selectedModel = localStorage.getItem("purrpaw_model") || "gemini-2.5-flash-image";
      const response = await fetch("/api/generate-character-talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          characterName: characterName.trim(),
          talkText: talkText.trim(),
          theme: theme.trim(),
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unexpected error occurred.");
      }

      setResultImage(data.imageUrl);
    } catch (err: any) {
      console.error("Character Talk generation failed:", err);
      setErrorMsg(err.message || "Failed to generate character talk sticker.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `character-talk-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyBase64 = () => {
    if (!resultImage) return;
    navigator.clipboard.writeText(resultImage);
    alert("Copied image base64 data to clipboard!");
  };

  const canGenerate = images.length > 0 && !loading;

  return (
    <>
      {/* Background aurora blobs */}
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
      </div>

      <div className="app-container">
        <Header />

        {/* Hero Banner */}
        <div className="hero-section">
          <span className="hero-mini-tag">STANDARD CHARACTER WITH STICKER DIALOGUES</span>
          <h1 className="hero-title">
            Character <span className="hero-title-highlight">Talk</span> sticker
          </h1>
          <p className="hero-subtitle">
            Keep your character proportions perfect and render bold white-stroked dialogue captions on the canvas.
          </p>
        </div>

        {/* Workspace */}
        <div className="workspace-grid">
          {/* Left Form */}
          <form className="panel-card" onSubmit={handleGenerate}>
            {/* Multi upload slots */}
            <div>
              <div className="section-label-tarot" style={{ marginBottom: "0.5rem" }}>
                <span className="section-num">[ I ]</span>
                <span className="section-txt">UPLOAD PORTRAITS (MAX 3)</span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[0, 1, 2].map((idx) => {
                  const imgSrc = images[idx];
                  const isDisabled = idx > 0 && images.length < idx;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        position: "relative", 
                        width: "80px", 
                        height: "80px",
                        opacity: isDisabled ? 0.3 : 1,
                        pointerEvents: isDisabled ? "none" : "auto"
                      }}
                    >
                      {!imgSrc ? (
                        <div
                          className="upload-zone-compact"
                          style={{ width: "100%", height: "100%", fontSize: "0.8rem" }}
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          title={`Portrait #${idx + 1}`}
                        >
                          ➕
                          <input
                            type="file"
                            ref={el => { fileInputRefs.current[idx] = el; }}
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                handleFileUpload(files[0], idx);
                              }
                            }}
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={loading}
                          />
                        </div>
                      ) : (
                        <div className="upload-preview-thumbnail-wrapper" style={{ width: "100%", height: "100%" }}>
                          <img src={imgSrc} alt={`Portrait Preview #${idx + 1}`} className="upload-preview-thumbnail" />
                          <button
                            type="button"
                            className="upload-remove-btn-compact"
                            onClick={() => removeImage(idx)}
                            title="Remove Portrait"
                            disabled={loading}
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inputs grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="section-label-tarot" style={{ display: "block" }}>
                  <span className="section-num">[ II ]</span>
                  <span className="section-txt">NAME</span>
                </label>
                <input
                  type="text"
                  className="prompt-textarea"
                  style={{ minHeight: "auto", height: "42px", padding: "0.5rem 0.75rem", marginTop: "0.4rem" }}
                  placeholder="Character Name..."
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="section-label-tarot" style={{ display: "block" }}>
                  <span className="section-num">[ III ]</span>
                  <span className="section-txt">THEME</span>
                </label>
                <input
                  type="text"
                  className="prompt-textarea"
                  style={{ minHeight: "auto", height: "42px", padding: "0.5rem 0.75rem", marginTop: "0.4rem" }}
                  placeholder="E.g., Winter, Cyberpunk..."
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Sticker Text */}
            <div>
              <div className="section-label-tarot">
                <span className="section-num">[ IV ]</span>
                <span className="section-txt">DIALOGUE STICKER TEXT</span>
              </div>
              <div className="textarea-wrapper" style={{ marginTop: "0.5rem" }}>
                <textarea
                  className="prompt-textarea"
                  placeholder="Dialogue inside the sticker (e.g., Get ready!, Let's go!). Drawn in bold pop outline typography."
                  value={talkText}
                  onChange={(e) => setTalkText(e.target.value)}
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="generate-btn"
              disabled={!canGenerate}
            >
              {loading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
                  Synthesizing Sticker...
                </>
              ) : (
                <>
                  <span>💫</span>
                  Generate Character Sticker
                </>
              )}
            </button>
          </form>

          {/* Right Panel Canvas */}
          <div className="canvas-panel">
            <div className="canvas-panel-header">
              <div className="section-label-tarot">
                <span className="section-num">[ V ]</span>
                <span className="section-txt">GENERATED RESULT</span>
              </div>
            </div>

            <div className="canvas-panel-body">
              {/* Loading */}
              {loading && (
                <div className="loading-box">
                  <div className="spinner-glow"></div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                      Synthesizing Pop Tensors
                    </h3>
                    <p className="progress-text" style={{ marginTop: "0.5rem" }}>
                      {loadingStep}
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {!loading && errorMsg && (
                <div className="results-wrapper" style={{ minHeight: "300px", justifyContent: "center" }}>
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p style={{ fontSize: "2rem" }}>❌</p>
                    <h3 style={{ color: "var(--accent-rose)", fontWeight: 700, marginTop: "1rem" }}>Synthesize Failed</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem", maxWidth: "400px", marginInline: "auto" }}>
                      {errorMsg}
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !resultImage && !errorMsg && (
                <div className="results-empty">
                  <div className="results-empty__icon" style={{ fontSize: "2rem" }}>✨</div>
                  <p className="results-empty__title">Awaiting Sticker Generation</p>
                  <p className="results-empty__subtitle">Upload character portraits, enter name details & speech dialogue, then generate.</p>
                </div>
              )}

              {/* Success Result */}
              {!loading && resultImage && (
                <div className="results-wrapper">
                  <div className="results-header">
                    <h3 className="results-title">✨ Character Sticker Dialogue</h3>
                    <span className="badge-model">Vertex AI</span>
                  </div>

                  <div className="results-canvas-container" style={{ aspectRatio: "1/1", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img
                      src={resultImage}
                      alt="Character Dialogue Output"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }}
                    />
                  </div>

                  <div className="result-actions-bar">
                    <button className="action-pill-btn download-pill" onClick={handleDownload} title="Download Image">
                      💾 Download
                    </button>
                    <button className="action-pill-btn copy-pill" onClick={handleCopyBase64} title="Copy Base64">
                      📋 Copy Base64
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="app-footer">
          <p>© 2026 Purrpaw-image. Crafted in partnership with Google Cloud Vertex AI.</p>
        </footer>
      </div>
    </>
  );
}
