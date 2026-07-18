import React, { useEffect, useMemo, useState } from "react";
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
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { Colors } from "../../theme/colors";
import { adminGet, adminPost, adminPut, normalizeList } from "../utils/adminApi";

const initialForm = {
  code: "NEWUSER20",
  type: "fixed",
  value: "20",
  minAmount: "100",
  maxDiscount: "20",
  maxUses: "100",
  usedCount: "0",
  startsAt: "2026-07-07T00:00:00.000Z",
  expiresAt: "2026-12-31T23:59:59.000Z",
  isActive: true,
};

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function normalizeCoupon(item) {
  const startsAt = item.startsAt || item.startAt || item.startDate || "";
  const expiresAt = item.expiresAt || item.endAt || item.endDate || "";

  return {
    id: item._id || item.id || item.code || Math.random().toString(36).slice(2),
    rawId: item._id || item.id || null,
    code: item.code || "N/A",
    type: item.type || "N/A",
    value: item.value ?? 0,
    minAmount: item.minAmount ?? 0,
    maxDiscount: item.maxDiscount ?? 0,
    maxUses: item.maxUses ?? 0,
    usedCount: item.usedCount ?? 0,
    startsAtRaw: startsAt,
    expiresAtRaw: expiresAt,
    startsAt: formatDate(startsAt),
    expiresAt: formatDate(expiresAt),
    status: item.isActive ? "active" : "inactive",
    users: Array.isArray(item.users) ? item.users.length : 0,
    createdAt: formatDate(item.createdAt),
  };
}

export default function Coupons() {
  const [search, setSearch] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [form, setForm] = useState(initialForm);

  const columns = useMemo(
    () => [
      { title: "Code", key: "code", width: 140 },
      { title: "Type", key: "type", width: 100 },
      { title: "Value", key: "value", width: 90 },
      { title: "Min Amount", key: "minAmount", width: 110 },
      { title: "Max Discount", key: "maxDiscount", width: 120 },
      { title: "Max Uses", key: "maxUses", width: 90 },
      { title: "Used", key: "usedCount", width: 80 },
      { title: "Status", key: "status", width: 100 },
      { title: "Starts", key: "startsAt", width: 180 },
      { title: "Expires", key: "expiresAt", width: 180 },
    ],
    []
  );

  const loadCoupons = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("coupons");
      const list = normalizeList(data, ["coupons", "data", "items", "results"]);
      const normalized = list.map(normalizeCoupon);
      setCoupons(normalized);

      if (selectedCoupon) {
        const refreshedSelected = normalized.find((item) => item.id === selectedCoupon.id);
        if (refreshedSelected) {
          setSelectedCoupon(refreshedSelected);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Coupons load nahi ho paye.");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const filteredCoupons = coupons.filter((item) =>
    [item.code, item.type, item.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleReset = () => {
    setSelectedCoupon(null);
    setForm(initialForm);
  };

  const setFormFromCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setForm({
      code: coupon.code || "",
      type: coupon.type || "fixed",
      value: String(coupon.value ?? ""),
      minAmount: String(coupon.minAmount ?? ""),
      maxDiscount: String(coupon.maxDiscount ?? ""),
      maxUses: String(coupon.maxUses ?? ""),
      usedCount: String(coupon.usedCount ?? 0),
      startsAt: coupon.startsAtRaw || initialForm.startsAt,
      expiresAt:
        coupon.expiresAtRaw || initialForm.expiresAt,
      isActive: coupon.status === "active",
    });
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      Alert.alert("Error", "Coupon code required hai.");
      return;
    }

    const createPayload = {
      code: form.code.trim(),
      type: form.type.trim() || "fixed",
      value: Number(form.value || 0),
      minAmount: Number(form.minAmount || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      maxUses: Number(form.maxUses || 0),
      usedCount: Number(form.usedCount || 0),
      startsAt: form.startsAt,
      expiresAt: form.expiresAt,
      isActive: Boolean(form.isActive),
      users: [],
    };

    const updatePayload = {
      code: form.code.trim(),
      type: form.type.trim() || "fixed",
      value: Number(form.value || 0),
      minAmount: Number(form.minAmount || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      maxUses: Number(form.maxUses || 0),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);
    try {
      if (selectedCoupon) {
        await adminPut("coupons", updatePayload);
        Alert.alert("Success", `${updatePayload.code} coupon updated successfully.`);
      } else {
        await adminPost("coupons", createPayload);
        Alert.alert("Success", `${createPayload.code} coupon created successfully.`);
      }

      setForm(initialForm);
      setSelectedCoupon(null);
      await loadCoupons();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Coupon save nahi ho paya."
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
            <Text style={styles.mainTitle}>Coupon Management</Text>
            <Text style={styles.mainSub}>
              /admin/coupons ke according coupons create aur list karo
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadCoupons}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentGrid}>
        <View style={styles.formCard}>
          <Text style={styles.boxTitle}>Create Coupon</Text>
          <Text style={styles.boxSub}>
            {selectedCoupon ? `Editing: ${selectedCoupon.code}` : "Create a new coupon"}
          </Text>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Code</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={(text) => handleChange("code", text)}
                placeholder="NEWUSER20"
                placeholderTextColor="#8B7AA8"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={form.type}
                onChangeText={(text) => handleChange("type", text)}
                placeholder="fixed"
                placeholderTextColor="#8B7AA8"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Value</Text>
              <TextInput
                style={styles.input}
                value={String(form.value)}
                onChangeText={(text) => handleChange("value", text)}
                placeholder="20"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Min Amount</Text>
              <TextInput
                style={styles.input}
                value={String(form.minAmount)}
                onChangeText={(text) => handleChange("minAmount", text)}
                placeholder="100"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Max Discount</Text>
              <TextInput
                style={styles.input}
                value={String(form.maxDiscount)}
                onChangeText={(text) => handleChange("maxDiscount", text)}
                placeholder="20"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Max Uses</Text>
              <TextInput
                style={styles.input}
                value={String(form.maxUses)}
                onChangeText={(text) => handleChange("maxUses", text)}
                placeholder="100"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Used Count</Text>
              <TextInput
                style={styles.input}
                value={String(form.usedCount)}
                onChangeText={(text) => handleChange("usedCount", text)}
                placeholder="0"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Status</Text>
              <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleActive}>
                <Text style={styles.toggleText}>
                  {form.isActive ? "Active" : "Inactive"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Starts At</Text>
          <TextInput
            style={styles.input}
            value={form.startsAt}
            onChangeText={(text) => handleChange("startsAt", text)}
            placeholder="2026-07-07T00:00:00.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Expires At</Text>
          <TextInput
            style={styles.input}
            value={form.expiresAt}
            onChangeText={(text) => handleChange("expiresAt", text)}
            placeholder="2026-12-31T23:59:59.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
              <Text style={styles.secondaryText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={styles.primaryText}>
                {saving
                  ? "Saving..."
                  : selectedCoupon
                  ? "Update Coupon"
                  : "Create Coupon"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.boxTitle}>Coupon List</Text>
              <Text style={styles.boxSub}>API se fetched coupons</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Coupons loading...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.statusBox}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.statusText}>{error}</Text>
            </View>
          ) : null}

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by code, type or status..."
          />

          <DataTable
            columns={columns}
            data={filteredCoupons}
            onRowPress={setFormFromCoupon}
          />
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
  contentGrid: {
    gap: 16,
  },
  formCard: {
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  listCard: {
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  listHeader: {
    marginBottom: 8,
  },
  boxTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  boxSub: {
    color: "#A7B0D1",
    marginTop: 4,
    fontSize: 13,
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
});
