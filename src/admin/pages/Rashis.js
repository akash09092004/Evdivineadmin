import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import AdminImage from "../components/AdminImage";
import { resolveAssetUrl } from "../../api/api.js";
import {
  adminDeleteRashi,
  adminGet,
  adminPutRashi,
  adminSaveRashi,
  adminSetRashiActive,
  normalizeList,
} from "../utils/adminApi";

const EMPTY_FORM = {
  name: "",
  slug: "",
  element: "",
  description: "",
  imageUrl: "",
  sortOrder: 1,
  isActive: true,
};

const COLORS = {
  bg: "#06040F",
  card: "#151B2E",
  cardSoft: "#0E0826",
  input: "#0B1020",
  border: "#242B45",
  text: "#F5EAFF",
  muted: "#A7B0D1",
  primary: "#8B5CF6",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRashi(item, index = 0) {
  return {
    id: item?._id || item?.id || `rashi-${index + 1}`,
    name: item?.name || "Untitled Rashi",
    slug: item?.slug || "",
    element: item?.element || "",
    description: item?.description || "",
    imageUrl: resolveAssetUrl(item?.imageUrl || item?.image || ""),
    sortOrder: Number(item?.sortOrder ?? index + 1),
    isActive: item?.isActive ?? item?.active ?? true,
    updatedAt: item?.updatedAt || "",
  };
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

function fileNameFromUrl(value) {
  if (!value) return "No image";

  try {
    const parsed = new URL(String(value));
    return parsed.pathname.split("/").filter(Boolean).pop() || "Rashi image";
  } catch (error) {
    return String(value).split("/").filter(Boolean).pop() || "Rashi image";
  }
}

function buildFormData(form, imageFile) {
  const payload = new FormData();
  payload.append("name", form.name.trim());
  payload.append("slug", form.slug.trim() || slugify(form.name));
  payload.append("element", form.element.trim());
  payload.append("description", form.description.trim());
  payload.append("sortOrder", String(Number(form.sortOrder) || 1));
  payload.append("isActive", String(Boolean(form.isActive)));

  if (imageFile) {
    payload.append("image", imageFile);
  }

  return payload;
}

function RemoteImage({ uri, style, placeholderLabel }) {
  return (
    <AdminImage
      uri={uri}
      style={style}
      resizeMode="cover"
      placeholderLabel={placeholderLabel}
      renderFallback={() => (
        <View style={[style, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={20} color={COLORS.muted} />
          <Text style={styles.placeholderText}>{placeholderLabel}</Text>
        </View>
      )}
    />
  );
}

export default function Rashis() {
  const [search, setSearch] = useState("");
  const [rashis, setRashis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [selectedRashiId, setSelectedRashiId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const loadRashis = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("rashis");
      const list = normalizeList(data, ["rashis", "data", "results", "items"]);
      setRashis(list.map((item, index) => normalizeRashi(item, index)));
    } catch (err) {
      setRashis([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Rashis load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRashis();
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === "web" && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredRashis = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rashis;

    return rashis.filter((item) =>
      [
        item.name,
        item.slug,
        item.element,
        item.description,
        String(item.sortOrder),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rashis, search]);

  const activeCount = rashis.filter((item) => item.isActive).length;
  const inactiveCount = rashis.length - activeCount;

  const clearPreview = () => {
    if (Platform.OS === "web" && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  const resetForm = () => {
    clearPreview();
    setSelectedRashiId("");
    setImageFile(null);
    setImagePreview("");
    setForm(EMPTY_FORM);
  };

  const openImagePicker = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert(
        "Unsupported",
        "Image upload abhi web admin panel par best supported hai."
      );
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        Alert.alert("Large Image", "Image size 5MB se kam honi chahiye.");
        return;
      }

      clearPreview();
      const blobUrl = URL.createObjectURL(file);
      setImageFile(file);
      setImagePreview(blobUrl);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
    };

    input.click();
  };

  const selectRashi = (rashi) => {
    clearPreview();
    setSelectedRashiId(rashi.id);
    setImageFile(null);
    setImagePreview("");
    setForm({
      name: rashi.name || "",
      slug: rashi.slug || "",
      element: rashi.element || "",
      description: rashi.description || "",
      imageUrl: rashi.imageUrl || "",
      sortOrder: Number(rashi.sortOrder || 1),
      isActive: Boolean(rashi.isActive),
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Rashi name required hai.");
      return false;
    }

    if (!selectedRashiId && !imageFile) {
      Alert.alert("Required", "Rashi image upload karo.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const cleanedForm = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        element: form.element.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        sortOrder: Number(form.sortOrder) || 1,
        isActive: Boolean(form.isActive),
      };

      const payload = imageFile
        ? buildFormData(cleanedForm, imageFile)
        : cleanedForm;

      if (selectedRashiId) {
        await adminPutRashi(selectedRashiId, payload);
        Alert.alert("Success", "Rashi updated successfully.");
      } else {
        await adminSaveRashi(payload);
        Alert.alert("Success", "Rashi created successfully.");
      }

      resetForm();
      await loadRashis();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Rashi save nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rashi) => {
    const nextActive = !rashi.isActive;
    setActionId(rashi.id);

    setRashis((prev) =>
      prev.map((item) =>
        item.id === rashi.id ? { ...item, isActive: nextActive } : item
      )
    );

    try {
      await adminSetRashiActive(rashi.id, nextActive);
    } catch (err) {
      setRashis((prev) =>
        prev.map((item) =>
          item.id === rashi.id ? { ...item, isActive: rashi.isActive } : item
        )
      );
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Rashi status update nahi ho paya."
      );
    } finally {
      setActionId("");
    }
  };

  const deleteRashi = async (rashi) => {
    const confirmed =
      Platform.OS === "web"
        ? window.confirm(`"${rashi.name}" rashi delete karni hai?`)
        : true;

    if (!confirmed) return;

    setActionId(rashi.id);
    const previous = rashis;
    setRashis((prev) => prev.filter((item) => item.id !== rashi.id));

    try {
      await adminDeleteRashi(rashi.id);
      if (selectedRashiId === rashi.id) {
        resetForm();
      }
    } catch (err) {
      setRashis(previous);
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Rashi delete nahi ho paya."
      );
    } finally {
      setActionId("");
    }
  };

  const previewSource = imagePreview || form.imageUrl || "";
  const previewUri = previewSource ? resolveAssetUrl(previewSource) : "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Rashi Management</Text>
          <Text style={styles.heroSub}>
            Rashi create, edit aur active/inactive control karo.
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <Text style={styles.heroBadgeText}>{rashis.length} Rashis</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{rashis.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.noticeBox}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.noticeText}>Rashi list loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.noticeBox}>
          <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.layout}>
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {selectedRashiId ? "Edit Rashi" : "Create Rashi"}
              </Text>
              <Text style={styles.cardSubTitle}>
                Name, slug, element aur image fill karo
              </Text>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Aries"
            placeholderTextColor="#8B7AA8"
            value={form.name}
            onChangeText={(text) => {
              const nextSlug = form.slug ? form.slug : slugify(text);
              setForm((prev) => ({ ...prev, name: text, slug: nextSlug }));
            }}
          />

          <Text style={styles.label}>Slug</Text>
          <TextInput
            style={styles.input}
            placeholder="aries"
            placeholderTextColor="#8B7AA8"
            value={form.slug}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, slug: text }))
            }
          />

          <Text style={styles.label}>Element</Text>
          <TextInput
            style={styles.input}
            placeholder="Fire"
            placeholderTextColor="#8B7AA8"
            value={form.element}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, element: text }))
            }
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Bold and energetic..."
            placeholderTextColor="#8B7AA8"
            multiline
            value={form.description}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, description: text }))
            }
          />

          <Text style={styles.label}>Rashi Image</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={openImagePicker}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.uploadText}>
              {imageFile?.name ||
                fileNameFromUrl(form.imageUrl) ||
                "Choose image"}
            </Text>
          </TouchableOpacity>

          <View style={styles.twoCol}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Sort Order</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#8B7AA8"
                value={String(form.sortOrder)}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, sortOrder: text }))
                }
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Status</Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  form.isActive ? styles.activeBtn : styles.inactiveBtn,
                ]}
                onPress={() =>
                  setForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
              >
                <Ionicons
                  name={
                    form.isActive
                      ? "checkmark-circle-outline"
                      : "close-circle-outline"
                  }
                  size={18}
                  color="#fff"
                />
                <Text style={styles.toggleText}>
                  {form.isActive ? "Active" : "Inactive"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabledBtn]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>
                  {selectedRashiId ? "Update Rashi" : "Save Rashi"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.previewCard}>
            <Text style={styles.cardTitle}>Live Preview</Text>
            <Text style={styles.cardSubTitle}>
              Jo image save hui hai wahi yahan dikhegi
            </Text>

            <View style={styles.previewBox}>
              <RemoteImage
                uri={previewUri}
                style={styles.previewImage}
                placeholderLabel="Image preview"
              />

              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{form.name || "Aries"}</Text>
                <Text style={styles.previewSubtitle}>
                  {form.slug || slugify(form.name) || "aries"} •{" "}
                  {form.element || "Fire"}
                </Text>
                <Text style={styles.previewDescription}>
                  {form.description ||
                    "Bold and energetic description yahan show hoga."}
                </Text>

                <View style={styles.previewMetaRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      Order {form.sortOrder || 1}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.chip,
                      form.isActive ? styles.greenChip : styles.grayChip,
                    ]}
                  >
                    <Text style={styles.chipText}>
                      {form.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.imageFileText} numberOfLines={1}>
                  Image: {fileNameFromUrl(previewSource)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.cardTitle}>Existing Rashis</Text>
                <Text style={styles.cardSubTitle}>
                  Select, update, status change or delete
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={loadRashis}
                disabled={loading}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search rashi..."
            />

            <View style={styles.listWrap}>
              {filteredRashis.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="sparkles-outline"
                    size={24}
                    color={COLORS.muted}
                  />
                  <Text style={styles.emptyText}>No rashi found</Text>
                </View>
              ) : (
                filteredRashis.map((rashi) => {
                  const busy = actionId === rashi.id;
                  const imageUri = resolveAssetUrl(rashi.imageUrl);

                  return (
                    <View
                      key={rashi.id}
                      style={[
                        styles.itemCard,
                        selectedRashiId === rashi.id && styles.itemCardSelected,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.itemMain}
                        onPress={() => selectRashi(rashi)}
                      >
                        <RemoteImage
                          uri={imageUri}
                          style={styles.thumb}
                          placeholderLabel="No image"
                        />

                        <View style={styles.itemInfo}>
                          <View style={styles.itemTopRow}>
                            <Text numberOfLines={1} style={styles.itemTitle}>
                              {rashi.name}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                rashi.isActive
                                  ? styles.activeBadge
                                  : styles.inactiveBadge,
                              ]}
                            >
                              <Text style={styles.statusBadgeText}>
                                {rashi.isActive ? "Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>

                          <Text numberOfLines={1} style={styles.itemSubtitle}>
                            {rashi.slug || "no-slug"} •{" "}
                            {rashi.element || "No element"}
                          </Text>

                          <Text
                            numberOfLines={2}
                            style={styles.itemDescription}
                          >
                            {rashi.description || "No description added"}
                          </Text>

                          <View style={styles.itemMetaRow}>
                            <View style={styles.metaItem}>
                              <Ionicons
                                name="reorder-three-outline"
                                size={14}
                                color={COLORS.muted}
                              />
                              <Text style={styles.metaText}>
                                Order {rashi.sortOrder}
                              </Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons
                                name="calendar-outline"
                                size={13}
                                color={COLORS.muted}
                              />
                              <Text style={styles.metaText}>
                                {formatDate(rashi.updatedAt)}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.imageFileText} numberOfLines={1}>
                            Image: {fileNameFromUrl(rashi.imageUrl)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.actionRow}>
                        {busy ? (
                          <View style={styles.actionLoading}>
                            <ActivityIndicator
                              size="small"
                              color={COLORS.primary}
                            />
                            <Text style={styles.actionLoadingText}>
                              Updating...
                            </Text>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.iconBtn}
                              onPress={() => handleToggleActive(rashi)}
                            >
                              <Ionicons
                                name={
                                  rashi.isActive
                                    ? "pause-outline"
                                    : "play-outline"
                                }
                                size={18}
                                color={
                                  rashi.isActive
                                    ? COLORS.warning
                                    : COLORS.success
                                }
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.iconBtn}
                              onPress={() => selectRashi(rashi)}
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={COLORS.primary}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.iconBtn, styles.deleteIconBtn]}
                              onPress={() => deleteRashi(rashi)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={COLORS.danger}
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 8px 22px rgba(0,0,0,0.22)" },
  default: { elevation: 4 },
});

const styles = StyleSheet.create({
  page: {
    paddingBottom: 20,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    ...shadow,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 13,
    ...shadow,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  noticeBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    color: "#D1D5DB",
    fontWeight: "700",
    fontSize: 12,
  },
  layout: {
    flexDirection: "row",
    gap: 14,
  },
  formCard: {
    width: "38%",
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...shadow,
  },
  rightCol: {
    width: "62%",
    gap: 14,
  },
  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...shadow,
  },
  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...shadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubTitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  resetBtn: {
    borderRadius: 12,
    backgroundColor: "#1F2937",
    paddingHorizontal: 12,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resetText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  label: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 6,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    minHeight: 46,
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 14,
    color: "#fff",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  uploadBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  uploadText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  toggleBtn: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  activeBtn: {
    backgroundColor: COLORS.success,
  },
  inactiveBtn: {
    backgroundColor: COLORS.warning,
  },
  toggleText: {
    color: "#fff",
    fontWeight: "900",
  },
  saveBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.75,
  },
  previewBox: {
    backgroundColor: COLORS.input,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2B3354",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#111827",
  },
  imagePlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  previewBody: {
    padding: 14,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  previewSubtitle: {
    color: "#E9D5FF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  previewDescription: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  previewMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    backgroundColor: "#211B3A",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  greenChip: {
    backgroundColor: "#065F46",
  },
  grayChip: {
    backgroundColor: "#374151",
  },
  chipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  imageFileText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 11,
  },
  listHeader: {
    marginBottom: 12,
    gap: 10,
  },
  refreshBtn: {
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  refreshText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  listWrap: {
    gap: 10,
  },
  emptyBox: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  itemCard: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
    padding: 12,
  },
  itemCardSelected: {
    borderColor: COLORS.primary,
  },
  itemMain: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: "#111827",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
  },
  inactiveBadge: {
    backgroundColor: COLORS.warning,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  itemSubtitle: {
    color: "#D8B4FE",
    fontSize: 12,
    marginTop: 4,
  },
  itemDescription: {
    color: "#CBD5E1",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  itemMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionLoading: {
    height: 34,
    minWidth: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionLoadingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
});
