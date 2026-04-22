"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShoppingCart,
  Phone,
  MessageCircle,
  BarChart3,
  Users,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { OrdelloLogo } from "@/components/ordello-logo";

const ORBIT_ITEMS = [
  {
    icon: ShoppingCart,
    label: "Orders",
    bg: "rgba(59,130,246,0.15)",
    color: "#60a5fa",
    delay: "0s",
  },
  {
    icon: Phone,
    label: "AI Calls",
    bg: "rgba(34,197,94,0.15)",
    color: "#4ade80",
    delay: "-3.33s",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    bg: "rgba(16,185,129,0.15)",
    color: "#34d399",
    delay: "-6.67s",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    bg: "rgba(139,92,246,0.15)",
    color: "#a78bfa",
    delay: "-10s",
  },
  {
    icon: Users,
    label: "Sales Reps",
    bg: "rgba(249,115,22,0.15)",
    color: "#fb923c",
    delay: "-13.33s",
  },
  {
    icon: Truck,
    label: "Agents",
    bg: "rgba(236,72,153,0.15)",
    color: "#f472b6",
    delay: "-16.67s",
  },
];

const MOCK_ORDERS = [
  {
    name: "Adewale Okafor",
    product: "Detox Tea ×2",
    status: "Delivered",
    sc: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  },
  {
    name: "Chisom Eze",
    product: "Slimming Belt ×1",
    status: "Dispatched",
    sc: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  },
  {
    name: "Bolu Adeyemi",
    product: "Body Cream ×3",
    status: "Confirmed",
    sc: { bg: "rgba(234,179,8,0.12)", color: "#facc15" },
  },
];

export function LandingHero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        paddingTop: "6rem",
        paddingBottom: "4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "5%",
            width: "500px",
            height: "500px",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "5%",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "0 1.25rem",
          width: "100%",
        }}
      >
        <div className="grid lg:grid-cols-2 gap-14 xl:gap-20 items-center">
          {/* ── Left: text ── */}
          <div
            style={{
              animation: "fade-up 0.65s cubic-bezier(0.23,1,0.32,1) both",
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0.875rem",
                borderRadius: "9999px",
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)",
                marginBottom: "1.75rem",
                animation:
                  "fade-up 0.65s 0.05s cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              <span
                style={{
                  width: "0.4rem",
                  height: "0.4rem",
                  borderRadius: "50%",
                  background: "#60a5fa",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#93c5fd",
                  fontWeight: 500,
                }}
              >
                The CRM built for Nigerian POD e-commerce
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
                fontWeight: 900,
                color: "white",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
                animation:
                  "fade-up 0.65s 0.1s cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              Every naira tracked.{" "}
              <span style={{ color: "#60a5fa" }}>Every Process </span>
              Automated.
            </h1>

            {/* Sub-copy */}
            <p
              style={{
                fontSize: "1.05rem",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.65,
                maxWidth: "30rem",
                marginBottom: "2.25rem",
                animation:
                  "fade-up 0.65s 0.15s cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              Replace the WhatsApp chaos and Excel sheets with a system that
              actually works. Track every order, automatically assign to sales
              reps, automatic inventory and delivery agent tracking, and know
              your real profit. All in one dashboard.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "2rem",
                animation:
                  "fade-up 0.65s 0.2s cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "#2563eb",
                  color: "white",
                  padding: "0.8rem 1.5rem",
                  borderRadius: "0.75rem",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  transition:
                    "background-color 150ms ease-out, transform 160ms ease-out",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#2563eb";
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "scale(0.97)";
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                Start 14-Day Free Trial
                <ArrowRight style={{ width: "1rem", height: "1rem" }} />
              </Link>
            </div>

            {/* Trust line */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1.25rem",
                animation:
                  "fade-up 0.65s 0.25s cubic-bezier(0.23,1,0.32,1) both",
              }}
            >
              {[
                "No credit card required",
                "14-day free trial",
                "Cancel anytime",
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.35)",
                  }}
                >
                  <CheckCircle2
                    style={{
                      width: "0.85rem",
                      height: "0.85rem",
                      color: "rgba(96,165,250,0.7)",
                    }}
                  />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: orbit + dashboard card ── */}
          <div
            style={{
              position: "relative",
              animation: "fade-up 0.75s 0.15s cubic-bezier(0.23,1,0.32,1) both",
            }}
            className="hidden lg:flex items-center justify-center"
          >
            {/* Orbit container */}
            <div
              style={{ position: "relative", width: "380px", height: "380px" }}
            >
              {/* Orbit rings */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "15%",
                  left: "15%",
                  right: "15%",
                  bottom: "15%",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              />

              {/* Orbiting icons — arm technique */}
              {ORBIT_ITEMS.map((item, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "190px",
                    height: "44px",
                    marginTop: "-22px",
                    transformOrigin: "0 50%",
                    animation: "orbit-rotate 24s linear infinite",
                    animationDelay: item.delay,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      width: "44px",
                      height: "44px",
                      borderRadius: "0.75rem",
                      background: item.bg,
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                      animation: "orbit-counter 24s linear infinite",
                      animationDelay: item.delay,
                    }}
                    title={item.label}
                  >
                    <item.icon
                      style={{
                        width: "1.1rem",
                        height: "1.1rem",
                        color: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Central dashboard card */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "220px",
                }}
              >
                <div
                  style={{
                    borderRadius: "1rem",
                    background: "#0d1525",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow:
                      "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
                    overflow: "hidden",
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <OrdelloLogo size={20} />
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "white",
                          fontWeight: 600,
                        }}
                      >
                        Today
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      {["#ef4444", "#eab308", "#22c55e"].map((c) => (
                        <div
                          key={c}
                          style={{
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "50%",
                            background: c,
                            opacity: 0.6,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {[
                      { label: "Orders", value: "47", change: "+12%" },
                      { label: "Revenue", value: "₦2.4M", change: "+8%" },
                    ].map((s, i) => (
                      <div
                        key={s.label}
                        style={{
                          padding: "0.625rem 0.75rem",
                          borderRight:
                            i === 0
                              ? "1px solid rgba(255,255,255,0.07)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.55rem",
                            color: "rgba(255,255,255,0.35)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            color: "white",
                            marginTop: "0.125rem",
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontSize: "0.55rem",
                            color: "#4ade80",
                            marginTop: "0.1rem",
                          }}
                        >
                          {s.change}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Orders list */}
                  <div style={{ padding: "0.625rem 0.75rem" }}>
                    <div
                      style={{
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Recent
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {MOCK_ORDERS.map((o) => (
                        <div
                          key={o.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                color: "white",
                                fontWeight: 500,
                              }}
                            >
                              {o.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.55rem",
                                color: "rgba(255,255,255,0.35)",
                              }}
                            >
                              {o.product}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "0.5rem",
                              padding: "0.15rem 0.4rem",
                              borderRadius: "9999px",
                              background: o.sc.bg,
                              color: o.sc.color,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {o.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <div style={{ display: "flex" }}>
                      {["#3b82f6", "#8b5cf6", "#f97316"].map((c, i) => (
                        <div
                          key={c}
                          style={{
                            width: "1rem",
                            height: "1rem",
                            borderRadius: "50%",
                            background: c,
                            border: "1.5px solid #0d1525",
                            marginLeft: i > 0 ? "-0.3rem" : 0,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: "0.55rem",
                        color: "rgba(255,255,255,0.35)",
                        flex: 1,
                      }}
                    >
                      3 reps online
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.55rem",
                        color: "#4ade80",
                      }}
                    >
                      <div
                        style={{
                          width: "0.35rem",
                          height: "0.35rem",
                          borderRadius: "50%",
                          background: "#4ade80",
                          animation: "pulse 2s infinite",
                        }}
                      />
                      Live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
