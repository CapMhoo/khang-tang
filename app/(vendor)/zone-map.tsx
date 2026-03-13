import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ZoneMapScreen({ navigation }: { navigation: any }) {
  const [locationPermission, setLocationPermission] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setLocationPermission(true);
    })();
  }, []);

  // ข้อมูลสมมติสำหรับโซนค้าขาย
  const zones = [
    {
      id: 1,
      name: "สีลม ซอย 5",
      district: "บางรัก",
      shops: "12/15",
      color: "#F79432",
      lat: 13.723,
      lng: 100.529,
    },
    {
      id: 2,
      name: "สุขุมวิท ซอย 38",
      district: "คลองเตย",
      shops: "20/20",
      color: "#FF3B30",
      lat: 13.72,
      lng: 100.579,
    },
  ];

  return (
    <View style={styles.container}>
      {/* 1. Map View (Background) */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: 13.723,
          longitude: 100.529,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {zones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={{ latitude: zone.lat, longitude: zone.lng }}
              radius={400}
              fillColor={`${zone.color}33`} // 33 คือ opacity ประมาณ 20%
              strokeColor={zone.color}
              strokeWidth={2}
            />
            <Marker coordinate={{ latitude: zone.lat, longitude: zone.lng }}>
              <View
                style={[styles.customMarker, { backgroundColor: zone.color }]}
              >
                <View style={styles.markerInner} />
              </View>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      {/* 2. Top Header & Search Section */}
      <SafeAreaView style={styles.overlayTop}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>แผนที่โซนค้าขาย</Text>
            <Text style={styles.headerSubtitle}>กรุงเทพมหานคร</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาเขต หรือชื่อโซน..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#F79432" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Ionicons name="location" size={18} color="white" />
            <Text style={styles.activeTabText}> แผนที่</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Ionicons name="list" size={18} color="#888" />
            <Text style={styles.tabText}> รายการ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 3. Bottom Sheet (โซนใกล้เคียง) */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>โซนใกล้เคียง</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {zones.map((zone) => (
            <TouchableOpacity key={zone.id} style={styles.zoneCard}>
              <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneDistrict}>{zone.district}</Text>
              </View>
              <Text style={styles.zoneStats}>{zone.shops} ร้าน</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  backButton: { padding: 5 },
  headerTitleContainer: { marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  headerSubtitle: { fontSize: 12, color: "#888" },

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
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  activeTab: { backgroundColor: "#F79432" },
  activeTabText: { color: "white", fontWeight: "bold" },
  tabText: { color: "#888" },

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
});
