import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../theme/colors";
import { adminLogin } from "../admin/utils/adminApi";
import {
  clearPreferredApiBaseUrl,
  getApiBaseUrls,
  getPreferredApiBaseUrl,
  setPreferredApiBaseUrl,
} from "../config/api";

export default function LoginScreen({ navigation, route }) {
  const [showPassword, setShowPassword] = useState(false);
  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getPreferredApiBaseUrl());
  const [apiSaving, setApiSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const loginInFlightRef = useRef(false);
  const { signIn } = useAuth();
  const redirectTo = route?.params?.redirectTo || "AdminHome";
  const successMessage = route?.params?.successMessage || "";
  const requireAdmin = route?.params?.requireAdmin || redirectTo === "AdminHome";
  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const openApiSettings = () => {
    setApiUrlInput(getPreferredApiBaseUrl());
    setApiModalVisible(true);
  };

  const closeApiSettings = () => {
    if (apiSaving) {
      return;
    }

    setApiModalVisible(false);
  };

  const saveApiUrl = async () => {
    const nextUrl = apiUrlInput.trim();

    if (!nextUrl) {
      Alert.alert(
        "Server URL required",
        "Backend URL khali nahi chhod sakte. Example: https://api.yourdomain.com"
      );
      return;
    }

    setApiSaving(true);

    try {
      const savedUrl = await setPreferredApiBaseUrl(nextUrl);
      setApiModalVisible(false);
      Alert.alert(
        "Server updated",
        `Admin app ab is backend ko use karega:\n${savedUrl}`
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "Server URL save nahi ho paya."
      );
    } finally {
      setApiSaving(false);
    }
  };

  const clearApiUrl = async () => {
    if (apiSaving) {
      return;
    }

    setApiSaving(true);

    try {
      await clearPreferredApiBaseUrl();
      setApiUrlInput(getPreferredApiBaseUrl());
      Alert.alert(
        "Server reset",
        "Saved backend URL hata diya gaya hai. Ab app default configured URLs try karega."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "Server URL clear nahi ho paya."
      );
    } finally {
      setApiSaving(false);
    }
  };

  React.useEffect(() => {
    if (route?.params?.email) {
      setForm((prev) => ({ ...prev, email: route.params.email }));
    }
  }, [route?.params?.email]);

  const handleLogin = async () => {
    if (loading || loginInFlightRef.current) {
      return;
    }

    if (!form.email || !form.password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }

    console.log("[Login] submit", {
      email: form.email.trim(),
      passwordLength: form.password.trim().length,
      redirectTo,
    });

    setLoading(true);
    loginInFlightRef.current = true;
    try {
      console.log("[Login] API base URLs", getApiBaseUrls());
      const loginPayload = {
        email: form.email.trim(),
        password: form.password.trim(),
      };

      console.log("[Login] calling API:", "/admin/auth/login");
      let authData = null;

      try {
        authData = await adminLogin(loginPayload);
      } catch (error) {
        if (error?.response?.status === 403 && error?.response?.data?.data?.otpRequired) {
          const otpData = error.response.data;
          navigation?.replace("OtpVerification", {
            email: otpData?.data?.email || form.email.trim(),
            purpose: "login",
            redirectTo,
            successMessage: otpData?.message || "Please verify OTP to continue.",
            otp: otpData?.data?.otp || "",
          });
          return;
        }

        throw error;
      }

      console.log("[Login] API response", {
        tokenExists: Boolean(authData?.token),
        user: authData?.user
          ? {
              id: authData.user._id || authData.user.id,
              email: authData.user.email,
              role: authData.user.role,
            }
          : null,
      });

      if (!authData?.token) {
        throw new Error("Login response missing token.");
      }

      const nextUser = authData?.user || authData?.admin;
      const userRole = authData?.user?.role || authData?.admin?.role || "user";

      if (!requireAdmin && userRole !== "admin") {
        const isActive =
          nextUser?.isActive ??
          nextUser?.active ??
          (nextUser?.isBlocked !== undefined ? !nextUser.isBlocked : true);
        const isVerified =
          nextUser?.otpVerified ??
          nextUser?.verified ??
          nextUser?.isVerified ??
          nextUser?.emailVerified ??
          false;

        if (!isActive || !isVerified) {
          Alert.alert(
            "Access Denied",
            "User ko login ke liye verified aur active hona zaroori hai."
          );
          return;
        }
      }

      if (requireAdmin && userRole !== "admin") {
        Alert.alert("Access Denied", "Admin dashboard ke liye admin login chahiye.");
        return;
      }

      await signIn({
        token: authData?.token,
        refreshToken: authData?.refreshToken,
        user: nextUser,
      });
      console.log("[Login] token stored and auth set true");
      console.log("[Login] auth updated; navigator will switch to", redirectTo);
      return;
    } catch (error) {
      console.log("[Login] unexpected error", error);
      const status = error?.response?.status;
      const apiMessage =
        status === 429
          ? "Bahut zyada attempts ho gaye. Thodi der baad dobara try karo."
          : error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Login failed";
      Alert.alert("Error", apiMessage);
    } finally {
      loginInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.cardShell}>
            <View style={styles.card}>
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>EV</Text>
              </View>

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Login to your EvDivine account
              </Text>

              <View style={styles.serverRow}>
                <View style={styles.serverTextWrap}>
                  <Text style={styles.serverLabel}>Backend URL</Text>
                  <Text style={styles.serverValue} numberOfLines={1}>
                    {getPreferredApiBaseUrl()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.serverBtn}
                  onPress={openApiSettings}
                >
                  <Text style={styles.serverBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {successMessage ? (
                <Text style={styles.successText}>{successMessage}</Text>
              ) : null}

              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.primary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={form.email}
                  onChangeText={(text) => handleChange("email", text)}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={Colors.primary}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={(text) => handleChange("password", text)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation?.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Don't have an account?</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation?.navigate("Signup", {
                      redirectTo,
                      successMessage,
                    })
                  }
                >
                  <Text style={styles.linkText}> Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={apiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeApiSettings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend URL</Text>
            <Text style={styles.modalSubtitle}>
              Phone par app chalane ke liye backend ka public URL ya same Wi-Fi
              IP yahan set karo.
            </Text>

            <Text style={styles.modalLabel}>API URL</Text>
            <TextInput
              style={styles.modalInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://api.yourdomain.com"
              placeholderTextColor="#8F8AA8"
            />

            <Text style={styles.modalHint}>
              Example: http://192.168.1.41:5000 ya https://api.domain.com
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSecondaryBtn]}
                onPress={clearApiUrl}
                disabled={apiSaving}
              >
                <Text style={styles.modalSecondaryBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimaryBtn]}
                onPress={saveApiUrl}
                disabled={apiSaving}
              >
                {apiSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={closeApiSettings}
              disabled={apiSaving}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  background: {
    flex: 1,
    backgroundColor: "#12092E",
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 32 : 36,
    left: 20,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 74,
    paddingBottom: 32,
    minHeight: "100%",
  },
  cardShell: {
    width: "100%",
    maxWidth: 460,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 26,
    padding: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.38)",
    ...Platform.select({
      web: {
        backdropFilter: "blur(22px) saturate(170%)",
        WebkitBackdropFilter: "blur(22px) saturate(170%)",
        boxShadow: "0px 18px 50px rgba(0,0,0,0.28)",
      },
      default: {
        elevation: 6,
      },
    }),
  },
  logoBox: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(138,82,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  logoText: {
    fontSize: 34,
    fontWeight: "900",
    color: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2B124C",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#443A66",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 22,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  serverTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  serverLabel: {
    color: "#E9D5FF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  serverValue: {
    color: "#FFF7ED",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  serverBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(192, 132, 252, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(216, 180, 254, 0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  serverBtnText: {
    color: "#F5D0FE",
    fontSize: 12,
    fontWeight: "900",
  },
  successText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2B124C",
    marginBottom: 8,
  },
  inputBox: {
    height: 54,
    backgroundColor: "rgba(138,82,255,0.10)",
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    marginLeft: 9,
    fontSize: 14,
    color: "#1A1A2E",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  forgotText: {
    color: Colors.primaryLight,
    fontWeight: "900",
  },
  button: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
  },
  bottomText: {
    color: "#443A66",
  },
  linkText: {
    color: Colors.primaryLight,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 3, 20, 0.78)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#161021",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 18,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#C9B6FF",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  modalLabel: {
    color: "#F5D0FE",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalInput: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  modalHint: {
    color: "#B8A6E8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSecondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalSecondaryBtnText: {
    color: "#E9D5FF",
    fontSize: 13,
    fontWeight: "900",
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.primary,
  },
  modalPrimaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  modalCloseBtn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCloseText: {
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "900",
  },
});
