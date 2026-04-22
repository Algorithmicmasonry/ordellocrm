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
import { OrdelloLogo } from "@/components/ordello-logo";
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

      {/* ── YouTube demo embed ────────────────────────────────── */}
      <section style={{ padding: "5rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <SectionLabel>See it in action</SectionLabel>
            <SectionHeading>
              Watch Ordello <span style={{ color: "#60a5fa" }}>in a real business</span>
            </SectionHeading>
            <SectionSub>
              See how Henry went from WhatsApp chaos to a fully tracked operation — orders, agents, profit, all in one place.
            </SectionSub>
          </div>
          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              borderRadius: "1rem",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/y_zd_cHPqyc?si=wayLSuu0Ck6Mbn0N"
              title="Ordello demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </section>

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

      {/* ── Feature showcase (videos) ─────────────────────────── */}
      <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <SectionLabel>System walkthrough</SectionLabel>
            <SectionHeading>
              The moments that make operators{" "}
              <span style={{ color: "#60a5fa" }}>switch immediately</span>
            </SectionHeading>
            <SectionSub>
              See the real dashboards — not mockups. Every video is from a live Ordello account.
            </SectionSub>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5rem" }}>

            {/* Row 1: text left, video right */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem", padding: "0.2rem 0.75rem", background: "rgba(59,130,246,0.1)", borderRadius: "9999px", border: "1px solid rgba(59,130,246,0.2)" }}>
                  Profit Clarity
                </div>
                <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>
                  Finally see if you're actually making money
                </h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
                  Not revenue. Real profit after ad spend, clearing fees, failed deliveries, commissions, and hidden leakage. The number most operators think they know — until they see it properly.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {["See ROAS, ROI, margin, and product-level profit clearly", "Know what to kill, what to fix, and what to scale", "Stop confusing top-line sales with actual business health"].map((b) => (
                    <div key={b} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", color: "#4ade80", flexShrink: 0, marginTop: "0.2rem" }} />
                      <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: "1rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0a0f1e", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
                <video controls autoPlay muted loop playsInline style={{ width: "100%", display: "block" }}>
                  <source src="/enterprise/ordello-profit-clarity.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            {/* Row 2: video left, text right */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div style={{ borderRadius: "1rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0a0f1e", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }} className="order-last lg:order-first">
                <video controls autoPlay muted loop playsInline style={{ width: "100%", display: "block" }}>
                  <source src="/enterprise/ordello-round-robin-assign.mp4" type="video/mp4" />
                </video>
              </div>
              <div>
                <div style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem", padding: "0.2rem 0.75rem", background: "rgba(34,197,94,0.1)", borderRadius: "9999px", border: "1px solid rgba(34,197,94,0.2)" }}>
                  Order Control
                </div>
                <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>
                  Orders stop falling through the cracks
                </h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
                  Instead of manually sharing orders to reps on WhatsApp, the system catches every incoming order and automatically assigns it to the next available rep — even while you sleep.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {["Orders equally distributed to sales reps automatically", "Scheduled follow-up reminders before leads go cold", "Rep gets notified instantly and knows exactly what to do"].map((b) => (
                    <div key={b} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", color: "#4ade80", flexShrink: 0, marginTop: "0.2rem" }} />
                      <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: text left, video right */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "#f472b6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem", padding: "0.2rem 0.75rem", background: "rgba(236,72,153,0.1)", borderRadius: "9999px", border: "1px solid rgba(236,72,153,0.2)" }}>
                  Delivery Control
                </div>
                <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>
                  Know exactly where every agent stands
                </h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
                  Assign stock to agents, track what they've delivered, reconcile defectives and missing items, and see each agent's performance — all from one screen.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {["Real-time agent stock and delivery tracking", "Defective and missing item reconciliation", "Per-agent performance and accountability view"].map((b) => (
                    <div key={b} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", color: "#4ade80", flexShrink: 0, marginTop: "0.2rem" }} />
                      <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius: "1rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0a0f1e", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
                <video controls autoPlay muted loop playsInline style={{ width: "100%", display: "block" }}>
                  <source src="/enterprise/ordello-agents-page.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            {/* Row 4: image (command center) */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div style={{ borderRadius: "1rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }} className="order-last lg:order-first">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/enterprise/ordello-command-center.png" alt="Ordello command center dashboard" style={{ width: "100%", display: "block" }} />
              </div>
              <div>
                <div style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem", padding: "0.2rem 0.75rem", background: "rgba(249,115,22,0.1)", borderRadius: "9999px", border: "1px solid rgba(249,115,22,0.2)" }}>
                  Full Visibility
                </div>
                <h3 style={{ fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: "1rem" }}>
                  One dashboard to run the whole operation
                </h3>
                <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
                  Revenue, orders, agents, reps, expenses, and profit — all in a single command center. No more switching between WhatsApp, Excel, and spreadsheets to get a picture of your business.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {["Live order counts and revenue by period", "Top products, top reps, fulfilment rate at a glance", "Compare this week vs last week automatically"].map((b) => (
                    <div key={b} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: "0.9rem", height: "0.9rem", color: "#4ade80", flexShrink: 0, marginTop: "0.2rem" }} />
                      <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading>Simple, transparent pricing</SectionHeading>
            <SectionSub>
              Start free. Scale as you grow. Every plan includes full access during the trial — no credit card required.
            </SectionSub>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Starter */}
            <div
              style={{
                borderRadius: "1.25rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "2rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>Starter</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 800, color: "white" }}>₦18,000</span>
                <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>/month</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.75rem" }}>₦180,000/year — save 2 months</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
                {[
                  "Up to 500 orders/month",
                  "Up to 3 sales reps",
                  "Up to 10 delivery agents",
                  "Order tracking & notes",
                  "Basic analytics",
                  "Email support",
                ].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", color: "#4ade80", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: "rgba(255,255,255,0.06)", color: "white", padding: "0.8rem 1.5rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", transition: "background-color 150ms" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)"; }}
              >
                Start free trial
              </Link>
            </div>

            {/* Growth — highlighted */}
            <div
              style={{
                borderRadius: "1.25rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(59,130,246,0.35)",
                padding: "2rem",
                position: "relative",
                boxShadow: "0 0 40px rgba(37,99,235,0.1)",
              }}
            >
              <div style={{ position: "absolute", top: "-0.75rem", left: "50%", transform: "translateX(-50%)", padding: "0.2rem 0.75rem", borderRadius: "9999px", background: "#2563eb", fontSize: "0.65rem", color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                Most popular
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>Growth</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 800, color: "white" }}>₦35,000</span>
                <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>/month</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.75rem" }}>₦350,000/year — save 2 months</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
                {[
                  "Unlimited orders & products",
                  "Up to 15 sales reps",
                  "Up to 50 delivery agents",
                  "AI voice calling (Vapi)",
                  "Full profit & analytics reports",
                  "Multi-currency pricing",
                  "Round-robin assignment",
                  "Priority support",
                ].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", color: "#4ade80", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: "#2563eb", color: "white", padding: "0.8rem 1.5rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", transition: "background-color 150ms, transform 160ms" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#3b82f6"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#2563eb"; }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                Start 14-Day Free Trial
                <ArrowRight style={{ width: "0.9rem", height: "0.9rem" }} />
              </Link>
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: "0.625rem" }}>No credit card required</p>
            </div>

            {/* Enterprise */}
            <div
              style={{
                borderRadius: "1.25rem",
                background: "linear-gradient(135deg, rgba(13,31,60,0.8) 0%, rgba(6,10,20,0.6) 100%)",
                border: "1px solid rgba(99,102,241,0.3)",
                padding: "2rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>Enterprise</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "2.25rem", fontWeight: 800, color: "white" }}>₦500,000</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.75rem" }}>One-time setup — done for you</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
                {[
                  "Everything in Growth",
                  "Unlimited reps & agents",
                  "Done-for-you implementation",
                  "Full team training",
                  "Profit & commission audit",
                  "90-day review support",
                  "Dedicated account manager",
                  "2 slots available per month",
                ].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle2 style={{ width: "0.85rem", height: "0.85rem", color: "#a78bfa", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/enterprise"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: "rgba(99,102,241,0.15)", color: "#a78bfa", padding: "0.8rem 1.5rem", borderRadius: "0.75rem", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", border: "1px solid rgba(99,102,241,0.3)", transition: "background-color 150ms, border-color 150ms" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(99,102,241,0.25)"; el.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(99,102,241,0.15)"; el.style.borderColor = "rgba(99,102,241,0.3)"; }}
              >
                Book Strategy Call
                <ArrowRight style={{ width: "0.9rem", height: "0.9rem" }} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Install on any device ────────────────────────────── */}
      <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel>Available everywhere</SectionLabel>
            <SectionHeading>
              Install Ordello as an app —{" "}
              <span style={{ color: "#60a5fa" }}>on any device</span>
            </SectionHeading>
            <SectionSub>
              Ordello runs as a Progressive Web App. Your team can install it directly on their phones, tablets, and computers — no app store needed.
            </SectionSub>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1.5rem", height: "1.5rem" }}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                ),
                platform: "iOS & iPadOS",
                desc: "Tap Share → Add to Home Screen in Safari. Runs full-screen like a native app.",
                color: "#a78bfa",
                bg: "rgba(139,92,246,0.1)",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1.5rem", height: "1.5rem" }}>
                    <path d="M17.523 15.341 20 12l-2.477-3.341L14 12l3.523 3.341zM12 6.523 8.659 9 12 11.477 15.341 9 12 6.523zM6.477 8.659 4 12l2.477 3.341L10 12 6.477 8.659zM12 17.477 8.659 15 12 12.523 15.341 15 12 17.477z"/>
                  </svg>
                ),
                platform: "Android",
                desc: "Tap the menu → Add to Home Screen in Chrome. Works offline too.",
                color: "#4ade80",
                bg: "rgba(34,197,94,0.1)",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1.5rem", height: "1.5rem" }}>
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
                    <path d="M6 10h12v2H6zm0 4h8v2H6z"/>
                  </svg>
                ),
                platform: "macOS",
                desc: "Install from Chrome or Safari on Mac. Lives in your Dock like any native app.",
                color: "#60a5fa",
                bg: "rgba(59,130,246,0.1)",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1.5rem", height: "1.5rem" }}>
                    <path d="M3 12V6.75l9-1.58V12H3zM21 3.5V12h-9V4.92L21 3.5zM3 13h9v6.42L3 18.08V13zm9 .08V20.5l9-1.58V13H12z"/>
                  </svg>
                ),
                platform: "Windows",
                desc: "Install from Edge or Chrome. Pins to your taskbar — no separate download.",
                color: "#fb923c",
                bg: "rgba(249,115,22,0.1)",
              },
            ].map((p) => (
              <div
                key={p.platform}
                style={{
                  padding: "1.75rem",
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    background: p.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: p.color,
                    marginBottom: "1.125rem",
                  }}
                >
                  {p.icon}
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>{p.platform}</h3>
                <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>
              Works for admins, sales reps, and inventory managers — each role gets their own tailored view.
            </p>
          </div>
        </div>
      </section>

      {/* ── About the builder ─────────────────────────────────── */}
      <section style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <SectionLabel>Who built this</SectionLabel>
          </div>
          <div
            style={{
              borderRadius: "1.25rem",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "3rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 1.5rem",
                border: "2px solid rgba(59,130,246,0.3)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/emmy.jpg" alt="Emmanuel" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", marginBottom: "1.75rem" }}>
              My name is Emmanuel.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left" }}>
              {[
                "I am a software engineer. Before I built Ordello, I spent years building systems for different kinds of businesses — car dealerships, pharmacies, barbershops, universities, logistics companies. Different industries, same problem everywhere: the business had grown but the tools they were using had not kept up.",
                "Then Henry sent me a message. He had posted a picture on his WhatsApp status — sitting with paper, manually calculating how much stock he had sent to agents. We started talking. He told me he was tired of Google Sheets, sharing orders with reps one by one, manually, every single day, with no way to know which rep was actually closing and which one was wasting leads.",
                "So I built it. Not from a distance — inside his real business, with his real team, fixing real problems one by one. When it was ready, I didn't just hand it over. I trained his staff personally and kept working with him to make it better.",
                "I built Ordello for exactly one type of business: Nigerian POD operators who are serious about running things properly. If that is you, I want to build it inside your business too.",
              ].map((para, i) => (
                <p key={i} style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.75 }}>
                  {para}
                </p>
              ))}
            </div>
            <div style={{ marginTop: "2rem" }}>
              <Link
                href="/enterprise"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(59,130,246,0.1)",
                  color: "#93c5fd",
                  padding: "0.8rem 1.75rem",
                  borderRadius: "0.75rem",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  border: "1px solid rgba(59,130,246,0.2)",
                  transition: "background-color 150ms",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(59,130,246,0.18)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(59,130,246,0.1)"; }}
              >
                Work with me directly
                <ArrowRight style={{ width: "0.9rem", height: "0.9rem" }} />
              </Link>
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
                <OrdelloLogo size={28} />
                <span style={{ fontWeight: 700, color: "white", fontSize: "1rem" }}>Ordello</span>
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
