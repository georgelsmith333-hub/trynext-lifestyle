import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { api, OrderTrackResponse } from "@/lib/api";

const STATUS_INFO: Record<string, { label: string; icon: string; color: string }> = {
  pending:    { label: "Order Placed",    icon: "clock",       color: "#F59E0B" },
  confirmed:  { label: "Confirmed",       icon: "check-circle", color: "#3B82F6" },
  processing: { label: "Processing",      icon: "settings",    color: "#8B5CF6" },
  shipped:    { label: "Shipped",         icon: "truck",       color: "#F97316" },
  delivered:  { label: "Delivered",       icon: "package",     color: "#22C55E" },
  cancelled:  { label: "Cancelled",       icon: "x-circle",   color: "#EF4444" },
};

function getStatus(s: string) {
  return STATUS_INFO[s] ?? { label: s, icon: "help-circle", color: "#6B7280" };
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderTrackResponse | null>(null);

  const track = async () => {
    if (!orderNumber.trim()) { setError("Please enter your order number"); return; }
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    setError(null);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const data = await api.trackOrder({ orderNumber: orderNumber.trim(), phone: phone.trim() });
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Order not found. Please check your details.");
      setResult(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

      const order = result;
  const timeline = result?.timeline ?? [];
  const statusInfo = order ? getStatus(order.status) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        result ? <RefreshControl refreshing={loading} onRefresh={track} tintColor={colors.primary} /> : undefined
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.navy }]}>
        <Text style={styles.headerTitle}>Track Order</Text>
        <Text style={styles.headerSub}>Enter your details to see live status</Text>
      </View>

      {/* Search Form */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Order Number</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="hash" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="e.g. TN2406001234"
            placeholderTextColor={colors.mutedForeground}
            value={orderNumber}
            onChangeText={setOrderNumber}
            autoCapitalize="characters"
            returnKeyType="next"
          />
        </View>

        <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 12 }]}>Phone Number</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="phone" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Your registered phone"
            placeholderTextColor={colors.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={track}
          />
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={track}
          disabled={loading}
          style={({ pressed }) => [
            styles.trackBtn,
            { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="search" size={18} color="#fff" />
              <Text style={styles.trackBtnText}>Track Order</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Results */}
      {order && statusInfo && (
        <>
          {/* Status Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={[styles.orderNumber, { color: colors.foreground }]}>#{order.orderNumber}</Text>
                <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}18` }]}>
                <Feather name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Feather name="user" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{order.customerName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="phone" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{order.customerPhone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>District</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {order.shippingDistrict || order.shippingCity || "N/A"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Feather name="credit-card" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>৳{order.total.toLocaleString()}</Text>
              </View>
            </View>

            {order.trackingNumber && (
              <View style={[styles.trackingBox, { backgroundColor: colors.secondary, borderColor: `${colors.primary}30` }]}>
                <Feather name="truck" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>Tracking</Text>
                  <Text style={[styles.trackingValue, { color: colors.foreground }]}>
                    {order.courierName && `${order.courierName} · `}{order.trackingNumber}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Items */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items Ordered</Text>
            {order.items.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.itemIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="package" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>
                    {item.productName || item.name || "Product"}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                    {[item.size, item.color].filter(Boolean).join(" · ")} · Qty {item.quantity}
                  </Text>
                </View>
                {item.price ? (
                  <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                    ৳{(item.price * item.quantity).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Timeline */}
          {timeline.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Timeline</Text>
              {timeline.map((t, idx) => {
                const info = getStatus(t.status);
                const isLast = idx === timeline.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: info.color }]}>
                        <Feather name={info.icon as any} size={12} color="#fff" />
                      </View>
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineStatus, { color: colors.foreground }]}>{info.label}</Text>
                      <Text style={[styles.timelineNote, { color: colors.mutedForeground }]}>{t.note}</Text>
                      <Text style={[styles.timelineDate, { color: colors.mutedForeground }]}>
                        {new Date(t.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Help note */}
      <View style={[styles.helpNote, { backgroundColor: colors.muted }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
          Your order number is in the confirmation SMS/email. Example: TN2406001234
        </Text>
      </View>

      <View style={{ height: isWeb ? 34 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    color: "#EF4444",
    fontSize: 13,
    lineHeight: 18,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 26,
    marginTop: 4,
  },
  trackBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoItem: {
    width: "46%",
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  trackingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  trackingLabel: {
    fontSize: 11,
  },
  trackingValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
  },
  timelineLeft: {
    alignItems: "center",
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
    gap: 2,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  timelineNote: {
    fontSize: 12,
  },
  timelineDate: {
    fontSize: 11,
  },
  helpNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
