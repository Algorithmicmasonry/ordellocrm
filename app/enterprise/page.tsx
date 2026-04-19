"use client";

const systems = [
  {
    name: "Order Command Layer",
    desc: "Auto-capture, clear stage ownership, and less order leakage across channels.",
    value: "N120,000 value",
  },
  {
    name: "Delivery Control Layer",
    desc: "Agent reconciliation visibility, failed-delivery tracking, and risk flags.",
    value: "N150,000 value",
  },
  {
    name: "Money Clarity Layer",
    desc: "Revenue, margin, and profitability views you can trust for decisions.",
    value: "N180,000 value",
  },
  {
    name: "Team Performance Layer",
    desc: "Rep accountability, conversion trend visibility, and cleaner payroll logic.",
    value: "N100,000 value",
  },
  {
    name: "Done-For-You Implementation",
    desc: "Diagnosis, migration, rollout, team onboarding, and post-go-live tuning.",
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

export default function EnterprisePage() {
  const bookingLink =
    process.env.NEXT_PUBLIC_ENTERPRISE_BOOKING_URL || "#apply";

  return (
    <>
      <main className="enterprise-page mt-0 pt-0">
        <nav>
          <div className="nav-brand">
            <div className="nav-logo-mark">OR</div>
            <span className="nav-name">Ordo Enterprise</span>
          </div>
          <a className="nav-cta" href={bookingLink}>
            Book Strategy Call
          </a>
        </nav>

        <div className="alert-banner">
          2 Enterprise implementation slots per month <span>•</span> Starts at
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
              If your orders are growing but your backend feels messy, we help
              you build the
              <em> operating system your team can run on daily.</em>
            </h1>
            <p className="hero-qualifier">
              This is not for early-stage testing. It is for operators already
              moving 20-50+ orders with a team of sales reps, interstate
              delivery agents, and finance.
            </p>
            <p className="hero-sub">
              We diagnose your bottlenecks, rebuild the workflow, migrate your
              process into Ordo, and stay involved until your operations are
              running with clarity.
            </p>
            <div className="hero-cta-group">
              <a className="btn-primary" href={bookingLink}>
                Book Strategy Call
              </a>
            </div>
          </div>
          <div className="hero-screenshot">
            <div className="container-wide">
              <div className="screenshot-frame">
                <div className="screenshot-bar">
                  <span className="dot dot-r" />
                  <span className="dot dot-y" />
                  <span className="dot dot-g" />
                  <div className="screenshot-url">app.ordo.com/dashboard</div>
                </div>
                <div className="screenshot-img">
                  <div className="img-placeholder">
                    <div className="img-placeholder-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path d="M4 16l4-4 3 3 5-5 4 4" strokeWidth="1.7" />
                        <path d="M4 20h16" strokeWidth="1.7" />
                      </svg>
                    </div>
                    <p className="img-placeholder-text">
                      Replace with your real dashboard screenshot
                    </p>
                    <p className="img-placeholder-label">
                      Orders + Revenue + Team Performance
                    </p>
                  </div>
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
                  1,300<span>+</span>
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
                  N20M<span>+</span>
                </p>
                <p className="stat-label">inventory movement managed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pain">
          <div className="container">
            <p className="section-label">The Core Problem</p>
            <h2>
              Most POD businesses do not have an effort problem. They have an
              operations translation problem.
            </h2>
            <p className="pain-lead">
              The team is working hard, but effort is not consistently turning
              into clean outcomes. Orders leak, handoffs break, and the numbers
              arrive too late to guide decisions.
            </p>
            <div className="pain-cols">
              <div className="pain-card">
                <h4>Order leakage across channels</h4>
                <p>
                  Orders appear in many places and ownership is unclear during
                  handoffs.
                </p>
              </div>
              <div className="pain-card">
                <h4>Delivery and agent reconciliation stress</h4>
                <p>
                  Teams spend energy arguing over outcomes instead of improving
                  process.
                </p>
              </div>
              <div className="pain-card">
                <h4>Commission and payout friction</h4>
                <p>
                  Manual calculations create avoidable errors and trust issues.
                </p>
              </div>
              <div className="pain-card">
                <h4>Weak margin confidence</h4>
                <p>
                  Revenue is visible, but true profitability is often unclear
                  until too late.
                </p>
              </div>
            </div>
            <div className="pain-quote">
              <p>
                When operations are unclear, growth feels like progress from the
                outside and chaos from the inside.
              </p>
              <p className="attribution">
                This is the gap Enterprise is built to close.
              </p>
            </div>
          </div>
        </section>

        <section className="proof">
          <div className="container">
            <span className="proof-tag">Built In Real Operations</span>
            <h2>
              Ordo was pressure-tested in live POD workflows, not in demo mode.
            </h2>
            <p className="proof-lead">
              The system evolved from daily operating pressure: team handoff
              issues, delivery disputes, inventory mismatch, and slow financial
              visibility.
            </p>
            <div className="proof-story">
              <p>
                <strong>The Henry case:</strong> high activity, multiple
                channels, and a team moving fast, but backend control lagging
                behind growth.
              </p>
              <p>
                We started with diagnosis, not features.{" "}
                <em>Where are orders leaking?</em>{" "}
                <em>Where are decisions delayed?</em>{" "}
                <em>What is creating avoidable finance friction?</em>
              </p>
              <p>
                Then we rebuilt the flow around one system of record and clear
                stage ownership. Result: less reactive firefighting and more
                confident daily operations.
              </p>
            </div>
          </div>
        </section>

        <section className="offer">
          <div className="container">
            <p className="section-label">Enterprise Offer</p>
            <h2>The Ordo Done-For-You POD Operations Build</h2>
            <p className="offer-lead">
              One implementation team, one accountable process, and one clear
              outcome: a backend your business can scale on.
            </p>

            <div className="offer-card">
              <div className="offer-card-head">
                <div>
                  <span className="offer-badge">Enterprise Only</span>
                  <h3>Built around your current business constraints</h3>
                  <p>
                    We map your present workflow first, then implement a cleaner
                    one with migration, rollout, and adoption support.
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
                  <span className="tlabel">
                    Conservative implementation value
                  </span>
                  <span className="tval">N1,050,000+</span>
                </div>
                <div className="total-row">
                  <span className="tlabel">
                    Enterprise implementation investment
                  </span>
                  <span className="tval">N500,000</span>
                </div>
                <div className="total-row big">
                  <span className="tlabel">Monthly capacity</span>
                  <span className="tval">2 slots max</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bonuses">
          <div className="container">
            <p className="section-label">Enterprise Bonuses</p>
            <h2>4 implementation bonuses included at Enterprise level.</h2>
            <p className="bonuses-lead">
              Each bonus removes a common failure point that usually slows
              rollout or weakens adoption.
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
          </div>
        </section>

        <section className="scarcity">
          <div className="container">
            <p className="section-label section-label-light">
              Why Timing Matters
            </p>
            <h2>
              Only 2 Enterprise implementations per month. This is a hard cap.
            </h2>
            <p className="scarcity-lead">
              We keep this capped to protect delivery quality. If current slots
              are gone, onboarding moves to the next cycle.
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
                <h4>Why We Keep It Small</h4>
                <p>
                  Enterprise requires deep implementation work in your real
                  workflow, not surface-level setup.
                </p>
              </div>
            </div>
            <div className="urgency-box">
              <h4>Cost of delay</h4>
              <p>
                Most losses come from operational leakage that compounds
                quietly. The longer structure is delayed, the more expensive
                daily chaos becomes.
              </p>
            </div>
          </div>
        </section>

        <section className="guarantee">
          <div className="container">
            <p className="section-label">Guarantee</p>
            <h2>
              The &quot;We Do Not Leave Until It Is Running&quot; commitment.
            </h2>
            <p className="guarantee-lead">
              Enterprise is a service implementation, so our guarantee is
              completion accountability.
            </p>
            <div className="guarantee-card">
              <p className="guarantee-name">Completion Guarantee</p>
              <p className="guarantee-body">
                We do not consider engagement complete until your workflow is
                live, your team is operating in-system, and your core reporting
                is usable for day-to-day management.
              </p>
              <div className="guarantee-quote">
                &quot;This is for operators building a serious operation. We
                stay accountable until it is working in production.&quot;
              </div>
              <p className="conditions-title">What this includes</p>
              <div className="condition-row">
                <span className="cnum">1</span>
                <span>
                  Workflow mapping and implementation in your live operating
                  context.
                </span>
              </div>
              <div className="condition-row">
                <span className="cnum">2</span>
                <span>
                  Structured rollout support with team onboarding and handoff
                  clarity.
                </span>
              </div>
              <div className="condition-row">
                <span className="cnum">3</span>
                <span>
                  Post-go-live tuning to stabilize usage and operational
                  visibility.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing" id="apply">
          <div className="container">
            <p className="section-label section-label-light">Next Step</p>
            <h2>Enterprise starts at N500,000 one-time implementation.</h2>
            <p className="pricing-lead">
              Qualified businesses move to strategy call, then implementation
              planning.
            </p>
            <div className="pricing-card">
              <span className="pricing-badge">Ordo Enterprise</span>
              <h3>Done-For-You Operations Build</h3>
              <p className="pricing-tagline">
                Built for active POD operators managing real order volume and
                team complexity.
              </p>
              <p className="pricing-amount">N500,000</p>
              <p className="pricing-period">one-time implementation</p>
              <p className="pricing-limit">2 onboarding slots per month</p>
              <ul className="pricing-features">
                <li>Operational diagnosis + workflow redesign</li>
                <li>Migration and rollout support</li>
                <li>Team onboarding and process adoption</li>
                <li>Post-launch optimization window</li>
              </ul>
              <a className="cta-main" href={bookingLink}>
                Book Strategy Call
              </a>
              <p className="cta-sub">
                Fit-first process. We will tell you directly if Enterprise is
                too early.
              </p>
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <h2>If your backend is limiting your growth, fix it now.</h2>
            <p>
              When operations become clearer, execution becomes faster, cleaner,
              and more profitable.
            </p>
            <div className="final-btns">
              <a className="btn-primary" href={bookingLink}>
                Book Strategy Call
              </a>
            </div>
          </div>
        </section>

        <footer>
          Ordo Enterprise • Operational clarity for serious POD operators
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
        .screenshot-frame {
          border-radius: 12px 12px 0 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom: none;
          overflow: hidden;
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

        footer {
          background: var(--blue-deep);
          padding: 2rem 1.5rem;
          text-align: center;
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.25);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
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

        @media (max-width: 700px) {
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
