import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { Colors } from "../theme/colors";
import { adminLogin } from "../admin/utils/adminApi";
import { getApiBaseUrls } from "../config/api";

export default function LoginScreen({ navigation, route }) {
  const [showPassword, setShowPassword] = useState(false);
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
});
