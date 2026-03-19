import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function OfficerInspectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    vendorId?: string;
    zoneId?: string;
    shopName?: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>บันทึกการตรวจสอบ</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Inspection Page</Text>
        <Text style={styles.subtitle}>
          vendorId: {params.vendorId ?? "-"}
        </Text>
        <Text style={styles.subtitle}>
          zoneId: {params.zoneId ?? "-"}
        </Text>
        <Text style={styles.subtitle}>
          shopName: {params.shopName ?? "-"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  headerRight: {
    width: 42,
    height: 42,
  },
  card: {
    marginTop: 18,
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
