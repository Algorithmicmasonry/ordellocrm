"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "Is Ordello suitable for small businesses?",
    a: "Yes. Ordello is designed for e-commerce businesses of all sizes — from a solo operator just starting out to teams with 10+ sales reps and 25+ delivery agents. You only pay for what you use, and you can scale up as you grow.",
  },
  {
    q: "How does the automatic sales rep order assignment work?",
    a: "Ordello uses a round-robin algorithm, which simply means it takes every new order that comes in and shares it one by one to all your sales reps, it moves around in a circle so each rep gets an order and orders are shared equally.",
  },
  {
    q: "Can Ordello work with my wordpress site?",
    a: "Yes. Ordello can be integrated with your wordpress, elementor or woocommerce site using our wordpress plugin, which allows you to track orders, manage stock, and assign sales reps automatically.",
  },
  {
    q: "Is Ordello Mobile-friendly?",
    a: "Yes. Ordello can be installed as an app on any mobile device (ios/android) so you and your sales reps can access the system easily from your phones",
  },
  {
    q: "Will I receive support and training for my staff?",
    a: "Yes. We provide comprehensive support and training for your staff, including onboarding and regular support sessions.",
  },
  {
    q: "How does the AI calling feature work?",
    a: "This feature is coming soon. We are traning our AI agent with a humnan like voice that will call your customers immediately they submit an order, it will also have access to your whatsapp groups so it can monitor and update order statuses from delivery agents, delivery updates, and follow-ups. The AI speaks naturally, handles common objections, and logs every call outcome directly in the CRM so you and your reps can pick up where it left off.",
  },
  {
    q: "Can I track Stock in multiple locations?",
    a: "Yes. You can assign stock to individual agents in multiple locations and ordello automatically updates stock, tracks each agent's active deliveries, reconcile inventory with defective or missing items, and view performance metrics for every agent from your dashboard.",
  },
  {
    q: "Does Ordello support multi-currency pricing?",
    a: "Yes. You can configure prices in multiple currencies (NGN, USD, GBP,GHS etc.) for each product. Your order form automatically presents the correct currency, and your reporting tracks revenue and costs per currency",
  },
  {
    q: "How is billing handled?",
    a: "Billing is powered by Paystack. You can subscribe monthly or annually, and cancel anytime with no penalty. There are no setup fees or hidden charges.",
  },
  {
    q: "Can I import my existing orders and products?",
    a: "Yes. We provide CSV import tools for products, orders, and customer data. Our onboarding team can also assist with custom migrations for larger historical datasets.",
  },
  {
    q: "What happens if I exceed my plan limits?",
    a: "We'll notify you before you hit any limit so you can upgrade without disruption. We never cut off your account mid-cycle — you'll always have access to your data.",
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            style={{
              border: `1px solid ${isOpen ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "0.875rem",
              overflow: "hidden",
              background: isOpen
                ? "rgba(59,130,246,0.04)"
                : "rgba(255,255,255,0.02)",
              transition:
                "border-color 200ms ease-out, background-color 200ms ease-out",
            }}
          >
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.25rem 1.5rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                gap: "1rem",
              }}
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span
                style={{
                  fontSize: "0.95rem",
                  color: "white",
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {faq.q}
              </span>
              <div
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition:
                    "transform 200ms ease-out, background-color 200ms ease-out",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  background: isOpen ? "rgba(59,130,246,0.15)" : "transparent",
                }}
              >
                <Plus
                  style={{
                    width: "0.75rem",
                    height: "0.75rem",
                    color: isOpen ? "#60a5fa" : "rgba(255,255,255,0.5)",
                  }}
                />
              </div>
            </button>

            <div
              style={{
                maxHeight: isOpen ? "400px" : "0px",
                opacity: isOpen ? 1 : 0,
                overflow: "hidden",
                transition:
                  "max-height 250ms cubic-bezier(0.23,1,0.32,1), opacity 200ms ease-out",
              }}
            >
              <p
                style={{
                  padding: "0 1.5rem 1.25rem",
                  fontSize: "0.875rem",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: 1.7,
                }}
              >
                {faq.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
