import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { adminPost } from "../utils/adminApi";

export default function Logout({ navigation }) {
  const { logout } = useAuth();
  const didRunRef = useRef(false);
  const [working, setWorking] = useState(false);

  const runLogout = async () => {
    if (didRunRef.current) {
      return;
    }

    didRunRef.current = true;
    setWorking(true);

    void adminPost("logout", {}).catch(() => {});

    try {
      await logout();
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    runLogout();
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          {working ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Ionicons name="log-out-outline" size={52} color="#fff" />
          )}
        </View>

        <Text style={styles.title}>Logout Admin</Text>
        <Text style={styles.subtitle}>
          Logging out... Aapko login screen par bheja ja raha hai.
        </Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={runLogout} disabled={working}>
          <Ionicons name="log-out-outline" size={21} color="#fff" />
          <Text style={styles.logoutText}>
            {working ? "Logging out..." : "Logout Now"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation?.goBack?.()}
          disabled={working}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    elevation: 4,
  },
  iconCircle: {
    width: 105,
    height: 105,
    borderRadius: 52,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#2B124C",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  logoutBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#EF4444",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  logoutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  cancelBtn: {
    width: "100%",
    height: 50,
    backgroundColor: "#F5F0FF",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    color: "#7C3AED",
    fontSize: 15,
    fontWeight: "900",
  },
});
