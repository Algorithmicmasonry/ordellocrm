"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Package,
  Phone,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { LandingNav } from "./_components/landing-nav";
import { LandingHero } from "./_components/landing-hero";
import { LandingFaq } from "./_components/landing-faq";

/* ─── helpers ──────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.3rem 0.875rem",
        borderRadius: "9999px",
        background: "rgba(59,130,246,0.1)",
        border: "1px solid rgba(59,130,246,0.2)",
        fontSize: "0.75rem",
        color: "#93c5fd",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: "1.25rem",
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
        fontWeight: 800,
        color: "white",
        lineHeight: 1.15,
        letterSpacing: "-0.025em",
        marginBottom: "1rem",
      }}
    >
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "1rem",
        color: "rgba(255,255,255,0.5)",
        lineHeight: 1.65,
        maxWidth: "36rem",
        margin: "0 auto",
      }}
    >
      {children}
    </p>
  );
}

/* ─── page ──────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div style={{ backgroundColor: "#060a14", minHeight: "100vh", color: "white" }}>
      <LandingNav />
      <LandingHero />

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2.5rem 0" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "1,400+", label: "Orders managed" },
              { value: "₦17M+", label: "Revenue tracked" },
              { value: "25+",   label: "Agents supported" },
              { value: "98%",   label: "Platform uptime" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <SectionLabel>Features</SectionLabel>
            <SectionHeading>
              Stop managing your business<br />
              in <span style={{ color: "#60a5fa" }}>WhatsApp chats</span>
            </SectionHeading>
            <SectionSub>
              Everything a Nigerian e-commerce business needs to run cleanly — orders, agents, AI calls, inventory, and profit — in a single tab.
            </SectionSub>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: ShoppingCart,
                title: "Smart Order Management",
                desc: "Track every order from NEW to DELIVERED. Round-robin assignment, status updates, call notes, and follow-up scheduling — all in one view.",
                color: "#3b82f6",
                bg: "rgba(59,130,246,0.1)",
              },
              {
                icon: Phone,
                title: "AI Voice Calling",
                desc: "Automatically call customers to confirm orders, chase follow-ups, and handle delivery queries — powered by Vapi.ai. Your reps focus on selling.",
                color: "#4ade80",
                bg: "rgba(34,197,94,0.1)",
              },
              {
                icon: Truck,
                title: "Agent Distribution",
                desc: "Assign stock to delivery agents, track what they've delivered, reconcile defective and missing items, and view per-agent performance.",
                color: "#f472b6",
                bg: "rgba(236,72,153,0.1)",
              },
              {
                icon: Package,
                title: "Inventory Control",
                desc: "Real-time stock tracking across your warehouse and agents. Get low-stock alerts before you run out mid-campaign.",
                color: "#a78bfa",
                bg: "rgba(139,92,246,0.1)",
              },
              {
                icon: BarChart3,
                title: "Profit & Analytics",
                desc: "Revenue, cost, expenses, and net profit — by day, week, or month. Compare periods and see exactly where your money is going.",
                color: "#fb923c",
                bg: "rgba(249,115,22,0.1)",
              },
              {
                icon: Users,
                title: "Sales Rep Tracking",
                desc: "Monitor each rep's order count, revenue, conversion rate, and activity. Run fair round-robin assignment with a single toggle.",
                color: "#34d399",
                bg: "rgba(16,185,129,0.1)",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "1.75rem",
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "border-color 200ms ease-out, background-color 200ms ease-out",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(255,255,255,0.14)";
                  el.style.backgroundColor = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = "rgba(255,255,255,0.07)";
                  el.style.backgroundColor = "rgba(255,255,255,0.025)";
                }}
              >
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.6rem",
                    background: f.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.125rem",
                  }}
                >
                  <f.icon style={{ width: "1.1rem", height: "1.1rem", color: f.color }} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <SectionLabel>How it works</SectionLabel>
            <SectionHeading>
              Up and running in{" "}
              <span style={{ color: "#60a5fa" }}>under an hour</span>
            </SectionHeading>
            <SectionSub>
              No complex setup. No developer needed. Just sign up, add your products, and share your order link.
            </SectionSub>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Package,
                title: "Add your products",
                desc: "Enter your product catalogue with pricing, cost, and currency settings. Multi-currency supported from day one.",
              },
              {
                step: "02",
                icon: ClipboardList,
                title: "Share your order form",
                desc: "Get a shareable link to your branded order form. Post it in your ads, stories, and bio. Orders flow in automatically.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Ordello handles the rest",
                desc: "Orders are auto-assigned to your reps. AI calls confirm them. Agents dispatch. You watch the dashboard.",
              },
            ].map((step, i) => (
              <div key={step.step} style={{ position: "relative" }}>
                {/* Connecting line */}
                {i < 2 && (
                  <div
                    className="hidden md:block"
                    style={{
                      position: "absolute",
                      top: "1.75rem",
                      right: "-3rem",
                      width: "6rem",
                      height: "1px",
                      background: "linear-gradient(to right, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                    }}
                  />
                )}
                <div
                  style={{
                    padding: "1.75rem",
                    borderRadius: "1rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    height: "100%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", minWidth: "2rem" }}>
                      {step.step}
                    </div>
                    <div
                      style={{
                        width: "2.25rem",
                        height: "2.25rem",
                        borderRadius: "0.55rem",
                        background: "rgba(59,130,246,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <step.icon style={{ width: "1rem", height: "1rem", color: "#60a5fa" }} />
                    </div>
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof / case study ─────────────────────────── */}
      <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div
            style={{
              borderRadius: "1.25rem",
              background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(6,10,20,0) 60%)",
              border: "1px solid rgba(59,130,246,0.2)",
              padding: "3rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative glow */}
            <div style={{ position: "absolute", top: "-4rem", right: "-4rem", width: "16rem", height: "16rem", background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    fontSize: "0.7rem",
                    color: "#4ade80",
                    fontWeight: 600,
                    marginBottom: "1.25rem",
                  }}
                >
                  <TrendingUp style={{ width: "0.7rem", height: "0.7rem" }} />
                  Real results
                </div>
                <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>
                  From Excel chaos to{" "}
                  <span style={{ color: "#60a5fa" }}>₦17M tracked</span> in one quarter
                </h2>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "1.75rem" }}>
                  &ldquo;Before Ordello we were managing 4 reps and 25+ agents entirely in WhatsApp groups and Google Sheets. We had no idea what our actual profit was. Now I can open the dashboard and see everything in real time.&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 700, color: "white" }}>
                    H
                  </div>
                  <div>
                    <div style={{ fontSize: "0.875rem", color: "white", fontWeight: 600 }}>Henry O.</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Health & Wellness brand, Lagos</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "4",    label: "Sales reps", icon: Users },
                  { value: "25+",  label: "Agents",     icon: Truck },
                  { value: "1,400",label: "Orders",     icon: ShoppingCart },
                  { value: "₦17M", label: "Revenue",    icon: TrendingUp },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: "1.25rem",
                      borderRadius: "0.875rem",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <m.icon style={{ width: "1rem", height: "1rem", color: "#60a5fa", marginBottom: "0.625rem" }} />
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{m.value}</div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.125rem" }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing CTA ───────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading>
              One plan. Everything included.
            </SectionHeading>
            <SectionSub>
              No per-seat pricing. No hidden add-ons. Just one flat plan that gives your whole team access to every feature.
            </SectionSub>
          </div>

          {/* Pricing card */}
          <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
            <div
              style={{
                borderRadius: "1.25rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(59,130,246,0.25)",
                padding: "2.5rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Popular badge */}
              <div style={{ position: "absolute", top: "1rem", right: "1rem", padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", fontSize: "0.65rem", color: "#93c5fd", fontWeight: 600 }}>
                Most popular
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>Ordello Pro</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                  <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "white" }}>₦35,000</span>
                  <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>/month</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginTop: "0.25rem" }}>
                  Or ₦350,000/year — save 2 months
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "2rem" }}>
                {[
                  "Unlimited orders & products",
                  "Up to 15 sales reps",
                  "Up to 50 delivery agents",
                  "AI voice calling (Vapi)",
                  "WhatsApp delivery tracking",
                  "Multi-currency pricing",
                  "Full analytics & profit reports",
                  "Priority support",
                ].map((feature) => (
                  <div key={feature} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", color: "#4ade80", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.65)" }}>{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  background: "#2563eb",
                  color: "white",
                  padding: "0.9rem 1.5rem",
                  borderRadius: "0.75rem",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  transition: "background-color 150ms ease-out, transform 160ms ease-out",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#3b82f6"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#2563eb"; }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                Start 14-day free trial
                <ArrowRight style={{ width: "1rem", height: "1rem" }} />
              </Link>
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "0.75rem" }}>
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel>FAQ</SectionLabel>
            <SectionHeading>Questions & answers</SectionHeading>
            <SectionSub>
              Everything you need to know before getting started.
            </SectionSub>
          </div>
          <LandingFaq />
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 1.25rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
            Ready to run your business<br />
            <span style={{ color: "#60a5fa" }}>the right way?</span>
          </h2>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: "2.5rem" }}>
            Join e-commerce operators using Ordello to track every order, every naira, and every delivery — with zero spreadsheet chaos.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#2563eb",
                color: "white",
                padding: "0.9rem 1.875rem",
                borderRadius: "0.875rem",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                transition: "background-color 150ms ease-out, transform 160ms ease-out",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#3b82f6"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#2563eb"; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              Start free trial
              <ArrowRight style={{ width: "1.1rem", height: "1.1rem" }} />
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.8)",
                padding: "0.9rem 1.875rem",
                borderRadius: "0.875rem",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                transition: "background-color 150ms ease-out, border-color 150ms ease-out, transform 160ms ease-out",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(255,255,255,0.09)"; el.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(255,255,255,0.05)"; el.style.borderColor = "rgba(255,255,255,0.1)"; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "3rem 0" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div style={{ gridColumn: "span 1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
                <div style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.4rem", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: "0.8rem", color: "white" }} stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                </div>
                <span style={{ fontWeight: 700, color: "white", fontSize: "1rem" }}>ordello</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.65 }}>
                The CRM built for Nigerian e-commerce. Track every order, every naira, every delivery.
              </p>
            </div>

            {/* Links */}
            {[
              {
                heading: "Product",
                links: ["Features", "Pricing", "Changelog", "Roadmap"],
              },
              {
                heading: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
              {
                heading: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
              },
            ].map((col) => (
              <div key={col.heading}>
                <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
                  {col.heading}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {col.links.map((link) => (
                    <li key={link}>
                      <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", cursor: "default" }}>
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
              © {new Date().getFullYear()} Ordello. All rights reserved.
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
              Built for Nigerian e-commerce
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
