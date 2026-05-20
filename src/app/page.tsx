"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable prefer-const */
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";


const INSPIRE_PROMPTS = [
  "A majestic origami phoenix rising from glowing paper ashes, intricate folds, paper texture, studio lighting",
  "A photorealistic close-up of a futuristic cybernetic owl with neon glowing gears, nocturnal forest background",
  "Cyberpunk market street in Neo-Tokyo after heavy rain, vibrant neon sign reflections on dark wet puddles, 8k",
  "A whimsical watercolor of a magical library built inside a giant ancient oak tree, warm fairy lights glowing",
  "An intricate 3D render of a glass terrarium floating in deep cosmic space, bioluminescent forest inside",
  "Sleek retro-futuristic synthwave sports car speeding on a neon grid highway, purple and orange sunset background",
  "A majestic dragon made of liquid emerald and gold splashes, frozen in motion, black solid studio background",
  "A cinematic portrait of a cosmic explorer in an ornate space suit, looking at a nebula reflection on the helmet visor",
  "An ancient mystical temple hidden behind a colossal waterfall in a tropical jungle, volumetric sunbeams, fantasy style",
];

// UI controls for style selection, aspect ratios, and image counts are removed. Generations are strictly single images in 1:1 square aspect ratio.

const LOADING_STEPS = [
  "Connecting to Google Cloud Vertex AI API...",
  "Initializing Vertex AI Gemini client...",
  "Running content safety filters...",
  "Synthesizing latent canvas variables...",
  "Rendering pixel tensors via diffusion steps...",
  "Processing and refining image contrasts...",
  "Converting generated buffers to base64 outputs...",
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [prompt, setPrompt] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [modelUsed, setModelUsed] = useState<string>("");
  const [errorInfo, setErrorInfo] = useState<{
    error: string;
    details?: string;
    isConfigError?: boolean;
  } | null>(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  // Inspire me helper
  const handleInspireMe = () => {
    const randomIndex = Math.floor(Math.random() * INSPIRE_PROMPTS.length);
    setPrompt(INSPIRE_PROMPTS[randomIndex]);
  };

  // Handle local file uploads
  const handleFileUpload = (file: File) => {
    if (uploadedImages.length >= 2) {
      alert("You can upload a maximum of 2 reference images.");
      return;
    }

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
        setUploadedImages(prev => [...prev, result]);
      }
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setErrorInfo(null);
    setGeneratedImages([]);

    try {
      const selectedModel = localStorage.getItem("purrpaw_model") || "gemini-2.5-flash-image";
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          images: uploadedImages,
          aspectRatio: "1:1",
          sampleCount: 1,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.error || "An unexpected error occurred.",
          details: data.details,
          isConfigError: data.isConfigError,
        };
      }

      setGeneratedImages(data.images);
      setModelUsed(data.modelUsed);
    } catch (err: any) {
      console.error("Generation failed:", err);
      setErrorInfo({
        error: err.message || "Failed to contact generator API.",
        details: err.details || "Make sure your server is running and configuration variables are set.",
        isConfigError: err.isConfigError || false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (base64Data: string, filename: string) => {
    const link = document.createElement("a");
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyBase64 = (base64Data: string) => {
    navigator.clipboard.writeText(base64Data);
    alert("Copied image base64 data to clipboard!");
  };

  return (
    <>
      {/* Background aurora blobs */}
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
      </div>

      <div className="app-container">
        {/* Header Section */}
        <Header />

        {/* Centered Hero Banner Section */}
        <div className="hero-section">
          <span className="hero-mini-tag">VERTEX AI IMAGE SYNTHESIZER</span>
          <h1 className="hero-title">
            Transform into <span className="hero-title-highlight">Purrpaw Image</span>
          </h1>
          <p className="hero-subtitle">
            Upload reference images, describe your vision, and watch the magic unfold.
          </p>
        </div>

        {/* Main Columns workspace */}
        <div className="workspace-grid">
          {/* Controls Form Panel */}
          <form className="panel-card" onSubmit={handleGenerate}>
            <div>
              <div className="section-label-tarot">
                <span className="section-num">[ I ]</span>
                <span className="section-txt">ENTER PROMPT</span>
              </div>
              <div className="textarea-wrapper" style={{ marginTop: "0.5rem" }}>
                <textarea
                  className="prompt-textarea"
                  placeholder="Describe the image you want to generate in detail..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Reference Image Upload Control */}
            <div>
              <div className="section-label-tarot" style={{ marginBottom: "0.5rem" }}>
                <span className="section-num">[ II ]</span>
                <span className="section-txt">REFERENCE IMAGES (MAX 2)</span>
              </div>
              
              {uploadedImages.length === 0 ? (
                <div 
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
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
                      handleFileUpload(files[0]);
                    }
                  }}
                >
                  <div className="upload-icon-box">
                    <span>↑</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p className="upload-zone-title">DROP OR CLICK</p>
                    <p className="upload-zone-subtitle">PNG, JPG or WEBP (Max 4MB)</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0]);
                      }
                    }}
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={loading}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  {uploadedImages.map((imgSrc, idx) => (
                    <div key={idx} className="upload-preview-thumbnail-wrapper">
                      <img src={imgSrc} alt={`Reference Preview ${idx + 1}`} className="upload-preview-thumbnail" />
                      <button
                        type="button"
                        className="upload-remove-btn-compact"
                        onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        title="Remove Reference Image"
                        disabled={loading}
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                  
                  {uploadedImages.length < 2 && (
                    <div 
                      className="upload-zone-compact"
                      onClick={() => fileInputRef.current?.click()}
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
                          handleFileUpload(files[0]);
                        }
                      }}
                      title="Add Reference Image"
                    >
                      <span style={{ fontSize: "1rem" }}>➕</span>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileUpload(files[0]);
                      }
                    }}
                    accept="image/*"
                    style={{ display: "none" }}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* Style, Aspect Ratio, and Number of Images selectors are removed as the app strictly creates 1:1 single images. */}

            {/* Submit Button */}
            <button
              type="submit"
              className="generate-btn"
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <span>💫</span>
                  Generate Masterpiece
                </>
              )}
            </button>
          </form>

          {/* Canvas Display Area */}
          <div className="canvas-panel">
            <div className="canvas-panel-header">
              <div className="section-label-tarot">
                <span className="section-num">[ III ]</span>
                <span className="section-txt">GENERATED RESULT</span>
              </div>
            </div>

            <div className="canvas-panel-body">
              {/* Loading State */}
              {loading && (
                <div className="loading-box">
                  <div className="spinner-glow"></div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                      Synthesizing Masterpiece
                    </h3>
                    <p className="progress-text" style={{ marginTop: "0.5rem" }}>
                      {loadingStep}
                    </p>
                  </div>
                </div>
              )}

              {/* Error & Dev Guide Wizard */}
              {!loading && errorInfo && (
                <div className="results-wrapper">
                  <div className="results-header" style={{ borderColor: "rgba(244, 63, 94, 0.2)" }}>
                    <h3 className="results-title" style={{ color: "var(--accent-rose)" }}>
                      ❌ Generation Failed
                    </h3>
                    <span className="badge-model" style={{ background: "rgba(244, 63, 94, 0.08)", color: "var(--accent-rose)" }}>
                      Config Error
                    </span>
                  </div>

                  <div className="dev-guide-card">
                    <div className="guide-header">
                      <span>⚙️</span>
                      Vertex AI Configuration Required
                    </div>
                    
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <strong>Error Message:</strong> {errorInfo.error}
                    </p>
                    
                    {errorInfo.isConfigError && (
                      <>
                        <div className="guide-step-title">1. Setup Environment Variables</div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Open the <strong>.env</strong> file at your project root and declare the missing properties:
                        </p>
                        <pre className="guide-code">
  {`VERTEX_AI_MODEL=imagen-3.0-generate-001
  GOOGLE_CLOUD_PROJECT=your-gcp-project-id
  GOOGLE_CLOUD_LOCATION=us-central1
  GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json`}
                        </pre>

                        <div className="guide-step-title">2. Obtain GCP Service Account Credentials</div>
                        <ul className="guide-bullet-list">
                          <li>Go to GCP Console &gt; IAM &amp; Admin &gt; Service Accounts.</li>
                          <li>Create a Service Account and assign the <strong>Vertex AI User</strong> role.</li>
                          <li>Generate a new <strong>JSON Key File</strong> and download it.</li>
                          <li>Place this JSON file at the project root as <code>gcp-key.json</code>.</li>
                        </ul>

                        <div className="guide-step-title">3. Enable Vertex AI API</div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          Make sure the <strong>Vertex AI API</strong> is enabled in your Google Cloud Project.
                        </p>
                      </>
                    )}
                    
                    {!errorInfo.isConfigError && errorInfo.details && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div className="guide-step-title">Actionable Recommendation</div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                          {errorInfo.details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Results State */}
              {!loading && !errorInfo && generatedImages.length > 0 && (
                <div className="results-wrapper">
                  <div className="results-header">
                    <h3 className="results-title">✨ Synthesized Outputs</h3>
                    <span className="badge-model">
                      {modelUsed || "imagen-3.0-generate-001"}
                    </span>
                  </div>

                  <div className="images-container">
                    {generatedImages.map((imgBase64, idx) => (
                      <div key={idx} className="image-canvas-card">
                        <img
                          src={imgBase64}
                          alt={`Generated Output ${idx + 1}`}
                          className="generated-image"
                        />
                        <div className="glass-overlay">
                          <div style={{ color: "white", fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {prompt}
                          </div>
                          <div className="overlay-actions">
                            <button
                              className="action-icon-btn"
                              onClick={() => handleCopyBase64(imgBase64)}
                              title="Copy Base64 String"
                            >
                              📋
                            </button>
                            <button
                              className="action-btn-text"
                              onClick={() => handleDownload(imgBase64, `purrpaw-${Date.now()}-${idx + 1}.png`)}
                            >
                              ⬇️ Download PNG
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!loading && !errorInfo && generatedImages.length === 0 && (
                <div className="canvas-empty-state">
                  <div className="glowing-icon-placeholder">✦</div>
                  <h3 className="empty-state-title">No image generated</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Choose options and enter prompt on the left to see previews here
                  </p>
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
