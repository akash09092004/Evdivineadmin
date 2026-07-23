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
  useWindowDimensions,
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

const COLORS = {
  card: "#151B2E",
  cardSoft: "#0E0826",
  input: "#0B1020",
  border: "#242B45",
  muted: "#A7B0D1",
  primary: "#8B5CF6",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  chip: "#211B3A",
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  element: "",
  shortDescription: "",
  longContent: "",
  benefits: "",
  consultationPrice: "",
  offerPrice: "",
  sortOrder: "1",
  isActive: true,
  imageUrl: "",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function normalizeBenefits(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  return text
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function benefitsToText(value) {
  return normalizeBenefits(value).join(", ");
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

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return `$${number.toLocaleString("en-US")}`;
}

function formatUsdValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  return `$${number.toLocaleString("en-US")}`;
}

function normalizeRashi(item, index = 0) {
  const imageUrl = resolveAssetUrl(item?.imageUrl || item?.image || "");
  const sortOrder = Number(item?.sortOrder ?? index + 1) || index + 1;
  const consultationPrice = Number(item?.consultationPrice ?? item?.price ?? 0);
  const offerPrice = Number(
    item?.offerPrice ??
      item?.offer ??
      item?.discountPrice ??
      item?.salePrice ??
      item?.consultationOfferPrice ??
      0
  );
  const benefitsValue =
    item?.benefits ?? item?.benefit ?? item?.highlights ?? "";

  return {
    id: item?._id || item?.id || `rashi-${index + 1}`,
    name: item?.name || "Untitled Rashi",
    slug: item?.slug || "",
    element: item?.element || "",
    shortDescription:
      item?.shortDescription || item?.description || item?.summary || "",
    longContent: item?.longContent || item?.content || "",
    benefits: benefitsToText(benefitsValue),
    consultationPrice: Number.isFinite(consultationPrice)
      ? consultationPrice
      : "",
    offerPrice: Number.isFinite(offerPrice) ? offerPrice : "",
    sortOrder,
    isActive: item?.isActive ?? item?.active ?? true,
    imageUrl,
    updatedAt: item?.updatedAt || item?.modifiedAt || item?.createdAt || "",
  };
}

function buildRashiFormData(form, imageFile, removeImage) {
  const payload = new FormData();

  payload.append("name", form.name.trim());
  payload.append("slug", form.slug.trim() || slugify(form.name));
  payload.append("element", form.element.trim());
  payload.append("shortDescription", form.shortDescription.trim());
  payload.append("longContent", form.longContent.trim());
  payload.append("benefits", form.benefits.trim());
  payload.append(
    "consultationPrice",
    String(Number(form.consultationPrice) || 0)
  );
  payload.append("offerPrice", String(Number(form.offerPrice) || 0));
  payload.append("sortOrder", String(Number(form.sortOrder) || 1));
  payload.append("isActive", String(Boolean(form.isActive)));

  if (imageFile) {
    payload.append("image", imageFile);
  }

  if (removeImage) {
    payload.append("removeImage", "true");
  }

  return payload;
}

function StatCard({ label, value, icon, tone }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, tone && { backgroundColor: tone }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={String(value ?? "")}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B7AA8"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function Badge({ label, active, tone = "green" }) {
  const badgeStyle =
    tone === "green"
      ? active
        ? styles.greenBadge
        : styles.grayBadge
      : tone === "orange"
      ? styles.orangeBadge
      : styles.grayBadge;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function RashiImage({ uri, style, placeholder }) {
  return (
    <AdminImage
      uri={uri}
      style={style}
      resizeMode="cover"
      placeholderLabel={placeholder}
      renderFallback={() => (
        <View style={[style, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={20} color={COLORS.muted} />
          <Text style={styles.placeholderText}>{placeholder}</Text>
        </View>
      )}
    />
  );
}

export default function Rashis() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const isTablet = width >= 720;

  const [search, setSearch] = useState("");
  const [rashis, setRashis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [selectedRashiId, setSelectedRashiId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadRashis = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("rashis");
      const list = normalizeList(data, ["rashis", "data", "results", "items"]);

      const next = list
        .map((item, index) => normalizeRashi(item, index))
        .sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.name.localeCompare(b.name);
        });

      setRashis(next);
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
        item.shortDescription,
        item.longContent,
        item.benefits,
        String(item.sortOrder),
        String(item.consultationPrice),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rashis, search]);

  const activeCount = rashis.filter((item) => item.isActive).length;
  const inactiveCount = rashis.length - activeCount;
  const currentImageUri =
    imagePreview || (removeImage ? "" : form.imageUrl || "");

  const resetForm = () => {
    if (Platform.OS === "web" && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedRashiId("");
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
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

      if (Platform.OS === "web" && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      const blobUrl = URL.createObjectURL(file);
      setImageFile(file);
      setImagePreview(blobUrl);
      setRemoveImage(false);
    };

    input.click();
  };

  const selectRashi = (rashi) => {
    if (Platform.OS === "web" && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedRashiId(rashi.id);
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
    setForm({
      name: rashi.name || "",
      slug: rashi.slug || "",
      element: rashi.element || "",
      shortDescription: rashi.shortDescription || "",
      longContent: rashi.longContent || "",
      benefits: rashi.benefits || "",
      consultationPrice:
        rashi.consultationPrice !== "" && rashi.consultationPrice !== null
          ? String(rashi.consultationPrice)
          : "",
      offerPrice:
        rashi.offerPrice !== "" && rashi.offerPrice !== null
          ? String(rashi.offerPrice)
          : "",
      sortOrder: String(rashi.sortOrder || 1),
      isActive: Boolean(rashi.isActive),
      imageUrl: rashi.imageUrl || "",
    });
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Rashi name required hai.");
      return false;
    }

    if (!form.element.trim()) {
      Alert.alert("Required", "Element required hai.");
      return false;
    }

    if (!form.shortDescription.trim()) {
      Alert.alert("Required", "Short description fill karo.");
      return false;
    }

    if (!form.longContent.trim()) {
      Alert.alert("Required", "Long content fill karo.");
      return false;
    }

    if (!String(form.consultationPrice).trim()) {
      Alert.alert("Required", "Consultation price fill karo.");
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
        shortDescription: form.shortDescription.trim(),
        longContent: form.longContent.trim(),
        benefits: form.benefits.trim(),
        consultationPrice: Number(form.consultationPrice) || 0,
        offerPrice: Number(form.offerPrice) || 0,
        sortOrder: Number(form.sortOrder) || 1,
        isActive: Boolean(form.isActive),
      };

      const payload = buildRashiFormData(cleanedForm, imageFile, removeImage);

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

  const previewUri = currentImageUri ? resolveAssetUrl(currentImageUri) : "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Rashi Management</Text>
          <Text style={styles.heroSub}>
            Create, edit, image upload, remove image aur active/inactive
            control.
          </Text>
        </View>

        <View style={styles.heroBadge}>
          <Ionicons name="sparkles-outline" size={16} color="#fff" />
          <Text style={styles.heroBadgeText}>{rashis.length} Rashis</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Total"
          value={rashis.length}
          icon="layers-outline"
          tone="#7C3AED"
        />
        <StatCard
          label="Active"
          value={activeCount}
          icon="checkmark-circle-outline"
          tone="#16A34A"
        />
        <StatCard
          label="Inactive"
          value={inactiveCount}
          icon="remove-circle-outline"
          tone="#F59E0B"
        />
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

      <View style={[styles.layout, !isDesktop && styles.layoutStack]}>
        <View style={[styles.formCard, !isDesktop && styles.fullWidth]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {selectedRashiId ? "Edit Rashi" : "Create Rashi"}
              </Text>
              <Text style={styles.cardSubTitle}>
                Name, slug, description, benefits aur image fill karo
              </Text>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <Field
            label="Name"
            placeholder="Aries"
            value={form.name}
            onChangeText={(text) => {
              const nextSlug = form.slug ? form.slug : slugify(text);
              setForm((prev) => ({ ...prev, name: text, slug: nextSlug }));
            }}
          />

          <Field
            label="Slug"
            placeholder="aries"
            value={form.slug}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, slug: text }))
            }
          />

          <Field
            label="Element"
            placeholder="Fire"
            value={form.element}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, element: text }))
            }
          />

          <Field
            label="Short Description"
            placeholder="Bold and energetic rashi..."
            value={form.shortDescription}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, shortDescription: text }))
            }
            multiline
          />

          <Field
            label="Long Content"
            placeholder="Aries ke bare me full detail..."
            value={form.longContent}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, longContent: text }))
            }
            multiline
          />

          <Field
            label="Benefits"
            placeholder="Leadership, confidence, fast action"
            value={form.benefits}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, benefits: text }))
            }
            multiline
          />

          <View style={[styles.formRow, !isTablet && styles.formRowStack]}>
            <View style={styles.flex1}>
              <Field
                label="Consultation Price ($)"
                placeholder="499"
                value={form.consultationPrice}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, consultationPrice: text }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.flex1}>
              <Field
                label="Offer Price ($)"
                placeholder="399"
                value={form.offerPrice}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, offerPrice: text }))
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.flex1}>
              <Field
                label="Sort Order"
                placeholder="1"
                value={form.sortOrder}
                onChangeText={(text) =>
                  setForm((prev) => ({ ...prev, sortOrder: text }))
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Rashi Image</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={openImagePicker}>
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.uploadText}>
              {imageFile?.name ||
                fileNameFromUrl(form.imageUrl) ||
                "Choose image"}
            </Text>
          </TouchableOpacity>

          <View style={styles.imageActionsRow}>
            <View style={styles.imageMetaBox}>
              <Text style={styles.imageMetaLabel}>Current image</Text>
              <Text style={styles.imageMetaValue} numberOfLines={1}>
                {removeImage
                  ? "Will be removed on save"
                  : fileNameFromUrl(currentImageUri)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.removeImageBtn,
                !selectedRashiId && !form.imageUrl && styles.disabledOutline,
              ]}
              onPress={() => setRemoveImage((prev) => !prev)}
              disabled={!selectedRashiId && !form.imageUrl}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.removeImageText}>
                {removeImage ? "Keep Image" : "Remove Image"}
              </Text>
            </TouchableOpacity>
          </View>

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

        <View style={[styles.rightCol, !isDesktop && styles.fullWidth]}>
          <View style={styles.previewCard}>
            <Text style={styles.cardTitle}>Live Preview</Text>
            <Text style={styles.cardSubTitle}>
              Jo image save hui hai wahi yahan dikhegi
            </Text>

            <View
              style={[styles.previewBox, !isTablet && styles.previewBoxStack]}
            >
              <RashiImage
                uri={previewUri}
                style={styles.previewImage}
                placeholder="Image preview"
              />

              <View style={styles.previewBody}>
                <View style={styles.previewTopRow}>
                  <Text style={styles.previewTitle}>
                    {form.name || "Aries"}
                  </Text>
                  <Badge
                    label={form.isActive ? "Active" : "Inactive"}
                    active={form.isActive}
                  />
                </View>

                <Text style={styles.previewSubtitle}>
                  {form.slug || slugify(form.name) || "aries"} -{" "}
                  {form.element || "Fire"}
                </Text>

                <Text style={styles.previewDescription} numberOfLines={4}>
                  {form.shortDescription ||
                    "Bold and energetic description yahan show hoga."}
                </Text>

                <Text style={styles.previewLongText} numberOfLines={4}>
                  {form.longContent || "Long content yahan show hoga."}
                </Text>

                <View style={styles.previewMetaRow}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      Order {form.sortOrder || 1}
                    </Text>
                  </View>

                  <View style={[styles.chip, styles.priceChip]}>
                    <Ionicons
                      name="logo-usd"
                      size={12}
                      color="#fff"
                      style={styles.chipIcon}
                    />
                    <Text style={styles.chipText}>
                      {form.consultationPrice
                        ? formatUsdValue(form.consultationPrice)
                        : "No Price"}
                    </Text>
                  </View>

                  <View style={[styles.chip, styles.offerChip]}>
                    <Ionicons
                      name="logo-usd"
                      size={12}
                      color="#fff"
                      style={styles.chipIcon}
                    />
                    <Text style={styles.chipText}>
                      {form.offerPrice
                        ? formatUsdValue(form.offerPrice)
                        : "No Offer"}
                    </Text>
                  </View>
                </View>

                <View style={styles.benefitWrap}>
                  {normalizeBenefits(form.benefits).length > 0 ? (
                    normalizeBenefits(form.benefits).map((item) => (
                      <View key={item} style={styles.benefitChip}>
                        <Text style={styles.benefitText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.imageFileText}>
                      Benefits yahan show honge.
                    </Text>
                  )}
                </View>

                <Text style={styles.imageFileText} numberOfLines={1}>
                  Image: {fileNameFromUrl(currentImageUri)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Existing Rashis</Text>
                <Text style={styles.cardSubTitle}>
                  Select, update, active/inactive change aur delete karo
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
                filteredRashis.map((rashi, index) => {
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
                        <View style={styles.indexBadge}>
                          <Text style={styles.indexText}>{index + 1}</Text>
                        </View>

                        <RashiImage
                          uri={imageUri}
                          style={styles.thumb}
                          placeholder="No image"
                        />

                        <View style={styles.itemInfo}>
                          <View style={styles.itemTopRow}>
                            <Text numberOfLines={1} style={styles.itemTitle}>
                              {rashi.name}
                            </Text>
                            <Badge
                              label={rashi.isActive ? "Active" : "Inactive"}
                              active={rashi.isActive}
                            />
                          </View>

                          <Text numberOfLines={1} style={styles.itemSubtitle}>
                            {rashi.slug || "no-slug"} -{" "}
                            {rashi.element || "No element"}
                          </Text>

                          <Text
                            numberOfLines={2}
                            style={styles.itemDescription}
                          >
                            {rashi.shortDescription ||
                              "No short description added"}
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
                                name="logo-usd"
                                size={13}
                                color={COLORS.muted}
                              />
                              <Text style={styles.metaText}>
                                {rashi.consultationPrice
                                  ? formatUsdValue(rashi.consultationPrice)
                                  : "No price"}
                              </Text>
                            </View>

                            <View style={styles.metaItem}>
                              <Ionicons
                                name="logo-usd"
                                size={13}
                                color={COLORS.muted}
                              />
                              <Text style={styles.metaText}>
                                {rashi.offerPrice
                                  ? formatUsdValue(rashi.offerPrice)
                                  : "No offer"}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
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
  layoutStack: {
    flexDirection: "column",
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
  fullWidth: {
    width: "100%",
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
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    color: "#D8B4FE",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    minHeight: 46,
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 14,
    color: "#fff",
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formRowStack: {
    flexDirection: "column",
  },
  flex1: {
    flex: 1,
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
    marginBottom: 10,
  },
  uploadText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    flexShrink: 1,
  },
  imageActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  imageMetaBox: {
    flex: 1,
    backgroundColor: COLORS.input,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imageMetaLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  imageMetaValue: {
    color: "#fff",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  removeImageBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
  },
  removeImageText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  disabledOutline: {
    opacity: 0.45,
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
    flexDirection: "column",
  },
  previewBoxStack: {
    flexDirection: "column",
  },
  previewImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#111827",
  },
  imagePlaceholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    backgroundColor: "#111827",
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  previewBody: {
    padding: 14,
  },
  previewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    flex: 1,
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
  previewLongText: {
    color: "#B8C1E0",
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
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  priceChip: {
    backgroundColor: "#312E81",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  offerChip: {
    backgroundColor: "#4C1D95",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipIcon: {
    marginRight: 1,
  },
  chipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  greenBadge: {
    backgroundColor: COLORS.success,
  },
  grayBadge: {
    backgroundColor: "#374151",
  },
  orangeBadge: {
    backgroundColor: COLORS.warning,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  benefitWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  benefitChip: {
    backgroundColor: "#312E81",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  benefitText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  imageFileText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 11,
  },
  listHeader: {
    marginBottom: 12,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  indexBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
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
