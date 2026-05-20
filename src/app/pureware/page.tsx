"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";

const LOADING_STEPS = [
  "Connecting to Google Cloud Vertex AI API...",
  "Analyzing character body structure...",
  "Extracting outfit textures & style...",
  "Running content safety filters...",
  "Draping outfit using physics-based synthesis...",
  "Refining details and lighting contrasts...",
  "Formatting generated base64 buffer...",
];

export default function PureWarePage() {
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [outfitImage, setOutfitImage] = useState<string | null>(null);
  const [additionalRequests, setAdditionalRequests] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const charInputRef = useRef<HTMLInputElement>(null);
  const outfitInputRef = useRef<HTMLInputElement>(null);


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

  const handleFileUpload = (file: File, type: "character" | "outfit") => {
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
        if (type === "character") {
          setCharacterImage(result);
        } else {
          setOutfitImage(result);
        }
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterImage || !outfitImage || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setResultImage(null);

    try {
      const selectedModel = localStorage.getItem("purrpaw_model") || "gemini-2.5-flash-image";
      const response = await fetch("/api/pureware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterImage,
          outfitImage,
          additionalRequests: additionalRequests.trim(),
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An unexpected error occurred.");
      }

      setResultImage(data.imageUrl);
    } catch (err: any) {
      console.error("PureWare generation failed:", err);
      setErrorMsg(err.message || "Failed to generate virtual Try-On image.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `pureware-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyBase64 = () => {
    if (!resultImage) return;
    navigator.clipboard.writeText(resultImage);
    alert("Copied image base64 data to clipboard!");
  };

  const canGenerate = !!characterImage && !!outfitImage && !loading;

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
          <span className="hero-mini-tag">VIRTUAL OUTFIT draping</span>
          <h1 className="hero-title">
            Pure<span className="hero-title-highlight">Ware</span> Outfit Swap
          </h1>
          <p className="hero-subtitle">
            Upload a character photo and a garment template, then let Vertex AI seamlessly drape the new look.
          </p>
        </div>

        {/* Workspace */}
        <div className="workspace-grid">
          {/* Left Form */}
          <form className="panel-card" onSubmit={handleGenerate}>
            {/* Character Upload */}
            <div>
              <div className="section-label-tarot" style={{ marginBottom: "0.5rem" }}>
                <span className="section-num">[ I ]</span>
                <span className="section-txt">CHARACTER PHOTO</span>
              </div>
              
              {!characterImage ? (
                <div 
                  className="upload-zone"
                  onClick={() => charInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("dragover");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("dragover");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("dragover");
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0], "character");
                    }
                  }}
                >
                  <div className="upload-icon-box">
                    <span>👤</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p className="upload-zone-title">UPLOAD CHARACTER</p>
                    <p className="upload-zone-subtitle">Face, hair & body base (Max 4MB)</p>
                  </div>
                  <input
                    type="file"
                    ref={charInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0], "character");
                      }
                    }}
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="upload-preview-thumbnail-wrapper" style={{ width: "100px", height: "100px" }}>
                  <img src={characterImage} alt="Character Preview" className="upload-preview-thumbnail" />
                  <button
                    type="button"
                    className="upload-remove-btn-compact"
                    onClick={() => setCharacterImage(null)}
                    title="Remove Character"
                    disabled={loading}
                    style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}
                  >
                    ❌
                  </button>
                </div>
              )}
            </div>

            {/* Outfit Upload */}
            <div>
              <div className="section-label-tarot" style={{ marginBottom: "0.5rem" }}>
                <span className="section-num">[ II ]</span>
                <span className="section-txt">OUTFIT TEMPLATE</span>
              </div>
              
              {!outfitImage ? (
                <div 
                  className="upload-zone"
                  onClick={() => outfitInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("dragover");
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("dragover");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("dragover");
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0], "outfit");
                    }
                  }}
                >
                  <div className="upload-icon-box">
                    <span>👕</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p className="upload-zone-title">UPLOAD OUTFIT</p>
                    <p className="upload-zone-subtitle">Garment fabric & textures (Max 4MB)</p>
                  </div>
                  <input
                    type="file"
                    ref={outfitInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0], "outfit");
                      }
                    }}
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="upload-preview-thumbnail-wrapper" style={{ width: "100px", height: "100px" }}>
                  <img src={outfitImage} alt="Outfit Preview" className="upload-preview-thumbnail" />
                  <button
                    type="button"
                    className="upload-remove-btn-compact"
                    onClick={() => setOutfitImage(null)}
                    title="Remove Outfit"
                    disabled={loading}
                    style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}
                  >
                    ❌
                  </button>
                </div>
              )}
            </div>

            {/* Custom Details */}
            <div>
              <div className="section-label-tarot">
                <span className="section-num">[ III ]</span>
                <span className="section-txt">ADDITIONAL OPTIONS</span>
              </div>
              <div className="textarea-wrapper" style={{ marginTop: "0.5rem" }}>
                <textarea
                  className="prompt-textarea"
                  placeholder="E.g., change background to a flower garden, add a black hat, customize colors..."
                  value={additionalRequests}
                  onChange={(e) => setAdditionalRequests(e.target.value)}
                  disabled={loading}
                  maxLength={1000}
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
                  Draping...
                </>
              ) : (
                <>
                  <span>💫</span>
                  Swap Outfit Now
                </>
              )}
            </button>
          </form>

          {/* Right Panel Canvas */}
          <div className="canvas-panel">
            <div className="canvas-panel-header">
              <div className="section-label-tarot">
                <span className="section-num">[ IV ]</span>
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
                      Adapting Fashion Tensors
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
                    <h3 style={{ color: "var(--accent-rose)", fontWeight: 700, marginTop: "1rem" }}>Draping Failed</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem", maxWidth: "400px", marginInline: "auto" }}>
                      {errorMsg}
                    </p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !resultImage && !errorMsg && (
                <div className="results-empty">
                  <div className="results-empty__icon" style={{ fontSize: "2rem" }}>🎭</div>
                  <p className="results-empty__title">Awaiting Try-On Generation</p>
                  <p className="results-empty__subtitle">Upload character photo and outfit template above, then generate.</p>
                </div>
              )}

              {/* Success Result */}
              {!loading && resultImage && (
                <div className="results-wrapper">
                  <div className="results-header">
                    <h3 className="results-title">✨ Styled Adaptation</h3>
                    <span className="badge-model">Vertex AI</span>
                  </div>

                  <div className="results-canvas-container" style={{ aspectRatio: "1/1", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <img
                      src={resultImage}
                      alt="Virtual Dressing Output"
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
