import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminPost } from "../utils/adminApi";

export default function ChangePassword() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = async () => {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }

    if (form.newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      Alert.alert("Error", "New password and confirm password not matched");
      return;
    }

    try {
      await adminPost("changePassword", form);
      Alert.alert("Success", "Password changed successfully");
      setForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Password change nahi ho paya"
      );
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Update your admin account password</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed-outline" size={42} color="#fff" />
        </View>

        <Text style={styles.label}>Old Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showOld}
            placeholder="Enter old password"
            placeholderTextColor="#999"
            value={form.oldPassword}
            onChangeText={(text) => setForm({ ...form, oldPassword: text })}
          />
          <TouchableOpacity onPress={() => setShowOld(!showOld)}>
            <Ionicons
              name={showOld ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#7C3AED"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showNew}
            placeholder="Enter new password"
            placeholderTextColor="#999"
            value={form.newPassword}
            onChangeText={(text) => setForm({ ...form, newPassword: text })}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons
              name={showNew ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#7C3AED"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordBox}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirm}
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            value={form.confirmPassword}
            onChangeText={(text) =>
              setForm({ ...form, confirmPassword: text })
            }
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons
              name={showConfirm ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#7C3AED"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Update Password</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2B124C",
  },
  subtitle: {
    color: "#777",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 4,
  },
  lockCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    color: "#374151",
    marginBottom: 8,
  },
  passwordBox: {
    height: 52,
    backgroundColor: "#F5F0FF",
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
  },
  button: {
    height: 52,
    backgroundColor: "#7C3AED",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
});
