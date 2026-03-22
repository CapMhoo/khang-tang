import { Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import this
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ShopInfoStep({ data, onUpdate }: any) {
  const updateAssistants = (delta: number) => {
    const current = data.assistantsCount || 0;
    const next = Math.max(0, current + delta);
    onUpdate({ assistantsCount: next });
  };

  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);
  // Temporary state for iOS so the change doesn't flicker while scrolling the wheel
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const openPicker = (type: "start" | "end") => {
    const currentTime = type === "start" ? data.startTime : data.endTime;
    setTempDate(getTimeAsDate(currentTime));
    setShowPicker(type);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(null);
      if (selectedDate) {
        saveTime(selectedDate);
      }
    } else {
      // On iOS, we just update the temp date while they scroll
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const saveTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const newTime = `${hours}:${minutes}:00`;

    const prospectiveStart = showPicker === "start" ? newTime : data.startTime;
    const prospectiveEnd = showPicker === "end" ? newTime : data.endTime;

    if (validateTimes(prospectiveStart, prospectiveEnd)) {
      if (showPicker === "start") {
        onUpdate({ startTime: newTime });
      } else {
        onUpdate({ endTime: newTime });
      }
    }
  };

  const getTimeAsDate = (timeStr: string) => {
    const d = new Date();
    if (timeStr) {
      const [hours, minutes] = timeStr.split(":");
      d.setHours(parseInt(hours), parseInt(minutes), 0);
    }
    return d;
  };

  const validateTimeRange = (start: string, end: string) => {
    if (!start || !end) return true;

    // Convert "HH:mm:ss" to total minutes for comparison
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startMinutes = sH * 60 + sM;
    const endMinutes = eH * 60 + eM;

    // If start and end are the same, it's invalid
    if (startMinutes === endMinutes) return false;

    return true;
  };

  const validateTimes = (start: string, end: string) => {
    if (!start || !end) return true;

    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);

    const startMins = sH * 60 + sM;
    let endMins = eH * 60 + eM;

    // Handle midnight wrap-around (e.g., 19:00 to 01:00)
    if (endMins <= startMins) {
      endMins += 24 * 60; // Add 24 hours to the end time
    }

    const durationHours = (endMins - startMins) / 60;

    if (startMins === endMins) {
      Alert.alert(
        "เวลาไม่ถูกต้อง",
        "เวลาเริ่มและเวลาสิ้นสุดห้ามเป็นเวลาเดียวกัน",
      );
      return false;
    }

    // Warning if duration is unusually long (e.g., > 18 hours)
    if (durationHours > 18) {
      Alert.alert(
        "ตรวจสอบเวลา",
        "ระยะเวลาขายของท่านนานกว่า 18 ชั่วโมง กรุณาตรวจสอบความถูกต้อง",
      );
      return false;
    }

    return true;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* ชื่อร้าน */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ชื่อร้าน</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อร้าน"
            placeholderTextColor="#A0AEC0"
            value={data.shopName}
            onChangeText={(text) => onUpdate({ shopName: text })}
          />
        </View>

        {/* ชนิดและประเภทของสินค้า */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ชนิดและประเภทของสินค้า</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น อาหาร"
            placeholderTextColor="#A0AEC0"
            value={data.productType}
            onChangeText={(text) => onUpdate({ productType: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>เวลา</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[
                styles.timeBox,
                data.startTime === data.endTime &&
                  data.startTime !== "" && { borderColor: "red" },
              ]}
              onPress={() => openPicker("start")}
            >
              <Text style={styles.timeText}>
                {data.startTime ? data.startTime.substring(0, 5) : "19:00"}
              </Text>
              <Ionicons name="time-outline" size={18} color="#4A5568" />
            </TouchableOpacity>

            <Text style={styles.toText}>ถึง</Text>

            <TouchableOpacity
              style={styles.timeBox}
              onPress={() => openPicker("end")}
            >
              <Text style={styles.timeText}>
                {data.endTime ? data.endTime.substring(0, 5) : "01:00"}
              </Text>
              <Ionicons name="time-outline" size={18} color="#4A5568" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Android Picker */}
        {Platform.OS === "android" && showPicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            is24Hour={true}
            onChange={handleTimeChange}
          />
        )}

        {/* iOS Picker in a Modal to solve the "same color as background" issue */}
        <Modal
          visible={Platform.OS === "ios" && showPicker !== null}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(null)}>
                  <Text style={styles.cancelText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    saveTime(tempDate);
                    setShowPicker(null);
                  }}
                >
                  <Text style={styles.doneText}>ตกลง</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
                textColor="black" // Explicitly set text color
              />
            </View>
          </View>
        </Modal>

        {/* จำนวนผู้ช่วย */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>จำนวนผู้ช่วย</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => updateAssistants(-1)}
            >
              <Feather name="minus" size={20} color="#1A202C" />
            </TouchableOpacity>

            <View style={styles.countValueBox}>
              <Text style={styles.countText}>{data.assistantsCount || 0}</Text>
            </View>

            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => updateAssistants(1)}
            >
              <Feather name="plus" size={20} color="#1A202C" />
            </TouchableOpacity>

            <Text style={styles.unitText}>คน</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white", // Bright white to contrast with your app background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  doneText: {
    color: "#28A745",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelText: {
    color: "#666",
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA", // พื้นหลังเทาอ่อนมากตามรูปแบบ
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: "#1A202C",
    marginBottom: 8,
    fontFamily: "Anuphan-Bold", // ใช้ Anuphan สำหรับหัวข้อ Input
    fontWeight: "700",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#EDF2F7", // สีขอบจางๆ
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    fontFamily: "Anuphan",
    color: "#1A202C",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
  },
  timeBox: {
    flex: 1,
    maxWidth: 140,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  timeText: {
    fontSize: 16,
    color: "#1A202C",
    fontFamily: "Anuphan",
  },
  toText: {
    fontSize: 16,
    color: "#1A202C",
    fontFamily: "Anuphan",
    marginHorizontal: 4,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    // เงาบางๆ สำหรับปุ่มกด
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  countValueBox: {
    width: 50,
    alignItems: "center",
  },
  countText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A202C",
    fontFamily: "Anuphan-SemiBold",
  },
  unitText: {
    fontSize: 16,
    color: "#1A202C",
    marginLeft: 12,
    fontFamily: "Anuphan",
  },
});
