import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { Colors } from "../../theme/colors";
import {
  adminGet,
  adminPost,
  adminSetSlotPlanStatus,
  adminUpdateSlotPlan,
  normalizeList,
} from "../utils/adminApi";

const initialForm = {
  title: "15 Min Chat Plan",
  consultationType: "chat",
  durationMinutes: "15",
  breakMinutes: "5",
  basePrice: "500",
  offerPrice: "399",
  currency: "USD",
  isPopular: true,
  isActive: true,
};

const consultationTypes = [
  { label: "Chat", value: "chat", icon: "chatbubble-ellipses-outline" },
  { label: "Call", value: "call", icon: "call-outline" },
  { label: "Video", value: "video", icon: "videocam-outline" },
];

function formatMoney(value, currency = "USD") {
  const amount = Number(value || 0);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `${currency || "USD"} ${amount}`;
  }
}

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

function normalizeSlotPlan(item) {
  const title = item.title || item.name || "Untitled Slot Plan";

  return {
    id: item._id || item.id || title || Math.random().toString(36).slice(2),
    rawId: item._id || item.id || null,
    title,
    consultationType: item.consultationType || item.type || "chat",
    durationMinutes: Number(item.durationMinutes ?? item.duration ?? 0),
    breakMinutes: Number(item.breakMinutes ?? item.breakTime ?? 0),
    basePrice: Number(item.basePrice ?? item.price ?? 0),
    offerPrice: Number(item.offerPrice ?? item.discountPrice ?? 0),
    currency: item.currency || "USD",
    isPopular: item.isPopular ? "yes" : "no",
    status: item.isActive ? "active" : "inactive",
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
  };
}

function extractPlanRecord(result) {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    if (result.data && typeof result.data === "object" && !Array.isArray(result.data)) {
      return result.data;
    }
    if (result.result && typeof result.result === "object" && !Array.isArray(result.result)) {
      return result.result;
    }
  }

  return result || {};
}

function normalizeSlotPlanFromPayload(existingPlan, payload, fallbackRecord = {}) {
  const merged = {
    ...(existingPlan || {}),
    ...(fallbackRecord || {}),
    ...(payload || {}),
  };

  return normalizeSlotPlan({
    _id: merged._id || merged.rawId || existingPlan?.rawId || fallbackRecord._id,
    id: merged.id || existingPlan?.id,
    title: merged.title || merged.name || existingPlan?.title,
    consultationType:
      merged.consultationType || merged.type || existingPlan?.consultationType,
    durationMinutes:
      merged.durationMinutes ?? merged.duration ?? existingPlan?.durationMinutes,
    breakMinutes: merged.breakMinutes ?? merged.breakTime ?? existingPlan?.breakMinutes,
    basePrice: merged.basePrice ?? merged.price ?? existingPlan?.basePrice,
    offerPrice: merged.offerPrice ?? merged.discountPrice ?? existingPlan?.offerPrice,
    currency: merged.currency || existingPlan?.currency,
    isPopular:
      merged.isPopular !== undefined
        ? merged.isPopular
        : existingPlan?.isPopular === "yes",
    isActive:
      merged.isActive !== undefined
        ? merged.isActive
        : existingPlan?.status === "active",
    createdAt: fallbackRecord.createdAt || existingPlan?.createdAt,
    updatedAt: fallbackRecord.updatedAt || new Date().toISOString(),
  });
}

function extractSlotPlanList(response) {
  if (!response || typeof response !== "object") {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      pages: 1,
    };
  }

  const body = response.data && typeof response.data === "object" ? response.data : response;
  const items =
    (Array.isArray(body.items) && body.items) ||
    (Array.isArray(body.data?.items) && body.data.items) ||
    (Array.isArray(body.results) && body.results) ||
    [];

  return {
    items,
    total: Number(body.total ?? body.data?.total ?? items.length ?? 0),
    page: Number(body.page ?? body.data?.page ?? 1),
    limit: Number(body.limit ?? body.data?.limit ?? 20),
    pages: Number(body.pages ?? body.data?.pages ?? 1),
  };
}

function statCard({ label, value, hint, icon, accent }) {
  return { label, value, hint, icon, accent };
}

export default function SlotPlans() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });

  const columns = useMemo(
    () => [
      { title: "Title", key: "title", width: 190 },
      { title: "Type", key: "consultationType", width: 110 },
      { title: "Duration", key: "durationMinutes", width: 90 },
      { title: "Break", key: "breakMinutes", width: 80 },
      { title: "Base", key: "basePrice", width: 110 },
      { title: "Offer", key: "offerPrice", width: 110 },
      { title: "Currency", key: "currency", width: 90 },
      { title: "Popular", key: "isPopular", width: 90 },
      { title: "Status", key: "status", width: 100 },
      { title: "Created", key: "createdAt", width: 180 },
    ],
    []
  );

  const loadPlans = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("slotPlans");
      const extracted = extractSlotPlanList(data);
      const list = extracted.items.length
        ? extracted.items
        : normalizeList(data, ["slotPlans", "data", "items", "results"]);
      const normalized = list.map(normalizeSlotPlan);
      setPlans(normalized);
      setPagination({
        total: extracted.total || normalized.length,
        page: extracted.page,
        limit: extracted.limit,
        pages: extracted.pages,
      });

      if (selectedPlan) {
        const refreshed = normalized.find((item) => item.id === selectedPlan.id);
        if (refreshed) {
          setSelectedPlan(refreshed);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Slot plans load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filteredPlans = plans.filter((item) =>
    [
      item.title,
      item.consultationType,
      item.currency,
      item.status,
      item.isPopular,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((item) => item.status === "active").length;
    const popular = plans.filter((item) => item.isPopular === "yes").length;
    const lowestOffer = plans.length
      ? Math.min(...plans.map((item) => Number(item.offerPrice || 0)))
      : 0;

    return [
      statCard({
        label: "Total Plans",
        value: String(total),
        hint: "Available slot plans",
        icon: "layers-outline",
        accent: Colors.primary,
      }),
      statCard({
        label: "Active",
        value: String(active),
        hint: "Currently published",
        icon: "checkmark-circle-outline",
        accent: "#22C55E",
      }),
      statCard({
        label: "Popular",
        value: String(popular),
        hint: "Marked as featured",
        icon: "star-outline",
        accent: Colors.accent,
      }),
      statCard({
        label: "Lowest Offer",
        value: plans.length
          ? formatMoney(lowestOffer, form.currency || "USD")
          : "N/A",
        hint: "Starting price",
        icon: "pricetag-outline",
        accent: Colors.accent2,
      }),
    ];
  }, [plans, form.currency]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTogglePopular = () => {
    setForm((prev) => ({ ...prev, isPopular: !prev.isPopular }));
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const handleReset = () => {
    setSelectedPlan(null);
    setForm(initialForm);
  };

  const applyPlanUpdate = (rawId, nextPlan, sourceId) => {
    setPlans((prev) =>
      prev.map((item) =>
        item.rawId === rawId || item.id === sourceId
          ? {
              ...item,
              ...nextPlan,
              id: item.id,
              rawId: item.rawId || nextPlan.rawId,
            }
          : item
      )
    );
  };

  const handleToggleStatus = async (plan) => {
    if (!plan?.rawId) {
      Alert.alert("Error", "Plan id missing hai.");
      return;
    }

    const nextActive = plan.status !== "active";
    setActionId(plan.rawId);

    try {
      const result = await adminSetSlotPlanStatus(plan.rawId, nextActive);
      const nextItem = normalizeSlotPlanFromPayload(
        plan,
        { isActive: nextActive },
        extractPlanRecord(result)
      );
      applyPlanUpdate(plan.rawId, nextItem, plan.id);

      if (selectedPlan?.rawId === plan.rawId) {
        setSelectedPlan(nextItem);
        setForm((prev) => ({ ...prev, isActive: nextActive }));
      }

      Alert.alert(
        "Success",
        `${nextItem.title} ${nextActive ? "activated" : "deactivated"} successfully.`
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Slot plan status update nahi ho paya."
      );
    } finally {
      setActionId("");
    }
  };

  const setFormFromPlan = (plan) => {
    setSelectedPlan(plan);
    setForm({
      title: plan.title || "",
      consultationType: plan.consultationType || "chat",
      durationMinutes: String(plan.durationMinutes ?? ""),
      breakMinutes: String(plan.breakMinutes ?? ""),
      basePrice: String(plan.basePrice ?? ""),
      offerPrice: String(plan.offerPrice ?? ""),
      currency: plan.currency || "USD",
      isPopular: plan.isPopular === "yes",
      isActive: plan.status === "active",
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert("Error", "Plan title required hai.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      consultationType: form.consultationType.trim().toLowerCase() || "chat",
      durationMinutes: Number(form.durationMinutes || 0),
      breakMinutes: Number(form.breakMinutes || 0),
      basePrice: Number(form.basePrice || 0),
      offerPrice: Number(form.offerPrice || 0),
      currency: form.currency.trim().toUpperCase() || "USD",
      isPopular: Boolean(form.isPopular),
      isActive: Boolean(form.isActive),
    };

    if (!payload.title) {
      Alert.alert("Error", "Plan title required hai.");
      return;
    }

    setSaving(true);

    try {
      if (selectedPlan?.rawId) {
        const result = await adminUpdateSlotPlan(selectedPlan.rawId, payload);
        const nextItem = normalizeSlotPlanFromPayload(
          selectedPlan,
          payload,
          extractPlanRecord(result)
        );
        applyPlanUpdate(selectedPlan.rawId, nextItem, selectedPlan.id);
        Alert.alert("Success", `${payload.title} slot plan updated successfully.`);
      } else {
        const result = await adminPost("slotPlans", payload);
        const nextItem = normalizeSlotPlan({
          ...payload,
          ...extractPlanRecord(result),
        });
        setPlans((prev) => {
          const exists = prev.some(
            (item) => item.rawId === nextItem.rawId || item.id === nextItem.id
          );

          if (exists) {
            return prev.map((item) =>
              item.rawId === nextItem.rawId || item.id === nextItem.id ? nextItem : item
            );
          }

          return [nextItem, ...prev];
        });
        Alert.alert("Success", "Slot plan created successfully.");
      }

      handleReset();
      await loadPlans();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Slot plan save nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderQuickToggle = (label, value, onPress, activeText, inactiveText) => (
    <View style={styles.toggleField}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.toggleBtn} onPress={onPress}>
        <View
          style={[
            styles.togglePill,
            value ? styles.togglePillOn : styles.togglePillOff,
          ]}
        >
          <View
            style={[
              styles.toggleDot,
              value ? styles.toggleDotOn : styles.toggleDotOff,
            ]}
          />
          <Text style={styles.toggleText}>{value ? activeText : inactiveText}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderRowActions = (item) => {
    const busy = saving || Boolean(actionId) || loading;
    const active = item.status === "active";

    return (
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={[styles.actionPill, styles.actionPillEdit]}
          onPress={() => setFormFromPlan(item)}
          disabled={busy}
        >
          <Ionicons name="create-outline" size={14} color="#fff" />
          <Text style={styles.actionPillText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionPill,
            active ? styles.actionPillInactive : styles.actionPillActive,
          ]}
          onPress={() => handleToggleStatus(item)}
          disabled={busy}
        >
          <Ionicons
            name={active ? "pause-outline" : "play-outline"}
            size={14}
            color="#fff"
          />
          <Text style={styles.actionPillText}>
            {active ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.kicker}>Admin Slot Plan Manager</Text>
            <Text style={styles.mainTitle}>Slot Plans</Text>
            <Text style={styles.mainSub}>
              Yahan se consultation slot plans create, refresh aur manage karo.
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadPlans}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Ionicons name="flash-outline" size={14} color="#fff" />
            <Text style={styles.heroChipText}>Smooth responsive form</Text>
          </View>
          <View style={styles.heroChip}>
            <Ionicons name="layers-outline" size={14} color="#fff" />
            <Text style={styles.heroChipText}>Create + list view</Text>
          </View>
          <View style={styles.heroChip}>
            <Ionicons name="phone-portrait-outline" size={14} color="#fff" />
            <Text style={styles.heroChipText}>Mobile friendly</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: item.accent }]}>
              <Ionicons name={item.icon} size={20} color="#fff" />
            </View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statHint}>{item.hint}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.contentGrid, isWide && styles.contentGridWide]}>
        <View style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.boxTitle}>
                {selectedPlan ? "Edit Slot Plan" : "Create Slot Plan"}
              </Text>
              <Text style={styles.boxSub}>
                {selectedPlan
                  ? `Selected: ${selectedPlan.title}`
                  : "Form fill karke new plan create karo"}
              </Text>
            </View>

            {selectedPlan ? (
              <View style={styles.badge}>
                <Ionicons name="create-outline" size={14} color="#fff" />
                <Text style={styles.badgeText}>Editing</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.fieldFull}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => handleChange("title", text)}
                placeholder="15 Min Chat Plan"
                placeholderTextColor="#8B7AA8"
              />
            </View>

            <View style={styles.fieldFull}>
              <Text style={styles.label}>Consultation Type</Text>
              <View style={styles.typeRow}>
                {consultationTypes.map((type) => {
                  const active = form.consultationType === type.value;
                  return (
                    <Pressable
                      key={type.value}
                      onPress={() => handleChange("consultationType", type.value)}
                      style={[
                        styles.typeChip,
                        active ? styles.typeChipActive : styles.typeChipIdle,
                      ]}
                    >
                      <Ionicons
                        name={type.icon}
                        size={14}
                        color={active ? "#fff" : "#C4B5FD"}
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          active ? styles.typeChipTextActive : null,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Duration Minutes</Text>
              <TextInput
                style={styles.input}
                value={String(form.durationMinutes)}
                onChangeText={(text) => handleChange("durationMinutes", text)}
                placeholder="15"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Break Minutes</Text>
              <TextInput
                style={styles.input}
                value={String(form.breakMinutes)}
                onChangeText={(text) => handleChange("breakMinutes", text)}
                placeholder="5"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Base Price</Text>
              <TextInput
                style={styles.input}
                value={String(form.basePrice)}
                onChangeText={(text) => handleChange("basePrice", text)}
                placeholder="500"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Offer Price</Text>
              <TextInput
                style={styles.input}
                value={String(form.offerPrice)}
                onChangeText={(text) => handleChange("offerPrice", text)}
                placeholder="399"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fieldGrid}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                value={form.currency}
                onChangeText={(text) => handleChange("currency", text.toUpperCase())}
                placeholder="USD"
                placeholderTextColor="#8B7AA8"
                autoCapitalize="characters"
              />
            </View>

            {renderQuickToggle(
              "Popular",
              form.isPopular,
              handleTogglePopular,
              "Marked Popular",
              "Mark as Popular"
            )}
          </View>

          {renderQuickToggle(
            "Status",
            form.isActive,
            handleToggleActive,
            "Active",
            "Inactive"
          )}

          <View style={styles.previewCard}>
            <View>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewTitle}>{form.title || "Slot Plan"}</Text>
              <Text style={styles.previewMeta}>
                {form.consultationType || "chat"} - {form.durationMinutes || 0} min -{" "}
                {form.currency || "USD"}
              </Text>
            </View>

            <View style={styles.priceBlock}>
              <Text style={styles.offerText}>
                {formatMoney(form.offerPrice || 0, form.currency || "USD")}
              </Text>
              <Text style={styles.baseText}>
                {formatMoney(form.basePrice || 0, form.currency || "USD")}
              </Text>
            </View>
          </View>

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
                  : selectedPlan
                  ? "Update Plan"
                  : "Create Plan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.boxTitle}>Slot Plan List</Text>
              <Text style={styles.boxSub}>Row pe tap karke form me load karo</Text>
            </View>

            <View style={styles.smallBadge}>
              <Text style={styles.smallBadgeText}>
                {pagination.total || filteredPlans.length} items
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Slot plans loading...</Text>
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
            placeholder="Search by title, type, status..."
          />

          <DataTable
            columns={columns}
            data={filteredPlans}
            onRowPress={setFormFromPlan}
            renderRowActions={renderRowActions}
            actionColumnWidth={220}
          />

          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Page {pagination.page} of {pagination.pages} - Limit {pagination.limit} - Total{" "}
              {pagination.total}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 10px 30px rgba(0,0,0,0.38)" },
  default: { elevation: 7 },
});

const styles = StyleSheet.create({
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#14172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#272D47",
    marginBottom: 14,
    ...shadow,
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  heroTextWrap: {
    flex: 1,
    minWidth: 220,
  },
  kicker: {
    color: "#A7F3D0",
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  mainTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
  },
  mainSub: {
    color: "#B7C0E0",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
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
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 170,
    backgroundColor: "#151B2E",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#D8B4FE",
    marginTop: 4,
    fontWeight: "800",
  },
  statHint: {
    color: "#A7B0D1",
    marginTop: 4,
    fontSize: 12,
  },
  contentGrid: {
    gap: 14,
  },
  contentGridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  formCard: {
    flex: 1,
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  listCard: {
    flex: 1.08,
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
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
    lineHeight: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  smallBadge: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  smallBadgeText: {
    color: "#E9D5FF",
    fontWeight: "800",
    fontSize: 12,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  fieldHalf: {
    flex: 1,
    minWidth: 180,
  },
  fieldFull: {
    width: "100%",
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
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipIdle: {
    backgroundColor: "#0B1020",
    borderColor: "#2B3354",
  },
  typeChipText: {
    color: "#E9D5FF",
    fontWeight: "800",
    fontSize: 12,
  },
  typeChipTextActive: {
    color: "#fff",
  },
  toggleField: {
    flex: 1,
    minWidth: 180,
  },
  toggleBtn: {
    width: "100%",
  },
  togglePill: {
    height: 52,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  togglePillOn: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderColor: "rgba(34,197,94,0.55)",
  },
  togglePillOff: {
    backgroundColor: "#0B1020",
    borderColor: "#2B3354",
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  toggleDotOn: {
    backgroundColor: "#22C55E",
  },
  toggleDotOff: {
    backgroundColor: "#64748B",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "900",
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: "#0B1020",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2B3354",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  previewLabel: {
    color: "#A7B0D1",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  previewMeta: {
    color: "#C4B5FD",
    marginTop: 4,
    fontSize: 12,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  offerText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  baseText: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginTop: 3,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
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
    flex: 1.35,
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
  rowActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  actionPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  actionPillEdit: {
    backgroundColor: Colors.primary,
  },
  actionPillActive: {
    backgroundColor: "#22C55E",
  },
  actionPillInactive: {
    backgroundColor: "#F97316",
  },
  actionPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  paginationInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  paginationText: {
    color: "#A7B0D1",
    fontSize: 12,
    fontWeight: "700",
  },
});
