import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

type OfficerHomeParams = {
  officerName?: string;
};

export default function OfficerHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<OfficerHomeParams>();
  const officerName = params.officerName || "เจ้าหน้าที่";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topRow}>
          <Text style={styles.greetingText}>สวัสดี {officerName}</Text>
          <Pressable style={styles.bellButton} hitSlop={10}>
            <Ionicons name="notifications-outline" size={24} color="#111827" />
          </Pressable>
        </View>

        <Pressable style={styles.profileCard}>
          <Text style={styles.profileText}>โปรไฟล์ ?</Text>
        </Pressable>

        <View style={styles.portalList}>
          <PortalButton
            title="ดูแผนที่โซนค้าขาย"
            onPress={() => router.push("/(officer)/zone-map")}
          />
          <PortalButton
            title="บันทึกการตรวจสอบ"
            onPress={() => router.push("/(officer)/inspect")}
          />
          <PortalButton
            title="รายงานปัญหา Traffy Fondue"
            onPress={() => router.push("/(officer)/report")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PortalButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.portalButton}>
      <View style={styles.portalIconCircle}>
        <Ionicons name="location-sharp" size={22} color="#111827" />
      </View>
      <Text style={styles.portalTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    backgroundColor: "white",
    borderRadius: 18,
    paddingVertical: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    marginTop: 18,
    marginBottom: 18,
  },
  profileText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  portalList: {
    gap: 14,
  },
  portalButton: {
    backgroundColor: "#64748B",
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  portalIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  portalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
  },
});

// import * as Location from "expo-location"; // Import Location
// import React, { useEffect, useState } from "react";
// import { Alert, StyleSheet, View } from "react-native";
// import MapView, { PROVIDER_GOOGLE, Polygon } from "react-native-maps";

// export default function App() {
//   const [locationPermission, setLocationPermission] = useState(false);

//   useEffect(() => {
//     (async () => {
//       // 1. Request Permission
//       let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") {
//         Alert.alert(
//           "Permission denied",
//           "We need your location to show it on the map"
//         );
//         return;
//       }
//       setLocationPermission(true);
//     })();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <MapView
//         provider={PROVIDER_GOOGLE}
//         style={styles.map}
//         // 2. These two lines show the Blue Dot and the "Center Me" button
//         showsUserLocation={true}
//         showsMyLocationButton={true}
//         initialRegion={{
//           latitude: 13.7563,
//           longitude: 100.5018,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         <Polygon
//           coordinates={[
//             { latitude: 13.7563, longitude: 100.5018 },
//             { latitude: 13.7573, longitude: 100.5018 },
//             { latitude: 13.7573, longitude: 100.5028 },
//             { latitude: 13.7563, longitude: 100.5028 },
//           ]}
//           fillColor="rgba(0, 255, 0, 0.3)"
//           strokeColor="rgba(0, 255, 0, 1)"
//         />
//       </MapView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   map: {
//     width: "100%",
//     height: "100%",
//   },
// });
