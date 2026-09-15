import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { api, apiFetch } from "@/lib/api";

// Major districts for quick-select chips (most common delivery destinations)
const MAJOR_DISTRICTS = [
  "Dhaka","Chittagong","Rajshahi","Khulna","Sylhet","Barisal","Rangpur","Mymensingh",
  "Gazipur","Narayanganj","Comilla","Cox's Bazar",
];

// Full list used for text-input validation/autocomplete
const BD_DISTRICTS = [
  "Dhaka","Chittagong","Rajshahi","Khulna","Sylhet","Barisal","Rangpur","Mymensingh",
  "Comilla","Narayanganj","Gazipur","Narsingdi","Munshiganj","Manikganj","Tangail",
  "Faridpur","Sherpur","Jamalpur","Netrokona","Kishorganj","Brahmanbaria","Chandpur",
  "Lakshmipur","Feni","Noakhali","Cox's Bazar","Bandarban","Rangamati","Khagrachhari",
  "Jessore","Satkhira","Bagerhat","Narail","Magura","Jhenaidah","Kushtia","Meherpur",
  "Chuadanga","Pabna","Sirajganj","Bogra","Joypurhat","Chapainawabganj","Naogaon",
  "Natore","Dinajpur","Thakurgaon","Panchagarh","Nilphamari","Lalmonirhat",
  "Kurigram","Gaibandha","Habiganj","Sunamganj","Moulvibazar","Pirojpur","Bhola",
  "Patuakhali","Barguna","Jhalokathi","Madaripur","Gopalganj","Shariatpur",
];

type MobilePaymentMethod = "cod" | "bkash" | "nagad" | "upay" | "bank" | "card";

const PAYMENT_METHODS = (siteSettings?: Record<string, string> | null) => {
  const options: { value: MobilePaymentMethod; label: string; icon: any; color: string; desc: string }[] = [];
  const codEnabled = siteSettings?.codEnabled == null || String(siteSettings.codEnabled) !== "false";
  if (codEnabled) {
    options.push({ value: "cod", label: "Cash on Delivery", icon: "dollar-sign", color: "#0891b2", desc: "25% advance, rest on delivery" });
  }
  const bkash = siteSettings?.bkashNumber;
  const nagad = siteSettings?.nagadNumber;
  const upay = siteSettings?.upayNumber;
  if (bkash) {
    options.push({ value: "bkash", label: "bKash", icon: "smartphone", color: "#e2136e", desc: `${bkash} (Personal)` });
  }
  if (nagad) {
    options.push({ value: "nagad", label: "Nagad", icon: "smartphone", color: "#f7941d", desc: `${nagad} (Personal)` });
  }
  if (upay) {
    options.push({ value: "upay", label: "uPay", icon: "smartphone", color: "#0077cc", desc: `${upay} (Personal)` });
  }
  const bankConfigured = !!(siteSettings?.bankName && siteSettings?.bankAccountNumber && siteSettings?.bankAccountName);
  if (bankConfigured) {
    options.push({ value: "bank", label: "Bank Transfer", icon: "briefcase", color: "#16a34a", desc: siteSettings?.bankName || "Bank transfer" });
  }
  options.push({ value: "card", label: "Card on Delivery", icon: "credit-card", color: "#7c3aed", desc: "Pay with POS card machine" });
  return options;
};

const isWallet = (m: string) => m === "bkash" || m === "nagad" || m === "upay";

function formatPrice(p: number) {
  return "৳" + p.toLocaleString("en-BD");
}

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { items, subtotal, clearCart } = useCart();

  const [step, setStep] = useState<"details" | "payment" | "confirm" | "success">("details");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [notes, setNotes] = useState("");

  // Inline field validation errors — avoids Alert popups which feel jarring on mobile
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<MobilePaymentMethod>("cod");
  const [paymentMode, setPaymentMode] = useState<"full" | "advance" | "cod">("advance");
  const [lastFour, setLastFour] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [senderName, setSenderName] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmissionError, setPaymentSubmissionError] = useState<string | null>(null);
  const [retryingPaymentSubmission, setRetryingPaymentSubmission] = useState(false);

  const [createdOrder, setCreatedOrder] = useState<{
    orderNumber: string;
    id: number;
    total: number;
    advance: number;
    paymentMethod: MobilePaymentMethod;
    paymentMode: "full" | "advance" | "cod";
    paymentSubmitted?: boolean;
  } | null>(null);

  // Fetch dynamic site settings (shipping cost, payment numbers, etc.)
  const { data: siteSettings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });

  const freeShippingThreshold = Number(siteSettings?.freeShippingThreshold ?? 1500);
  const shippingFee = Number(siteSettings?.shippingCost ?? 60);
  // Real admin-configured numbers only. No hardcoded fallback.
  const bkashNumber = siteSettings?.bkashNumber ?? "";
  const nagadNumber = siteSettings?.nagadNumber ?? "";
  const paymentOptions = useMemo(() => PAYMENT_METHODS(siteSettings), [siteSettings]);
  const hasWalletOrBankMethod = paymentOptions.some((method) =>
    method.value === "bkash" || method.value === "nagad" || method.value === "upay" || method.value === "bank",
  );

  useEffect(() => {
    if (paymentOptions.length > 0 && !paymentOptions.some((method) => method.value === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].value);
    }
  }, [paymentOptions, paymentMethod]);

  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const total = Math.max(0, subtotal + shipping - promoDiscount);

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await api.validatePromo(promoInput.trim(), total, email);
      if (res.valid) {
        setPromoApplied(res.code);
        setPromoDiscount(res.discount ?? 0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      setPromoError(err.message || "Invalid promo code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPromoLoading(false);
    }
  };

  const validateStep1 = () => {
    const errs: typeof fieldErrors = {};
    if (!name.trim()) errs.name = "Please enter your full name";
    const digits = phone.replace(/\D/g, "");
    if (!phone.trim() || !/^01[3-9]\d{8}$/.test(digits)) errs.phone = "Enter a valid 11-digit Bangladesh phone number";
    if (!address.trim()) errs.address = "Please enter your delivery address";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const validatePayment = () => {
    setPaymentError(null);
    if (isWallet(paymentMethod)) {
      if (!/^01[3-9]\d{8}$/.test(senderNumber.replace(/\D/g, ""))) {
        setPaymentError("Enter a valid Bangladesh mobile number used to send the payment.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      if (lastFour.length !== 4) {
        setPaymentError("Enter the last 4 digits of your sending number.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      const numberAvailable = paymentMethod === "bkash" ? bkashNumber : paymentMethod === "nagad" ? nagadNumber : siteSettings?.upayNumber;
      if (!numberAvailable) {
        setPaymentError(`${paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "uPay"} number is not configured. Choose another method or contact support.`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    }
    if (paymentMethod === "bank") {
      if (!senderName.trim() || !bankReference.trim()) {
        setPaymentError("Enter your sender name and bank reference number.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    }
    return true;
  };

  const submitPaymentInfo = async (orderId: number) => {
    setPaymentSubmissionError(null);
    try {
      await apiFetch(`/api/orders/${orderId}/payment-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          paymentMethod,
          customerEmail: email.trim() || undefined,
          customerPhone: phone,
          lastFourDigits: lastFour,
          senderNumber,
          transactionId,
          senderName,
          bankReference,
          promoCode: promoApplied || undefined,
        }),
      });
      setCreatedOrder((previous) => previous ? { ...previous, paymentSubmitted: true } : previous);
      return true;
    } catch (error: any) {
      setPaymentSubmissionError(error?.message || "Payment details could not be submitted yet.");
      return false;
    }
  };

  const placeOrder = async () => {
    if (loading) return;
    if (!validateStep1()) return;
    if (!validatePayment()) return;
    setLoading(true);
    try {
      const orderItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
        price: i.product.discountPrice ?? i.product.price,
        customNote: i.customNote,
        customImages: i.customImages,
      }));

      const order = await api.createOrder({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        shippingAddress: address.trim(),
        shippingCity: thana.trim() || undefined,
        shippingDistrict: district,
        paymentMethod,
        notes: [
          notes.trim(),
          paymentMode === "full" ? "Payment plan: full payment" : "Payment plan: 25% advance + cash on delivery",
        ].filter(Boolean).join(" | "),
        promoCode: promoApplied || undefined,
        items: orderItems,
        subtotal,
        shippingCost: shipping,
        total,
        promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
        source: "mobile",
      });

      const serverTotal = Number(order.total) || total;
      const serverAdvance = Math.ceil(serverTotal * 0.25);
      setCreatedOrder({
        orderNumber: order.orderNumber,
        id: order.id,
        total: serverTotal,
        advance: serverAdvance,
        paymentMethod,
        paymentMode,
      });
      clearCart();

      // Auto-submit payment verification for wallet/bank payments. The order
      // remains usable and retryable if this second request fails.
      if (isWallet(paymentMethod) || paymentMethod === "bank") {
        await submitPaymentInfo(order.id);
      }

      setStep("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setFieldErrors({ name: err.message || "Something went wrong. Please try again." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (step === "success" && createdOrder) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="check-circle" size={64} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Order Placed! 🎉</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your order <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>#{createdOrder.orderNumber}</Text> has been placed successfully.
        </Text>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Payment method</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {paymentOptions.find((method) => method.value === createdOrder.paymentMethod)?.label ?? createdOrder.paymentMethod}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Order total</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatPrice(createdOrder.total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              {createdOrder.paymentMode === "full" ? "Amount due now" : "25% advance"}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {formatPrice(createdOrder.paymentMode === "full" ? createdOrder.total : createdOrder.advance)}
            </Text>
          </View>
          {createdOrder.paymentMode !== "full" && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Remaining on delivery</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {formatPrice(createdOrder.total - createdOrder.advance)}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.successCardTitle, { color: colors.foreground }]}>What happens next?</Text>
          <View style={styles.successStep}>
            <Feather name="phone" size={16} color={colors.primary} />
            <Text style={[styles.successStepText, { color: colors.mutedForeground }]}>We'll call/SMS you within 2 hours to confirm</Text>
          </View>
          <View style={styles.successStep}>
            <Feather name="package" size={16} color={colors.primary} />
            <Text style={[styles.successStepText, { color: colors.mutedForeground }]}>Production starts after confirmation</Text>
          </View>
          <View style={styles.successStep}>
            <Feather name="truck" size={16} color={colors.primary} />
            <Text style={[styles.successStepText, { color: colors.mutedForeground }]}>Delivered within 24-48 hours</Text>
          </View>
        </View>
        {paymentSubmissionError && (
          <View style={[styles.successCard, { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }]}>
            <Text style={[styles.successCardTitle, { color: "#9A3412" }]}>Payment details still need to be sent</Text>
            <Text style={[styles.successStepText, { color: "#9A3412", marginTop: 4 }]}>
              Your order is safe. Retry now to submit the payment information for verification.
            </Text>
            <Pressable
              style={[styles.trackBtn, { backgroundColor: "#EA580C", marginTop: 12 }]}
              disabled={retryingPaymentSubmission}
              onPress={async () => {
                setRetryingPaymentSubmission(true);
                try {
                  await submitPaymentInfo(createdOrder.id);
                } finally {
                  setRetryingPaymentSubmission(false);
                }
              }}
            >
              <Feather name="refresh-cw" size={18} color="#fff" />
              <Text style={styles.trackBtnText}>{retryingPaymentSubmission ? "Retrying…" : "Retry Payment Submission"}</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          style={[styles.trackBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            router.replace("/(tabs)/orders");
          }}
        >
          <Feather name="map-pin" size={18} color="#fff" />
          <Text style={styles.trackBtnText}>Track My Order</Text>
        </Pressable>
        <Pressable
          style={[styles.homeBtn, { borderColor: colors.border }]}
          onPress={() => router.replace("/")}
        >
          <Text style={[styles.homeBtnText, { color: colors.foreground }]}>Continue Shopping</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: isWeb ? 20 : insets.top + 8, backgroundColor: colors.navy }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.stepBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(["details", "payment", "confirm"] as const).map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, {
                backgroundColor: step === s ? colors.primary : (["details", "payment", "confirm"].indexOf(step) > i ? colors.primary : colors.border),
              }]}>
                <Text style={styles.stepDotText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, { color: step === s ? colors.primary : colors.mutedForeground }]}>
                {s === "details" ? "Info" : s === "payment" ? "Payment" : "Review"}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {step === "details" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Details</Text>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: fieldErrors.name ? "#ef4444" : colors.border }]}
                value={name}
                onChangeText={(v) => { setName(v); if (fieldErrors.name) setFieldErrors(e => ({ ...e, name: undefined })); }}
                placeholder="e.g. Ahmed Hasan"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone Number *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: fieldErrors.phone ? "#ef4444" : colors.border }]}
                value={phone}
                onChangeText={(v) => { setPhone(v); if (fieldErrors.phone) setFieldErrors(e => ({ ...e, phone: undefined })); }}
                placeholder="01XXXXXXXXX"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              {fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email (optional)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Street Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: fieldErrors.address ? "#ef4444" : colors.border }]}
                value={address}
                onChangeText={(v) => { setAddress(v); if (fieldErrors.address) setFieldErrors(e => ({ ...e, address: undefined })); }}
                placeholder="House, Road, Area..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                returnKeyType="next"
              />
              {fieldErrors.address && <Text style={styles.fieldError}>{fieldErrors.address}</Text>}

              <Text style={[styles.label, { color: colors.mutedForeground }]}>District *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                  {MAJOR_DISTRICTS.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setDistrict(d)}
                      style={[styles.districtChip, {
                        backgroundColor: district === d ? colors.primary : colors.card,
                        borderColor: district === d ? colors.primary : colors.border,
                      }]}
                    >
                      <Text style={[styles.districtChipText, { color: district === d ? "#fff" : colors.foreground }]}>{d}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={district}
                onChangeText={setDistrict}
                placeholder="Or type district..."
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Thana / Area</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={thana}
                onChangeText={setThana}
                placeholder="Thana or area name"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Order Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special instructions..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
              />

              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Promo / Referral Code</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.promoInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
                  value={promoInput}
                  onChangeText={setPromoInput}
                  placeholder="Enter code"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                  editable={!promoApplied}
                />
                {promoApplied ? (
                  <Pressable
                    onPress={() => { setPromoApplied(null); setPromoDiscount(0); setPromoInput(""); setPromoError(null); }}
                    style={[styles.promoBtn, { backgroundColor: "#EF4444" }]}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={applyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                    style={[styles.promoBtn, { backgroundColor: colors.primary, opacity: promoLoading || !promoInput.trim() ? 0.5 : 1 }]}
                  >
                    {promoLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.promoBtnText}>Apply</Text>
                    )}
                  </Pressable>
                )}
              </View>
              {promoApplied && (
                <Text style={{ color: "#22C55E", fontSize: 13, marginTop: 4, fontFamily: "Inter_600SemiBold" }}>
                  ✓ {promoApplied} — {formatPrice(promoDiscount)} off
                </Text>
              )}
              {promoError && (
                <Text style={{ color: "#EF4444", fontSize: 13, marginTop: 4, fontFamily: "Inter_400Regular" }}>{promoError}</Text>
              )}
            </View>
          )}

          {step === "payment" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment</Text>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Mode</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                {(["full", "advance", ...(paymentOptions.some((method) => method.value === "cod") ? ["cod" as const] : [])] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setPaymentMode(mode);
                      if (mode === "cod") {
                        if (paymentOptions.some((method) => method.value === "cod")) setPaymentMethod("cod");
                      } else if (paymentMethod === "cod") {
                        const replacement = paymentOptions.find((method) => method.value !== "cod");
                        if (replacement) setPaymentMethod(replacement.value);
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.modeChip, {
                      backgroundColor: paymentMode === mode ? colors.primary : colors.card,
                      borderColor: paymentMode === mode ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.modeChipText, { color: paymentMode === mode ? "#fff" : colors.foreground }]}>
                      {mode === "full" ? "Full" : mode === "advance" ? "25% Advance" : "COD"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Method</Text>
              {!hasWalletOrBankMethod && (
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 10, fontFamily: "Inter_400Regular" }}>
                  No wallet or bank transfer is configured. Available methods are shown below.
                </Text>
              )}
              {paymentOptions.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    setPaymentMethod(m.value);
                    if (m.value === "cod") setPaymentMode("cod");
                    else if (paymentMode === "cod") setPaymentMode("advance");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.paymentOption, {
                    backgroundColor: colors.card,
                    borderColor: paymentMethod === m.value ? m.color : colors.border,
                    borderWidth: paymentMethod === m.value ? 2 : 1,
                  }]}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: paymentMethod === m.value ? m.color + "20" : colors.background }]}>
                    <Feather name={m.icon as any} size={20} color={paymentMethod === m.value ? m.color : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentLabel, { color: colors.foreground }]}>{m.label}</Text>
                    <Text style={[styles.paymentDesc, { color: colors.mutedForeground }]}>{m.desc}</Text>
                  </View>
                  {paymentMethod === m.value && (
                    <Feather name="check-circle" size={20} color={m.color} />
                  )}
                </Pressable>
              ))}

              {paymentError && (
                <Text style={{ color: "#EF4444", fontSize: 13, marginTop: 12, fontFamily: "Inter_500Medium" }}>{paymentError}</Text>
              )}

              {isWallet(paymentMethod) && (
                <View style={[styles.paymentDetailCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.paymentDetailTitle, { color: colors.foreground }]}>
                    Send {formatPrice(paymentMode === "full" ? total : Math.ceil(total * 0.25))} to {paymentMethod === "bkash" ? "bKash" : paymentMethod === "nagad" ? "Nagad" : "uPay"}
                  </Text>
                  <Text style={[styles.paymentDetailNumber, { color: paymentMethod === "bkash" ? "#e2136e" : paymentMethod === "nagad" ? "#f7941d" : "#0077cc" }]}>
                    {paymentMethod === "bkash" ? bkashNumber : paymentMethod === "nagad" ? nagadNumber : siteSettings?.upayNumber || ""}
                  </Text>
                  {!siteSettings?.[`${paymentMethod}Number`] && (
                    <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>Admin number not configured.</Text>
                  )}

                  <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Your Sending Number *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={senderNumber}
                    onChangeText={(v) => setSenderNumber(v.replace(/[^0-9]/g, "").slice(0, 11))}
                    placeholder="01XXXXXXXXX"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />

                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Last 4 Digits *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, letterSpacing: 8, textAlign: "center", fontSize: 20, fontFamily: "Inter_700Bold" }]}
                    value={lastFour}
                    onChangeText={(v) => setLastFour(v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="5678"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={4}
                  />

                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Transaction ID (optional)</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={transactionId}
                    onChangeText={(v) => setTransactionId(v.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30))}
                    placeholder="e.g. 8X9K2L"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {paymentMethod === "bank" && (
                <View style={[styles.paymentDetailCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.paymentDetailTitle, { color: colors.foreground }]}>Bank Transfer</Text>
                  <View style={{ gap: 4, marginBottom: 12 }}>
                    <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>Bank: <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{siteSettings?.bankName || "Not configured"}</Text></Text>
                    <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>Account: <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{siteSettings?.bankAccountName || "Not configured"}</Text></Text>
                    <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>Number: <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{siteSettings?.bankAccountNumber || "Not configured"}</Text></Text>
                    {siteSettings?.bankBranch && <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>Branch: {siteSettings?.bankBranch}</Text>}
                  </View>
                  <Text style={[styles.paymentDetailAmount, { color: "#16a34a" }]}>
                    Send {formatPrice(paymentMode === "full" ? total : Math.ceil(total * 0.25))}
                  </Text>

                  <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Sender Name / Account Name *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={senderName}
                    onChangeText={(v) => setSenderName(v.slice(0, 100))}
                    placeholder="Your bank account name"
                    placeholderTextColor={colors.mutedForeground}
                  />

                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Reference Number *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={bankReference}
                    onChangeText={(v) => setBankReference(v.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 50))}
                    placeholder="e.g. REF123456"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {paymentMethod === "card" && (
                <View style={[styles.paymentDetailCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.paymentDetailTitle, { color: colors.foreground }]}>Card on Delivery</Text>
                  <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>
                    {siteSettings?.cardPaymentNote || "Pay with card on delivery (POS machine available)."}
                  </Text>
                  <Text style={[styles.paymentDetailAmount, { color: "#7c3aed", marginTop: 8 }]}>Pay {formatPrice(total)} on delivery</Text>
                </View>
              )}

              {paymentMethod === "cod" && (
                <View style={[styles.paymentDetailCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.paymentDetailTitle, { color: colors.foreground }]}>Cash on Delivery</Text>
                  <Text style={[styles.paymentDetailMeta, { color: colors.mutedForeground }]}>
                    A 25% advance of {formatPrice(Math.ceil(total * 0.25))} is required to confirm your order. Our team will contact you with payment instructions.
                  </Text>
                  <Text style={[styles.paymentDetailAmount, { color: "#0891b2", marginTop: 8 }]}>Remaining {formatPrice(total - Math.ceil(total * 0.25))} on delivery</Text>
                </View>
              )}
            </View>
          )}

          {step === "confirm" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>

              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Name</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Phone</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{phone}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Address</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground, flex: 1, textAlign: "right" }]}>{address}, {thana ? thana + ", " : ""}{district}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Payment</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground, textAlign: "right" }]}>
                    {paymentOptions.find(m => m.value === paymentMethod)?.label}
                    {paymentMode !== "full" ? `\n${paymentMode === "cod" ? "25% advance" : "25% advance"} ${formatPrice(Math.ceil(total * 0.25))}` : ""}
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Items ({items.length})</Text>
              {items.map((item) => (
                <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.product.name}</Text>
                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                      {[item.size, item.color].filter(Boolean).join(" · ")} × {item.quantity}
                    </Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                    {formatPrice((item.product.discountPrice ?? item.product.price) * item.quantity)}
                  </Text>
                </View>
              ))}

              <View style={[styles.totalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                  <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatPrice(subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Shipping</Text>
                  <Text style={[styles.totalValue, { color: shipping === 0 ? "#22C55E" : colors.foreground }]}>
                    {shipping === 0 ? "FREE" : formatPrice(shipping)}
                  </Text>
                </View>
                {promoDiscount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: "#22C55E" }]}>Promo ({promoApplied})</Text>
                    <Text style={[styles.totalValue, { color: "#22C55E" }]}>-{formatPrice(promoDiscount)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.grandTotal, { borderTopColor: colors.border }]}>
                  <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatPrice(total)}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: isWeb ? 20 : insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {step !== "details" && (
            <Pressable
              onPress={() => setStep(step === "confirm" ? "payment" : "details")}
              style={[styles.backStepBtn, { borderColor: colors.border }]}
            >
              <Feather name="arrow-left" size={18} color={colors.foreground} />
              <Text style={[styles.backStepText, { color: colors.foreground }]}>Back</Text>
            </Pressable>
          )}

          {step === "details" && (
            <Pressable
              onPress={() => {
                if (!validateStep1()) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep("payment");
              }}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.nextBtnText}>Continue to Payment</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          )}

          {step === "payment" && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep("confirm");
              }}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.nextBtnText}>Review Order</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          )}

          {step === "confirm" && (
            <Pressable
              onPress={placeOrder}
              disabled={loading}
              style={[styles.nextBtn, { backgroundColor: "#22C55E", opacity: loading ? 0.7 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Place Order — {formatPrice(total)}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  stepBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepDotText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  section: { padding: 16, gap: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 4 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  textArea: { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
  districtChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  districtChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldError: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#ef4444", marginTop: -8, marginBottom: 8 },
  promoRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  promoBtn: {
    width: 72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  promoBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  paymentIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  paymentLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  paymentDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modeChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  paymentDetailCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 12 },
  paymentDetailTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  paymentDetailNumber: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  paymentDetailMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  paymentDetailAmount: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  infoBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  summaryCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.07)" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: "60%" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, gap: 8 },
  itemName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  itemPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  grandTotal: { borderTopWidth: 1, marginTop: 2 },
  grandTotalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grandTotalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  backStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  backStepText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  successIcon: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  successCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12, marginTop: 4 },
  successCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  successStep: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  successStepText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
    marginTop: 8,
  },
  trackBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  homeBtn: {
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  homeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
