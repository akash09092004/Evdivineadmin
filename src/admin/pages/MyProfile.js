import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminGet, adminPut } from "../utils/adminApi";

export default function MyProfile() {
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@evdivine.com",
    phone: "+91 9876543210",
    role: "Super Admin",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await adminGet("profile");

        if (!mounted) return;

        const source = data?.data || data?.profile || data || {};

        setProfile({
          name: source.name || source.fullName || "Admin User",
          email: source.email || "admin@evdivine.com",
          phone: source.phone || source.mobile || "+91 9876543210",
          role: source.role || source.designation || "Super Admin",
        });
      } catch (err) {
        if (!mounted) return;

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Profile load nahi ho paya."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (key, value) => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Error", "Full name enter karo");
      return;
    }

    if (!profile.email.trim()) {
      Alert.alert("Error", "Email enter karo");
      return;
    }

    try {
      setSaving(true);

      await adminPut("profile", {
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
      });

      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Profile update nahi ho paya"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color="#7C3AED" />

            <Text style={styles.statusText}>Profile loading...</Text>
          </View>
        )}

        {!loading && error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />

            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={30} color="#FFFFFF" />
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.name || "Admin User"}
              </Text>

              <View style={styles.roleBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color="#7C3AED"
                />

                <Text style={styles.roleText}>{profile.role}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={17}
                  color="#7C3AED"
                />

                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(text) => handleChange("name", text)}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color="#7C3AED"
                />

                <TextInput
                  style={styles.input}
                  value={profile.email}
                  onChangeText={(text) => handleChange("email", text)}
                  placeholder="Enter email address"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="call-outline"
                  size={17}
                  color="#7C3AED"
                />

                <TextInput
                  style={styles.input}
                  value={profile.phone}
                  onChangeText={(text) => handleChange("phone", text)}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (saving || loading) && styles.disabledButton,
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.buttonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 20,
  },

  statusBox: {
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },

  statusText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },

  errorBox: {
    minHeight: 44,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600",
  },

  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",

    ...Platform.select({
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0px 3px 12px rgba(17, 24, 39, 0.06)",
      },
      default: {
        elevation: 2,
      },
    }),
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarBox: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B124C",
    marginBottom: 6,
  },

  roleBadge: {
    alignSelf: "flex-start",
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F0FF",
    borderRadius: 20,
    paddingHorizontal: 9,
  },

  roleText: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "700",
    textTransform: "capitalize",
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F1F4",
    marginVertical: 14,
  },

  form: {
    gap: 11,
  },

  inputGroup: {
    gap: 5,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginLeft: 2,
  },

  inputContainer: {
    height: 43,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAF8FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E9E1F8",
    paddingHorizontal: 11,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    fontSize: 13,
    color: "#111827",
    outlineStyle: "none",
  },

  button: {
    height: 44,
    backgroundColor: "#7C3AED",
    borderRadius: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginTop: 3,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
