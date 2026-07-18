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
  name: "Starter Pack",
  amount: "199",
  bonusAmount: "20",
  description: "Best for first recharge",
  isPopular: true,
  isActive: true,
};

function normalizeRechargePlan(item) {
  return {
    id: item._id || item.id || item.name || Math.random().toString(36).slice(2),
    rawId: item._id || item.id || null,
    name: item.name || "N/A",
    amount: item.amount ?? 0,
    bonusAmount: item.bonusAmount ?? 0,
    description: item.description || "N/A",
    isPopular: item.isPopular ? "yes" : "no",
    isActive: item.isActive ? "active" : "inactive",
    createdAt: item.createdAt || "N/A",
    updatedAt: item.updatedAt || "N/A",
  };
}

export default function RechargePlans() {
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState(initialForm);

  const columns = useMemo(
    () => [
      { title: "Name", key: "name", width: 180 },
      { title: "Amount", key: "amount", width: 100 },
      { title: "Bonus", key: "bonusAmount", width: 100 },
      { title: "Popular", key: "isPopular", width: 90 },
      { title: "Status", key: "isActive", width: 100 },
      { title: "Created", key: "createdAt", width: 180 },
    ],
    []
  );

  const loadPlans = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("rechargePlans");
      const list = normalizeList(data, ["rechargePlans", "data", "items", "results"]);
      const normalized = list.map(normalizeRechargePlan);
      setPlans(normalized);

      if (selectedPlan) {
        const refreshed = normalized.find((item) => item.id === selectedPlan.id);
        if (refreshed) {
          setSelectedPlan(refreshed);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Recharge plans load nahi ho paye."
      );
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = plans.filter((item) =>
    [item.name, item.description, item.isActive, item.isPopular]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSelectedPlan(null);
    setForm(initialForm);
  };

  const handleTogglePopular = () => {
    setForm((prev) => ({ ...prev, isPopular: !prev.isPopular }));
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const setFormFromPlan = (plan) => {
    setSelectedPlan(plan);
    setForm({
      name: plan.name || "",
      amount: String(plan.amount ?? ""),
      bonusAmount: String(plan.bonusAmount ?? ""),
      description: plan.description || "",
      isPopular: plan.isPopular === "yes",
      isActive: plan.isActive === "active",
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Plan name required hai.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      amount: Number(form.amount || 0),
      bonusAmount: Number(form.bonusAmount || 0),
      description: form.description.trim(),
      isPopular: Boolean(form.isPopular),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);
    try {
      if (selectedPlan) {
        await adminPut("rechargePlans", payload);
        Alert.alert("Success", `${payload.name} plan updated successfully.`);
      } else {
        await adminPost("rechargePlans", payload);
        Alert.alert("Success", `${payload.name} plan created successfully.`);
      }

      handleReset();
      await loadPlans();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Recharge plan save nahi ho paya."
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
            <Text style={styles.mainTitle}>Recharge Plans</Text>
            <Text style={styles.mainSub}>
              /admin/recharge-plans ke according plans create aur list karo
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadPlans}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentGrid}>
        <View style={styles.formCard}>
          <Text style={styles.boxTitle}>
            {selectedPlan ? "Edit Recharge Plan" : "Create Recharge Plan"}
          </Text>
          <Text style={styles.boxSub}>
            {selectedPlan ? `Editing: ${selectedPlan.name}` : "Fill plan details below"}
          </Text>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(text) => handleChange("name", text)}
                placeholder="Starter Pack"
                placeholderTextColor="#8B7AA8"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={String(form.amount)}
                onChangeText={(text) => handleChange("amount", text)}
                placeholder="199"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Bonus Amount</Text>
              <TextInput
                style={styles.input}
                value={String(form.bonusAmount)}
                onChangeText={(text) => handleChange("bonusAmount", text)}
                placeholder="20"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Popular</Text>
              <TouchableOpacity style={styles.toggleBtn} onPress={handleTogglePopular}>
                <Text style={styles.toggleText}>
                  {form.isPopular ? "Popular" : "Normal"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(text) => handleChange("description", text)}
            placeholder="Best for first recharge"
            placeholderTextColor="#8B7AA8"
            multiline
          />

          <Text style={styles.label}>Status</Text>
          <TouchableOpacity style={styles.toggleBtn} onPress={handleToggleActive}>
            <Text style={styles.toggleText}>
              {form.isActive ? "Active" : "Inactive"}
            </Text>
          </TouchableOpacity>

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
                {saving ? "Saving..." : selectedPlan ? "Update Plan" : "Create Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.boxTitle}>Recharge Plan List</Text>
          <Text style={styles.boxSub}>Tap a row to edit</Text>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Recharge plans loading...</Text>
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
            placeholder="Search by name or status..."
          />

          <DataTable columns={columns} data={filteredPlans} onRowPress={setFormFromPlan} />
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
  boxTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  boxSub: {
    color: "#A7B0D1",
    marginTop: 4,
    fontSize: 13,
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
