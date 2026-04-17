import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

// const API_URL = process.env.EXPO_PUBLIC_API_URL;
// for committing to main
const API_URL = "http://172.20.10.7:8000";

const formatTime = (date) => {
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "สวัสดีครับ\nผมช่วยตอบคำถามเกี่ยวกับการลงทะเบียนพื้นที่ค้าขาย",
  timestamp: formatTime(new Date()),
  suggestions: ["ขั้นตอนการลงทะเบียน", "พื้นที่ค้าขายที่ยังว่าง", "เอกสารที่ต้องใช้"],
};

async function queryRAG(question) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: question, role: null }),
  });
  if (!res.ok) throw new Error("RAG API error");
  const data = await res.json();
  return {
    answer: data.answer,
    suggestions: [],
  };
}

function BotAvatar() {
  return (
    <View style={styles.avatarOuter}>
      <View style={styles.avatarInner} />
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.botRow}>
      <BotAvatar />
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>...</Text>
      </View>
    </View>
  );
}

function SuggestionChip({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ChatBubble({ message, onSuggestionClick }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
    );
  }

  const lines = message.content.split("\n");

  return (
    <View style={styles.botRow}>
      <BotAvatar />
      <View style={{ maxWidth: "80%" }}>
        <View style={styles.botBubble}>
          {lines.map((line, i) => {
            const numbered = line.match(/^(\d+)\.\s+(.+)/);
            if (numbered) {
              return (
                <View key={i} style={styles.numberedRow}>
                  <Text style={styles.numberedIndex}>{numbered[1]}.</Text>
                  <Text style={styles.botText}>{numbered[2]}</Text>
                </View>
              );
            }
            return line ? (
              <Text key={i} style={[styles.botText, i > 0 && { marginTop: 4 }]}>{line}</Text>
            ) : (
              <View key={i} style={{ height: 4 }} />
            );
          })}
        </View>

        {message.suggestions && message.suggestions.length > 0 && (
          <View style={styles.chipsRow}>
            {message.suggestions.map((s) => (
              <SuggestionChip key={s} label={s} onPress={() => onSuggestionClick(s)} />
            ))}
          </View>
        )}

        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
    </View>
  );
}

export default function VendorChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const router = useRouter();
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      role: "user",
      content: trimmed,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { answer, suggestions } = await queryRAG(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer,
          timestamp: formatTime(new Date()),
          suggestions,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
          timestamp: formatTime(new Date()),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
     {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarInner} />
        </View>
        <View>
          <Text style={styles.headerName}>ผู้ช่วย กทม.</Text>
          <Text style={styles.headerStatus}>ออนไลน์</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.datePill}>
          <Text style={styles.datePillText}>วันนี้</Text>
        </View>

        {messages.length === 1 && (
          <Text style={styles.suggestionLabel}>
            คุณอาจจะต้องการศึกษาเพิ่มเติมเกี่ยวกับ:
          </Text>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} onSuggestionClick={sendMessage} />
        ))}

        {loading && <TypingIndicator />}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="พิมพ์คำถามของคุณ..."
          placeholderTextColor="#9ca3af"
          editable={!loading}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const GREEN = "#1a6b3c";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 12,
    paddingTop: Platform.OS === "ios" ? 55 : 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f5ee",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: GREEN },
  headerName: { fontWeight: "600", fontSize: 14, color: "#111827" },
  headerStatus: { fontSize: 11, color: GREEN },
  messageList: { flex: 1 },
  datePill: {
    alignSelf: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  datePillText: { fontSize: 11, color: "#6b7280" },
  suggestionLabel: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 40,
  },
  userRow: { alignItems: "flex-end", marginBottom: 16 },
  userBubble: {
    backgroundColor: GREEN,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 10,
    maxWidth: "75%",
  },
  userText: { color: "white", fontSize: 14, lineHeight: 22 },
  botRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 16 },
  botBubble: {
    backgroundColor: "white",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  botText: { fontSize: 14, color: "#1f2937", lineHeight: 22 },
  numberedRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  numberedIndex: { fontWeight: "600", color: GREEN, minWidth: 20 },
  typingBubble: {
    backgroundColor: "white",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  typingText: { fontSize: 20, color: "#9ca3af", letterSpacing: 4 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, paddingHorizontal: 4 },
  chip: { borderWidth: 1, borderColor: GREEN, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, color: GREEN, fontWeight: "500" },
  timestamp: { fontSize: 11, color: "#9ca3af", marginTop: 4, paddingHorizontal: 4 },
  inputRow: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: "white", fontSize: 16 },
  backBtn: {
  paddingRight: 8,
  justifyContent: "center",
  },
  backArrow: {
    fontSize: 36,
    color: "#333",
    lineHeight: 40,
},
});