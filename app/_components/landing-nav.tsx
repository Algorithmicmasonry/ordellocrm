"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { OrdelloLogo } from "@/components/ordello-logo";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background-color 200ms ease-out, border-color 200ms ease-out",
        backgroundColor: scrolled ? "rgba(6,10,20,0.92)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <OrdelloLogo size={32} />
          <span style={{ color: "white", fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>
            Ordello
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.55)",
                transition: "color 150ms ease-out",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "white")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.55)")}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.65)",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              transition: "color 150ms ease-out",
              textDecoration: "none",
            }}
          >
            Log in
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: "0.875rem",
              color: "white",
              backgroundColor: "#2563eb",
              padding: "0.5rem 1.125rem",
              borderRadius: "0.625rem",
              fontWeight: 600,
              transition: "background-color 150ms ease-out, transform 150ms ease-out",
              textDecoration: "none",
              display: "inline-block",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "#3b82f6")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "#2563eb")}
          >
            Start free trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          style={{ color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(6,10,20,0.97)",
            backdropFilter: "blur(16px)",
            padding: "1rem 1.25rem 1.25rem",
          }}
          className="md:hidden space-y-1"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: "block",
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.6)",
                padding: "0.625rem 0",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <Link
              href="/login"
              style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.7)",
                padding: "0.7rem 1rem",
                borderRadius: "0.625rem",
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
              }}
            >
              Log in
            </Link>
            <Link
              href="/login"
              style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "white",
                backgroundColor: "#2563eb",
                padding: "0.7rem 1rem",
                borderRadius: "0.625rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
