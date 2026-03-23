import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SuccessStepProps {
  onHome: () => void;
}

export default function SuccessStep({ onHome }: SuccessStepProps) {
  return (
    <View style={styles.container}>
      {/* การ์ดสีขาวตรงกลาง */}
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-sharp" size={60} color="white" />
        </View>

        <Text style={styles.title}>ส่งคำขอสำเร็จ</Text>

        <TouchableOpacity
          style={styles.textButton}
          onPress={onHome}
          activeOpacity={0.6}
        >
          <Text style={styles.textButtonText}>กลับหน้าหลัก</Text>
          <Ionicons name="chevron-forward" size={18} color="#718096" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9EDF2", // สีพื้นหลังฟ้าอมเทาตามรูป
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    // เงาของการ์ด
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#00C38B", // สีเขียวมินต์ตามรูป
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "Anuphan-Bold",
    color: "#000000",
    marginBottom: 24,
  },
  textButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  textButtonText: {
    fontSize: 18,
    fontFamily: "Anuphan-Regular",
    color: "#718096", // สีเทาตามรูป
  },
});
