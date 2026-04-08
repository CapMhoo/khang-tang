import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // Ensure this path is correct

interface SuccessStepProps {
  onHome: () => void;
}

export default function SuccessStep({ onHome }: SuccessStepProps) {
  const { vendorId } = useLocalSearchParams(); // Get vendorId from URL params
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContractData();
  }, []);

  const fetchContractData = async () => {
    try {
      const { data: contract, error } = await supabase
        .from("contracts")
        .select(
          `
          firstname, 
          lastname, 
          shop_name,
          zones (district_name, district)
        `,
        )
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setData(contract);
    } catch (error) {
      console.error("Error fetching success data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <ActivityIndicator size="large" color="#00C38B" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-sharp" size={60} color="white" />
        </View>

        <Text style={styles.title}>ส่งคำขอสำเร็จ</Text>

        {/* Real Data Section */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>ชื่อเจ้าของร้าน</Text>
            <Text style={styles.value}>
              {data?.firstname} {data?.lastname}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>เขตที่ทำการค้า</Text>
            <Text style={styles.value}>{data?.zones?.district}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>พื้นที่ทำการค้า</Text>
            <Text style={[styles.value, styles.addressText]}>
              {data?.zones?.district_name}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={onHome}>
          <Text style={styles.mainButtonText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    shadowRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    elevation: 5,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00C38B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  infoContainer: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 20,
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#718096",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
    flex: 1.5,
  },
  addressText: {
    fontSize: 13,
  },
  mainButton: {
    backgroundColor: "#0C4B33", // BMA Dark Green
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  mainButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
