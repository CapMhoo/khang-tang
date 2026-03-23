import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { supabase } from "../../lib/supabase";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type ZoneVendor = {
  id: string;
  name: string;
  checkInTime?: string;
  checkOutTime?: string;
  inspected?: boolean;
};

type Zone = {
  id: string;
  name: string;
  district: string;
  timeRange: string;
  currentShops: number;
  totalShops: number;
  color: string;
  lat?: number;
  lng?: number;
};

type StoreSheetParams = {
  vendorId: string;
  zoneId: string;
  zoneName: string;
  shopName: string;
};

type StoreContract = {
  id: string;
  shop_name: string | null;
  product_type: string | null;
  vendors: { first_name: string | null; last_name: string | null } | null;
} | null;

type StoreCheckin = {
  checkin_time: string;
  checkout_time: string | null;
  checkin_photo: string;
  checkout_photo: string | null;
} | null;

export default function ZoneMapScreen() {
  const router = useRouter();
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  const [vendorsByZoneId, setVendorsByZoneId] = useState<
    Record<string, ZoneVendor[]>
  >({});
  const [zoneDetailsLoadingById, setZoneDetailsLoadingById] = useState<
    Record<string, boolean>
  >({});
  const [zoneDetailsErrorById, setZoneDetailsErrorById] = useState<
    Record<string, string | null>
  >({});

  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [selectedDistrictIndex, setSelectedDistrictIndex] = useState(0);
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // Keep the map dominant; sheets should feel compact.
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.38;
  const SHEET_PEEK = 72;
  const SHEET_COLLAPSED_Y = SHEET_HEIGHT - SHEET_PEEK;
  const sheetTranslateY = useSharedValue(0);
  const sheetStartY = useSharedValue(0);

  const STORE_SHEET_HEIGHT = SCREEN_HEIGHT * 0.62;
  const STORE_SHEET_PEEK = 84;
  const STORE_SHEET_COLLAPSED_Y = STORE_SHEET_HEIGHT - STORE_SHEET_PEEK;
  const storeSheetTranslateY = useSharedValue(STORE_SHEET_COLLAPSED_Y);
  const storeSheetStartY = useSharedValue(STORE_SHEET_COLLAPSED_Y);

  const [storeSheet, setStoreSheet] = useState<StoreSheetParams | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeContract, setStoreContract] = useState<StoreContract>(null);
  const [storeCheckin, setStoreCheckin] = useState<StoreCheckin>(null);
  const [storeAvgScore, setStoreAvgScore] = useState<number | null>(null);
  const [photoViewer, setPhotoViewer] = useState<{
    uri: string;
    label: string;
  } | null>(null);

  const springConfig = {
    damping: 28,
    stiffness: 260,
    mass: 0.8,
    overshootClamping: true,
    restDisplacementThreshold: 0.5,
    restSpeedThreshold: 0.5,
  } as const;

  const getTodayYmdLocal = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setHasLocationPermission(true);
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setZonesLoading(true);
      setZonesError(null);

      const { data, error } = await supabase
        .from("zones")
        .select(
          "id, district_name, district, lat, lon, max_vendor, time_start, time_end",
        );

      if (!isMounted) return;

      if (error) {
        setZonesError(error.message);
        setZones([]);
        setZonesLoading(false);
        return;
      }

      const zoneIds = (data ?? []).map((z: any) => String(z.id));
      const contractsCountByZoneId = new Map<string, number>();
      if (zoneIds.length > 0) {
        const todayYmd = getTodayYmdLocal();
        const pageSize = 1000;
        const allContracts: any[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data: contracts, error: contractsError } = await supabase
            .from("contracts")
            .select("zone_id, start_date, end_date")
            .eq("status", "active")
            .in("zone_id", zoneIds)
            .range(from, from + pageSize - 1);
          if (contractsError) {
            console.error("Fetch contracts count error:", contractsError);
            break;
          }
          allContracts.push(...(contracts ?? []));
          if (!contracts || contracts.length < pageSize) break;
        }

        if (!isMounted) return;

        for (const row of allContracts) {
          const start = ((row as any).start_date as string | null) ?? null;
          const end = ((row as any).end_date as string | null) ?? null;
          const startOk = !start || start <= todayYmd;
          const endOk = !end || end >= todayYmd;
          if (!startOk || !endOk) continue;
          const zid = String((row as any).zone_id ?? "");
          if (!zid) continue;
          contractsCountByZoneId.set(
            zid,
            (contractsCountByZoneId.get(zid) ?? 0) + 1,
          );
        }
      }

      const formatted: Zone[] = (data || []).map((z: any) => {
        const total = Number(z.max_vendor ?? 0) || 0;
        const contractCount = contractsCountByZoneId.get(String(z.id)) ?? 0;
        const current = contractCount;

        const color =
          total > 0 && current >= total
            ? "#FF3B30"
            : total > 0 && current > total * 0.7
              ? "#F79432"
              : "#34C759";

        // const timeRange = `${z.time_start ?? "—"}-${z.time_end ?? "—"} น.`;
        const district = (z.district_name as string | null) ?? "ไม่ระบุเขต";

        const start = z.time_start ? z.time_start.substring(0, 5) : "—";
        const end = z.time_end ? z.time_end.substring(0, 5) : "—";
        const timeRange = `${start}-${end} น.`;

        return {
          id: String(z.id),
          name: z.district_name || "ไม่ระบุชื่อโซน", // Specific zone name (e.g., Ari Soi 1)
          district: z.district || "ไม่ระบุเขต", // Larger scope (e.g., Phaya Thai)
          timeRange, // Now it will be "08:00-00:00 น."
          currentShops: current,
          totalShops: total,
          color,
          lat: typeof z.lat === "number" ? z.lat : undefined,
          lng: typeof z.lon === "number" ? z.lon : undefined,
        };
      });

      setZones(formatted);
      setZonesLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const districtOptions = useMemo(
    () => ["ทั้งหมด", ...Array.from(new Set(zones.map((z) => z.district)))],
    [zones],
  );
  const selectedDistrict =
    districtOptions[selectedDistrictIndex] ?? districtOptions[0];

  const filteredZones = useMemo(() => {
    return zones.filter(
      (z) => selectedDistrict === "ทั้งหมด" || z.district === selectedDistrict,
    );
  }, [zones, selectedDistrict]);

  const mapZonesWithCoords = filteredZones.filter(
    (z) => typeof z.lat === "number" && typeof z.lng === "number",
  );
  const firstZoneWithCoords = mapZonesWithCoords[0];
  const initialCenter = firstZoneWithCoords
    ? {
        latitude: firstZoneWithCoords.lat as number,
        longitude: firstZoneWithCoords.lng as number,
      }
    : { latitude: 13.7563, longitude: 100.5018 };

  const selectedZone = selectedZoneId
    ? (zones.find((z) => z.id === selectedZoneId) ?? null)
    : null;
  const selectedZoneVendors = selectedZone
    ? (vendorsByZoneId[selectedZone.id] ?? [])
    : [];
  const selectedZoneDetailsLoading = selectedZone
    ? zoneDetailsLoadingById[selectedZone.id] === true
    : false;
  const selectedZoneDetailsError = selectedZone
    ? (zoneDetailsErrorById[selectedZone.id] ?? null)
    : null;

  const cycleDistrict = () => {
    setSelectedDistrictIndex((i) => (i + 1) % districtOptions.length);
  };

  const formatTimeHHmm = (value: string | null | undefined) => {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const formatTimeHHmmWithSuffix = (value: string | null | undefined) => {
    const hhmm = formatTimeHHmm(value);
    return hhmm ? `${hhmm} น.` : "—";
  };

  const formatThaiDate = (value: string | null | undefined) => {
    if (!value) return "";
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
    return `วันนี้ ${day} ${month} ${String(yearBE).slice(-2)}`;
  };

  const openStoreSheet = async (params: StoreSheetParams) => {
    setStoreSheet(params);
    setStoreLoading(true);
    setStoreError(null);
    setStoreContract(null);
    setStoreCheckin(null);
    setStoreAvgScore(null);
    storeSheetTranslateY.value = withSpring(0, springConfig);

    try {
      const todayYmd = getTodayYmdLocal();
      const [
        { data: contractData, error: contractError },
        { data: checkinData, error: checkinError },
        { data: scoreRows, error: scoreError },
      ] = await Promise.all([
        supabase
          .from("contracts")
          .select(
            "id, shop_name, product_type, start_date, end_date, vendors(first_name, last_name)",
          )
          .eq("vendor_id", params.vendorId)
          .eq("zone_id", params.zoneId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("daily_checkins")
          .select("checkin_time, checkout_time, checkin_photo, checkout_photo")
          .eq("vendor_id", params.vendorId)
          .order("checkin_time", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("dashboard_vendor_daily_scores")
          .select("total_score")
          .eq("vendor_id", params.vendorId),
      ]);

      if (contractError) throw contractError;
      const start = (contractData as any)?.start_date as
        | string
        | null
        | undefined;
      const end = (contractData as any)?.end_date as string | null | undefined;
      const startOk = !start || start <= todayYmd;
      const endOk = !end || end >= todayYmd;
      setStoreContract(startOk && endOk ? (contractData as any) : null);

      if (checkinError) throw checkinError;
      setStoreCheckin(checkinData as any);

      if (scoreError) {
        console.warn("Fetch store avg score error:", scoreError);
      } else {
        const values = (scoreRows ?? [])
          .map((r: any) => Number(r.total_score))
          .filter((n: number) => Number.isFinite(n));
        if (values.length) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          setStoreAvgScore(Math.round(avg));
        }
      }
    } catch (err: any) {
      setStoreError(err?.message ?? "โหลดข้อมูลร้านค้าไม่สำเร็จ");
    } finally {
      setStoreLoading(false);
    }
  };

  const closeStoreSheet = () => {
    storeSheetTranslateY.value = withSpring(
      STORE_SHEET_COLLAPSED_Y,
      springConfig,
    );
    setTimeout(() => {
      setStoreSheet(null);
      setStoreContract(null);
      setStoreCheckin(null);
      setStoreAvgScore(null);
      setStoreError(null);
      setStoreLoading(false);
    }, 200);
  };

  const openPhotoViewer = (uri: string, label: string) => {
    if (!uri) return;
    setPhotoViewer({ uri, label });
  };

  const ensureZoneDetails = async (zoneId: string) => {
    if (zoneDetailsLoadingById[zoneId]) return;

    setZoneDetailsLoadingById((prev) => ({ ...prev, [zoneId]: true }));
    setZoneDetailsErrorById((prev) => ({ ...prev, [zoneId]: null }));

    try {
      const todayYmd = getTodayYmdLocal();
      const offsetMinutes = -new Date().getTimezoneOffset();
      const sign = offsetMinutes >= 0 ? "+" : "-";
      const abs = Math.abs(offsetMinutes);
      const hh = String(Math.floor(abs / 60)).padStart(2, "0");
      const mm = String(abs % 60).padStart(2, "0");
      const offset = `${sign}${hh}:${mm}`;
      const startTs = `${todayYmd}T00:00:00${offset}`;
      const endTs = `${todayYmd}T23:59:59.999${offset}`;

      const { data: activeContracts, error: activeContractsError } =
        await supabase
          .from("contracts")
          .select(
            "id, vendor_id, shop_name, status, start_date, end_date, vendors(first_name, last_name)",
          )
          .eq("zone_id", zoneId)
          .eq("status", "active");

      if (activeContractsError) throw activeContractsError;

      const activeContractsToday = (activeContracts ?? []).filter((c: any) => {
        const start = (c.start_date as string | null) ?? null;
        const end = (c.end_date as string | null) ?? null;
        const startOk = !start || start <= todayYmd;
        const endOk = !end || end >= todayYmd;
        return startOk && endOk;
      });

      const vendorIds = Array.from(
        new Set(activeContractsToday.map((c: any) => String(c.vendor_id))),
      ).filter(Boolean);

      const { data: checkins, error: checkinsError } = vendorIds.length
        ? await supabase
            .from("daily_checkins")
            .select("vendor_id, checkin_time, checkout_time")
            .in("vendor_id", vendorIds)
            .gte("checkin_time", startTs)
            .lte("checkin_time", endTs)
            .order("checkin_time", { ascending: false })
        : { data: [], error: null };

      if (checkinsError) throw checkinsError;

      const latestCheckinByVendorId = new Map<
        string,
        { checkin_time: string; checkout_time?: string | null }
      >();
      for (const ci of checkins ?? []) {
        const vid = String((ci as any).vendor_id);
        if (!latestCheckinByVendorId.has(vid)) {
          latestCheckinByVendorId.set(vid, {
            checkin_time: (ci as any).checkin_time,
            checkout_time: (ci as any).checkout_time,
          });
        }
      }

      const contractIds = activeContractsToday
        .map((c: any) => String(c.id))
        .filter(Boolean);

      const inspectedContractIds = new Set<string>();
      if (contractIds.length) {
        for (let i = 0; i < contractIds.length; i += 200) {
          const ids = contractIds.slice(i, i + 200);
          const { data, error } = await supabase
            .from("inspections")
            .select("contract_id, created_at")
            .in("contract_id", ids)
            .gte("created_at", startTs)
            .lte("created_at", endTs)
            .range(0, 9999);
          if (error) throw error;
          for (const row of data ?? []) {
            const cid = String((row as any).contract_id ?? "");
            if (cid) inspectedContractIds.add(cid);
          }
        }
      }

      const vendors: ZoneVendor[] = activeContractsToday.map((c: any) => {
        const vendorId = String(c.vendor_id);
        const first = c.vendors?.first_name ?? "";
        const last = c.vendors?.last_name ?? "";
        const vendorName = `${first} ${last}`.trim();

        const latest = latestCheckinByVendorId.get(vendorId);
        const checkInTime = formatTimeHHmm(latest?.checkin_time);
        const checkOutTime = formatTimeHHmm(latest?.checkout_time ?? undefined);

        return {
          id: vendorId,
          name:
            (c.shop_name as string | null | undefined) ||
            vendorName ||
            vendorId,
          checkInTime,
          checkOutTime,
          inspected: inspectedContractIds.has(String(c.id)),
        };
      });

      setVendorsByZoneId((prev) => ({ ...prev, [zoneId]: vendors }));
    } catch (err: any) {
      const message =
        err?.message ?? "เกิดข้อผิดพลาดในการโหลดข้อมูลร้านค้าในโซนนี้";
      setZoneDetailsErrorById((prev) => ({ ...prev, [zoneId]: message }));
      setVendorsByZoneId((prev) => ({ ...prev, [zoneId]: [] }));
    } finally {
      setZoneDetailsLoadingById((prev) => ({ ...prev, [zoneId]: false }));
    }
  };

  const toggleExpanded = (zoneId: string) => {
    setExpandedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const snapSheetTo = (to: number) => {
    sheetTranslateY.value = withSpring(to, springConfig);
  };

  const bottomSheetPan = Gesture.Pan()
    .onBegin(() => {
      sheetStartY.value = sheetTranslateY.value;
    })
    .onUpdate((e) => {
      const next = sheetStartY.value + e.translationY;
      sheetTranslateY.value = Math.max(0, Math.min(SHEET_COLLAPSED_Y, next));
    })
    .onEnd((e) => {
      const isSwipingDown = e.velocityY > 600;
      const isSwipingUp = e.velocityY < -600;

      if (isSwipingDown) {
        sheetTranslateY.value = withSpring(SHEET_COLLAPSED_Y, springConfig);
        return;
      }

      if (isSwipingUp) {
        sheetTranslateY.value = withSpring(0, springConfig);
        return;
      }

      const shouldCollapse = sheetTranslateY.value > SHEET_COLLAPSED_Y / 2;
      sheetTranslateY.value = withSpring(
        shouldCollapse ? SHEET_COLLAPSED_Y : 0,
        springConfig,
      );
    });

  const bottomSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const storeSheetPan = Gesture.Pan()
    .onBegin(() => {
      storeSheetStartY.value = storeSheetTranslateY.value;
    })
    .onUpdate((e) => {
      const next = storeSheetStartY.value + e.translationY;
      storeSheetTranslateY.value = Math.max(
        0,
        Math.min(STORE_SHEET_COLLAPSED_Y, next),
      );
    })
    .onEnd((e) => {
      const isSwipingDown = e.velocityY > 700;
      const isSwipingUp = e.velocityY < -700;

      if (isSwipingDown) {
        storeSheetTranslateY.value = withSpring(
          STORE_SHEET_COLLAPSED_Y,
          springConfig,
        );
        return;
      }

      if (isSwipingUp) {
        storeSheetTranslateY.value = withSpring(0, springConfig);
        return;
      }

      const shouldCollapse =
        storeSheetTranslateY.value > STORE_SHEET_COLLAPSED_Y / 2;
      storeSheetTranslateY.value = withSpring(
        shouldCollapse ? STORE_SHEET_COLLAPSED_Y : 0,
        springConfig,
      );
    });

  const storeSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: storeSheetTranslateY.value }],
  }));

  const Header = (
    <SafeAreaView
      style={activeTab === "map" ? styles.overlayTop : styles.headerBlock}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </Pressable>

        <Text style={styles.headerTitle}>แผนที่โซนค้าขาย</Text>

        <Pressable onPress={cycleDistrict} style={styles.districtPill}>
          <Text style={styles.districtText}>
            {/* If "ทั้งหมด" show that, otherwise show "เขต" + the larger district name */}
            {selectedDistrict === "ทั้งหมด"
              ? "เขตทั้งหมด"
              : `เขต${selectedDistrict}`}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.tabPill}>
        <Pressable
          onPress={() => setActiveTab("map")}
          style={[styles.tabBtn, activeTab === "map" && styles.tabBtnActive]}
        >
          <Ionicons
            name="map-outline"
            size={20}
            color={activeTab === "map" ? "#111827" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "map" && styles.tabTextActive,
            ]}
          >
            แผนที่
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("list")}
          style={[styles.tabBtn, activeTab === "list" && styles.tabBtnActive]}
        >
          <Ionicons
            name="list"
            size={20}
            color={activeTab === "list" ? "#111827" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.tabTextActive,
            ]}
          >
            รายการ
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  if (zonesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F79432" />
        <Text style={styles.centerText}>กำลังโหลดข้อมูลโซน...</Text>
      </View>
    );
  }

  if (zonesError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>โหลดข้อมูลไม่สำเร็จ</Text>
        <Text style={styles.errorText}>{zonesError}</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>ย้อนกลับ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeTab === "map" ? (
        <>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            showsUserLocation={hasLocationPermission}
            initialRegion={{
              latitude: initialCenter.latitude,
              longitude: initialCenter.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {mapZonesWithCoords.map((zone) => (
              <React.Fragment key={zone.id}>
                <Circle
                  center={{
                    latitude: zone.lat as number,
                    longitude: zone.lng as number,
                  }}
                  radius={450}
                  fillColor={`${zone.color}33`}
                  strokeColor={zone.color}
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{
                    latitude: zone.lat as number,
                    longitude: zone.lng as number,
                  }}
                  onPress={() => {
                    setSelectedZoneId(zone.id);
                    void ensureZoneDetails(zone.id);
                    snapSheetTo(0);
                  }}
                >
                  <View
                    style={[
                      styles.customMarker,
                      { backgroundColor: zone.color },
                    ]}
                  >
                    <View style={styles.markerInner} />
                  </View>
                </Marker>
              </React.Fragment>
            ))}
          </MapView>

          {Header}

          <Animated.View style={[styles.bottomSheet, bottomSheetStyle]}>
            <GestureDetector gesture={bottomSheetPan}>
              <Pressable
                onPress={() =>
                  snapSheetTo(sheetTranslateY.value > 0 ? 0 : SHEET_COLLAPSED_Y)
                }
                style={styles.sheetHandleHit}
              >
                <View style={styles.sheetHandle} />
              </Pressable>
            </GestureDetector>

            {selectedZone ? (
              <>
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.zoneBigTitle} numberOfLines={1}>
                    {selectedZone.name}
                  </Text>

                  <Pressable
                    onPress={() => setSelectedZoneId(null)}
                    style={styles.sheetClose}
                    hitSlop={10}
                  >
                    <Ionicons name="close-circle" size={26} color="#E2E8F0" />
                  </Pressable>
                </View>

                {/* Meta Row (Time and Count) */}
                <View style={styles.zoneMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={18} color="#374151" />
                    <Text style={styles.metaText}>
                      {selectedZone.timeRange}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={18} color="#374151" />
                    <Text style={styles.metaText}>
                      {selectedZoneVendors.filter((v) => !!v.checkInTime)
                        .length || selectedZone.currentShops}
                      /{selectedZone.totalShops} ร้านค้า
                    </Text>
                  </View>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedZoneDetailsLoading ? (
                    <View style={styles.inlineLoadingRow}>
                      <ActivityIndicator size="small" color="#F79432" />
                      <Text style={styles.inlineLoadingText}>
                        กำลังโหลดรายการร้านค้า...
                      </Text>
                    </View>
                  ) : null}

                  {selectedZoneDetailsError ? (
                    <View style={styles.inlineErrorBox}>
                      <Text style={styles.inlineErrorText}>
                        {selectedZoneDetailsError}
                      </Text>
                    </View>
                  ) : null}

                  {!selectedZoneDetailsLoading &&
                  !selectedZoneDetailsError &&
                  selectedZoneVendors.length === 0 ? (
                    <View style={styles.inlineEmptyBox}>
                      <Text style={styles.inlineEmptyText}>
                        ไม่พบร้านค้าในโซนนี้
                      </Text>
                    </View>
                  ) : null}

                  {selectedZoneVendors.map((v) => (
                    <Pressable
                      key={v.id}
                      style={styles.vendorCard}
                      onPress={() =>
                        void openStoreSheet({
                          vendorId: v.id,
                          zoneId: selectedZone.id,
                          zoneName: selectedZone.name,
                          shopName: v.name,
                        })
                      }
                    >
                      <View style={styles.vendorCardLeft}>
                        <Text style={styles.vendorTitle}>{v.name}</Text>
                        <Text style={styles.vendorSub}>
                          เช็คอิน {v.checkInTime ?? "—"}
                          {v.checkOutTime
                            ? ` · เช็คเอาท์ ${v.checkOutTime}`
                            : ""}
                        </Text>
                      </View>

                      {v.inspected ? (
                        <View style={styles.statusChecked}>
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#10B981"
                          />
                          <Text style={styles.statusCheckedText}>ตรวจแล้ว</Text>
                        </View>
                      ) : (
                        <Text style={styles.statusPendingText}>ยังไม่ตรวจ</Text>
                      )}
                    </Pressable>
                  ))}

                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>โซน</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {filteredZones.map((zone) => (
                    <Pressable
                      key={zone.id}
                      style={styles.zoneRow}
                      onPress={() => {
                        setSelectedZoneId(zone.id);
                        void ensureZoneDetails(zone.id);
                        snapSheetTo(0);
                      }}
                    >
                      {/* The Dot Indicator (Green/Orange/Red) */}
                      <View
                        style={[
                          styles.zoneDot,
                          { backgroundColor: zone.color },
                        ]}
                      />

                      <View style={styles.zoneRowInfo}>
                        {/* EDIT: Use zone.name (Specific Soi/Market name) */}
                        <Text style={styles.zoneRowName}>{zone.name}</Text>

                        {/* EDIT: Use zone.timeRange (Formatted HH:mm) */}
                        <Text style={styles.zoneRowSub}>{zone.timeRange}</Text>
                      </View>

                      {/* The Occupancy Count (e.g., 4/12) */}
                      <Text style={styles.zoneRowCount}>
                        {zone.currentShops}/{zone.totalShops}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#D1D5DB"
                      />
                    </Pressable>
                  ))}
                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}
          </Animated.View>
        </>
      ) : (
        <View style={styles.listRoot}>
          {Header}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {filteredZones.map((zone) => {
              const isExpanded = expandedZoneIds.has(zone.id);
              return (
                <View key={zone.id} style={styles.zoneListCard}>
                  <Pressable
                    onPress={() => {
                      const willExpand = !expandedZoneIds.has(zone.id);
                      toggleExpanded(zone.id);
                      if (willExpand) void ensureZoneDetails(zone.id);
                    }}
                    style={styles.zoneListHeader}
                  >
                    <Text style={styles.zoneListTitle}>{zone.name}</Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={22}
                      color="#111827"
                    />
                  </Pressable>

                  <View style={styles.zoneMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={18} color="#374151" />
                      <Text style={styles.metaText}>{zone.timeRange}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#374151"
                      />
                      <Text style={styles.metaText}>
                        {zone.currentShops}/{zone.totalShops} ร้านค้า
                      </Text>
                    </View>
                  </View>

                  {isExpanded ? (
                    <View style={styles.vendorList}>
                      {zoneDetailsLoadingById[zone.id] ? (
                        <View style={styles.inlineLoadingRow}>
                          <ActivityIndicator size="small" color="#F79432" />
                          <Text style={styles.inlineLoadingText}>
                            กำลังโหลดรายการร้านค้า...
                          </Text>
                        </View>
                      ) : null}

                      {zoneDetailsErrorById[zone.id] ? (
                        <View style={styles.inlineErrorBox}>
                          <Text style={styles.inlineErrorText}>
                            {zoneDetailsErrorById[zone.id]}
                          </Text>
                        </View>
                      ) : null}

                      {!zoneDetailsLoadingById[zone.id] &&
                      !zoneDetailsErrorById[zone.id] &&
                      (vendorsByZoneId[zone.id]?.length ?? 0) === 0 ? (
                        <View style={styles.inlineEmptyBox}>
                          <Text style={styles.inlineEmptyText}>
                            ไม่พบร้านค้าในโซนนี้
                          </Text>
                        </View>
                      ) : null}

                      {(vendorsByZoneId[zone.id] ?? []).map((v) => (
                        <Pressable
                          key={v.id}
                          style={styles.vendorCard}
                          onPress={() =>
                            void openStoreSheet({
                              vendorId: v.id,
                              zoneId: zone.id,
                              zoneName: zone.name,
                              shopName: v.name,
                            })
                          }
                        >
                          <View style={styles.vendorCardLeft}>
                            <Text style={styles.vendorTitle}>{v.name}</Text>
                            <Text style={styles.vendorSub}>
                              เช็คอิน {v.checkInTime ?? "—"}
                              {v.checkOutTime
                                ? ` · เช็คเอาท์ ${v.checkOutTime}`
                                : ""}
                            </Text>
                          </View>

                          {v.inspected ? (
                            <View style={styles.statusChecked}>
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color="#10B981"
                              />
                              <Text style={styles.statusCheckedText}>
                                ตรวจแล้ว
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.statusPendingText}>
                              ยังไม่ตรวจ
                            </Text>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}

      {storeSheet ? (
        <>
          <Pressable
            style={styles.storeSheetBackdrop}
            onPress={closeStoreSheet}
          />
          <Animated.View style={[styles.storeSheet, storeSheetStyle]}>
            <GestureDetector gesture={storeSheetPan}>
              <Pressable
                onPress={() =>
                  storeSheetTranslateY.value > 0
                    ? (storeSheetTranslateY.value = withSpring(0, springConfig))
                    : (storeSheetTranslateY.value = withSpring(
                        STORE_SHEET_COLLAPSED_Y,
                        springConfig,
                      ))
                }
                style={styles.sheetHandleHit}
              >
                <View style={styles.sheetHandle} />
              </Pressable>
            </GestureDetector>

            <View style={styles.storeSheetBody}>
              <View style={styles.storeSheetTopRow}>
                <Pressable
                  onPress={closeStoreSheet}
                  style={styles.sheetClose}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={20} color="#111827" />
                </Pressable>
              </View>

              <Text style={styles.storeShopTitle} numberOfLines={1}>
                {storeContract?.shop_name?.trim() || storeSheet.shopName}
              </Text>

              <View style={styles.storeSubRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeZoneLine} numberOfLines={2}>
                    {storeSheet.zoneName}
                  </Text>
                  <Text style={styles.storeIdentityLine}>
                    {(() => {
                      const first =
                        storeContract?.vendors?.first_name?.trim() ?? "";
                      const last =
                        storeContract?.vendors?.last_name?.trim() ?? "";
                      const vendorName = `${first} ${last}`.trim();
                      const productType =
                        storeContract?.product_type?.trim() ?? "";
                      if (vendorName && productType)
                        return `${vendorName} • ${productType}`;
                      if (vendorName) return vendorName;
                      if (productType) return productType;
                      return "—";
                    })()}
                  </Text>
                </View>
                <Text style={styles.storeScoreText}>
                  {storeLoading ? "..." : storeAvgScore ?? "—"}
                </Text>
              </View>

              <View style={styles.storeSectionHeaderRow}>
                <Text style={styles.storeSectionTitle}>หลักฐานการเช็คอิน</Text>
                <Pressable
                  style={styles.storeHistoryLink}
                  hitSlop={10}
                  onPress={() =>
                    router.push({
                      pathname: "/(officer)/checkin-history",
                      params: {
                        vendorId: storeSheet.vendorId,
                        shopName:
                          storeContract?.shop_name?.trim() ||
                          storeSheet.shopName,
                        zoneName: storeSheet.zoneName,
                      },
                    })
                  }
                >
                  <Text style={styles.storeHistoryText}>ประวัติการเช็คอิน</Text>
                  <Ionicons name="chevron-forward" size={18} color="#111827" />
                </Pressable>
              </View>

              <Text style={styles.storeDateText}>
                {formatThaiDate(storeCheckin?.checkin_time)}
              </Text>

              {storeLoading ? (
                <View style={styles.inlineLoadingRow}>
                  <ActivityIndicator size="small" color="#F79432" />
                  <Text style={styles.inlineLoadingText}>กำลังโหลด...</Text>
                </View>
              ) : storeError ? (
                <View style={styles.inlineErrorBox}>
                  <Text style={styles.inlineErrorText}>{storeError}</Text>
                </View>
              ) : (
                <View style={styles.storePhotoRow}>
                  <EvidencePhoto
                    uri={storeCheckin?.checkin_photo ?? ""}
                    label={`เช็คอิน: ${formatTimeHHmmWithSuffix(
                      storeCheckin?.checkin_time,
                    )}`}
                    onPress={(uri, label) => openPhotoViewer(uri, label)}
                  />
                  <EvidencePhoto
                    uri={storeCheckin?.checkout_photo ?? ""}
                    label={`เช็คเอาท์: ${formatTimeHHmmWithSuffix(
                      storeCheckin?.checkout_time,
                    )}`}
                    onPress={(uri, label) => openPhotoViewer(uri, label)}
                  />
                </View>
              )}

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(officer)/inspect",
                    params: {
                      contractId: storeContract?.id,
                      vendorId: storeSheet.vendorId,
                      zoneId: storeSheet.zoneId,
                      shopName:
                        storeContract?.shop_name?.trim() || storeSheet.shopName,
                    },
                  })
                }
                style={styles.storeInspectButton}
                disabled={storeLoading || !storeContract?.id}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color="white"
                />
                <Text style={styles.storeInspectButtonText}>
                  ตรวจสอบร้านค้า
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </>
      ) : null}

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
              <Text style={styles.photoViewerLabelText}>
                {photoViewer.label}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EvidencePhoto({
  uri,
  label,
  onPress,
}: {
  uri: string;
  label: string;
  onPress?: (uri: string, label: string) => void;
}) {
  const hasUri = Boolean(uri);
  return (
    <Pressable
      style={styles.storePhotoCard}
      onPress={hasUri ? () => onPress?.(uri, label) : undefined}
    >
      {hasUri ? (
        <Image source={{ uri }} style={styles.storePhoto} contentFit="cover" />
      ) : (
        <View style={[styles.storePhoto, styles.storePhotoPlaceholder]}>
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          <Text style={styles.storePhotoPlaceholderText}>ไม่มีรูป</Text>
        </View>
      )}
      <View style={styles.storePhotoLabelOverlay}>
        <Text style={styles.storePhotoLabelText}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  map: { width: "100%", height: "100%" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  centerText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#991B1B",
    marginBottom: 6,
  },
  errorText: { fontSize: 13, color: "#7F1D1D", textAlign: "center" },
  errorBtn: {
    marginTop: 14,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorBtnText: { color: "white", fontWeight: "800" },

  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    paddingTop: Platform.OS === "android" ? 45 : 25,
  },
  headerBlock: {
    backgroundColor: "white",
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 2,
    paddingTop: Platform.OS === "android" ? 45 : 25,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    flex: 1,
    fontFamily: "Anuphan-Bold",
  },
  districtPill: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 32,
  },
  districtText: { fontSize: 13, fontWeight: "800", color: "#111827" },

  tabPill: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 6,
    marginHorizontal: 16,
    backgroundColor: "#E9EEF5",
    borderRadius: 16,
    padding: 3,
    gap: 5,
  },
  tabBtn: {
    flex: 1,
    height: 32,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  tabBtnActive: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabText: { fontSize: 13, fontWeight: "900", color: "#6B7280" },
  tabTextActive: { color: "#111827" },

  customMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: "white",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 4,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHandleHit: {
    paddingTop: 2,
    paddingBottom: 6,
  },
  sheetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },

  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  zoneDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  zoneRowInfo: { flex: 1 },
  zoneRowName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  zoneRowSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  zoneRowCount: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    marginRight: 10,
  },

  zoneBigTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
  },
  zoneMetaRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 13, fontWeight: "800", color: "#374151" },

  inlineLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  inlineLoadingText: { fontSize: 13, fontWeight: "800", color: "#374151" },
  inlineErrorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  inlineErrorText: { fontSize: 13, fontWeight: "800", color: "#991B1B" },
  inlineEmptyBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inlineEmptyText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },

  vendorCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vendorCardLeft: { flex: 1, paddingRight: 12 },
  vendorTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  vendorSub: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    opacity: 0.9,
  },
  statusChecked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4, // Spaces the checkmark away from the text
  },
  statusCheckedText: {
    fontSize: 15,
    fontFamily: "Anuphan-Bold", // Ensure this matches your bold font
    color: "#10B981", // The emerald green from the pic
    fontWeight: "700",
  },
  statusPendingText: {
    fontSize: 15,
    fontFamily: "Anuphan-Bold",
    color: "#94A3B8", // The muted grey from the pic
    fontWeight: "700",
  },

  listRoot: { flex: 1, backgroundColor: "#F3F4F6" },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  zoneListCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    overflow: "hidden",
  },
  zoneListHeader: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneListTitle: {
    flex: 1,
    paddingRight: 12,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  vendorList: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },

  storeSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17,24,39,0.35)",
  },
  storeSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // FIX: Scaled height for iOS vs Android to fix "too long" look
    // 0.51 on iPhone 15/16 Pro looks much more balanced than 0.6+
    height: Platform.OS === "ios" ? SCREEN_HEIGHT * 0.58 : SCREEN_HEIGHT * 0.51,
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    // Android Shadow
    elevation: 40,
    // iOS Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },

  storeSheetBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storeSheetTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  storeShopTitle: {
    fontSize: 28,
    fontFamily: "Anuphan-Bold",
    color: "#111827",
    fontWeight: "900",
    marginBottom: 4,
  },
  storeSubRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  storeZoneLine: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 3,
  },
  storeIdentityLine: { fontSize: 15, fontWeight: "600", color: "#64748B" },
  storeScoreText: {
    fontSize: 44,
    fontWeight: "900",
    color: "#10B981",
    marginLeft: 12,
    lineHeight: 44,
  },
  storeSectionHeaderRow: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeSectionTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  storeHistoryLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  storeHistoryText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  storeDateText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  storePhotoRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  storePhotoCard: { flex: 1, borderRadius: 18, overflow: "hidden" },
  storePhoto: { width: "100%", height: 136, borderRadius: 18 },
  storePhotoPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  storePhotoPlaceholderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  storePhotoLabelOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  storePhotoLabelText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  storeInspectButton: {
    marginTop: 20,
    backgroundColor: "#64748B", // Slate-500 color
    borderRadius: 16,
    paddingVertical: 16, // Thicker button
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  storeInspectButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Anuphan-Bold",
  },

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
    height: SCREEN_HEIGHT * 0.72,
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
  photoViewerImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111827",
  },
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
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center", // Level alignment
    justifyContent: "space-between",
    paddingHorizontal: 4, // Aligns with the handle
    marginTop: -8, // Pulls the title up closer to the grey handle
    marginBottom: 4,
  },
});
