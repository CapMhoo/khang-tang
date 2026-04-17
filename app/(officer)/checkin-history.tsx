import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
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

// Formats to "22 มี.ค. 69"
function formatThaiDateFromIso(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const day = d.getDate();
  const month = months[d.getMonth()] ?? "";
  const yearBE = String(d.getFullYear() + 543).slice(-2);
  return `${day} ${month} ${yearBE}`;
}

// Formats to "HH:mm น."
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
      try {
        const { data, error: fetchError } = await supabase
          .from("daily_checkins")
          .select("id, checkin_time, checkout_time, checkin_photo, checkout_photo")
          .eq("vendor_id", vendorId)
          .order("checkin_time", { ascending: false })
          .limit(30);

        if (fetchError) throw fetchError;
        if (isMounted) setRows((data as any) ?? []);
      } catch (err: any) {
        if (isMounted) setError(err?.message ?? "โหลดประวัติไม่สำเร็จ");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [vendorId]);

  const latestThumb = useMemo(() => rows[0]?.checkin_photo ?? null, [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, CheckinRow[]>();
    for (const row of rows) {
      const key = dateKey(row.checkin_time);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [rows]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* Scaled Down Header */}
      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>ประวัติการเช็คอิน</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="small" color="#64748B" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          
          {/* Compact Vendor Card with Thumbnail */}
          <View style={styles.vendorCard}>
            <View style={styles.thumbContainer}>
              {latestThumb ? (
                <Image source={{ uri: latestThumb }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="image-outline" size={20} color="#94A3B8" />
                </View>
              )}
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName} numberOfLines={1}>{shopName}</Text>
              <View style={styles.vendorLocRow}>
                <Ionicons name="location" size={12} color="#64748B" />
                <Text style={styles.vendorLocText} numberOfLines={1}>{zoneName}</Text>
              </View>
            </View>
          </View>

          {/* History Sections */}
          {grouped.map(([key, items]) => (
            <View key={key} style={styles.dayBlock}>
              <Text style={styles.dayTitle}>{formatThaiDateFromIso(key)}</Text>
              {items.map((row) => (
                <View key={row.id} style={styles.dayCard}>
                  {/* Check-in */}
                  <Pressable 
                    style={styles.photoBox} 
                    onPress={() => setPhotoViewer({ uri: row.checkin_photo, label: `เช็คอิน: ${formatTimeHHmm(row.checkin_time)}` })}
                  >
                    <Image source={{ uri: row.checkin_photo }} style={styles.photo} contentFit="cover" />
                    <View style={styles.photoLabel}><Text style={styles.photoLabelText}>เช็คอิน: {formatTimeHHmm(row.checkin_time)}</Text></View>
                  </Pressable>
                  
                  {/* Check-out */}
                  <Pressable 
                    style={styles.photoBox} 
                    disabled={!row.checkout_photo}
                    onPress={() => setPhotoViewer({ uri: row.checkout_photo!, label: `เช็คเอาท์: ${formatTimeHHmm(row.checkout_time)}` })}
                  >
                    {row.checkout_photo ? (
                      <>
                        <Image source={{ uri: row.checkout_photo }} style={styles.photo} contentFit="cover" />
                        <View style={styles.photoLabel}><Text style={styles.photoLabelText}>เช็คเอาท์: {formatTimeHHmm(row.checkout_time)}</Text></View>
                      </>
                    ) : (
                      <View style={[styles.photo, styles.photoEmpty]}>
                        <Text style={styles.photoEmptyText}>ไม่มีรูป</Text>
                        <View style={styles.photoLabel}><Text style={styles.photoLabelText}>เช็คเอาท์: —</Text></View>
                      </View>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Full Screen Photo Viewer */}
      {photoViewer && (
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setPhotoViewer(null)} />
          <View style={styles.viewerCard}>
            <Pressable onPress={() => setPhotoViewer(null)} style={styles.viewerClose}><Ionicons name="close" size={20} color="#111827" /></Pressable>
            <Image source={{ uri: photoViewer.uri }} style={styles.viewerImage} contentFit="contain" />
            <View style={styles.viewerInfo}><Text style={styles.viewerInfoText}>{photoViewer.label}</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header scaled to 16
  headerBlock: {
    backgroundColor: "white",
    paddingTop: 45,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 44 },
  backButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#000000", marginLeft: 4, fontFamily: "Anuphan-Bold", opacity: 1,},

  content: { paddingHorizontal: 12, paddingTop: 12 },

  // Compact Vendor Card
  vendorCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  thumbContainer: { width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vendorInfo: { flex: 1, marginLeft: 12 },
  vendorName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  vendorLocRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  vendorLocText: { fontSize: 12, color: "#64748B", fontWeight: "500" },

  // History Grid
  dayBlock: { marginBottom: 16 },
  dayTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginBottom: 8 },
  dayCard: { 
    backgroundColor: "white", 
    borderRadius: 12, 
    padding: 8, 
    flexDirection: "row", 
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  photoBox: { flex: 1, borderRadius: 8, overflow: "hidden", backgroundColor: "#F1F5F9" },
  photo: { width: "100%", height: 105 },
  photoEmpty: { alignItems: "center", justifyContent: "center", height: 105 },
  photoEmptyText: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  photoLabel: {
    position: "absolute",
    left: 4, right: 4, bottom: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 4,
    borderRadius: 4,
  },
  photoLabelText: { color: "white", fontSize: 10, fontWeight: "700", textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Viewer
  viewerRoot: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: "center", alignItems: "center" },
  viewerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)" },
  viewerCard: { width: "90%", height: "65%", backgroundColor: "black", borderRadius: 20, overflow: "hidden" },
  viewerClose: { position: "absolute", top: 12, right: 12, zIndex: 10, backgroundColor: "white", borderRadius: 20, padding: 6 },
  viewerImage: { width: "100%", height: "100%" },
  viewerInfo: { position: "absolute", bottom: 15, left: 15, right: 15, backgroundColor: "rgba(0,0,0,0.7)", padding: 12, borderRadius: 10 },
  viewerInfoText: { color: "white", fontSize: 14, fontWeight: "700", textAlign: "center" },
});