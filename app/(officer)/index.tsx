import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getOfficerSession, setOfficerSession } from "../../lib/officerSession";

import { supabase } from "../../lib/supabase";

type Zone = {
  id: string;
  district: string;
};

const MENU_WIDTH = 170;

export default function OfficerHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    officerId?: string;
    officerName?: string;
  }>();
  const session = getOfficerSession();
  const officerName = params.officerName || session?.officerName || "ลีออน";

  useEffect(() => {
    if (params.officerId) {
      setOfficerSession({
        officerId: String(params.officerId),
        officerName: params.officerName ?? session?.officerName,
      });
    }
  }, [params.officerId, params.officerName, session?.officerName]);

  const settingsBtnRef = useRef<any>(null);
  const [settingsMenu, setSettingsMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Animation values
  const mapScale = useRef(new Animated.Value(1)).current;
  const traffyScale = useRef(new Animated.Value(1)).current;

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ทั้งหมด");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    inspectedVendorsToday: 0,
    checkinVendorsToday: 0,
    lowScoreShops: 0,
    avgScore: 0,
  });

  // Scale Animation Helpers
  const animateIn = (val: Animated.Value) => {
    Animated.spring(val, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animateOut = (val: Animated.Value) => {
    Animated.spring(val, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    (async () => {
      setZonesLoading(true);
      const { data, error } = await supabase
        .from("zones")
        .select("id, district");
      if (!error && data) {
        setZones(
          data.map((z: any) => ({
            id: String(z.id),
            district: z.district || "ไม่ระบุเขต",
          })),
        );
      }
      setZonesLoading(false);
    })();
  }, []);

  const districtOptions = useMemo(() => {
    const districts = Array.from(new Set(zones.map((z) => z.district)));
    districts.sort((a, b) => a.localeCompare(b, "th"));
    return ["ทั้งหมด", ...districts];
  }, [zones]);

  const handleSelectDistrict = () => {
    if (districtOptions.length === 0) {
      Alert.alert("ขออภัย", "ไม่พบข้อมูลเขตในระบบ");
      return;
    }

    Alert.alert("เลือกเขต", "กรุณาเลือกเขตที่ต้องการค้นหา", [
      ...districtOptions.map((name) => ({
        text: name,
        onPress: () => {
          setSelectedDistrict(name);
        },
      })),
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const fetchSummary = useCallback(async () => {
    if (zonesLoading || zones.length === 0) return;
    setSummaryLoading(true);
    const d = new Date();
    const todayYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;

    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    const offset = `${sign}${hh}:${mm}`;
    const startTs = `${todayYmd}T00:00:00${offset}`;
    const endTs = `${todayYmd}T23:59:59.999${offset}`;

    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
      }
      return out;
    };

    const zoneIds = zones
      .filter(
        (z) =>
          selectedDistrict === "ทั้งหมด" || z.district === selectedDistrict,
      )
      .map((z) => z.id);
    try {
      if (zoneIds.length === 0) {
        setSummary({
          totalVendors: 0,
          inspectedVendorsToday: 0,
          checkinVendorsToday: 0,
          lowScoreShops: 0,
          avgScore: 0,
        });
        return;
      }

      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select("id, vendor_id, start_date, end_date")
        .in("zone_id", zoneIds)
        .eq("status", "active");
      if (contractsError) throw contractsError;

      console.log(
        "📊 DASHBOARD DEBUG - Total contracts fetched:",
        contracts?.length || 0,
      );
      console.log(
        "📊 DASHBOARD DEBUG - All contracts:",
        (contracts ?? []).map((c: any) => ({
          id: c.id,
          vendor_id: c.vendor_id,
          start_date: c.start_date,
          end_date: c.end_date,
        })),
      );

      const activeVendorIds = Array.from(
        new Set(
          (contracts ?? [])
            .filter((c: any) => {
              const start = (c.start_date as string | null) ?? null;
              const end = (c.end_date as string | null) ?? null;
              const startOk = !start || start <= todayYmd;
              const endOk = !end || end >= todayYmd;
              const isValid = startOk && endOk;
              if (!isValid) {
                console.log(
                  "❌ FILTERED OUT vendor:",
                  c.vendor_id,
                  "start:",
                  start,
                  "startOk:",
                  startOk,
                  "end:",
                  end,
                  "endOk:",
                  endOk,
                );
              }
              return isValid;
            })
            .map((c: any) => String(c.vendor_id)),
        ),
      ).filter(Boolean);

      console.log(
        "📊 DASHBOARD DEBUG - Active vendor IDs for today:",
        activeVendorIds,
      );

      // Get contract IDs for active vendors (needed for inspection lookup)
      const activeContractIds = (contracts ?? [])
        .filter((c: any) => {
          const start = (c.start_date as string | null) ?? null;
          const end = (c.end_date as string | null) ?? null;
          const startOk = !start || start <= todayYmd;
          const endOk = !end || end >= todayYmd;
          return startOk && endOk;
        })
        .map((c: any) => String(c.id))
        .filter(Boolean);

      console.log(
        "📊 DASHBOARD DEBUG - Active contract IDs for today:",
        activeContractIds,
      );

      if (activeVendorIds.length === 0) {
        setSummary({
          totalVendors: 0,
          inspectedVendorsToday: 0,
          checkinVendorsToday: 0,
          lowScoreShops: 0,
          avgScore: 0,
        });
        return;
      }

      // Calculate time window for inspection query (±12 hours from now, same as zone-map)
      const now = new Date();
      const startOfQuery = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const endOfQuery = new Date(now.getTime() + 12 * 60 * 60 * 1000);

      // Query inspections table instead of dashboard_vendor_daily_scores
      const inspectedContractIds = new Set<string>();
      if (activeContractIds.length > 0) {
        for (const contractIds of chunk(activeContractIds, 200)) {
          const { data, error } = await supabase
            .from("inspections")
            .select("contract_id")
            .in("contract_id", contractIds)
            .gte("inspection_time", startOfQuery.toISOString())
            .lte("inspection_time", endOfQuery.toISOString());
          if (error) {
            console.error("Error fetching inspections:", error);
            throw error;
          }

          for (const row of data ?? []) {
            inspectedContractIds.add(String((row as any).contract_id));
          }
        }
      }

      console.log(
        "📊 DASHBOARD DEBUG - Inspected contract IDs today:",
        Array.from(inspectedContractIds),
      );

      const checkinVendorIds = new Set<string>();
      for (const ids of chunk(activeVendorIds, 200)) {
        const { data, error } = await supabase
          .from("daily_checkins")
          .select("vendor_id")
          .in("vendor_id", ids)
          .gte("checkin_time", startTs)
          .lte("checkin_time", endTs);
        if (error) throw error;
        for (const row of data ?? []) {
          checkinVendorIds.add(String((row as any).vendor_id));
        }
      }

      console.log(
        "📊 DASHBOARD DEBUG - Checkin vendor IDs today:",
        Array.from(checkinVendorIds),
      );

      const totalByVendorId = new Map<string, number>();
      const countByVendorId = new Map<string, number>();
      const pageSize = 1000;
      for (const ids of chunk(activeVendorIds, 200)) {
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from("dashboard_vendor_daily_scores")
            .select("vendor_id, total_score, date")
            .in("vendor_id", ids)
            .order("vendor_id", { ascending: true })
            .order("date", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;

          for (const row of data ?? []) {
            const vendorId = String((row as any).vendor_id ?? "");
            const score = Number((row as any).total_score);
            if (!vendorId || !Number.isFinite(score)) continue;
            totalByVendorId.set(
              vendorId,
              (totalByVendorId.get(vendorId) ?? 0) + score,
            );
            countByVendorId.set(
              vendorId,
              (countByVendorId.get(vendorId) ?? 0) + 1,
            );
          }

          if (!data || data.length < pageSize) break;
        }
      }

      const avgScoreByVendorId = new Map<string, number>();
      for (const [vendorId, total] of totalByVendorId.entries()) {
        const count = countByVendorId.get(vendorId) ?? 0;
        if (count <= 0) continue;
        avgScoreByVendorId.set(vendorId, total / count);
      }

      const vendorAvgValues = Array.from(avgScoreByVendorId.values());
      const avgScore =
        vendorAvgValues.length > 0
          ? Math.round(
              vendorAvgValues.reduce((a, b) => a + b, 0) /
                vendorAvgValues.length,
            )
          : 0;

      const lowScoreCount = Array.from(avgScoreByVendorId.values()).filter(
        (s) => s < 60,
      ).length;

      setSummary({
        totalVendors: activeContractIds.length,
        inspectedVendorsToday: inspectedContractIds.size,
        checkinVendorsToday: checkinVendorIds.size,
        lowScoreShops: lowScoreCount,
        avgScore,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedDistrict, zones, zonesLoading]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useFocusEffect(
    useCallback(() => {
      void fetchSummary();
    }, [fetchSummary]),
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.topRow}>
          <Text style={styles.greetingText}>สวัสดี {officerName}</Text>
          <View style={styles.topIconRow}>
            <Pressable style={styles.topIconBtn}>
              <Ionicons name="notifications" size={18} color="black" />
            </Pressable>
            <Pressable
              ref={settingsBtnRef}
              style={styles.topIconBtn}
              onPress={() => {
                settingsBtnRef.current?.measureInWindow?.(
                  (x: number, y: number, width: number, height: number) => {
                    setSettingsMenu({
                      x: x - MENU_WIDTH + width,
                      y: y + height + 5,
                    });
                  },
                );
              }}
            >
              <Ionicons name="settings-sharp" size={18} color="black" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map Card — full bleed */}
        <View style={styles.fullBleedWrapper}>
          <Animated.View style={{ transform: [{ scale: mapScale }] }}>
            <Pressable
              style={({ pressed }) => [
                styles.heroCardGreen,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPressIn={() => animateIn(mapScale)}
              onPressOut={() => animateOut(mapScale)}
              onPress={() => router.push("/(officer)/zone-map")}
            >
              <View style={styles.heroIconSquare}>
                <Ionicons name="map-outline" size={20} color="black" />
              </View>
              <Text style={styles.heroTitleWhite}>
                ดูแผนที่โซนค้าขาย และ ตรวจสอบร้านค้า
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Traffy Card — full bleed, flush below map card */}
        <View style={styles.fullBleedWrapper}>
          <Animated.View style={{ transform: [{ scale: traffyScale }] }}>
            <Pressable
              style={({ pressed }) => [
                styles.heroCardBrown,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPressIn={() => animateIn(traffyScale)}
              onPressOut={() => animateOut(traffyScale)}
              onPress={() =>
                WebBrowser.openBrowserAsync("https://citydata.traffy.in.th/")
              }
            >
              <View style={[styles.heroIconSquare, { overflow: "hidden" }]}>
                <Image
                  source={require("../../assets/images/traffy-logo.png")}
                  style={styles.traffyLogo}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.heroTitleBrown}>
                รายงานปัญหา Traffy Fondue
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryWrapper}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderTitle}>ภาพรวม</Text>
              <TouchableOpacity
                style={styles.summaryDistrictPill}
                onPress={handleSelectDistrict}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryDistrictText}>
                  {selectedDistrict === "ทั้งหมด"
                    ? "เขตทั้งหมด"
                    : `เขต${selectedDistrict}`}
                </Text>
                <Ionicons name="chevron-down" size={14} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryTile
                value={
                  summaryLoading
                    ? "..."
                    : `${summary.inspectedVendorsToday}/${summary.totalVendors}`
                }
                label="ตรวจสอบแล้ว"
              />
              <SummaryTile
                value={
                  summaryLoading
                    ? "..."
                    : `${summary.checkinVendorsToday}/${summary.totalVendors}`
                }
                label="เช็คอินวันนี้"
              />
              <SummaryTile
                value={`${summary.lowScoreShops}`}
                label="ร้านค้าคะแนนต่ำ"
              />
              <SummaryTile value={`${summary.avgScore}`} label="คะแนนเฉลี่ย" />
            </View>
          </View>
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      <Modal transparent visible={Boolean(settingsMenu)} animationType="fade">
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setSettingsMenu(null)}
        >
          <View
            style={[
              styles.menuCard,
              { top: settingsMenu?.y, left: settingsMenu?.x },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => router.replace("/(auth)/officer-auth")}
            >
              <Ionicons name="log-out-outline" size={18} color="black" />
              <Text style={styles.menuItemText}>ออกจากระบบ</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SummaryTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F5F8" },
  headerSafeArea: {
    paddingTop: Platform.OS === "ios" ? 18 : 34,
    backgroundColor: "white",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
  },
  greetingText: {
    fontSize: 24,
    fontFamily: "Anuphan-Bold",
    color: "#111827",
  },
  topIconRow: { flexDirection: "row", alignItems: "center" },
  topIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  content: { flex: 1 },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 36,
  },

  // Full-bleed wrapper — no margin so cards sit flush against each other
  fullBleedWrapper: {
    width: "100%",
  },

  // Map card — full width, no border radius, dark green
  heroCardGreen: {
    width: "100%",
    backgroundColor: "#1F5A3A",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  // Traffy card — full width, no border radius, white bg
  heroCardBrown: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  heroIconSquare: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  traffyLogo: {
    width: "100%",
    height: "100%",
  },

  heroTitleWhite: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: "Anuphan-Bold",
    color: "white",
  },
  heroTitleBrown: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: "Anuphan-Bold",
    color: "#7B4F2A",
  },

  summaryWrapper: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8EDF2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  summaryHeader: {
    backgroundColor: "#1F5A3A",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryHeaderTitle: {
    fontSize: 16,
    color: "white",
    fontFamily: "Anuphan-Bold",
  },
  summaryDistrictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryDistrictText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
  },
  summaryGrid: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTile: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 18,
    minHeight: 110,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: "Anuphan-Bold",
    color: "#111827",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Anuphan-Regular",
  },
  menuBackdrop: { ...StyleSheet.absoluteFillObject },
  menuCard: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  menuItemText: { fontSize: 14, fontFamily: "Anuphan-Medium", color: "black" },
});
