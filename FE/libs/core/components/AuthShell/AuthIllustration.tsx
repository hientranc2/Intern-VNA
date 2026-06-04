const CHECK_ROWS = [true, true, false];

function Person({
  width,
  head,
  body,
  leg,
  style,
}: {
  width: number;
  head: string;
  body: string;
  leg: string;
  style: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 50 90"
      width={width}
      fill="none"
      style={{ position: "absolute", ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="25" cy="14" r="10" fill={head} />
      <rect x="14" y="26" width="22" height="36" rx="6" fill={body} />
      <rect x="6" y="28" width="10" height="24" rx="5" fill={body} />
      <rect x="34" y="28" width="10" height="24" rx="5" fill={body} />
      <rect x="15" y="62" width="9" height="22" rx="4" fill={leg} />
      <rect x="26" y="62" width="9" height="22" rx="4" fill={leg} />
    </svg>
  );
}

/** Minh hoạ laptop + checklist + nhân vật cho trang xác thực (thuần CSS/SVG). */
export function AuthIllustration() {
  return (
    <div className="relative" style={{ width: 420, height: 390 }}>
      {/* Màn hình laptop */}
      <div
        className="absolute overflow-hidden"
        style={{
          top: 15,
          left: 55,
          width: 290,
          height: 165,
          background: "#1a56db",
          borderRadius: "12px 12px 0 0",
          boxShadow: "0 10px 30px rgba(26,86,219,0.4)",
        }}
      >
        <div
          className="absolute"
          style={{
            inset: 8,
            background:
              "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)",
            borderRadius: 6,
          }}
        />
        <div className="absolute z-[2]" style={{ top: 22, left: 20, right: 20 }}>
          {CHECK_ROWS.map((done, index) => (
            <div key={index} className="mb-3 flex items-center gap-2">
              <div
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: done ? "#22c55e" : "#94a3b8",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 8" fill="none">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                className="h-2.5 flex-1 rounded-full"
                style={{
                  background: done
                    ? "rgba(255,255,255,0.75)"
                    : "rgba(255,255,255,0.22)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bản lề + thân laptop */}
      <div
        className="absolute"
        style={{
          top: 180,
          left: 45,
          width: 310,
          height: 16,
          background: "linear-gradient(180deg, #1a56db 0%, #1341a8 100%)",
          borderRadius: "0 0 8px 8px",
        }}
      />
      <div
        className="absolute"
        style={{
          top: 196,
          left: 70,
          width: 260,
          height: 8,
          background: "rgba(26,86,219,0.2)",
          borderRadius: "50%",
          filter: "blur(4px)",
        }}
      />

      {/* Vòng tròn số */}
      {[
        { n: 1, style: { top: 118, left: 18 }, bg: "#f97316" },
        { n: 2, style: { top: 230, left: 100 }, bg: "#f97316" },
        { n: 3, style: { top: 8, right: 76 }, bg: "#f97316" },
      ].map(({ n, style, bg }) => (
        <div
          key={n}
          className="absolute z-10 flex items-center justify-center rounded-full font-bold text-white"
          style={{
            width: 36,
            height: 36,
            fontSize: 16,
            background: bg,
            boxShadow: "0 4px 12px rgba(249,115,22,0.5)",
            ...style,
          }}
        >
          {n}
        </div>
      ))}

      <Person width={40} head="#fbbf24" body="#1d4ed8" leg="#1e3a8a" style={{ left: 12, bottom: 60 }} />
      <Person width={38} head="#f97316" body="#22c55e" leg="#166534" style={{ right: 28, bottom: 52 }} />
      <Person width={34} head="#fbbf24" body="#7c3aed" leg="#4c1d95" style={{ right: 82, bottom: 32 }} />
    </div>
  );
}
