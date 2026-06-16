import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, formatPrice } from "@/lib/utils";
import { Gift, Copy, Check, Users, Share2, Sparkles, TrendingUp, Wallet, ShoppingBag, ArrowRight, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ReferralData {
  id: number;
  code: string;
  ownerName: string;
  ownerEmail: string;
  discountPercent: number;
  totalUses: number;
  totalEarnings: number;
  active: boolean;
}

export default function Referral() {
  const { toast } = useToast();
  const { customer, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [myReferral, setMyReferral] = useState<ReferralData | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  useEffect(() => {
    if (isAuthenticated && customer?.email) {
      setName(customer.name);
      setEmail(customer.email);
      setLoadingEarnings(true);
      fetch(getApiUrl(`/api/referrals/my/${encodeURIComponent(customer.email)}`))
        .then(r => r.json())
        .then(data => {
          if (data.referral) {
            setMyReferral(data.referral);
            setReferralCode(data.referral.code);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEarnings(false));
    }
  }, [isAuthenticated, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl("/api/referrals"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ ownerName: name, ownerEmail: email, ownerPhone: phone || undefined }),
      });
      const data = await res.json();
      if (data.referral) {
        setReferralCode(data.referral.code);
        setMyReferral(data.referral);
        toast({ title: "Your code is ready!", description: data.message });
      }
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = referralCode ? `${window.location.origin}?ref=${referralCode}` : "";

  const copyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with friends to earn rewards." });
    setTimeout(() => setCopied(false), 3000);
  };

  const shareCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.share({
        title: "Get 10% off at TryNex!",
        text: `Use my referral link to get 10% off your first order at TryNex Lifestyle!`,
        url: shareUrl,
      });
    } catch {
      copyCode();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead title="Refer & Earn 10% | TryNex Lifestyle" description="Refer friends to TryNex and earn 10% credit. They get 10% off their first order!" />
      <Navbar />

      <section className="pt-header py-10 sm:py-16 px-4" style={{ background: "linear-gradient(135deg, #1C1917, #292524)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-6"
              style={{ background: "rgba(232,93,4,0.2)", color: "#FB8500", border: "1px solid rgba(232,93,4,0.3)" }}>
              <Gift className="w-4 h-4" /> Referral Program
            </span>
            <h1 className="text-3xl md:text-5xl font-black font-display text-white leading-tight mb-3 sm:mb-4">
              Refer Friends,<br /><span style={{ color: "#FB8500" }}>Earn 10% Credit</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-lg max-w-lg mx-auto">
              Share your unique link. Your friends get <strong className="text-white">10% off</strong> their first order.
              You earn <strong className="text-white">10% credit</strong> from every sale they make.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-8 sm:py-12 px-4 -mt-6">
        <div className="max-w-lg mx-auto">
          {!referralCode ? (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 space-y-4"
            >
              <h2 className="font-black text-xl text-gray-900 text-center">Get Your Referral Code</h2>
              <p className="text-center text-sm text-gray-500">
                {isAuthenticated ? "We've filled in your details. Just click generate!" : "Enter your info to get started."}
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Your Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Enter your name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Phone (Optional)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="01XXXXXXXXX" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                {loading ? "Creating..." : <><Sparkles className="w-4 h-4" /> Generate My Code</>}
              </button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 sm:p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <h2 className="font-black text-xl text-gray-900">Your Referral Code</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-orange-600">{referralCode}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="text-xs text-orange-700 font-medium break-all">{shareUrl}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyCode}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button onClick={shareCode}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                    <Share2 className="w-4 h-4" /> More Options
                  </button>
                </div>

                <div className="pt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-left">Direct Share</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const msg = encodeURIComponent(`🎁 TryNex Lifestyle থেকে কাস্টম টি-শার্ট, হুডি, মগ অর্ডার করুন!\n\n✅ আমার লিঙ্ক দিয়ে অর্ডার করলে আপনি পাবেন ১০% ছাড়!\n👉 ${shareUrl}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                      style={{ background: "#25D366" }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.118 1.522 5.852L0 24l6.302-1.493A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.004-1.368l-.36-.214-3.732.883.936-3.628-.235-.373A9.817 9.817 0 012.182 12c0-5.42 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        const u = encodeURIComponent(shareUrl);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, '_blank', 'width=600,height=400');
                      }}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                      style={{ background: "#1877F2" }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      Facebook
                    </button>
                  </div>
                </div>
              </div>

              {myReferral && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-500" /> Your Earnings
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-orange-50">
                      <p className="text-2xl font-black text-orange-600">{myReferral.totalUses || 0}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Sales</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-green-50">
                      <p className="text-2xl font-black text-green-600">{formatPrice(myReferral.totalEarnings || 0)}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Earned</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-blue-50">
                      <p className="text-2xl font-black text-blue-600">10%</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Commission</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Earnings accumulate as store credit. Contact us via WhatsApp to redeem.
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-500" /> QR Code
                  </h3>
                  <span className="text-[10px] text-gray-400 font-medium">Scan to visit your link</span>
                </div>
                <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}&color=E85D04&bgcolor=ffffff`}
                    alt="Referral QR Code"
                    className="w-28 h-28 rounded-xl border border-gray-100 shrink-0"
                  />
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold text-gray-900 mb-1">Share your QR code</p>
                    <p className="text-xs text-gray-500 mb-3">People can scan this at events, markets, or print it on flyers to use your referral link</p>
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=E85D04&bgcolor=ffffff`}
                      download="trynex-referral-qr.png"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:underline"
                    >
                      Download QR <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {referralCode && (
        <>
          <section className="py-6 sm:py-10 px-4 -mt-2">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Copy className="w-4 h-4 text-orange-500" /> Ready-Made Messages
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Copy and paste to WhatsApp, Facebook, or anywhere you sell</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    {
                      lang: "বাংলা",
                      flag: "🇧🇩",
                      text: `🎁 TryNex Lifestyle থেকে কাস্টম টি-শার্ট, হুডি, মগ ও ক্যাপ অর্ডার করুন!\n\n✅ প্রিমিয়াম কোয়ালিটি\n✅ ২৪ ঘণ্টায় প্রোডাকশন\n✅ বাংলাদেশের ৬৪ জেলায় ডেলিভারি\n\n🔗 আমার লিঙ্ক দিয়ে অর্ডার করলে পাবেন ১০% ছাড়:\n${referralCode ? `${window.location.origin}?ref=${referralCode}` : ''}`,
                    },
                    {
                      lang: "English",
                      flag: "🇬🇧",
                      text: `🎁 Get custom T-shirts, hoodies, mugs & caps from TryNex Lifestyle!\n\n✅ Premium quality\n✅ 24hr production\n✅ Delivery across Bangladesh\n\n🔗 Use my link and get 10% OFF your first order:\n${referralCode ? `${window.location.origin}?ref=${referralCode}` : ''}`,
                    },
                    {
                      lang: "ফেসবুক পোস্ট",
                      flag: "📘",
                      text: `কাস্টম প্রিন্টেড টি-শার্ট বা হুডি চাই? 👕\n\nTryNex Lifestyle তোমার ডিজাইন প্রিন্ট করে দিচ্ছে মাত্র ২৪ ঘণ্টায়! বাংলাদেশের সেরা কাস্টম অ্যাপারেল ব্র্যান্ড 🔥\n\n👇 আমার লিঙ্ক দিয়ে অর্ডার করো, ১০% ছাড় পাবে!\n${referralCode ? `${window.location.origin}?ref=${referralCode}` : ''}\n\n#TryNex #CustomTshirt #Bangladesh #প্রিন্টেড_টিশার্ট`,
                    },
                  ].map(({ lang, flag, text }) => (
                    <div key={lang} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                        <span className="text-xs font-bold text-gray-700">{flag} {lang}</span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(text);
                            toast({ title: "Message copied!", description: "Paste it anywhere to share." });
                          }}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="px-3 py-2.5 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`${window.location.origin}?ref=${referralCode}`)}&color=E85D04&bgcolor=ffffff`}
                  alt="Referral QR Code"
                  className="w-28 h-28 rounded-xl border border-gray-100 shrink-0"
                />
                <div>
                  <h4 className="font-bold text-gray-900 mb-1">Your QR Code</h4>
                  <p className="text-xs text-gray-500 mb-3">Print on flyers, business cards, or display at events. Anyone who scans it goes straight to your referral link.</p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}?ref=${referralCode}`)}&color=E85D04&bgcolor=ffffff`}
                    download="trynex-referral-qr.png"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs hover:bg-orange-100 transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Download QR (400×400)
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="py-6 sm:py-10 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6 sm:mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-3"
                  style={{ background: "rgba(232,93,4,0.2)", color: "#FB8500", border: "1px solid rgba(232,93,4,0.3)" }}>
                  <ShoppingBag className="w-3.5 h-3.5" /> Reseller Program
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Sell TryNex,<br /><span style={{ color: "#FB8500" }}>Your Way</span></h2>
                <p className="text-gray-400 text-sm max-w-lg mx-auto">
                  Use your referral link through any channel — Facebook groups, WhatsApp broadcasts, Instagram, or your own online shop. You earn 10% on every sale automatically.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { icon: "📱", title: "WhatsApp Broadcast", desc: "Send your referral link to your WhatsApp contacts. Set up a broadcast list and send the Bangla message template above." },
                  { icon: "👥", title: "Facebook Groups", desc: "Post in local buy/sell groups, student groups, and office groups. Use the Facebook post template above — just copy and paste." },
                  { icon: "🛒", title: "Your Own Shop", desc: "Sell custom products on your page or profile. Accept orders, place them on TryNex with your code, earn 10% every time." },
                  { icon: "📣", title: "Instagram & TikTok", desc: "Create content showing the products, add your referral link in bio. Every customer who clicks and orders earns you 10%." },
                  { icon: "🖨️", title: "Flyers & Prints", desc: "Download your QR code above and print it on flyers, posters, or cards. Hand them out physically in your area." },
                  { icon: "💬", title: "Messenger & Telegram", desc: "Share in Messenger group chats or Telegram channels. The more people see your link, the more you earn." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all">
                    <p className="text-2xl mb-2">{icon}</p>
                    <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
                    <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                <p className="text-white font-bold text-sm mb-1">Commission Calculator</p>
                <p className="text-gray-400 text-xs">10 orders × ৳500 avg = <span className="text-orange-400 font-black text-base">৳500 earned</span> &nbsp;|&nbsp; 50 orders × ৳700 avg = <span className="text-orange-400 font-black text-base">৳3,500 earned</span></p>
                <p className="text-gray-500 text-xs mt-1">No cap. No limit. Earn as much as you refer.</p>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black font-display text-gray-900 text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Gift, title: "1. Get Your Code", desc: "Sign up above to receive your unique referral link instantly", color: "#E85D04" },
              { icon: Share2, title: "2. Share & Earn", desc: "Send the link to friends — they get 10% off their first order", color: "#2563eb" },
              { icon: Wallet, title: "3. Collect 10% Credit", desc: "You earn 10% of every sale as store credit. Track your earnings above", color: "#16a34a" },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${color}12` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black font-display text-gray-900 text-center mb-6">FAQ</h2>
          <div className="space-y-3">
            {[
              { q: "How much do my friends save?", a: "They get 10% off their first order when they use your referral link." },
              { q: "How much do I earn?", a: "You earn 10% of every sale made through your referral link as store credit." },
              { q: "How do I redeem my earnings?", a: "Your earnings accumulate as store credit. Contact us via WhatsApp or visit your Account page to check your balance and request a payout or apply it to your next order." },
              { q: "Is there a limit to how many people I can refer?", a: "No! Refer as many friends as you want. There's no cap on your earnings." },
              { q: "Do I need an account?", a: "You can create a referral code without an account, but we recommend signing up so you can track your earnings on your Account page." },
            ].map(({ q, a }) => (
              <div key={q} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="font-bold text-sm text-gray-900 mb-1">{q}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isAuthenticated && (
        <section className="py-10 px-4">
          <div className="max-w-md mx-auto text-center bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 sm:p-8">
            <BadgeCheck className="w-10 h-10 text-white mx-auto mb-3" />
            <h3 className="text-xl font-black text-white mb-2">Create an Account</h3>
            <p className="text-orange-100 text-sm mb-4">Sign up to track your referral earnings, order history, and more.</p>
            <a href="/signup" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange-50 transition-all">
              Sign Up Free <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
