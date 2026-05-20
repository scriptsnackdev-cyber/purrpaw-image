"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash-image");
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "dark";
    setTheme(savedTheme);

    const savedModel = localStorage.getItem("purrpaw_model") || "gemini-2.5-flash-image";
    setModel(savedModel);
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    setModel(newModel);
    localStorage.setItem("purrpaw_model", newModel);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const navItems = [
    { name: "Image Gen", path: "/" },
    { name: "PureWare", path: "/pureware" },
    { name: "Character Group", path: "/character-group" },
    { name: "Chibi Talk", path: "/chibi-talk" },
    { name: "Character Talk", path: "/character-talk" },
  ];

  const getBrandName = (path: string) => {
    switch (path) {
      case "/":
        return "Image";
      case "/pureware":
        return "PureWare";
      case "/character-group":
        return "Char Group";
      case "/chibi-talk":
        return "Chibi Talk";
      case "/character-talk":
        return "Char Talk";
      default:
        return "Image";
    }
  };

  return (
    <header className="header-glass">
      <div 
        className={`brand-badge-wrapper ${isOpen ? "open" : ""}`} 
        ref={dropdownRef}
      >
        <div
          className="brand-badge-tarot"
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsOpen(!isOpen);
            }
          }}
          style={{ userSelect: "none" }}
        >
          <div className="brand-icon-pink">✦</div>
          <div className="brand-text-block">
            <span className="brand-tiny">PURRPAW</span>
            <span className="brand-bold">{getBrandName(pathname)}</span>
          </div>
          <span className="brand-caret-down">∨</span>
        </div>

        <div className="brand-dropdown-menu">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`brand-dropdown-item ${isActive ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="dropdown-item-dot">✦</span>
                <span className="dropdown-item-text">{item.name}</span>
                {isActive && <span className="dropdown-item-active-pill">Active</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div className="model-select-wrapper">
          <select
            className="model-select-tarot"
            value={model}
            onChange={handleModelChange}
            aria-label="Select Model"
          >
            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
            <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash (Preview)</option>
            <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Preview)</option>
          </select>
        </div>

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          style={{ cursor: "pointer" }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
