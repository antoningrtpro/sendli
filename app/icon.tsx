import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111184",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          color: "white",
          fontSize: "14px",
          fontWeight: "bold",
          letterSpacing: "-0.5px",
        }}
      >
        s.
      </div>
    ),
    { ...size },
  );
}
