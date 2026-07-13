export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
}

// Static catalog shared by client components (shop/cart UI) and server code
// (checkout pricing, DB seeding) — no server-only imports here.
export const PRODUCTS: Product[] = [
  {
    id: "prod_headlamp",
    slug: "trailbeam-headlamp",
    name: "TrailBeam Headlamp",
    description: "300-lumen rechargeable headlamp for early starts and late camps.",
    priceCents: 3400,
    category: "lighting",
  },
  {
    id: "prod_socks",
    slug: "merino-hiking-socks",
    name: "Merino Hiking Socks (2-pack)",
    description: "Cushioned merino wool socks that regulate temperature on long days.",
    priceCents: 2200,
    category: "apparel",
  },
  {
    id: "prod_firestarter",
    slug: "all-weather-firestarter",
    name: "All-Weather Firestarter Kit",
    description: "Waterproof tinder and striker for reliable camp fires.",
    priceCents: 1500,
    category: "camp",
  },
  {
    id: "prod_daypack",
    slug: "20l-daypack",
    name: "20L Daypack",
    description: "Lightweight daypack sized for a full day on trail.",
    priceCents: 6900,
    category: "packs",
  },
];
