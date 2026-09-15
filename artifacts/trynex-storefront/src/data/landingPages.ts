/* ════════════════════════════════════════════════════════════════════
   Keyword Landing Page Configs
   Each entry maps a URL slug to its SEO content, product filter,
   and FAQ items — all targeting high-volume Bangladesh search terms.
════════════════════════════════════════════════════════════════════ */

export interface LandingFAQ {
  q: string;
  a: string;
}

export interface LandingPageConfig {
  slug: string;
  h1: string;
  seoTitle: string;
  description: string;
  keywords: string;
  intro: string;
  heroTag: string;
  categoryFilter?: string;
  tagFilter?: string;
  searchFilter?: string;
  faqs: LandingFAQ[];
  ctaLabel: string;
  ctaHref: string;
  relatedPages: { label: string; href: string }[];
}

export const LANDING_PAGES: Record<string, LandingPageConfig> = {
  "custom-tshirt-bangladesh": {
    slug: "custom-tshirt-bangladesh",
    h1: "Custom T-Shirt Bangladesh",
    seoTitle: "Custom T-Shirt Bangladesh — Design Your Own Tee | Trynext Lifestyle",
    description:
      "Design your own custom t-shirt in Bangladesh. Premium cotton, unlimited color & print options. Fast delivery to Dhaka & all 64 districts. Pay via bKash or Nagad — just 25% in advance.",
    keywords:
      "custom t-shirt bangladesh, কাস্টম টি-শার্ট বাংলাদেশ, custom tshirt dhaka, personalized tshirt bd, custom print tshirt bangladesh, design your own tshirt bangladesh, oversized tshirt bangladesh, bulk tshirt printing dhaka",
    heroTag: "Bangladesh's #1 Custom T-Shirt Brand",
    intro:
      "Looking for the best custom t-shirt in Bangladesh? Trynext Lifestyle lets you design exactly what you want — your name, your artwork, your team logo, or any photo — printed on premium 100% cotton tees. Whether you need 1 piece for a birthday gift or 500 pieces for a corporate event, we deliver to every corner of Bangladesh.",
    tagFilter: "t-shirt",
    faqs: [
      {
        q: "What is the minimum order for custom t-shirts in Bangladesh?",
        a: "Trynext has no minimum order — you can order as few as 1 custom t-shirt. For bulk orders of 50+ pieces, we offer special wholesale pricing.",
      },
      {
        q: "How long does custom t-shirt delivery take in Bangladesh?",
        a: "Standard delivery takes 3–5 business days across Bangladesh. Express delivery to Dhaka is available in 24–48 hours. We ship to all 64 districts.",
      },
      {
        q: "What printing method do you use for custom t-shirts?",
        a: "We use DTG (Direct-to-Garment) printing for small orders and screen printing for bulk orders — both give vibrant, long-lasting results that don't crack or fade.",
      },
      {
        q: "Can I print my own design or photo on a t-shirt?",
        a: "Yes. Upload your design in our Design Studio, or send us your artwork on WhatsApp. We accept JPG, PNG, PDF, and AI files.",
      },
      {
        q: "What sizes are available for custom t-shirts?",
        a: "We offer XS to 5XL including oversized fits. Check our size guide at trynext.shop/size-guide for detailed measurements.",
      },
      {
        q: "How much does a custom t-shirt cost in Bangladesh?",
        a: "Custom t-shirts at Trynext start from ৳399. Price depends on design complexity, quantity, and fabric type. Visit our shop to see current pricing.",
      },
    ],
    ctaLabel: "Shop Custom T-Shirts",
    ctaHref: "/products?category=t-shirts",
    relatedPages: [
      { label: "Custom Hoodie Bangladesh", href: "/custom-hoodie-bangladesh" },
      { label: "Custom Mug Bangladesh", href: "/custom-mug-bangladesh" },
      { label: "Custom Gift Bangladesh", href: "/custom-gift-bangladesh" },
      { label: "Design Studio", href: "/design-studio" },
    ],
  },

  "custom-hoodie-bangladesh": {
    slug: "custom-hoodie-bangladesh",
    h1: "Custom Hoodie Bangladesh",
    seoTitle: "Custom Hoodie Bangladesh — Premium Oversized Hoodies | Trynext",
    description:
      "Premium custom hoodies in Bangladesh. Oversized fits, GSM 340+ fleece. Name, logo, or photo printing. Fast delivery Dhaka & all districts. Pay via bKash or Nagad — just 25% in advance.",
    keywords:
      "custom hoodie bangladesh, কাস্টম হুডি বাংলাদেশ, oversized hoodie bangladesh, custom printed hoodie dhaka, couple hoodie bangladesh, corporate hoodie bangladesh, bulk hoodie printing bd",
    heroTag: "Premium Custom Hoodies — Delivered Across Bangladesh",
    intro:
      "Trynext Lifestyle makes Bangladesh's finest custom hoodies. Choose from our premium heavyweight 340GSM fleece — warm, soft, and built to last — then personalize it with your design, name, couple print, or brand logo. Perfect for team uniforms, corporate gifting, or as a statement fashion piece.",
    tagFilter: "hoodie",
    faqs: [
      {
        q: "What GSM is your custom hoodie in Bangladesh?",
        a: "Our hoodies use 340GSM premium fleece — heavyweight and warm, significantly better than the 280GSM hoodies sold elsewhere in Bangladesh.",
      },
      {
        q: "Can I get matching couple hoodies in Bangladesh?",
        a: "Absolutely. Couple hoodies are one of our most popular items. You can mix sizes and print complementing designs on each piece.",
      },
      {
        q: "Do you offer bulk corporate hoodie printing in Bangladesh?",
        a: "Yes. We offer bulk custom hoodies for companies, universities, and event teams. Discounts apply for orders of 20+ pieces. Contact us on WhatsApp for a quote.",
      },
      {
        q: "How is a custom hoodie priced in Bangladesh?",
        a: "Custom hoodies at Trynext start from ৳899. Pricing includes the hoodie and custom printing. No hidden charges.",
      },
      {
        q: "What printing styles are available for hoodies?",
        a: "We offer full-colour DTG printing, embroidery, puff print, and heat-transfer — depending on your design and quantity.",
      },
    ],
    ctaLabel: "Shop Custom Hoodies",
    ctaHref: "/products?category=hoodies",
    relatedPages: [
      { label: "Custom T-Shirt Bangladesh", href: "/custom-tshirt-bangladesh" },
      { label: "Corporate Gift Dhaka", href: "/corporate-gift-dhaka" },
      { label: "Custom Gift Bangladesh", href: "/custom-gift-bangladesh" },
      { label: "Design Studio", href: "/design-studio" },
    ],
  },

  "custom-gift-bangladesh": {
    slug: "custom-gift-bangladesh",
    h1: "Custom Gift Bangladesh",
    seoTitle: "Custom Gift Bangladesh — Personalized Gifts Delivered | Trynext",
    description:
      "Bangladesh's #1 personalized gift shop. Custom t-shirts, mugs, hoodies, caps & hampers. Photo printing, name engraving. Fast delivery Dhaka & all 64 districts.",
    keywords:
      "custom gift bangladesh, কাস্টম গিফট বাংলাদেশ, personalized gift dhaka, customized gift bd, custom photo gift bangladesh, unique gift idea bangladesh, gift shop dhaka, birthday gift bangladesh, anniversary gift bd",
    heroTag: "Bangladesh's #1 Personalized Gift Shop",
    intro:
      "Give a gift that can't be found in any store. Trynext Lifestyle creates personalized gifts in Bangladesh — from photo mugs and custom t-shirts to premium gift hampers — each made uniquely for the person you care about. Whether it's a birthday, anniversary, graduation, or Eid gift, we make it special.",
    tagFilter: "gift",
    faqs: [
      {
        q: "What kinds of custom gifts does Trynext make in Bangladesh?",
        a: "We make custom t-shirts, hoodies, mugs, caps, water bottles, and curated gift hampers — all with your chosen photo, name, message, or artwork.",
      },
      {
        q: "Can I order a last-minute gift with same-day delivery in Dhaka?",
        a: "Yes! Express same-day delivery is available in Dhaka for in-stock items. Contact us on WhatsApp to confirm availability and place your rush order.",
      },
      {
        q: "Is there a gift wrapping option?",
        a: "Yes. We offer premium gift box packaging with ribbon and a personalised message card. Select this at checkout or mention it on WhatsApp.",
      },
      {
        q: "What is the minimum budget for a custom gift from Trynext?",
        a: "Custom gifts start from ৳399 for a printed mug or t-shirt. Hamper packages start from ৳1,499.",
      },
      {
        q: "Do you ship custom gifts outside Dhaka?",
        a: "Yes — we ship to all 64 districts of Bangladesh via Pathao, Steadfast, and Sundarban Courier. Standard delivery takes 3–5 business days.",
      },
    ],
    ctaLabel: "Shop Custom Gifts",
    ctaHref: "/products",
    relatedPages: [
      { label: "Birthday Gift Bangladesh", href: "/birthday-gift-bangladesh" },
      { label: "Custom T-Shirt Bangladesh", href: "/custom-tshirt-bangladesh" },
      { label: "Corporate Gift Dhaka", href: "/corporate-gift-dhaka" },
      { label: "Gift Hampers", href: "/hampers" },
    ],
  },

  "corporate-gift-dhaka": {
    slug: "corporate-gift-dhaka",
    h1: "Corporate Gift Dhaka",
    seoTitle: "Corporate Gift Dhaka — Bulk Branded Gifts for Companies | Trynext",
    description:
      "Premium corporate gifts in Dhaka & across Bangladesh. Branded t-shirts, mugs, hoodies, caps with company logo. Bulk discounts. Fast delivery. Invoice available.",
    keywords:
      "corporate gift dhaka, corporate gift bangladesh, branded gift dhaka, bulk custom gift dhaka, company gift bangladesh, employee gift dhaka, promotional gift bangladesh, bulk tshirt printing dhaka, corporate hamper bangladesh",
    heroTag: "Corporate Gifting Made Simple — Bulk Orders Across Bangladesh",
    intro:
      "Impress your clients and motivate your team with premium branded corporate gifts from Trynext Lifestyle. We specialize in bulk corporate orders — branded t-shirts, mugs, hoodies, caps, and hampers — with your company logo, event theme, or personalized message. Tax invoice provided for all corporate orders.",
    searchFilter: "corporate",
    faqs: [
      {
        q: "What is the minimum order for corporate gifts in Bangladesh?",
        a: "We accept corporate orders from as few as 10 pieces. For bulk orders of 100+, we provide dedicated account management and competitive pricing.",
      },
      {
        q: "Do you provide tax invoices for corporate gift orders?",
        a: "Yes. We issue VAT-inclusive tax invoices for all corporate orders. This is perfect for companies needing expense documentation.",
      },
      {
        q: "Can you print our company logo on t-shirts and mugs?",
        a: "Absolutely. Send us your brand assets (logo, colors, slogan) and we'll create mockups for your approval before production begins.",
      },
      {
        q: "How quickly can corporate gift orders be fulfilled?",
        a: "Standard corporate orders take 5–7 business days. Rush orders are possible in 3 days for an extra charge. Delivery anywhere in Bangladesh.",
      },
      {
        q: "What are the payment options for corporate bulk orders?",
        a: "We accept bank transfer, bKash business, Nagad, and cash. A 30% advance is required for new corporate clients, with balance on delivery.",
      },
    ],
    ctaLabel: "Get a Corporate Quote",
    ctaHref: "/contact",
    relatedPages: [
      { label: "Custom Gift Bangladesh", href: "/custom-gift-bangladesh" },
      { label: "Custom Hoodie Bangladesh", href: "/custom-hoodie-bangladesh" },
      { label: "Custom T-Shirt Bangladesh", href: "/custom-tshirt-bangladesh" },
      { label: "Gift Hampers", href: "/hampers" },
    ],
  },

  "custom-mug-bangladesh": {
    slug: "custom-mug-bangladesh",
    h1: "Custom Mug Bangladesh",
    seoTitle: "Custom Mug Bangladesh — Photo & Name Printed Mugs | Trynext",
    description:
      "Personalized custom mugs in Bangladesh. Photo, name & design printing. 11oz & 15oz ceramic mugs. Gift-ready packaging. Fast delivery Dhaka & all districts.",
    keywords:
      "custom mug bangladesh, কাস্টম মগ বাংলাদেশ, photo mug bangladesh, personalized mug dhaka, custom printed mug bd, gift mug bangladesh, couple mug bangladesh, magic mug bangladesh",
    heroTag: "Custom Photo Mugs — Perfectly Personalized",
    intro:
      "A custom mug from Trynext Lifestyle is the gift people remember. Print any photo, name, special message, or artwork on a premium ceramic mug — available in 11oz everyday size or 15oz large size. Perfect for birthdays, Valentine's Day, anniversaries, or as a desk companion with your favourite motto.",
    tagFilter: "mug",
    faqs: [
      {
        q: "What types of custom mugs does Trynext offer in Bangladesh?",
        a: "We offer 11oz standard mugs, 15oz large mugs, magic colour-changing mugs, frosted glass mugs, and travel mugs — all fully customizable.",
      },
      {
        q: "Can I print a photo on a mug in Bangladesh?",
        a: "Yes. Send us any high-resolution photo and we'll print it beautifully on your mug. Photos print best at 300DPI or higher resolution.",
      },
      {
        q: "Are the custom mugs dishwasher-safe?",
        a: "Our standard mugs are hand-wash recommended for best longevity of print. For dishwasher use, we suggest our sublimation-coated premium mugs.",
      },
      {
        q: "How much does a custom photo mug cost in Bangladesh?",
        a: "Custom mugs start from ৳399 including full-color printing. Gift box packaging is available for an additional charge.",
      },
      {
        q: "How fast is mug delivery in Bangladesh?",
        a: "Custom mugs are ready in 24–48 hours and delivered within 3–5 business days anywhere in Bangladesh. Same-day Dhaka delivery available.",
      },
    ],
    ctaLabel: "Shop Custom Mugs",
    ctaHref: "/products?category=mugs",
    relatedPages: [
      { label: "Custom Gift Bangladesh", href: "/custom-gift-bangladesh" },
      { label: "Birthday Gift Bangladesh", href: "/birthday-gift-bangladesh" },
      { label: "Custom T-Shirt Bangladesh", href: "/custom-tshirt-bangladesh" },
      { label: "Design Studio", href: "/design-studio" },
    ],
  },

  "birthday-gift-bangladesh": {
    slug: "birthday-gift-bangladesh",
    h1: "Birthday Gift Bangladesh",
    seoTitle: "Birthday Gift Bangladesh — Unique Personalized Birthday Gifts | Trynext",
    description:
      "Best birthday gift ideas in Bangladesh. Personalized t-shirts, mugs, hoodies, hampers with name & photo. Gift wrapping. Fast delivery Dhaka & all districts.",
    keywords:
      "birthday gift bangladesh, জন্মদিনের উপহার বাংলাদেশ, birthday gift dhaka, unique birthday gift bd, personalized birthday gift bangladesh, birthday hamper dhaka, birthday surprise dhaka, custom birthday tshirt bangladesh",
    heroTag: "Make Their Birthday Unforgettable",
    intro:
      "Still searching for a birthday gift that's truly special? Trynext Lifestyle creates personalized birthday gifts in Bangladesh that feel like they were made just for them — because they were. From custom photo t-shirts and engraved mugs to curated premium hampers, every gift arrives beautifully packaged and ready to surprise.",
    tagFilter: "birthday",
    faqs: [
      {
        q: "What are the best birthday gift ideas in Bangladesh?",
        a: "The most memorable birthday gifts are personalized: a custom photo t-shirt, a mug with their name and a special message, a couple hoodie set, or a curated gift hamper with their favourite items.",
      },
      {
        q: "Can I get a birthday gift delivered the same day in Dhaka?",
        a: "Yes! For in-stock items, we offer same-day delivery in Dhaka. Order before 12pm for evening delivery. WhatsApp us to confirm availability.",
      },
      {
        q: "Do you provide gift wrapping for birthday gifts?",
        a: "Yes — our premium gift box with ribbon and personalized card is available at checkout. You can also add a handwritten note.",
      },
      {
        q: "Can I add a photo to a birthday gift?",
        a: "Absolutely. Upload your photo to our Design Studio or WhatsApp it to us. We print photos on t-shirts, mugs, cushions, and more.",
      },
      {
        q: "What is the price range for birthday gifts at Trynext?",
        a: "Birthday gifts range from ৳399 (custom mug or t-shirt) to ৳3,999+ for premium hamper packages. Something for every budget.",
      },
    ],
    ctaLabel: "Shop Birthday Gifts",
    ctaHref: "/products",
    relatedPages: [
      { label: "Custom Gift Bangladesh", href: "/custom-gift-bangladesh" },
      { label: "Custom Mug Bangladesh", href: "/custom-mug-bangladesh" },
      { label: "Gift Hampers", href: "/hampers" },
      { label: "Corporate Gift Dhaka", href: "/corporate-gift-dhaka" },
    ],
  },
};

export function getLandingPage(slug: string): LandingPageConfig | undefined {
  return LANDING_PAGES[slug];
}
