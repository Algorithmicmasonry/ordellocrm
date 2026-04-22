import { Sparkles } from "lucide-react";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function ComingSoonOverlay({
  children,
  title = "Feature Coming Soon",
  description = "We're working hard to bring this to you. Stay tuned for updates.",
}: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="pointer-events-none select-none blur-sm opacity-30">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          style={{
            background: "rgba(6,10,20,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "1.25rem",
            padding: "2.5rem 3rem",
            textAlign: "center",
            maxWidth: "420px",
            width: "90%",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "1rem",
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <Sparkles style={{ width: "1.4rem", height: "1.4rem", color: "#60a5fa" }} />
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.2)",
              marginBottom: "1rem",
            }}
          >
            <span style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: "#60a5fa", display: "inline-block" }} />
            <span style={{ fontSize: "0.7rem", color: "#93c5fd", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              In Development
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
