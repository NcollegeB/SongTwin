import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = "SongTwin - Find your next perfect song";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#050806",
          color: "white",
          display: "flex",
          fontFamily: "Arial",
          height: "100%",
          justifyContent: "center",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 20,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#1ed760",
                borderRadius: 18,
                color: "black",
                display: "flex",
                fontSize: 44,
                fontWeight: 900,
                height: 88,
                justifyContent: "center",
                width: 88,
              }}
            >
              ST
            </div>
            <div
              style={{
                color: "#d9f7e5",
                display: "flex",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              {siteConfig.name}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: 0,
              lineHeight: 0.95,
              maxWidth: 960,
            }}
          >
            Find your next perfect song.
          </div>
          <div
            style={{
              color: "#b7c8bd",
              display: "flex",
              fontSize: 32,
              lineHeight: 1.3,
              maxWidth: 980,
            }}
          >
            Search from a song you already love and get ranked music matches from a
            multi-source discovery algorithm.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
