import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type ZoneVendor = {
  id: string;
  name: string;
  checkedBy: string;
  checkInTime: string;
  score: number;
};

type Zone = {
  id: number;
  name: string;
  district: string;
  timeRange: string;
  currentShops: number;
  totalShops: number;
  color: string;
  lat: number;
  lng: number;
  vendors: ZoneVendor[];
};

export default function ZoneMapScreen() {
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [selectedDistrictIndex, setSelectedDistrictIndex] = useState(0);
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<number>>(
    () => new Set(),
  );
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setHasLocationPermission(true);
    })();
  }, []);

  // ข้อมูลสมมติสำหรับโซนค้าขาย
  const zones: Zone[] = [
    {
      id: 1,
      name: "ซอยพหลโยธิน 7 ถึงปากซอยอารีย์ 2",
      district: "บางรัก",
      timeRange: "19:00-01:00 น.",
      currentShops: 4,
      totalShops: 12,
      color: "#F79432",
      lat: 13.723,
      lng: 100.529,
      vendors: [
        {
          id: "v1",
          name: "ไก่ทอดวิชัย",
          checkedBy: "วิชัย",
          checkInTime: "09:04",
          score: 85,
        },
        {
          id: "v2",
          name: "ไก่ทอดวิชัย",
          checkedBy: "วิชัย",
          checkInTime: "09:04",
          score: 85,
        },
        {
          id: "v3",
          name: "ไก่ทอดวิชัย",
          checkedBy: "วิชัย",
          checkInTime: "09:04",
          score: 85,
        },
        {
          id: "v4",
          name: "ไก่ทอดวิชัย",
          checkedBy: "วิชัย",
          checkInTime: "09:04",
          score: 85,
        },
      ],
    },
    {
      id: 2,
      name: "สุขุมวิท ซอย 38",
      district: "คลองเตย",
      timeRange: "10:00-18:00 น.",
      currentShops: 20,
      totalShops: 20,
      color: "#FF3B30",
      lat: 13.72,
      lng: 100.579,
      vendors: [
        {
          id: "v5",
          name: "ก๋วยเตี๋ยวเรือ",
          checkedBy: "สมชาย",
          checkInTime: "10:12",
          score: 92,
        },
      ],
    },
  ];

  const districtOptions = [
    "ทั้งหมด",
    ...Array.from(new Set(zones.map((z) => z.district))),
  ];
  const selectedDistrict =
    districtOptions[selectedDistrictIndex] ?? districtOptions[0];

  const filteredZones = zones
    .filter(
      (z) => selectedDistrict === "ทั้งหมด" || z.district === selectedDistrict,
    )
    .filter((z) => {
      const q = searchQuery.trim();
      if (!q) return true;
      return (
        z.name.includes(q) ||
        z.district.includes(q) ||
        z.vendors.some((v) => v.name.includes(q))
      );
    });

  const toggleExpanded = (zoneId: number) => {
    setExpandedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  const cycleDistrict = () => {
    setSelectedDistrictIndex((i) => (i + 1) % districtOptions.length);
  };

  const Header = (
    <SafeAreaView
      style={activeTab === "map" ? styles.overlayTop : styles.listHeader}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>แผนที่โซนค้าขาย</Text>

        <Pressable onPress={cycleDistrict} style={styles.districtPill}>
          <Text style={styles.districtText}>
            เขต{selectedDistrict === "ทั้งหมด" ? "ทั้งหมด" : selectedDistrict}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#333" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาเขต / โซน / ร้านค้า..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#F79432" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab("map")}
          style={[styles.tab, activeTab === "map" && styles.activeTab]}
        >
          <Ionicons
            name="map-outline"
            size={18}
            color={activeTab === "map" ? "#111827" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "map" && styles.activeTabText,
            ]}
          >
            {" "}
            แผนที่
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("list")}
          style={[styles.tab, activeTab === "list" && styles.activeTab]}
        >
          <Ionicons
            name="list"
            size={18}
            color={activeTab === "list" ? "#111827" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.activeTabText,
            ]}
          >
            {" "}
            รายการ
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {activeTab === "map" ? (
        <>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            showsUserLocation={hasLocationPermission}
            initialRegion={{
              latitude: 13.723,
              longitude: 100.529,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {filteredZones.map((zone) => (
              <React.Fragment key={zone.id}>
                <Circle
                  center={{ latitude: zone.lat, longitude: zone.lng }}
                  radius={400}
                  fillColor={`${zone.color}33`}
                  strokeColor={zone.color}
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: zone.lat, longitude: zone.lng }}
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

          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>โซนใกล้เคียง</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredZones.map((zone) => (
                <TouchableOpacity key={zone.id} style={styles.zoneCard}>
                  <View
                    style={[styles.zoneDot, { backgroundColor: zone.color }]}
                  />
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneDistrict}>{zone.district}</Text>
                  </View>
                  <Text style={styles.zoneStats}>
                    {zone.currentShops}/{zone.totalShops} ร้าน
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#CCC" />
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
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
                    onPress={() => toggleExpanded(zone.id)}
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

                  {isExpanded && (
                    <View style={styles.vendorList}>
                      {zone.vendors.map((v) => (
                        <View key={v.id} style={styles.vendorRow}>
                          <View style={styles.vendorText}>
                            <Text style={styles.vendorName}>{v.name}</Text>
                            <Text style={styles.vendorSub}>
                              {v.checkedBy} · เช็คอิน {v.checkInTime}
                            </Text>
                          </View>
                          <Text style={styles.vendorScore}>{v.score}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  map: { width: "100%", height: "100%" },

  // Header Styles
  overlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  listRoot: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  listHeader: {
    backgroundColor: "white",
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  districtPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
  },
  districtText: { fontSize: 16, fontWeight: "700", color: "#111827" },

  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 15,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
    alignItems: "center",
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  filterButton: {
    width: 45,
    height: 45,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F79432",
  },

  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 15,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    height: 40,
    backgroundColor: "#EEF2F7",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabText: { color: "#6B7280", fontWeight: "800" },
  activeTabText: { color: "#111827" },

  // Marker Styles
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

  // Bottom Sheet Styles
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 10,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#EEE",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 15,
  },
  sheetTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  zoneCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  zoneDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: "bold" },
  zoneDistrict: { fontSize: 12, color: "#888" },
  zoneStats: { fontSize: 12, color: "#666", marginRight: 10 },

  // List Tab
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  zoneListCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    overflow: "hidden",
  },
  zoneListHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  zoneListTitle: {
    flex: 1,
    paddingRight: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  zoneMetaRow: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  vendorList: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  vendorText: { flex: 1, paddingRight: 12 },
  vendorName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 2,
  },
  vendorSub: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    opacity: 0.9,
  },
  vendorScore: {
    fontSize: 28,
    fontWeight: "900",
    color: "#10B981",
    minWidth: 48,
    textAlign: "right",
  },
});
