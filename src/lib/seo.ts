import type { Metadata } from "next";

const SITE_NAME = "JRV Admin";
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export function absoluteUrl(path = "/") {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

export function buildTitle(title?: string) {
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

export function baseMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    alternates: {
      canonical: absoluteUrl("/"),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: absoluteUrl("/"),
      title: SITE_NAME,
      description: "JRV Car Rental admin dashboard.",
      images: [
        {
          url: absoluteUrl("/og.png"),
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: "JRV Car Rental admin dashboard.",
      images: [absoluteUrl("/og.png")],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/favicon.ico",
    },
  };
}

export function pageMetadata(args: {
  title: string;
  description?: string;
  path?: string; // for canonical
  index?: boolean; // override robots
  images?: string[]; // optional OG override
}): Metadata {
  const canonical = absoluteUrl(args.path ?? "/");

  return {
    title: args.title,
    description: args.description,
    alternates: { canonical },
    robots:
      args.index === false
        ? { index: false, follow: false, googleBot: { index: false, follow: false } }
        : undefined,
    openGraph: {
      title: buildTitle(args.title),
      description: args.description,
      url: canonical,
      images: (args.images?.length ? args.images : undefined) as any,
    },
    twitter: {
      title: buildTitle(args.title),
      description: args.description,
      images: args.images?.length ? args.images : undefined,
    },
  };
}
