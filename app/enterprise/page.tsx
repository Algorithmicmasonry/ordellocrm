"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { OrdelloLogo } from "@/components/ordello-logo";

const systems = [
  {
    name: "Order capture and assignment system",
    desc: "All incoming orders from your channels flow into one queue and are assigned clearly to the right rep.",
    value: "N120,000 value",
  },
  {
    name: "Delivery and agent control system",
    desc: "Track agent movement, failed deliveries, reconciliation flow, and risk flags from one place.",
    value: "N150,000 value",
  },
  {
    name: "Profit and finance visibility system",
    desc: "See revenue, expenses, margins, ROAS, and real net profit without manual guesswork.",
    value: "N180,000 value",
  },
  {
    name: "Sales team performance system",
    desc: "Track rep output, conversion, follow-up discipline, and response speed with clean accountability.",
    value: "N100,000 value",
  },
  {
    name: "Done-for-you implementation and training",
    desc: "We set up your workflows, migrate operations, train your team, and stay until it works properly.",
    value: "N500,000 value",
  },
];

const bonuses = [
  {
    num: "Bonus 10",
    name: "Full Profit Audit",
    value: "N300,000 value",
    kills: "I can see revenue, but I do not trust the real profit number.",
    body: "We audit products, delivery, ad spend, commissions, and hidden operational leakage before rollout.",
  },
  {
    num: "Bonus 11",
    name: "Commission Accuracy Audit",
    value: "N150,000 value",
    kills: "Manual commission math keeps creating payout disputes.",
    body: "We validate historical commission logic with your order data so payout confidence is restored.",
  },
  {
    num: "Bonus 12",
    name: "Value Realization Dashboard",
    value: "N100,000 value",
    kills: "How do I know this implementation is truly paying off?",
    body: "A running view of recovered value from cleaner operations and tighter team accountability.",
  },
  {
    num: "Bonus 13",
    name: "90-Day Metrics Review Support",
    value: "N250,000 value",
    kills: "What if adoption drops after implementation?",
    body: "Monthly review sessions post-launch to reinforce usage and resolve performance blind spots.",
  },
];

const implementationValueTotal = 1050000;
const bonusValueTotal = 800000;
const allInValueTotal = implementationValueTotal + bonusValueTotal;
const askingPrice = 500000;

const featureShowcase = [
  {
    id: "profit",
    tag: "Profit Clarity",
    title: "I can finally see if I'm actually making money.",
    body: "Not revenue. Real profit after ad spend, clearing fees, failed deliveries, commissions, and hidden leakage. This is the number most operators think they know until they finally see it properly.",
    bullets: [
      "See ROAS, ROI, margin, and product-level profit clearly",
      "Know what to kill, what to fix, and what to scale",
      "Stop confusing top-line sales with actual business health",
    ],
    cta: "Book Free Strategy Call",
    type: "profit",
  },
  {
    id: "orders",
    tag: "Order Control",
    title: "Orders stop falling through the cracks.",
    body: "Every POD operator has lost orders to whatsapp chaos and lack of follow-up. Instead of manually sharing orders to sales reps, this system catches incoming orders and automatically assigns it to a sales rep and informs them about it, equally sharing orders among all reps on the team ",
    bullets: [
      "The system automatically assigns orders equally to sales reps without you being online ",
      "Scheduled follow up reminders on orders before leads get cold",
      "Rep gets notified instantly and knows exactly what to do",
    ],
    cta: "Book Free Strategy Call",
    type: "orders",
  },
  {
    id: "agent-control",
    tag: "Delivery Control",
    title: "Always know what your agents have and what they did with it.",
    body: "You send stock to agents across different states and then hope the numbers add up at the end. With Ordello, you do not hope. Every unit sent to every agent is tracked. Every delivery, every failure, every return is logged against that agent. If something does not reconcile, you see it immediately.",
    bullets: [
      "Record stock sent to each agent and track it in real time",
      "See delivered, failed, and unreconciled units per agent",
      "Compare failure rates across agents to spot problems early",
    ],
    cta: "Book Free Strategy Call",
    type: "agents",
  },
  {
    id: "command-centre",
    tag: "Full Visibility",
    title: "This is the whole command centre in one frame.",
    body: "Trash google sheets. This is the full operating view showing orders, profitability, team activity, agent control, and business clarity in one place.",
    bullets: [
      "See the business from one operating screen",
      "Tie together profit, orders, reps, and delivery control",
      "Replace scattered tools with one system of record",
      "Your sales reps have their own dashboards too",
    ],
    cta: "Book Free Strategy Call",
    type: "commandCenter",
  },
];

const defaultFormData = {
  businessName: "",
  products: "",
  weeklyOrders: "less100",
  teamSize: "solo",
  headache: "",
  startTimeline: "thisWeek",
  contactName: "",
  whatsapp: "+234",
  notes: "",
};

const weeklyOrderOptions = [
  { value: "less100", label: "Less than 100 orders/week" },
  { value: "100-300", label: "100-300 orders/week" },
  { value: "300-500", label: "300-500 orders/week" },
  { value: "500+", label: "500+ orders/week" },
];

const teamSizeOptions = [
  { value: "solo", label: "Just me (solo)" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-15", label: "6-15 people" },
  { value: "15+", label: "15+ people" },
];

const timelineOptions = [
  { value: "thisWeek", label: "This week" },
  { value: "within2weeks", label: "Within 2 weeks" },
  { value: "withinMonth", label: "Within a month" },
  { value: "exploring", label: "Just exploring options for now" },
];

const headacheOptions = [
  {
    value: "profit",
    label: "Don't know real profit per product after failed deliveries",
  },
  {
    value: "assignment",
    label: "Sales reps fighting over order assignments",
  },
  { value: "ads", label: "Can't scale Facebook ads confidently" },
  {
    value: "theft",
    label: "Losing money to agent theft or missing inventory",
  },
  {
    value: "manual",
    label: "Spending hours manually tracking orders in WhatsApp/Excel",
  },
  {
    value: "profitable",
    label: "Don't know which products are actually profitable",
  },
  {
    value: "failed",
    label: "Failed deliveries killing my profit (don't know how much)",
  },
  { value: "other", label: "Other" },
];

const ownerWhatsAppNumber =
  process.env.NEXT_PUBLIC_ENTERPRISE_WHATSAPP_NUMBER || "2348030000000";

const sanitizeWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) {
    return digits;
  }
  if (digits.startsWith("0")) {
    return `234${digits.slice(1)}`;
  }
  return `234${digits}`;
};

const formatWhatsAppDisplay = (value: string) => {
  const sanitized = sanitizeWhatsApp(value);
  return sanitized ? `+${sanitized}` : "";
};

function FeatureMockup({ type }: { type: string }) {
  if (type === "orders") {
    return (
      <div className="mockup-shell mockup-shell-video">
        <video
          className="feature-demo-video"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source
            src="/enterprise/ordello-round-robin-assign.mp4"
            type="video/mp4"
          />
        </video>
      </div>
    );
  }

  if (type === "profit") {
    return (
      <div className="mockup-shell mockup-shell-dark mockup-shell-video">
        <video
          className="feature-demo-video"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source
            src="/enterprise/ordello-profit-clarity.mp4"
            type="video/mp4"
          />
        </video>
      </div>
    );
  }

  if (type === "agents") {
    return (
      <div className="mockup-shell mockup-shell-video">
        <video
          className="feature-demo-video"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        >
          <source src="/enterprise/ordello-agents-page.mp4" type="video/mp4" />
        </video>
      </div>
    );
  }

  if (type === "commandCenter") {
    return (
      <div className="mockup-shell mockup-shell-dashboard mockup-shell-image">
        <svg
          className="command-beam"
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="commandBeamGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ff4fd8" />
              <stop offset="100%" stopColor="#7c4dff" />
            </linearGradient>
          </defs>
          <rect
            x="1.5"
            y="1.5"
            width="97"
            height="47"
            rx="4.5"
            fill="none"
            stroke="url(#commandBeamGradient)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <Image
          width={500}
          height={500}
          className="feature-command-image"
          src="/enterprise/ordello-command-center.png"
          alt="Ordello command center dashboard"
        />
      </div>
    );
  }
  return null;
}

export default function EnterprisePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
    setSubmitted(false);
    setFormErrors({});
    setSubmitError("");
    setFormData(defaultFormData);
  };

  const handleChange = (field: string, value: string) => {
    if (submitError) {
      setSubmitError("");
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.businessName.trim()) {
      errors.businessName = "Business name is required.";
    }
    if (!formData.products.trim()) {
      errors.products = "Tell me what products you sell.";
    }
    if (!formData.headache) {
      errors.headache = "Select the biggest operational headache.";
    }
    if (!formData.contactName.trim()) {
      errors.contactName = "Your name is required.";
    }
    if (!formData.whatsapp.trim()) {
      errors.whatsapp = "WhatsApp number is required.";
    } else if (!/^\+234\d{10}$/.test(formData.whatsapp.trim())) {
      errors.whatsapp = "Enter a valid Nigerian WhatsApp number (+234...).";
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/enterprise/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.error || "Failed to submit application. Please try again.",
        );
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const normalizedOwnerWhatsApp = ownerWhatsAppNumber.replace(/\D/g, "");
  const whatsappNowLink = `https://wa.me/${normalizedOwnerWhatsApp}?text=${encodeURIComponent(
    `Hi Emmanuel, I just submitted an Enterprise application for ${
      formData.businessName || "my business"
    }. Can we talk about Ordello?`,
  )}`;

  return (
    <>
      <main className="enterprise-page mt-0 pt-0">
        <nav>
          {/*<div className="nav-brand">
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
              <Rocket className="size-5" />
            </div>
            <span className="nav-name">Ordello Enterprise</span>
          </div>*/}
          <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <OrdelloLogo size={36} />
            <span className="text-white font-bold">Ordello</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Enterprise</span>
          </div>
        </nav>

        <div className="alert-banner">
          2 Enterprise implementation slots per month <span>&bull;</span> Starts at
          N500,000
        </div>

        <section className="hero">
          <div className="hero-grid-bg" />
          <div className="hero-glow" />
          <div className="hero-inner">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              For Nigerian POD Ecommerce Business owners
            </div>
            <h1>
              More orders. More delivery agents. More sales reps. Somehow more
              confusion.
              <br />
              <em>We fix that</em>
            </h1>
            <p className="hero-qualifier">
              This is not for early-stage testing. It is for operators already
              moving 20-50+ orders with a team of sales reps, interstate
              delivery agents, and finance.
            </p>
            <p className="hero-sub">
              We helped Mr Henry&apos;s business, a team of 4 reps, 25+ agents,
              3 products across Nigeria and Ghana and built Ordello inside it,
              and watched it process ₦17M in revenue and ₦3M in NET profit
              in 60 days. We are now opening 2 slots per month to build that
              same infrastructure inside your business. Done for you. Custom to
              how you operate. We don&apos;t hand you a login link and wish you
              luck.
            </p>
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary cursor-pointer"
                onClick={openModal}
              >
                Book Free Strategy Call
              </button>
            </div>
          </div>
          <div className="hero-screenshot px-4">
            <div className="container-wide">
              <div className="screenshot-frame">
                <iframe
                  width="560"
                  height="315"
                  src="https://www.youtube.com/embed/y_zd_cHPqyc?si=wayLSuu0Ck6Mbn0N"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        <section className="seen-on">
          <div className="container-wide">
            <div className="seen-on-row">
              <p className="seen-on-label">As Seen On</p>
              <div className="seen-on-logos">
                <div className="seen-on-item">
                  <span
                    className="seen-on-mark seen-on-mark-facebook"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.4v2H8v3.1h2.6v8h2.9Z"
                      />
                    </svg>
                  </span>
                  <span>Facebook</span>
                </div>
                <div className="seen-on-item">
                  <span
                    className="seen-on-mark seen-on-mark-twitter"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M18.24 2H21l-6.03 6.9L22 22h-5.48l-4.3-5.62L7.3 22H4.53l6.45-7.37L4 2h5.62l3.88 5.12L18.24 2Zm-.97 18.34h1.53L8.79 3.57H7.14l10.13 16.77Z"
                      />
                    </svg>
                  </span>
                  <span>Twitter</span>
                </div>
                <div className="seen-on-item">
                  <span
                    className="seen-on-mark seen-on-mark-linkedin"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <circle cx="6.2" cy="7.1" r="1.6" fill="currentColor" />
                      <path
                        fill="currentColor"
                        d="M4.9 10h2.7v8H4.9v-8Zm4.3 0h2.6v1.1h.04c.36-.69 1.25-1.42 2.57-1.42 2.75 0 3.26 1.81 3.26 4.16V18H15v-3.68c0-.88-.02-2-1.22-2-1.22 0-1.41.95-1.41 1.94V18H9.2v-8Z"
                      />
                    </svg>
                  </span>
                  <span>LinkedIn</span>
                </div>
                <div className="seen-on-item">
                  <span
                    className="seen-on-mark seen-on-mark-medium"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <circle cx="6.5" cy="12" r="3.5" fill="currentColor" />
                      <ellipse
                        cx="13"
                        cy="12"
                        rx="2.7"
                        ry="4.5"
                        fill="currentColor"
                      />
                      <ellipse
                        cx="18.3"
                        cy="12"
                        rx="1.5"
                        ry="3.2"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span>Medium</span>
                </div>
                <div className="seen-on-item">
                  <span
                    className="seen-on-mark seen-on-mark-youtube"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <rect
                        x="2"
                        y="5"
                        width="20"
                        height="14"
                        rx="4"
                        fill="currentColor"
                      />
                      <path fill="#ffffff" d="m10 9 6 3-6 3V9Z" />
                    </svg>
                  </span>
                  <span>YouTube</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="stats-bar">
          <div className="container-wide">
            <div className="stats-grid">
              <div className="stat-item">
                <p className="stat-val">
                  1,400<span>+</span>
                </p>
                <p className="stat-label">
                  orders processed in live operations
                </p>
              </div>
              <div className="stat-item">
                <p className="stat-val">
                  N17M<span>+</span>
                </p>
                <p className="stat-label">tracked revenue visibility</p>
              </div>
              <div className="stat-item">
                <p className="stat-val">
                  25<span>+</span>
                </p>
                <p className="stat-label">agents coordinated with control</p>
              </div>
              <div className="stat-item">
                <p className="stat-val">
                  N24M<span>+</span>
                </p>
                <p className="stat-label">inventory movement managed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-showcase">
          <div className="container-wide">
            <div className="feature-showcase-head">
              <p className="section-label">System Walkthrough</p>
              <h2>
                The 4 moments that make operators want this system immediately.
              </h2>
            </div>

            <div className="feature-stack">
              {featureShowcase.map((feature, index) => (
                <article
                  key={feature.id}
                  className={`feature-row ${index % 2 === 1 ? "feature-row-reverse" : ""} ${feature.type === "commandCenter" ? "feature-row-command" : ""}`}
                >
                  <div className="feature-copy">
                    <p className="feature-tag">{feature.tag}</p>
                    <h3>{feature.title}</h3>
                    <p className="feature-body">{feature.body}</p>
                    <div className="feature-points">
                      {feature.bullets.map((bullet) => (
                        <div key={bullet} className="feature-point">
                          <span className="feature-check">✓</span>
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                    <div className="feature-actions">
                      <button
                        type="button"
                        className="feature-btn cursor-pointer"
                        onClick={openModal}
                      >
                        {feature.cta}
                      </button>
                    </div>
                  </div>

                  <div className="feature-media">
                    <FeatureMockup type={feature.type} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="proof">
          <div className="container">
            <span className="proof-tag">Henry&apos;s Story</span>
            <h2>A real business we built this system inside.</h2>
            <p className="proof-lead">
              Henry sells products online. He ships to customers all over
              Nigeria and other african countries.
            </p>
            <div className="proof-story pt-4">
              <p className="pt-4">
                When we met him, his business was growing. But the bigger it
                got, the harder it was to manage.
              </p>
              <p className="pt-4">
                He had 4 sales reps taking orders on WhatsApp and Facebook. He
                had 25+ delivery agents spread across different states carrying
                his stock. He was running 3 products at the same time. And he
                had no clear way to see what was actually happening day to day.
              </p>
              <p className="pt-4">
                He was struggling with Google Sheets, scattered updates, and
                constant back-and-forth just to know basic numbers.
              </p>
              <p className="pt-4">
                He did not know which product was making him real money after
                all costs. He could not tell which sales rep was closing the
                most orders. He had no easy way to know if his stock numbers
                were adding up. Every week felt like he was putting out fires
                instead of running a business.
              </p>
              <p className="pt-4">
                We came in and built Ordello inside his business. We set up
                every system. We trained his team. We did not leave until
                everything was running properly.
              </p>
              <p className="pt-4">
                <strong>In 60 days:</strong>
              </p>
              <ul className="proof-metrics">
                <li>
                  His business processed over 1,400 orders across Nigeria and
                  Ghana.
                </li>
                <li>He made N17+ million in revenue.</li>
                <li>He took home N3M+ in net profit after every cost.</li>
                <li>
                  He had N24 million worth of stock moving across his agents
                  with full visibility.
                </li>
              </ul>
              <p>
                He did not do this because he worked harder. He did it because
                he could finally see his business clearly and his team knew
                exactly what to do every day.
              </p>
              <p className="pt-4">
                <strong>
                  That is what we are going to build inside your business.
                </strong>
              </p>
            </div>
            <div className="section-cta">
              <button
                type="button"
                className="btn-primary cursor-pointer"
                onClick={openModal}
              >
                Book Free Strategy Call
              </button>
            </div>
          </div>
        </section>

        <section className="offer">
          <div className="container">
            <p className="section-label">The Offer</p>
            <h2>Here is what we build inside your business.</h2>
            <p className="offer-lead">
              We do not hand you a login link. We come in, set everything up,
              train your team, and stay until it is working.
            </p>

            <div className="offer-card">
              <div className="offer-card-head">
                <div>
                  <span className="offer-badge">Enterprise Only</span>
                  <h3>Done-for-you operations implementation</h3>
                  <p>
                    Built around your current workflow, team reality, and order
                    volume.
                  </p>
                </div>
                <div className="offer-price-block">
                  <p className="offer-price">N500,000</p>
                  <p className="offer-price-note">one-time implementation</p>
                  <p className="offer-limit">
                    2 slots per month, permanently capped
                  </p>
                </div>
              </div>

              <div className="offer-systems">
                <p className="offer-systems-label">
                  Included Implementation Layers
                </p>
                {systems.map((system) => (
                  <div key={system.name} className="system-row">
                    <div className="system-check" />
                    <div>
                      <p className="system-name">{system.name}</p>
                      <p className="system-desc">{system.desc}</p>
                    </div>
                    <p className="system-val">{system.value}</p>
                  </div>
                ))}
              </div>

              <div className="offer-total">
                <div className="total-row">
                  <span className="tlabel">Total implementation value</span>
                  <span className="tval">
                    N{implementationValueTotal.toLocaleString("en-NG")}+
                  </span>
                </div>
                <div className="total-row">
                  <span className="tlabel">What you pay</span>
                  <span className="tval">
                    N{askingPrice.toLocaleString("en-NG")}
                  </span>
                </div>
                <div className="total-row big">
                  <span className="tlabel">Monthly capacity</span>
                  <span className="tval">2 slots max</span>
                </div>
              </div>
            </div>
          </div>
          <div className="about-card-action">
            <button
              type="button"
              className="btn-primary cursor-pointer"
              onClick={openModal}
            >
              Book Free Strategy Call
            </button>
          </div>
        </section>

        <section className="bonuses">
          <div className="container">
            <p className="section-label">The Bonuses</p>
            <h2>4 implementation bonuses included at Enterprise level.</h2>
            <p className="bonuses-lead">
              When we come in, we also do these four things most businesses do
              not even know they need.
            </p>
            {bonuses.map((bonus) => (
              <div className="bonus-card" key={bonus.num}>
                <div className="bonus-top">
                  <div>
                    <p className="bonus-num">{bonus.num}</p>
                    <p className="bonus-name">{bonus.name}</p>
                  </div>
                  <span className="bonus-val">{bonus.value}</span>
                </div>
                <p className="bonus-kills">Kills: &quot;{bonus.kills}&quot;</p>
                <p className="bonus-body">{bonus.body}</p>
              </div>
            ))}
            <div className="bonus-total-card">
              <div className="bonus-total-row">
                <span>Total bonus value</span>
                <strong>N{bonusValueTotal.toLocaleString("en-NG")}+</strong>
              </div>
              <div className="bonus-total-row">
                <span>All-in value (implementation + bonuses)</span>
                <strong>N{allInValueTotal.toLocaleString("en-NG")}+</strong>
              </div>
              <div className="bonus-total-row bonus-total-row-pay">
                <span>What you pay</span>
                <strong>N{askingPrice.toLocaleString("en-NG")}</strong>
              </div>
            </div>
          </div>
          <div className="about-card-action">
            <button
              type="button"
              className="btn-primary cursor-pointer"
              onClick={openModal}
            >
              Book Free Strategy Call
            </button>
          </div>
        </section>

        <section className="scarcity" id="apply">
          <div className="container">
            <p className="section-label section-label-light">Limited Spots</p>
            <h2>We only take 2 businesses per month.</h2>
            <p className="scarcity-lead">
              That is not a marketing line. The work we do takes real time and
              we cannot do it properly for more people than that.
            </p>
            <div className="scarcity-grid">
              <div className="scarcity-card">
                <h4>Current Month Capacity</h4>
                <p>One slot already assigned, one slot currently open.</p>
                <div className="slots">
                  <div className="slot taken" />
                  <div className="slot open" />
                </div>
                <p className="slot-note">
                  Availability updates as applications are qualified.
                </p>
              </div>
              <div className="scarcity-card">
                <h4>What this means for you</h4>
                <p>
                  If current slots are filled, the next onboarding moves to the
                  following month.
                </p>
              </div>
            </div>
          </div>
          <div className="section-cta">
            <button
              type="button"
              className="btn-primary cursor-pointer"
              onClick={openModal}
            >
              Book Free Strategy Call
            </button>
          </div>
        </section>

        <section className="about-builder">
          <div className="container">
            <div className="about-card">
              <div className="about-avatar-wrap">
                <img
                  className="about-avatar"
                  src="/emmy.jpg"
                  alt="Emmanuel portrait"
                />
              </div>
              <h2>My name is Emmanuel.</h2>
              <div className="about-copy">
                <p>
                  I am a software engineer. Before I built Ordello, I spent
                  years building systems for different kinds of businesses. Car
                  dealerships, pharmacies, barbershops, universities, logistics
                  companies. Different industries, same problem everywhere. The
                  business had grown but the tools they were using had not kept
                  up.
                </p>
                <p>Then Henry sent me a message.</p>
                <p>
                  He had posted a picture on his WhatsApp status. He was sitting
                  with paper, manually calculating how much stock he had sent to
                  agents in different locations. I replied. We started talking.
                </p>
                <p>
                  He told me he was tired of Google Sheets. He told me he was
                  sharing orders with his reps one by one, manually, every
                  single day. He told me he had no way of knowing which rep was
                  actually closing orders and which one was wasting leads. He
                  wanted one system that could handle all of it.
                </p>
                <p>So I built it.</p>
                <p>
                  I did not build it from a distance. I built it inside his real
                  business, with his real team, fixing real problems one by one.
                  When it was ready I did not just hand it over. I trained his
                  staff personally and I have kept working with him ever since
                  to make sure it keeps getting better.
                </p>
                <p>
                  I do not see Henry as just a client. I see him as a business
                  partner. His success is the proof that this works.
                </p>
                <p>
                  I have built Ordello for exactly one type of business.
                  Nigerian POD operators who are serious about running things
                  properly.
                </p>
                <p>
                  If that is you, I want to build it inside your business too.
                </p>
              </div>
              <div className="about-card-action">
                <button
                  type="button"
                  className="btn-primary cursor-pointer"
                  onClick={openModal}
                >
                  Book Free Strategy Call
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <h2>
              Book your strategy call and let&apos;s build this inside your
              business.
            </h2>
            <div className="final-btns">
              <button
                type="button"
                className="btn-primary cursor-pointer"
                onClick={openModal}
              >
                Book Free Strategy Call
              </button>
            </div>
          </div>
        </section>

        {modalOpen && (
          <div
            className="application-modal-overlay"
            onClick={closeModal}
            role="presentation"
          >
            <div
              className="application-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Complete the Ordello Enterprise application form"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close"
                aria-label="Close application form"
                onClick={closeModal}
              >
                X
              </button>

              {!submitted ? (
                <>
                  <div className="modal-head">
                    <p className="modal-eyebrow">
                      COMPLETE ORDELLO ENTERPRISE SALES SYSTEM
                    </p>
                    <h3>From Form Submission - Closed Sale</h3>
                    <p className="modal-sub">
                      Custom order management, done-for-you setup, profit
                      tracking, training, and dedicated support for Nigerian POD
                      ecommerce brands.
                    </p>
                  </div>
                  <form className="application-form" onSubmit={handleSubmit}>
                    <label>
                      Question 1:
                      <span>What&apos;s your business name? *</span>
                      <input
                        type="text"
                        placeholder="e.g., Luxury Wears Nigeria"
                        value={formData.businessName}
                        onChange={(event) =>
                          handleChange("businessName", event.target.value)
                        }
                      />
                      {formErrors.businessName && (
                        <span className="field-error">
                          {formErrors.businessName}
                        </span>
                      )}
                    </label>
                    <label>
                      Question 2:
                      <span>What products do you sell? *</span>
                      <input
                        type="text"
                        placeholder="e.g., Fashion accessories, beauty products, electronics"
                        value={formData.products}
                        onChange={(event) =>
                          handleChange("products", event.target.value)
                        }
                      />
                      {formErrors.products && (
                        <span className="field-error">
                          {formErrors.products}
                        </span>
                      )}
                    </label>
                    <fieldset>
                      <legend>
                        Question 3: How many orders are you processing per week
                        roughly? *
                      </legend>
                      {weeklyOrderOptions.map((option) => (
                        <label key={option.value} className="radio-option">
                          <span>{option.label}</span>
                          <input
                            type="radio"
                            name="weeklyOrders"
                            value={option.value}
                            checked={formData.weeklyOrders === option.value}
                            onChange={(event) =>
                              handleChange("weeklyOrders", event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </fieldset>
                    <fieldset>
                      <legend>
                        Question 4: How many people work in your business? *
                      </legend>
                      {teamSizeOptions.map((option) => (
                        <label key={option.value} className="radio-option">
                          <span>{option.label}</span>
                          <input
                            type="radio"
                            name="teamSize"
                            value={option.value}
                            checked={formData.teamSize === option.value}
                            onChange={(event) =>
                              handleChange("teamSize", event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Question 5: What&apos;s your biggest operational headache
                      right now? *
                      <span className="field-sub">
                        Select the challenge that is holding your business back
                        the most.
                      </span>
                      <select
                        value={formData.headache}
                        onChange={(event) =>
                          handleChange("headache", event.target.value)
                        }
                      >
                        <option value="">
                          Select your biggest challenge...
                        </option>
                        {headacheOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {formErrors.headache && (
                        <span className="field-error">
                          {formErrors.headache}
                        </span>
                      )}
                    </label>
                    <fieldset>
                      <legend>
                        Question 6: If we determine this is a good fit and build
                        this for you, when would you want to start? *
                      </legend>
                      {timelineOptions.map((option) => (
                        <label key={option.value} className="radio-option">
                          <span>{option.label}</span>
                          <input
                            type="radio"
                            name="startTimeline"
                            value={option.value}
                            checked={formData.startTimeline === option.value}
                            onChange={(event) =>
                              handleChange("startTimeline", event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </fieldset>
                    <label>
                      Question 7: What&apos;s your name? *
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={formData.contactName}
                        onChange={(event) =>
                          handleChange("contactName", event.target.value)
                        }
                      />
                      {formErrors.contactName && (
                        <span className="field-error">
                          {formErrors.contactName}
                        </span>
                      )}
                    </label>
                    <label>
                      Question 8: What&apos;s your WhatsApp number? *
                      <input
                        type="text"
                        placeholder="+234 XXX XXX XXXX"
                        value={formData.whatsapp}
                        onChange={(event) =>
                          handleChange("whatsapp", event.target.value)
                        }
                      />
                      {formErrors.whatsapp && (
                        <span className="field-error">
                          {formErrors.whatsapp}
                        </span>
                      )}
                    </label>
                    <label>
                      Question 9 (optional):
                      <span>Anything else I should know?</span>
                      <textarea
                        placeholder="Optional - share any additional context that might be helpful"
                        value={formData.notes}
                        onChange={(event) =>
                          handleChange("notes", event.target.value)
                        }
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn-primary cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? "Submitting..." : "Submit Application"}
                      </button>
                    </div>
                    {submitError && <p className="submit-error">{submitError}</p>}
                    <p className="form-footer">
                      By submitting this application, you agree to be contacted
                      via WhatsApp regarding your Enterprise inquiry. We respond
                      within 24 hours.
                    </p>
                  </form>
                </>
              ) : (
                <>
                  <div className="thanks-header">
                    <p className="modal-eyebrow">Application Received</p>
                    <h3>Thank you, {formData.contactName || "friend"}!</h3>
                    <p>
                      I&apos;ve received your Ordello Enterprise application for{" "}
                      <span className="font-semibold">
                        {formData.businessName || "your business"}
                      </span>
                      .
                    </p>
                  </div>
                  <div className="thanks-body">
                    <h4>WHAT HAPPENS NEXT:</h4>
                    <ul>
                      <li>I personally review every Enterprise application.</li>
                      <li>
                        If your business is a good fit, I&apos;ll WhatsApp you
                        within 24 hours.
                      </li>
                      <li className="mt-2">
                        We will discuss your operational challenges, the Ordello
                        build, and the timeline right there.
                      </li>
                    </ul>
                    <p className="py-2">
                      Keep an eye on WhatsApp for a message from me (Emmanuel).
                    </p>
                  </div>
                  <div className="cta-box">
                    <p>
                      If you want to fast track your application and talk to me,
                      click here:
                    </p>
                    <a
                      className="btn-secondary"
                      href={whatsappNowLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp me now
                    </a>
                  </div>
                  <div className="social-proof">
                    <p className="text-3xl">
                      WHILE YOU WAIT, SEE WHAT&apos;S POSSIBLE:
                    </p>
                    <div className="proof-grid">
                      <div>
                        <p>BEFORE ORDELLO:</p>
                        <ul>
                          <li>
                            Henry was checking Opay and other banking apps to
                            guess what his business was generating.
                          </li>
                          <li>
                            He could not clearly separate revenue, gross profit,
                            and net profit.
                          </li>
                          <li>
                            There was no reliable way to track stock across
                            multiple locations and agents.
                          </li>
                          <li>
                            Sales reps had no clean workspace to track assigned
                            customers and schedule follow-ups.
                          </li>
                          <li>
                            Orders were assigned manually every day, creating
                            chaos and delay.
                          </li>
                          <li>
                            He was running several products without knowing
                            which ones were truly profitable, which to scale, or
                            which to kill.
                          </li>
                        </ul>
                      </div>
                      <div>
                        <p>AFTER ORDELLO:</p>
                        <ul>
                          <li>
                            One dashboard now shows clear revenue, gross profit,
                            and net profit in real time.
                          </li>
                          <li>
                            Stock is tracked across locations and agents with
                            full visibility.
                          </li>
                          <li>
                            Sales reps work from assigned customer queues with
                            follow-up reminders.
                          </li>
                          <li>
                            Orders are auto-assigned with round-robin, so leads
                            stop falling through.
                          </li>
                          <li>
                            Product-level profitability is visible, making
                            scale-or-kill decisions obvious.
                          </li>
                        </ul>
                      </div>
                    </div>
                    <p className="proof-note">
                      System paid for itself in the first month. Talk soon,
                      Emmanuel Oamen • Founder, Ordello
                    </p>
                  </div>
                  <div className="faq">
                    <p>COMMON QUESTIONS:</p>
                    <div className="faq-grid">
                      <div>
                        <p>Q: How long does implementation take?</p>
                        <p>A: 2 weeks from payment to going live.</p>
                      </div>
                      <div>
                        <p>Q: Do I need to know how to code?</p>
                        <p>
                          A: No. We build everything for you and train your
                          team.
                        </p>
                      </div>
                      <div>
                        <p>Q: What if my team doesn&apos;t adopt it?</p>
                        <p>
                          A: We train your entire team (sales reps, agents,
                          admin). Plus, it&apos;s so simple they&apos;ll prefer
                          it to WhatsApp/Excel.
                        </p>
                      </div>
                      <div>
                        <p>Q: Can I see a demo first?</p>
                        <p>
                          A: Yes. That&apos;s what we&apos;ll discuss on our
                          WhatsApp call.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <footer>
          <div className="container">
            <p className="footer-disclaimer">
              Ordello is an operations implementation and education company that
              helps Nigerian POD businesses run their backend systems properly.
              We make no claims or guarantees that using Ordello will generate
              income or recover your investment. The presentation on this page,
              including videos, visuals, and testimonials, is provided for
              educational and illustrative purposes only. While examples may
              include real user experiences, results are not typical and will
              vary based on execution quality, team discipline, business model,
              and market conditions outside anyone&apos;s control.
            </p>
            <p className="footer-meta">
              Ordello Enterprise &bull; © {new Date().getFullYear()} All Rights
              Reserved
            </p>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Rethink+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap");

        :root {
          --blue: #1b6ef3;
          --blue-dark: #0d47c4;
          --blue-deep: #0a1628;
          --blue-light: #e8f0fe;
          --white: #ffffff;
          --off-white: #f7f9fc;
          --gray-light: #f1f5f9;
          --border: #e2e8f0;
          --text: #0f172a;
          --text-muted: #64748b;
          --green: #10b981;
          --amber: #f59e0b;
          --red: #ef4444;
        }

        * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }

        main {
          font-family: "Rethink Sans", sans-serif;
          background: var(--white);
          color: var(--text);
          font-size: 16px;
          line-height: 1.7;
          overflow-x: hidden;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }
        .container-wide {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }
        .enterprise-page section {
          padding: 5rem 0;
        }

        nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--blue-deep);
          border-bottom: 1px solid rgba(27, 110, 243, 0.3);
          padding: 0.85rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-logo-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--blue);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          color: var(--white);
        }
        .nav-name {
          color: var(--white);
          font-weight: 700;
          font-size: 1.05rem;
        }
        .nav-cta {
          background: var(--blue);
          color: var(--white);
          padding: 0.55rem 1.25rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
        }

        .alert-banner {
          background: var(--blue);
          padding: 0.65rem 1.5rem;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--white);
        }
        .alert-banner span {
          opacity: 0.75;
          margin: 0 6px;
        }

        .hero {
          background: var(--blue-deep);
          position: relative;
          overflow: hidden;
          padding: 0;
        }
        .hero-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(27, 110, 243, 0.06) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(27, 110, 243, 0.06) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
        }
        .hero-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 600px;
          background: radial-gradient(
            ellipse,
            rgba(27, 110, 243, 0.2) 0%,
            transparent 70%
          );
        }
        .hero-inner {
          position: relative;
          z-index: 2;
          padding: 5rem 1.5rem 0;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(27, 110, 243, 0.15);
          border: 1px solid rgba(27, 110, 243, 0.35);
          padding: 0.4rem 1rem;
          border-radius: 100px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #93b4ff;
          margin-bottom: 1.75rem;
        }
        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #93b4ff;
        }
        .hero h1 {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--white);
          margin-bottom: 1.25rem;
        }
        .hero h1 em {
          font-style: italic;
          color: #93b4ff;
        }
        .hero-qualifier {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.5);
          max-width: 560px;
          margin: 0 auto 1.5rem;
          font-style: italic;
          line-height: 1.6;
          border-left: 3px solid rgba(27, 110, 243, 0.5);
          padding: 0.75rem 1.25rem;
          text-align: left;
          background: rgba(27, 110, 243, 0.08);
          border-radius: 0 8px 8px 0;
        }
        .hero-sub {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.65);
          max-width: 600px;
          margin: 0 auto 2.5rem;
        }
        .hero-cta-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }
        .btn-primary {
          background: var(--blue);
          color: var(--white);
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          display: inline-block;
        }
        .btn-ghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 1rem;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .hero-screenshot {
          position: relative;
          margin: 0 -1.5rem;
          background: linear-gradient(
            to bottom,
            transparent,
            var(--blue-deep) 90%
          );
        }
        .hero-screenshot .container-wide {
          display: flex;
          justify-content: center;
        }
        .screenshot-frame {
          width: min(100%, 960px);
          margin: 0 auto;
          border-radius: 12px 12px 0 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: none;
          overflow: hidden;
          background: #0d1117;
        }
        .screenshot-frame iframe {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          height: auto;
          margin: 0 auto;
        }
        .seen-on {
          padding: 1.75rem 0 2rem;
          background: var(--blue-deep);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .seen-on-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .seen-on-label {
          margin: 0;
          font-size: 0.9rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(147, 180, 255, 0.85);
          font-weight: 600;
        }
        .seen-on-logos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .seen-on-item {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          color: rgba(255, 255, 255, 0.68);
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .seen-on-mark {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .seen-on-mark svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .seen-on-mark-facebook {
          color: #1877f2;
        }
        .seen-on-mark-twitter {
          color: #1d9bf0;
        }
        .seen-on-mark-linkedin {
          color: #0a66c2;
        }
        .seen-on-mark-medium {
          color: #12100e;
        }
        .seen-on-mark-youtube {
          color: #ff0000;
        }
        .screenshot-bar {
          background: #1a1f2e;
          padding: 0.6rem 1rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .dot-r {
          background: #ff5f57;
        }
        .dot-y {
          background: #ffbd2e;
        }
        .dot-g {
          background: #28c840;
        }
        .screenshot-url {
          flex: 1;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 0.25rem 0.75rem;
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.3);
          margin: 0 0.5rem;
        }
        .img-placeholder {
          min-height: 380px;
          background: linear-gradient(135deg, #0d1117 0%, #1a2035 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.3);
        }
        .img-placeholder-icon {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: rgba(27, 110, 243, 0.15);
          border: 1px dashed rgba(27, 110, 243, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .img-placeholder-icon svg {
          width: 28px;
          height: 28px;
          opacity: 0.5;
        }
        .img-placeholder-text {
          font-size: 0.8rem;
        }
        .img-placeholder-label {
          font-size: 0.7rem;
          color: rgba(27, 110, 243, 0.6);
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .stats-bar {
          background: var(--blue-deep);
          padding: 2.5rem 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        .stat-item {
          background: rgba(255, 255, 255, 0.02);
          padding: 1.5rem;
          text-align: center;
        }
        .stat-val {
          font-size: 2rem;
          font-weight: 800;
          color: var(--white);
          line-height: 1;
          margin-bottom: 4px;
        }
        .stat-val span {
          color: var(--blue);
        }
        .stat-label {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .feature-showcase {
          background: linear-gradient(180deg, #fbfdff 0%, #f4f8fc 100%);
        }
        .feature-showcase-head {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 4rem;
        }
        .feature-showcase-head h2 {
          font-size: clamp(2rem, 4vw, 3.1rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }
        .feature-showcase-lead {
          font-size: 1.05rem;
          color: var(--text-muted);
        }
        .feature-stack {
          display: grid;
          gap: 5rem;
        }
        .feature-row {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 3rem;
          align-items: center;
        }
        .feature-row-reverse .feature-copy {
          order: 2;
        }
        .feature-row-reverse .feature-media {
          order: 1;
        }
        .feature-row-command {
          grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
        }
        .feature-copy {
          max-width: 520px;
        }
        .feature-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.35rem 0.8rem;
          border-radius: 999px;
          background: rgba(27, 110, 243, 0.08);
          color: var(--blue);
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .feature-copy h3 {
          font-size: clamp(1.75rem, 3vw, 3rem);
          line-height: 1.08;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }
        .feature-body {
          font-size: 1.05rem;
          color: var(--text-muted);
          margin-bottom: 1.4rem;
        }
        .feature-points {
          display: grid;
          gap: 0.85rem;
          margin-bottom: 1.6rem;
        }
        .feature-point {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: var(--text);
        }
        .feature-check {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(27, 110, 243, 0.1);
          color: var(--blue);
          font-size: 0.8rem;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .feature-actions {
          display: flex;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .feature-btn {
          display: inline-block;
          text-decoration: none;
          background: var(--blue);
          color: var(--white);
          padding: 0.95rem 1.35rem;
          border-radius: 10px;
          font-weight: 700;
          box-shadow: 0 18px 40px rgba(27, 110, 243, 0.18);
        }
        .feature-media {
          display: grid;
          gap: 0.9rem;
        }
        .feature-media-note {
          font-size: 0.8rem;
          color: rgba(37, 52, 74, 0.55);
          text-align: center;
        }
        .mockup-shell {
          position: relative;
          min-height: 420px;
          border-radius: 28px;
          border: 1px solid rgba(20, 36, 67, 0.08);
          background:
            radial-gradient(
              circle at top,
              rgba(87, 184, 133, 0.18),
              transparent 35%
            ),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, #f6f8fb 100%);
          box-shadow:
            0 24px 60px rgba(15, 23, 42, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
          overflow: hidden;
          padding: 1.35rem;
        }
        .mockup-shell-video {
          padding: 0;
          min-height: 0;
          border: 4px solid rgba(20, 36, 67, 0.16);
          border-radius: 16px;
          background: transparent;
          box-shadow: none;
          overflow: hidden;
        }
        .feature-demo-video {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 16px;
          border: 0;
          background: transparent;
          object-fit: contain;
        }
        .feature-command-image {
          position: relative;
          z-index: 1;
          width: 100%;
          height: auto;
          display: block;
          border-radius: 16px;
          border: 4px solid #ffffff;
          background: #0f1628;
        }
        .mockup-shell-image {
          position: relative;
          padding: 0;
          min-height: 0;
          border: none;
          border-radius: 16px;
          background: transparent;
          box-shadow: none;
          line-height: 0;
          isolation: isolate;
          overflow: visible;
          max-width: 960px;
          justify-self: center;
        }
        .mockup-shell-image::before {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 20px;
          border: 2px solid rgba(255, 255, 255, 0.22);
          pointer-events: none;
          z-index: 0;
        }
        .mockup-shell-image::after {
          content: none;
        }
        .command-beam {
          position: absolute;
          inset: -4px;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          pointer-events: none;
          z-index: 0;
          filter: drop-shadow(0 0 9px rgba(255, 79, 216, 0.72))
            drop-shadow(0 0 14px rgba(124, 77, 255, 0.75));
        }
        .command-beam rect {
          stroke-dasharray: 62 520;
          stroke-dashoffset: 0;
          animation: command-beam-run 4.2s linear infinite;
        }
        @keyframes command-beam-run {
          to {
            stroke-dashoffset: -582;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .command-beam rect {
            animation: none;
          }
        }
        .mockup-shell-dark {
          background:
            radial-gradient(
              circle at top,
              rgba(27, 110, 243, 0.24),
              transparent 35%
            ),
            linear-gradient(180deg, #0f1628 0%, #101c31 100%);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 70px rgba(7, 13, 28, 0.3);
        }
        .mockup-topbar {
          display: flex;
          gap: 0.45rem;
          margin-bottom: 1rem;
        }
        .mockup-topbar span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.35);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .kpi-card {
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1.2rem;
          color: rgba(255, 255, 255, 0.88);
        }
        .kpi-card p,
        .profit-panel p,
        .profit-metrics p {
          font-size: 0.78rem;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.52);
          margin-bottom: 0.45rem;
        }
        .kpi-card strong,
        .profit-panel strong,
        .profit-metrics strong {
          display: block;
          font-size: 1.65rem;
          line-height: 1;
          margin-bottom: 0.35rem;
        }
        .kpi-card span,
        .profit-panel span,
        .profit-metrics span {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.58);
        }
        .kpi-card-wide {
          grid-column: span 2;
        }
        .chart-bars {
          height: 130px;
          display: flex;
          align-items: end;
          gap: 0.7rem;
          padding-top: 0.75rem;
        }
        .chart-bars span {
          flex: 1;
          border-radius: 999px 999px 0 0;
          background: linear-gradient(180deg, #57c0ff 0%, #1b6ef3 100%);
        }
        .flow-board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          height: 100%;
        }
        .flow-column {
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(20, 36, 67, 0.08);
          padding: 1.1rem;
          display: grid;
          align-content: start;
          gap: 0.7rem;
        }
        .flow-column p,
        .leaderboard-head span,
        .payroll-head span,
        .workspace-head span {
          margin: 0;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: rgba(37, 52, 74, 0.5);
        }
        .flow-column span,
        .metric-pill-row span,
        .workspace-actions span,
        .payroll-breakdown span {
          border-radius: 999px;
          background: rgba(27, 110, 243, 0.08);
          padding: 0.55rem 0.8rem;
          font-size: 0.82rem;
          color: #29415e;
        }
        .flow-column-center {
          background: linear-gradient(
            180deg,
            rgba(27, 110, 243, 0.1) 0%,
            rgba(27, 110, 243, 0.03) 100%
          );
          place-items: center;
          text-align: center;
        }
        .flow-orb {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            #8bd2ff 0%,
            #1b6ef3 68%,
            #0e3a8a 100%
          );
          box-shadow: 0 20px 40px rgba(27, 110, 243, 0.24);
        }
        .flow-column-center small {
          color: rgba(41, 65, 94, 0.7);
          font-size: 0.82rem;
        }
        .leaderboard-card,
        .payroll-card,
        .workspace-card,
        .inventory-board {
          height: 100%;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(20, 36, 67, 0.08);
          padding: 1.35rem;
        }
        .leaderboard-head,
        .payroll-head,
        .workspace-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .leaderboard-head strong,
        .payroll-head strong,
        .workspace-head strong {
          font-size: 1rem;
        }
        .leaderboard-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 0.9rem;
          align-items: center;
          padding: 0.8rem 0;
          border-top: 1px solid rgba(20, 36, 67, 0.06);
        }
        .leaderboard-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(27, 110, 243, 0.12);
          color: var(--blue);
          font-weight: 800;
        }
        .leaderboard-meta strong {
          display: block;
        }
        .leaderboard-meta span {
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .leaderboard-score {
          font-weight: 800;
          color: #1e7e4f;
        }
        .metric-pill-row,
        .workspace-actions,
        .payroll-breakdown {
          display: flex;
          gap: 0.7rem;
          flex-wrap: wrap;
          margin-top: 1rem;
        }
        .rotation-graphic {
          position: relative;
          height: 100%;
          min-height: 390px;
          display: grid;
          place-items: center;
        }
        .rotation-source,
        .rotation-hub,
        .rotation-list span {
          position: absolute;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.7rem 1rem;
          border-radius: 999px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(20, 36, 67, 0.08);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
        }
        .rotation-source {
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
        }
        .rotation-hub {
          z-index: 2;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(180deg, #1b6ef3 0%, #0f4dc3 100%);
          color: #fff;
          text-align: center;
          box-shadow: 0 20px 45px rgba(27, 110, 243, 0.28);
        }
        .rotation-list {
          position: absolute;
          right: 1.2rem;
          inset-block: 1.2rem;
          width: 150px;
        }
        .rotation-list span:nth-child(1) {
          top: 12%;
          right: 0;
        }
        .rotation-list span:nth-child(2) {
          top: 34%;
          right: 0;
        }
        .rotation-list span:nth-child(3) {
          top: 56%;
          right: 0;
        }
        .rotation-list span:nth-child(4) {
          top: 78%;
          right: 0;
        }
        .rotation-graphic::before,
        .rotation-graphic::after,
        .rotation-list::before,
        .rotation-list::after {
          content: "";
          position: absolute;
          height: 2px;
          background: rgba(32, 64, 104, 0.14);
          transform-origin: left center;
        }
        .rotation-graphic::before {
          left: 5.7rem;
          top: 50%;
          width: 150px;
        }
        .rotation-graphic::after {
          left: calc(50% + 2.8rem);
          top: 36%;
          width: 168px;
          transform: rotate(-34deg);
        }
        .rotation-list::before {
          left: -126px;
          top: 43%;
          width: 154px;
          transform: rotate(-10deg);
        }
        .rotation-list::after {
          left: -132px;
          top: 63%;
          width: 166px;
          transform: rotate(23deg);
        }
        .profit-layout {
          display: grid;
          gap: 1rem;
        }
        .profit-panel,
        .profit-metrics div {
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 1.2rem;
          color: rgba(255, 255, 255, 0.88);
        }
        .profit-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }
        .profit-lines {
          height: 150px;
          position: relative;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }
        .profit-lines span {
          position: absolute;
          inset-inline: 0;
          height: 2px;
          border-radius: 999px;
        }
        .profit-lines span:nth-child(1) {
          top: 78%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #34d399 20%,
            #34d399 75%,
            transparent 100%
          );
        }
        .profit-lines span:nth-child(2) {
          top: 50%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #60a5fa 25%,
            #60a5fa 70%,
            transparent 100%
          );
        }
        .profit-lines span:nth-child(3) {
          top: 26%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #fbbf24 18%,
            #f97316 72%,
            transparent 100%
          );
        }
        .inventory-board {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 1rem;
        }
        .agent-control-board {
          display: grid;
          gap: 1rem;
          height: 100%;
        }
        .agent-risk-panel {
          border-radius: 20px;
          padding: 1.2rem;
          background: linear-gradient(
            180deg,
            rgba(255, 112, 67, 0.12) 0%,
            rgba(255, 255, 255, 0.88) 100%
          );
          border: 1px solid rgba(255, 112, 67, 0.18);
        }
        .agent-risk-panel p {
          margin-bottom: 0.45rem;
          font-size: 0.78rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(37, 52, 74, 0.55);
        }
        .agent-risk-panel strong {
          display: block;
          font-size: 1.7rem;
          line-height: 1;
          margin-bottom: 0.45rem;
        }
        .agent-risk-panel span {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .agent-score-list {
          display: grid;
          gap: 0.75rem;
        }
        .agent-score-list div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(20, 36, 67, 0.08);
        }
        .agent-score-list strong {
          color: #ef4444;
          font-size: 1.05rem;
        }
        .agent-alert-strip {
          display: flex;
          gap: 0.7rem;
          flex-wrap: wrap;
        }
        .agent-alert-strip span {
          border-radius: 999px;
          padding: 0.55rem 0.85rem;
          background: rgba(255, 112, 67, 0.12);
          color: #b45309;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .inventory-map,
        .inventory-table {
          border-radius: 20px;
          background: rgba(27, 110, 243, 0.06);
          padding: 1rem;
        }
        .inventory-map {
          display: grid;
          gap: 0.8rem;
          align-content: center;
        }
        .inventory-map span,
        .inventory-table div {
          background: rgba(255, 255, 255, 0.86);
          border-radius: 16px;
          border: 1px solid rgba(20, 36, 67, 0.08);
          padding: 0.85rem 1rem;
        }
        .inventory-table {
          display: grid;
          gap: 0.75rem;
        }
        .inventory-table div {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .inventory-table strong {
          color: var(--blue);
        }
        .payroll-total {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 1rem;
        }
        .payroll-progress {
          height: 12px;
          border-radius: 999px;
          background: rgba(20, 36, 67, 0.08);
          overflow: hidden;
          margin-top: 1rem;
        }
        .payroll-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #1b6ef3 0%, #5ec0ff 100%);
        }
        .workspace-list {
          display: grid;
          gap: 0.8rem;
        }
        .workspace-list div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          background: rgba(27, 110, 243, 0.06);
        }
        .workspace-list strong {
          font-size: 1.2rem;
          color: var(--blue);
        }
        .mockup-shell-dashboard {
          background:
            radial-gradient(
              circle at top left,
              rgba(255, 255, 255, 0.6),
              transparent 32%
            ),
            linear-gradient(180deg, #f6f9fc 0%, #edf3f8 100%);
        }
        .dashboard-shot {
          min-height: 390px;
          display: grid;
          grid-template-columns: 92px 1fr;
          gap: 1rem;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(20, 36, 67, 0.08);
          overflow: hidden;
        }
        .dashboard-shot-sidebar {
          background: linear-gradient(180deg, #12213d 0%, #0f1b32 100%);
          display: grid;
          align-content: start;
          gap: 0.85rem;
          padding: 1rem;
        }
        .dashboard-shot-sidebar span {
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
        }
        .dashboard-shot-main {
          padding: 1rem;
          display: grid;
          gap: 1rem;
        }
        .dashboard-shot-top {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.8rem;
        }
        .dashboard-mini-card {
          border-radius: 18px;
          padding: 1rem;
          background: rgba(27, 110, 243, 0.07);
          border: 1px solid rgba(27, 110, 243, 0.08);
        }
        .dashboard-mini-card p {
          margin-bottom: 0.4rem;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(37, 52, 74, 0.5);
        }
        .dashboard-mini-card strong {
          font-size: 1.35rem;
        }
        .dashboard-shot-bottom {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 1rem;
        }
        .dashboard-chart {
          border-radius: 20px;
          min-height: 220px;
          background:
            linear-gradient(
              180deg,
              rgba(27, 110, 243, 0.08),
              rgba(27, 110, 243, 0.02)
            ),
            linear-gradient(90deg, rgba(20, 36, 67, 0.06) 1px, transparent 1px),
            linear-gradient(rgba(20, 36, 67, 0.06) 1px, transparent 1px);
          background-size:
            auto,
            44px 44px,
            44px 44px;
          position: relative;
          overflow: hidden;
        }
        .dashboard-chart::after {
          content: "";
          position: absolute;
          inset: auto 1rem 1.25rem 1rem;
          height: 120px;
          border-radius: 999px 999px 0 0;
          background: linear-gradient(
            180deg,
            rgba(52, 211, 153, 0.9) 0%,
            rgba(27, 110, 243, 0.9) 100%
          );
          clip-path: polygon(
            0 80%,
            18% 68%,
            34% 72%,
            52% 40%,
            68% 48%,
            82% 22%,
            100% 0,
            100% 100%,
            0 100%
          );
          opacity: 0.9;
        }
        .dashboard-list {
          display: grid;
          gap: 0.75rem;
        }
        .dashboard-list span {
          border-radius: 16px;
          padding: 0.9rem 1rem;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(20, 36, 67, 0.08);
          color: #29415e;
          font-weight: 700;
        }

        .section-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 0.85rem;
        }

        .pain {
          background: var(--off-white);
        }
        .pain h2,
        .offer h2,
        .proof h2,
        .cta h2 {
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .pain-lead,
        .offer-lead {
          font-size: 1.1rem;
          color: var(--text-muted);
          max-width: 620px;
          margin-bottom: 2.5rem;
        }
        .pain-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .pain-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-left: 3px solid var(--red);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
        }
        .pain-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.4rem;
        }
        .pain-card p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .pain-quote {
          margin-top: 2rem;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.4rem 1.7rem;
        }
        .pain-quote p {
          font-style: italic;
        }
        .pain-quote .attribution {
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          font-style: normal;
        }

        .proof {
          background: var(--blue-deep);
        }
        .proof-tag {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: var(--green);
          color: var(--white);
          padding: 0.3rem 0.8rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .proof h2 {
          color: var(--white);
        }
        .proof-lead,
        .proof-story p {
          color: rgba(255, 255, 255, 0.65);
        }
        .proof-story em {
          color: #93b4ff;
          font-style: normal;
          font-weight: 600;
        }
        .proof-story strong {
          color: var(--white);
        }
        .proof-metrics {
          margin: 0.8rem 0 1.1rem 1rem;
          padding: 0;
          display: grid;
          gap: 0.45rem;
          color: rgba(255, 255, 255, 0.74);
        }
        .proof-metrics li {
          margin: 0;
        }

        .offer {
          background: var(--off-white);
        }
        .offer-card {
          background: var(--blue-deep);
          border: 1px solid rgba(27, 110, 243, 0.35);
          border-radius: 16px;
          overflow: hidden;
        }
        .offer-card-head {
          padding: 2rem 2.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .offer-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--blue);
          color: var(--white);
          padding: 0.3rem 0.8rem;
          border-radius: 4px;
          margin-bottom: 0.85rem;
        }
        .offer-card-head h3 {
          color: var(--white);
          margin-bottom: 0.5rem;
        }
        .offer-card-head p {
          color: rgba(255, 255, 255, 0.5);
          max-width: 480px;
        }
        .offer-price-block {
          text-align: right;
        }
        .offer-price {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--white);
          line-height: 1;
        }
        .offer-price-note {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        .offer-limit {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--amber);
          margin-top: 6px;
        }
        .offer-systems {
          padding: 2rem 2.5rem;
        }
        .offer-systems-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 1.25rem;
        }
        .offer-total {
          margin: 0 2.5rem 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.65rem 1.25rem;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.5);
        }
        .total-row .tval {
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }
        .total-row.big {
          background: rgba(27, 110, 243, 0.15);
          border-bottom: none;
          padding: 1rem 1.25rem;
        }
        .total-row.big .tlabel {
          font-size: 1rem;
          font-weight: 700;
          color: var(--white);
        }
        .total-row.big .tval {
          font-size: 1.25rem;
          font-weight: 800;
          color: #93b4ff;
        }
        .system-row {
          display: flex;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          align-items: flex-start;
        }
        .system-row:last-child {
          border-bottom: none;
        }
        .system-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(27, 110, 243, 0.2);
          border: 1px solid rgba(27, 110, 243, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .system-check::after {
          content: "✓";
          font-size: 10px;
          color: #93b4ff;
          font-weight: 700;
        }
        .system-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--white);
          margin-bottom: 2px;
        }
        .system-desc {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.45);
        }
        .system-val {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.35);
          white-space: nowrap;
          margin-left: auto;
          padding-top: 2px;
          flex-shrink: 0;
        }

        .bonuses {
          background: var(--white);
        }
        .bonuses h2,
        .scarcity h2,
        .guarantee h2,
        .pricing h2,
        .final-cta h2 {
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }
        .bonuses-lead,
        .guarantee-lead,
        .scarcity-lead,
        .pricing-lead {
          font-size: 1rem;
          max-width: 600px;
          margin-bottom: 2.5rem;
          line-height: 1.8;
          color: var(--text-muted);
        }
        .bonus-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }
        .bonus-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }
        .bonus-num {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--blue);
          margin-bottom: 0.25rem;
        }
        .bonus-name {
          font-size: 1.05rem;
          font-weight: 700;
        }
        .bonus-val {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.6rem;
          background: var(--blue-light);
          color: var(--blue);
          border-radius: 4px;
          white-space: nowrap;
        }
        .bonus-kills {
          display: inline-block;
          font-size: 0.72rem;
          padding: 0.2rem 0.6rem;
          background: #fef2f2;
          color: var(--red);
          border-radius: 4px;
          margin-bottom: 0.6rem;
        }
        .bonus-body {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .bonus-total-card {
          margin-top: 1rem;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: #f8fbff;
        }
        .bonus-total-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
          font-size: 0.9rem;
          color: #334155;
        }
        .bonus-total-row strong {
          color: #0f172a;
          font-size: 1rem;
          white-space: nowrap;
        }
        .bonus-total-row:last-child {
          border-bottom: none;
        }
        .bonus-total-row-pay {
          background: rgba(27, 110, 243, 0.08);
          font-weight: 700;
        }

        .scarcity {
          background: var(--blue-deep);
        }
        .section-label-light {
          color: #93b4ff;
        }
        .scarcity h2,
        .pricing h2,
        .final-cta h2 {
          color: var(--white);
        }
        .scarcity-lead,
        .pricing-lead,
        .final-cta p {
          color: rgba(255, 255, 255, 0.55);
        }
        .scarcity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }
        .scarcity-cta-wrap {
          margin-top: 1.25rem;
        }
        .scarcity-card {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
        }
        .scarcity-card h4 {
          color: var(--white);
          margin-bottom: 0.5rem;
        }
        .scarcity-card p {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.9rem;
        }
        .slots {
          display: flex;
          gap: 5px;
          margin-top: 0.85rem;
        }
        .slot {
          width: 26px;
          height: 26px;
          border-radius: 4px;
        }
        .slot.taken {
          background: rgba(239, 68, 68, 0.25);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .slot.open {
          background: rgba(27, 110, 243, 0.35);
          border: 1px solid rgba(27, 110, 243, 0.5);
        }
        .slot-note {
          font-size: 0.75rem;
          color: #fca5a5;
          margin-top: 0.4rem;
        }
        .urgency-box {
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          padding: 1.75rem;
          background: rgba(245, 158, 11, 0.06);
        }
        .urgency-box h4 {
          color: var(--amber);
          margin-bottom: 0.5rem;
        }
        .urgency-box p {
          color: rgba(255, 255, 255, 0.6);
        }

        .guarantee {
          background: var(--off-white);
        }
        .guarantee-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 2rem;
        }
        .guarantee-name {
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .guarantee-body {
          color: var(--text-muted);
          margin-bottom: 1.25rem;
        }
        .guarantee-quote {
          border-left: 3px solid var(--blue);
          padding: 1rem 1.25rem;
          background: var(--blue-light);
          border-radius: 0 8px 8px 0;
          font-style: italic;
        }
        .conditions-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin: 1.5rem 0 0.75rem;
        }
        .condition-row {
          display: flex;
          gap: 10px;
          font-size: 0.875rem;
          color: var(--text-muted);
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border);
          align-items: flex-start;
        }
        .condition-row:last-child {
          border-bottom: none;
        }
        .cnum {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--blue-light);
          color: var(--blue);
          font-size: 0.7rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .pricing {
          background: var(--blue-deep);
        }
        .pricing-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(27, 110, 243, 0.4);
          border-radius: 20px;
          padding: 2rem;
          max-width: 560px;
          margin: 0 auto;
        }
        .pricing-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--blue);
          color: var(--white);
          padding: 0.3rem 0.8rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        .pricing-card h3 {
          color: var(--white);
          margin-bottom: 0.5rem;
        }
        .pricing-tagline {
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 1.5rem;
        }
        .pricing-amount {
          font-size: 3rem;
          font-weight: 800;
          color: var(--white);
          line-height: 1;
        }
        .pricing-period {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 0.4rem;
        }
        .pricing-limit {
          font-size: 0.8rem;
          color: var(--amber);
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .pricing-features {
          list-style: none;
          margin-bottom: 2rem;
          padding: 0;
        }
        .pricing-features li {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
        }
        .pricing-features li::before {
          content: "✓";
          color: var(--blue);
          font-weight: 700;
        }
        .pricing-features li:last-child {
          border-bottom: none;
        }
        .cta-main {
          display: block;
          width: 100%;
          text-align: center;
          background: var(--blue);
          color: var(--white);
          padding: 1.1rem 2rem;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
        }
        .cta-sub {
          text-align: center;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.3);
          margin-top: 0.85rem;
        }

        .final-cta {
          background: var(--text);
          color: var(--white);
          text-align: center;
        }
        .final-cta p {
          max-width: 640px;
          margin: 0 auto 2rem;
        }
        .final-btns {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .section-cta {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
        }
        .about-builder {
          background: var(--off-white);
        }
        .about-card {
          max-width: 700px;
          margin: 0 auto;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.94) 0%,
            rgba(252, 255, 254, 0.98) 100%
          );
          border: 1px solid rgba(27, 110, 243, 0.22);
          border-radius: 18px;
          padding: 1.8rem 1.8rem 1.5rem;
          box-shadow: 0 16px 42px rgba(15, 23, 42, 0.06);
        }
        .about-avatar-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 0.85rem;
        }
        .about-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: block;
          object-fit: cover;
          object-position: center;
          background: #ffffff;
          border: 2px solid rgba(27, 110, 243, 0.45);
        }
        .about-card h2 {
          text-align: center;
          font-size: clamp(1.55rem, 2.4vw, 2rem);
          line-height: 1.2;
          margin-bottom: 1.1rem;
          letter-spacing: -0.02em;
        }
        .about-copy {
          display: grid;
          gap: 0.85rem;
        }
        .about-copy p {
          margin: 0;
          color: #4b5563;
          font-size: 0.96rem;
          line-height: 1.7;
        }
        .about-card-action {
          display: flex;
          justify-content: center;
          margin-top: 1.35rem;
        }

        footer {
          background: var(--blue-deep);
          padding: 2rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .footer-disclaimer {
          margin: 0 auto;
          max-width: 980px;
          font-size: 0.8rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.52);
          text-align: left;
        }
        .footer-meta {
          margin: 0.95rem auto 0;
          max-width: 980px;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.3);
          text-align: left;
        }

        .cta-actions {
          display: flex;
          gap: 0.8rem;
          flex-wrap: wrap;
        }
        .btn-ghost-dark {
          border: 1px solid var(--border);
          color: var(--text);
          text-decoration: none;
          padding: 1rem 1.2rem;
          border-radius: 8px;
          font-weight: 600;
        }

        .application-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.85);
          display: grid;
          place-items: center;
          padding: 1.25rem;
          z-index: 999;
        }
        .application-modal {
          background: #ffffff;
          border-radius: 24px;
          width: min(100%, 760px);
          padding: 2.25rem;
          position: relative;
          box-shadow: 0 30px 60px rgba(3, 7, 18, 0.35);
          max-height: min(100vh, 90rem);
          overflow-y: auto;
        }
        .modal-close {
          position: absolute;
          right: 1rem;
          top: 1rem;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: #ffffff;
          font-size: 1.4rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .modal-head h3 {
          font-size: clamp(1.45rem, 2.6vw, 2rem);
          margin: 0.35rem 0 0.85rem;
          letter-spacing: -0.02em;
        }
        .modal-eyebrow {
          font-size: 0.78rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #0f172a;
          font-weight: 600;
          margin: 0;
        }
        .modal-sub {
          margin: 0;
          color: #475467;
          max-width: 580px;
          line-height: 1.6;
        }
        .application-form {
          display: grid;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .application-form label {
          display: grid;
          gap: 0.45rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #0f172a;
        }
        .application-form label span {
          font-weight: 400;
          font-size: 0.9rem;
          color: #475467;
        }
        .application-form input:not([type="radio"]),
        .application-form select,
        .application-form textarea {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(15, 23, 42, 0.15);
          padding: 0.85rem 1rem;
          font-size: 1rem;
          font-family: inherit;
          background: #f8fafc;
          color: #0f172a;
        }
        .application-form textarea {
          min-height: 110px;
          resize: vertical;
        }
        .field-error {
          color: #dc2626;
          font-size: 0.82rem;
          margin-top: 0.25rem;
        }
        .field-sub {
          font-size: 0.82rem;
          color: #94a3b8;
          font-weight: 400;
        }
        fieldset {
          border: none;
          padding: 0;
          margin: 0;
        }
        fieldset legend {
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #0f172a;
        }
        .radio-option {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          column-gap: 0.75rem;
          width: 100%;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .radio-option input {
          accent-color: #1b6ef3;
          width: 16px;
          height: 16px;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          justify-self: end;
        }
        .radio-option span {
          display: block;
          text-align: left;
          line-height: 1.35;
        }
        .form-actions {
          margin-top: 0.5rem;
        }
        .form-footer {
          font-size: 0.82rem;
          color: #94a3b8;
          margin: 0;
          line-height: 1.5;
        }
        .submit-error {
          margin: 0;
          color: #dc2626;
          font-size: 0.84rem;
          font-weight: 500;
        }
        .thanks-header h3 {
          margin-bottom: 0.4rem;
          font-size: 1.85rem;
          letter-spacing: -0.02em;
        }
        .thanks-header p {
          color: #475467;
          margin: 0;
        }
        .thanks-body {
          margin-top: 1.25rem;
        }
        .thanks-body h4 {
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.8rem;
          color: #0f172a;
        }
        .thanks-body ul {
          margin: 0;
          padding-left: 1rem;
          color: #475467;
          line-height: 1.7;
        }
        .cta-box {
          margin-top: 1.5rem;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 14px;
          padding: 1rem 1.4rem;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .cta-box p {
          margin: 0;
          font-weight: 500;
          letter-spacing: 0;
          font-size: 0.9rem;
          line-height: 1.45;
          color: #0f172a;
        }
        .btn-secondary {
          text-decoration: none;
          padding: 0.85rem 1.5rem;
          border-radius: 999px;
          border: 1px solid #119d53;
          background: #16a34a;
          color: #ffffff;
          font-weight: 700;
          white-space: nowrap;
        }
        .social-proof {
          margin-top: 1.5rem;
        }
        .social-proof p {
          margin-bottom: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          font-size: 0.8rem;
        }
        .proof-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .proof-grid p {
          margin: 0;
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
        }
        .proof-grid ul {
          margin: 0.25rem 0 0;
          padding-left: 1rem;
          color: #475467;
          line-height: 1.7;
        }
        .proof-note {
          margin-top: 0.9rem;
          color: #475467;
          font-size: 0.9rem;
        }
        .faq {
          margin-top: 1.5rem;
        }
        .faq-grid {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .faq-grid div {
          background: #f8fafc;
          border-radius: 10px;
          padding: 0.9rem 1rem;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .faq-grid p {
          margin: 0;
          color: #475467;
          font-size: 0.9rem;
        }
        .faq-grid p:first-child {
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: #0f172a;
        }

        @media (max-width: 700px) {
          .feature-stack {
            gap: 3rem;
          }
          .feature-row,
          .feature-row-command,
          .inventory-board,
          .flow-board,
          .profit-metrics,
          .kpi-grid,
          .dashboard-shot,
          .dashboard-shot-top,
          .dashboard-shot-bottom {
            grid-template-columns: 1fr;
          }
          .feature-row-reverse .feature-copy,
          .feature-row-reverse .feature-media {
            order: initial;
          }
          .kpi-card-wide {
            grid-column: auto;
          }
          .rotation-source {
            left: 50%;
            top: 1rem;
            transform: translateX(-50%);
          }
          .rotation-hub {
            width: 106px;
            height: 106px;
          }
          .rotation-list {
            position: static;
            width: auto;
            display: grid;
            gap: 0.75rem;
            margin-top: 11rem;
          }
          .rotation-list span {
            position: static;
          }
          .rotation-graphic::before,
          .rotation-graphic::after,
          .rotation-list::before,
          .rotation-list::after {
            display: none;
          }
          .mockup-shell {
            min-height: auto;
          }
          .feature-demo-video {
            min-height: 0;
          }
          .seen-on-row,
          .seen-on-logos {
            gap: 1rem 1.25rem;
          }
          .seen-on-item {
            font-size: 0.88rem;
          }
          .cta-box {
            flex-direction: column;
            align-items: flex-start;
          }
          .pain-cols {
            grid-template-columns: 1fr;
          }
          .offer-card-head,
          .offer-systems {
            padding: 1.25rem;
          }
          .offer-total {
            margin: 0 1.25rem 1.25rem;
          }
          .system-row {
            flex-wrap: wrap;
          }
          .system-val {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
}
