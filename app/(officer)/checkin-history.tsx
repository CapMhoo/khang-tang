import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Params = {
  vendorId?: string;
  shopName?: string;
  zoneName?: string;
};

type CheckinRow = {
  id: string;
  checkin_time: string;
  checkout_time: string | null;
  checkin_photo: string;
  checkout_photo: string | null;
};

function formatThaiDateFromIso(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()] ?? "";
  const yearBE = d.getFullYear() + 543;
  return `${day} ${month} ${String(yearBE).slice(-2)}`;
}

function formatTimeHHmm(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} น.`;
}

function dateKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OfficerCheckinHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const vendorId = params.vendorId ? String(params.vendorId) : "";
  const shopName = params.shopName ? String(params.shopName) : "ร้านค้า";
  const zoneName = params.zoneName ? String(params.zoneName) : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [photoViewer, setPhotoViewer] = useState<{
    uri: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!vendorId) {
        setError("Missing vendorId");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("daily_checkins")
          .select("id, checkin_time, checkout_time, checkin_photo, checkout_photo")
          .eq("vendor_id", vendorId)
          .order("checkin_time", { ascending: false })
          .limit(30);

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setRows((data as any) ?? []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message ?? "โหลดประวัติการเช็คอินไม่สำเร็จ");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [vendorId]);

  const latestThumb = useMemo(() => {
    return rows[0]?.checkin_photo ?? "";
  }, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, CheckinRow[]>();
    for (const row of rows) {
      const key = dateKey(row.checkin_time);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>ประวัติการเช็คอิน</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F79432" />
          <Text style={styles.centerText}>กำลังโหลด...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>เกิดข้อผิดพลาด</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.vendorCard}>
            <View style={styles.vendorThumb}>
              {latestThumb ? (
                <Image source={{ uri: latestThumb }} style={styles.thumbImage} contentFit="cover" />
              ) : (
                <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                  <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorTitle} numberOfLines={1}>
                {shopName}
              </Text>
              {zoneName ? (
                <View style={styles.vendorSubRow}>
                  <Ionicons name="location-outline" size={16} color="#111827" />
                  <Text style={styles.vendorSubText} numberOfLines={2}>
                    {zoneName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {grouped.map(([key, items]) => (
            <View key={key} style={styles.dayBlock}>
              <Text style={styles.dayTitle}>{formatThaiDateFromIso(key)}</Text>
              {items.map((row) => (
                <View key={row.id} style={styles.dayCard}>
                  <Pressable
                    style={styles.photoCard}
                    onPress={() => setPhotoViewer({ uri: row.checkin_photo, label: `เช็คอิน: ${formatTimeHHmm(row.checkin_time)}` })}
                  >
                    <Image source={{ uri: row.checkin_photo }} style={styles.photo} contentFit="cover" />
                    <View style={styles.photoLabelOverlay}>
                      <Text style={styles.photoLabelText}>
                        เช็คอิน: {formatTimeHHmm(row.checkin_time)}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.photoCard}
                    disabled={!row.checkout_photo}
                    onPress={() =>
                      row.checkout_photo
                        ? setPhotoViewer({ uri: row.checkout_photo, label: `เช็คเอาท์: ${formatTimeHHmm(row.checkout_time)}` })
                        : null
                    }
                  >
                    {row.checkout_photo ? (
                      <Image source={{ uri: row.checkout_photo }} style={styles.photo} contentFit="cover" />
                    ) : (
                      <View style={[styles.photo, styles.photoPlaceholder]}>
                        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                        <Text style={styles.photoPlaceholderText}>ไม่มีรูป</Text>
                      </View>
                    )}
                    <View style={styles.photoLabelOverlay}>
                      <Text style={styles.photoLabelText}>
                        เช็คเอาท์: {formatTimeHHmm(row.checkout_time)}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {photoViewer ? (
        <View style={styles.photoViewerRoot}>
          <Pressable
            style={styles.photoViewerBackdrop}
            onPress={() => setPhotoViewer(null)}
          />
          <View style={styles.photoViewerCard}>
            <Pressable
              onPress={() => setPhotoViewer(null)}
              style={styles.photoViewerClose}
              hitSlop={10}
            >
              <Ionicons name="close" size={18} color="#111827" />
            </Pressable>
            <Image
              source={{ uri: photoViewer.uri }}
              style={styles.photoViewerImage}
              contentFit="contain"
            />
            <View style={styles.photoViewerLabel}>
              <Text style={styles.photoViewerLabelText}>{photoViewer.label}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: "white",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#111827" },
  headerRight: { width: 36, height: 36 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  centerText: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#374151" },
  errorTitle: { fontSize: 16, fontWeight: "900", color: "#991B1B", marginBottom: 6 },
  errorText: { fontSize: 13, color: "#7F1D1D", textAlign: "center" },

  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20 },
  vendorCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 14,
  },
  vendorThumb: { width: 72, height: 72, borderRadius: 18, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  vendorTitle: { fontSize: 26, fontWeight: "900", color: "#111827" },
  vendorSubRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  vendorSubText: { fontSize: 16, fontWeight: "800", color: "#111827", opacity: 0.9, flex: 1 },

  dayBlock: { marginTop: 6, marginBottom: 14 },
  dayTitle: { fontSize: 24, fontWeight: "900", color: "#111827", marginBottom: 10 },
  dayCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  photoCard: { flex: 1, borderRadius: 16, overflow: "hidden" },
  photo: { width: "100%", height: 150 },
  photoPlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", gap: 6 },
  photoPlaceholderText: { fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  photoLabelOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  photoLabelText: { color: "white", fontSize: 16, fontWeight: "900", textAlign: "center" },

  photoViewerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  photoViewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  photoViewerCard: {
    width: "90%",
    height: 520,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  photoViewerClose: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoViewerImage: { width: "100%", height: "100%", backgroundColor: "#111827" },
  photoViewerLabel: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  photoViewerLabelText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
});
