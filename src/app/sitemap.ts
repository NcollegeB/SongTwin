import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const publicRoutes = [
  {
    path: "/",
    priority: 1,
  },
  {
    path: "/contact",
    priority: 0.5,
  },
  {
    path: "/privacy",
    priority: 0.3,
  },
  {
    path: "/terms",
    priority: 0.3,
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
