import { useState, useEffect } from "react";
import { Instagram, ExternalLink, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const FEED_IMAGES = [
  "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/hoodie/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/mug/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/cap/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/tshirt/black/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/hoodie/grey/front-base.png",
];

const FALLBACK_IMAGES = [
  "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/hoodie/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/mug/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/cap/white/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/tshirt/black/front-base.png",
  "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
];

const LIKES = [1284, 976, 2103, 843, 1567, 729];
const CAPTIONS = [
  "Custom tees 🔥",
  "Fresh hoodies ✨",
  "Personalized mugs ☕",
  "Caps on point 🧢",
  "Your design, your style 💯",
  "Crafted with love ❤️",
];

interface InstaPost {
  imageUrl: string;
  fallback: string;
  link: string;
  likes: number;
  caption: string;
}

const FEED: InstaPost[] = FEED_IMAGES.map((img, i) => ({
  imageUrl: img,
  fallback: FALLBACK_IMAGES[i],
  link: "#",
  likes: LIKES[i],
  caption: CAPTIONS[i],
}));

export function InstagramFeed() {
  const settings = useSiteSettings();
  const instaHandle = settings.instagramUrl?.replace(/.*instagram\.com\//, "").replace(/\/$/, "") || "trynext.lifestyle";
  const instaUrl = settings.instagramUrl || `https://instagram.com/${instaHandle}`;
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(131,58,180,0.1), rgba(253,29,29,0.1))",
              color: "#E1306C",
              border: "1px solid rgba(225,48,108,0.15)",
            }}
          >
            <Instagram className="w-4 h-4" /> @{instaHandle}
          </span>
          <h2 className="text-3xl md:text-4xl font-black font-display text-gray-900 mt-4">
            Follow Our Journey
          </h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">
            See what our customers are creating — custom tees, hoodies, mugs &amp; more from Bangladesh's top print brand.
          </p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {FEED.map((post, i) => (
            <motion.a
              key={i}
              href={instaUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={{ scale: 1.04 }}
              className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <img
                src={post.imageUrl}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = post.fallback;
                }}
              />
              {/* Overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 transition-all duration-300"
                style={{
                  background: hovered === i
                    ? "linear-gradient(180deg, rgba(225,48,108,0.5) 0%, rgba(131,58,180,0.6) 100%)"
                    : "transparent",
                  opacity: hovered === i ? 1 : 0,
                }}
              >
                <Heart className="w-5 h-5 text-white fill-white" />
                <span className="text-white text-xs font-bold">{post.likes.toLocaleString()}</span>
              </div>

              {/* Corner icon */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="w-3.5 h-3.5 text-white drop-shadow" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <a
            href={instaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
              boxShadow: "0 4px 20px rgba(225,48,108,0.3)",
            }}
          >
            <Instagram className="w-5 h-5" /> Follow @{instaHandle}
          </a>
          <span className="text-sm text-gray-400 font-medium">
            See recent custom creations and design ideas.
          </span>
        </div>
      </div>
    </section>
  );
}
