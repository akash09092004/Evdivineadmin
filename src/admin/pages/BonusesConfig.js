import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";
import { adminGet, adminPut, normalizeObject } from "../utils/adminApi";

const initialForm = {
  referralBonus: "50",
  welcomeBonus: "100",
  manualBonusEnabled: true,
  notes: "Updated from Postman",
  isActive: true,
};

function normalizeBonusConfig(data) {
  const source = normalizeObject(data);

  return {
    id: source._id || source.id || "bonus-config",
    referralBonus: source.referralBonus ?? "",
    welcomeBonus: source.welcomeBonus ?? "",
    manualBonusEnabled:
      typeof source.manualBonusEnabled === "boolean"
        ? source.manualBonusEnabled
        : Boolean(source.manualBonusEnabled),
    notes: source.notes || "",
    isActive:
      typeof source.isActive === "boolean" ? source.isActive : Boolean(source.isActive),
    createdAt: source.createdAt || "",
    updatedAt: source.updatedAt || "",
  };
}

export default function BonusesConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadConfig = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("bonusesConfig");
      const normalized = normalizeBonusConfig(data);
      setConfig(normalized);
      setForm({
        referralBonus: String(normalized.referralBonus ?? ""),
        welcomeBonus: String(normalized.welcomeBonus ?? ""),
        manualBonusEnabled: normalized.manualBonusEnabled,
        notes: normalized.notes || "",
        isActive: normalized.isActive,
      });
    } catch (err) {
      setConfig(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Bonus config load nahi ho paya. Default form dikhaya ja raha hai."
      );
      setForm(initialForm);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    if (config) {
      setForm({
        referralBonus: String(config.referralBonus ?? ""),
        welcomeBonus: String(config.welcomeBonus ?? ""),
        manualBonusEnabled: config.manualBonusEnabled,
        notes: config.notes || "",
        isActive: config.isActive,
      });
      return;
    }

    setForm(initialForm);
  };

  const handleSave = async () => {
    const payload = {
      referralBonus: Number(form.referralBonus || 0),
      welcomeBonus: Number(form.welcomeBonus || 0),
      manualBonusEnabled: Boolean(form.manualBonusEnabled),
      notes: form.notes.trim(),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);
    try {
      await adminPut("bonusesConfig", payload);
      Alert.alert("Success", "Bonus settings updated");
      await loadConfig();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Bonus settings save nahi ho paye."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.mainTitle}>Bonus Config</Text>
            <Text style={styles.mainSub}>Manage referral and welcome bonus settings</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadConfig}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.statusText}>Bonus config loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.formCard}>
        <Text style={styles.boxTitle}>Bonus Settings</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Referral Bonus</Text>
            <TextInput
              style={styles.input}
              value={String(form.referralBonus)}
              onChangeText={(text) => handleChange("referralBonus", text)}
              placeholder="50"
              placeholderTextColor="#8B7AA8"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Welcome Bonus</Text>
            <TextInput
              style={styles.input}
              value={String(form.welcomeBonus)}
              onChangeText={(text) => handleChange("welcomeBonus", text)}
              placeholder="100"
              placeholderTextColor="#8B7AA8"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Manual Bonus</Text>
            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => handleToggle("manualBonusEnabled")}
            >
              <Text style={styles.toggleText}>
                {form.manualBonusEnabled ? "Enabled" : "Disabled"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldHalf}>
            <Text style={styles.label}>Active</Text>
            <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggle("isActive")}>
              <Text style={styles.toggleText}>{form.isActive ? "Active" : "Inactive"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.notes}
          onChangeText={(text) => handleChange("notes", text)}
          placeholder="Updated from Postman"
          placeholderTextColor="#8B7AA8"
          multiline
        />

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
            <Text style={styles.secondaryText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.primaryText}>{saving ? "Saving..." : "Save Settings"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 8px 24px rgba(0,0,0,0.35)" },
  default: { elevation: 6 },
});

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
  },
  mainSub: {
    color: "#A7B0D1",
    marginTop: 6,
    fontSize: 14,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
  },
  refreshText: {
    color: "#fff",
    fontWeight: "900",
  },
  statusBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0B1020",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  formCard: {
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  boxTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    backgroundColor: "#0B1020",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 14,
    height: 52,
    color: "#fff",
    marginBottom: 4,
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  toggleBtn: {
    backgroundColor: "#0B1020",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2B3354",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "900",
  },
  primaryBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
  },
});
