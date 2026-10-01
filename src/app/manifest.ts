import type { MetadataRoute } from "next";

/** Base para instalar como PWA (tela inicial do celular). O service worker/offline fica para uma etapa futura. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PointParts — Comparador de peças",
    short_name: "PointParts",
    description: "Compare preços de peças de celular entre fornecedores.",
    start_url: "/consulta",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#244ec4",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
