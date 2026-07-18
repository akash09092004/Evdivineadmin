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
  adminDeleteBanner,
  adminGet,
  adminSaveBanner,
  adminSetBannerActive,
  adminPutBanner,
  normalizeList,
} from "../utils/adminApi";

const COLORS = {
  primary: "#7C3AED",
  primaryDark: "#5B21B6",
  primaryLight: "#F4F0FF",
  primaryBorder: "#E4D8FF",

  background: "#F7F8FC",
  card: "#FFFFFF",
  input: "#FAFAFD",

  heading: "#1E1633",
  text: "#4B5563",
  muted: "#8B91A1",
  border: "#E8EAF0",

  green: "#16A34A",
  greenLight: "#ECFDF3",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  red: "#DC2626",
  redLight: "#FEF2F2",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
};

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  linkType: "screen",
  linkValue: "",
  sortOrder: 1,
  isActive: true,
};

function normalizeBanner(item, index = 0) {
  return {
    id: item?._id || item?.id || `banner-${index + 1}`,
    title: item?.title || "Untitled Banner",
    subtitle: item?.subtitle || "",
    description: item?.description || "",
    imageUrl: resolveAssetUrl(item?.imageUrl || item?.image || ""),
    linkType: item?.linkType || "screen",
    linkValue: item?.linkValue || "",
    sortOrder: item?.sortOrder ?? index + 1,
    isActive: item?.isActive ?? item?.active ?? true,
    createdAt: item?.createdAt || "",
    updatedAt: item?.updatedAt || "",
  };
}

function formatDate(value) {
  if (!value) return "Not updated";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not updated";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFileName(value) {
  if (!value) return "No image selected";

  try {
    const parsed = new URL(String(value));
    return (
      parsed.pathname.split("/").filter(Boolean).pop() ||
      parsed.hostname ||
      "Banner image"
    );
  } catch (error) {
    return String(value).split("/").filter(Boolean).pop() || "Banner image";
  }
}

function createBannerFormData(form, imageFile) {
  const payload = new FormData();

  payload.append("title", form.title.trim());
  payload.append("subtitle", form.subtitle.trim());
  payload.append("description", form.description.trim());
  payload.append("linkType", form.linkType.trim() || "screen");
  payload.append("linkValue", form.linkValue.trim());
  payload.append("sortOrder", String(Number(form.sortOrder) || 1));
  payload.append("isActive", String(Boolean(form.isActive)));

  if (imageFile) {
    payload.append("image", imageFile);
  }

  return payload;
}

function SmallStatCard({
  icon,
  label,
  value,
  iconColor,
  iconBackground,
  compact,
}) {
  return (
    <View style={[styles.statCard, compact && styles.statCardCompact]}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>

      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          multiline && styles.textAreaWrapper,
          !editable && styles.inputDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.muted}
          style={multiline ? styles.textAreaIcon : null}
        />

        <TextInput
          style={[styles.input, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A7ACB8"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          editable={editable}
        />
      </View>
    </View>
  );
}

export default function Banners() {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1050;
  const isTablet = width >= 700;
  const isSmallMobile = width < 420;

  const [search, setSearch] = useState("");
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const [selectedBannerId, setSelectedBannerId] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState(emptyForm);

  const loadBanners = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("banners");

      const list = normalizeList(data, ["banners", "data", "results", "items"]);

      setBanners(list.map((item, index) => normalizeBanner(item, index)));
    } catch (err) {
      setBanners([]);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Banners load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === "web" && imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredBanners = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return banners;
    }

    return banners.filter((item) =>
      [
        item.title,
        item.subtitle,
        item.description,
        item.linkType,
        item.linkValue,
        String(item.sortOrder),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [banners, search]);

  const activeCount = useMemo(
    () => banners.filter((item) => item.isActive).length,
    [banners]
  );

  const inactiveCount = banners.length - activeCount;

  const updateForm = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const clearBlobPreview = () => {
    if (Platform.OS === "web" && imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
  };

  const resetForm = () => {
    clearBlobPreview();

    setSelectedBannerId("");
    setImageFile(null);
    setImagePreview("");
    setForm(emptyForm);
  };

  const openImagePicker = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert(
        "Image Upload",
        "File image upload abhi web admin panel par supported hai."
      );
      return;
    }

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        Alert.alert("Large Image", "Image size 5 MB se kam honi chahiye.");
        return;
      }

      clearBlobPreview();

      const preview = URL.createObjectURL(file);

      setImageFile(file);
      setImagePreview(preview);
      updateForm("imageUrl", "");
    };

    input.click();
  };

  const removeSelectedImage = () => {
    clearBlobPreview();

    setImageFile(null);
    setImagePreview("");
    updateForm("imageUrl", "");
  };

  const selectBanner = (banner) => {
    clearBlobPreview();

    setSelectedBannerId(banner.id);
    setImageFile(null);
    setImagePreview("");

    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      imageUrl: banner.imageUrl || "",
      linkType: banner.linkType || "screen",
      linkValue: banner.linkValue || "",
      sortOrder: Number(banner.sortOrder || 1),
      isActive: Boolean(banner.isActive),
    });

    if (Platform.OS === "web") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      Alert.alert("Required", "Banner title enter karo.");
      return false;
    }

    if (!selectedBannerId && !imageFile) {
      Alert.alert("Required", "Banner image upload karo.");
      return false;
    }

    if (selectedBannerId && !imageFile && !form.imageUrl.trim()) {
      Alert.alert("Required", "Banner image upload karo.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const cleanedForm = {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        linkType: form.linkType.trim() || "screen",
        linkValue: form.linkValue.trim(),
        sortOrder: Number(form.sortOrder) || 1,
        isActive: Boolean(form.isActive),
      };

      const payload = imageFile
        ? createBannerFormData(cleanedForm, imageFile)
        : cleanedForm;

      if (selectedBannerId) {
        await adminPutBanner(selectedBannerId, payload);

        Alert.alert("Banner Updated", "Banner successfully update ho gaya.");
      } else {
        await adminSaveBanner(payload);

        Alert.alert(
          "Banner Created",
          "New banner successfully create ho gaya."
        );
      }

      resetForm();
      await loadBanners();
    } catch (err) {
      Alert.alert(
        "Save Failed",
        err?.response?.data?.message ||
          err?.message ||
          "Banner save nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner) => {
    const nextActive = !banner.isActive;

    setActionId(banner.id);

    setBanners((previous) =>
      previous.map((item) =>
        item.id === banner.id
          ? {
              ...item,
              isActive: nextActive,
            }
          : item
      )
    );

    try {
      await adminSetBannerActive(banner.id, nextActive);
    } catch (err) {
      setBanners((previous) =>
        previous.map((item) =>
          item.id === banner.id
            ? {
                ...item,
                isActive: banner.isActive,
              }
            : item
        )
      );

      Alert.alert(
        "Update Failed",
        err?.response?.data?.message ||
          err?.message ||
          "Banner status update nahi ho paya."
      );
    } finally {
      setActionId("");
    }
  };

  const deleteBannerRequest = async (banner) => {
    setActionId(banner.id);

    const previousBanners = banners;

    setBanners((previous) => previous.filter((item) => item.id !== banner.id));

    try {
      await adminDeleteBanner(banner.id);

      if (selectedBannerId === banner.id) {
        resetForm();
      }
    } catch (err) {
      setBanners(previousBanners);

      Alert.alert(
        "Delete Failed",
        err?.response?.data?.message ||
          err?.message ||
          "Banner delete nahi ho paya."
      );
    } finally {
      setActionId("");
    }
  };

  const handleDelete = (banner) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `"${banner.title}" banner delete karna hai?`
      );

      if (confirmed) {
        deleteBannerRequest(banner);
      }

      return;
    }

    Alert.alert("Delete Banner", `"${banner.title}" banner delete karna hai?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteBannerRequest(banner),
      },
    ]);
  };

  const previewSource = imagePreview || form.imageUrl || "";
  const previewImageUrl = previewSource ? resolveAssetUrl(previewSource) : "";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.page, isDesktop && styles.pageDesktop]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[styles.pageHeader, isSmallMobile && styles.pageHeaderMobile]}
      >
        <View style={styles.headerTitleArea}>
          <View style={styles.headerIcon}>
            <Ionicons name="images-outline" size={23} color={COLORS.primary} />
          </View>

          <View style={styles.headerTextArea}>
            <Text style={styles.pageTitle}>Banner Management</Text>

            <Text style={styles.pageDescription}>
              Homepage banners create, edit aur manage karo.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          activeOpacity={0.75}
          onPress={loadBanners}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          )}

          {!isSmallMobile && (
            <Text style={styles.refreshButtonText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.statsRow, !isTablet && styles.statsRowMobile]}>
        <SmallStatCard
          icon="albums-outline"
          label="Total Banners"
          value={banners.length}
          iconColor={COLORS.primary}
          iconBackground={COLORS.primaryLight}
          compact={!isTablet}
        />

        <SmallStatCard
          icon="checkmark-circle-outline"
          label="Active"
          value={activeCount}
          iconColor={COLORS.green}
          iconBackground={COLORS.greenLight}
          compact={!isTablet}
        />

        <SmallStatCard
          icon="pause-circle-outline"
          label="Inactive"
          value={inactiveCount}
          iconColor={COLORS.orange}
          iconBackground={COLORS.orangeLight}
          compact={!isTablet}
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.red} />

          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity style={styles.retryButton} onPress={loadBanners}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        style={[
          styles.mainLayout,
          {
            flexDirection: isDesktop ? "row" : "column",
          },
        ]}
      >
        <View
          style={[
            styles.formCard,
            isDesktop ? styles.formCardDesktop : styles.formCardMobile,
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {selectedBannerId ? "Edit Banner" : "Create Banner"}
              </Text>

              <Text style={styles.cardDescription}>
                Banner details carefully fill karo.
              </Text>
            </View>

            {selectedBannerId ? (
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={resetForm}
              >
                <Ionicons name="close-outline" size={17} color={COLORS.text} />

                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.formBody}>
            <FormField
              label="Banner Title"
              icon="text-outline"
              value={form.title}
              onChangeText={(text) => updateForm("title", text)}
              placeholder="Example: First consultation offer"
            />

            <FormField
              label="Subtitle"
              icon="reader-outline"
              value={form.subtitle}
              onChangeText={(text) => updateForm("subtitle", text)}
              placeholder="Example: Limited time offer"
            />

            <FormField
              label="Description"
              icon="document-text-outline"
              value={form.description}
              onChangeText={(text) => updateForm("description", text)}
              placeholder="Banner ka short description..."
              multiline
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Banner Image</Text>

              <TouchableOpacity
                style={styles.uploadArea}
                activeOpacity={0.8}
                onPress={openImagePicker}
              >
                <View style={styles.uploadIcon}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.uploadContent}>
                  <Text style={styles.uploadTitle}>Choose image</Text>

                  <Text style={styles.uploadDescription} numberOfLines={1}>
                    {imageFile?.name ||
                      getFileName(form.imageUrl) ||
                      "PNG, JPG or WEBP"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>

              {(imageFile || form.imageUrl) && (
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeSelectedImage}
                >
                  <Ionicons name="trash-outline" size={14} color={COLORS.red} />

                  <Text style={styles.removeImageText}>
                    Remove selected image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.twoColumnRow,
                isSmallMobile && styles.twoColumnMobile,
              ]}
            >
              <View style={styles.column}>
                <FormField
                  label="Link Type"
                  icon="navigate-outline"
                  value={form.linkType}
                  onChangeText={(text) => updateForm("linkType", text)}
                  placeholder="screen"
                />
              </View>

              <View style={styles.column}>
                <FormField
                  label="Sort Order"
                  icon="reorder-three-outline"
                  value={String(form.sortOrder)}
                  onChangeText={(text) =>
                    updateForm("sortOrder", text.replace(/[^0-9]/g, ""))
                  }
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <FormField
              label="Link Value"
              icon="open-outline"
              value={form.linkValue}
              onChangeText={(text) => updateForm("linkValue", text)}
              placeholder="Example: Booking"
            />

            <View style={styles.statusSetting}>
              <View
                style={[
                  styles.statusSettingIcon,
                  {
                    backgroundColor: form.isActive
                      ? COLORS.greenLight
                      : COLORS.orangeLight,
                  },
                ]}
              >
                <Ionicons
                  name={
                    form.isActive
                      ? "checkmark-circle-outline"
                      : "pause-circle-outline"
                  }
                  size={20}
                  color={form.isActive ? COLORS.green : COLORS.orange}
                />
              </View>

              <View style={styles.statusSettingText}>
                <Text style={styles.statusSettingTitle}>Banner Status</Text>

                <Text style={styles.statusSettingDescription}>
                  {form.isActive
                    ? "Banner users ko visible rahega."
                    : "Banner users ko visible nahi hoga."}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.switchTrack,
                  form.isActive && styles.switchTrackActive,
                ]}
                activeOpacity={0.8}
                onPress={() => updateForm("isActive", !form.isActive)}
              >
                <View
                  style={[
                    styles.switchThumb,
                    form.isActive && styles.switchThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              activeOpacity={0.85}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={
                    selectedBannerId
                      ? "checkmark-circle-outline"
                      : "add-circle-outline"
                  }
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving..."
                  : selectedBannerId
                  ? "Update Banner"
                  : "Create Banner"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.rightColumn,
            isDesktop ? styles.rightColumnDesktop : styles.rightColumnMobile,
          ]}
        >
          <View style={styles.previewCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Live Preview</Text>

                <Text style={styles.cardDescription}>
                  Homepage par banner kuch aisa dikhega.
                </Text>
              </View>

              <View
                style={[
                  styles.previewStatus,
                  form.isActive
                    ? styles.previewStatusActive
                    : styles.previewStatusInactive,
                ]}
              >
                <View
                  style={[
                    styles.previewStatusDot,
                    {
                      backgroundColor: form.isActive
                        ? COLORS.green
                        : COLORS.orange,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.previewStatusText,
                    {
                      color: form.isActive ? COLORS.green : COLORS.orange,
                    },
                  ]}
                >
                  {form.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            <View style={styles.bannerPreview}>
              {previewImageUrl ? (
                <AdminImage
                  uri={previewImageUrl}
                  style={[
                    styles.previewImage,
                    {
                      height: isSmallMobile ? 150 : 210,
                    },
                  ]}
                  resizeMode="cover"
                  placeholderLabel="Banner image preview"
                />
              ) : (
                <View
                  style={[
                    styles.previewPlaceholder,
                    {
                      height: isSmallMobile ? 150 : 210,
                    },
                  ]}
                >
                  <View style={styles.placeholderIcon}>
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={COLORS.primary}
                    />
                  </View>

                  <Text style={styles.placeholderTitle}>
                    Banner image preview
                  </Text>

                  <Text style={styles.placeholderDescription}>
                    Direct image upload karo.
                  </Text>
                </View>
              )}

              <View style={styles.previewContent}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {form.title || "Your banner title"}
                </Text>

                <Text style={styles.previewSubtitle} numberOfLines={2}>
                  {form.subtitle || "Banner subtitle yahan show hoga."}
                </Text>

                {form.description ? (
                  <Text style={styles.previewDescription} numberOfLines={3}>
                    {form.description}
                  </Text>
                ) : null}

                <View style={styles.previewBottomRow}>
                  <View style={styles.previewLinkBadge}>
                    <Ionicons
                      name="navigate-outline"
                      size={13}
                      color={COLORS.primary}
                    />

                    <Text style={styles.previewLinkText} numberOfLines={1}>
                      {form.linkType || "screen"}
                      {" · "}
                      {form.linkValue || "No link"}
                    </Text>
                  </View>

                  <Text style={styles.previewOrder}>
                    Order #{form.sortOrder || 1}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.listCard}>
            <View
              style={[
                styles.listHeader,
                isSmallMobile && styles.listHeaderMobile,
              ]}
            >
              <View style={styles.listTitleArea}>
                <Text style={styles.cardTitle}>Existing Banners</Text>

                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {filteredBanners.length}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.searchWrapper,
                  isSmallMobile && styles.searchWrapperMobile,
                ]}
              >
                <SearchBar
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search banner..."
                />
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />

                <Text style={styles.loadingText}>Banners loading...</Text>
              </View>
            ) : filteredBanners.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="images-outline"
                    size={28}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>No banner found</Text>

                <Text style={styles.emptyDescription}>
                  Search change karo ya naya banner create karo.
                </Text>
              </View>
            ) : (
              <View style={styles.bannerList}>
                {filteredBanners.map((banner) => {
                  const busy = actionId === banner.id;

                  return (
                    <View
                      key={banner.id}
                      style={[
                        styles.bannerItem,
                        selectedBannerId === banner.id &&
                          styles.bannerItemSelected,
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.bannerMainArea,
                          isSmallMobile && styles.bannerMainAreaMobile,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => selectBanner(banner)}
                      >
                        <AdminImage
                          uri={
                            resolveAssetUrl(banner.imageUrl) ||
                            "https://placehold.co/200x120/F4F0FF/7C3AED?text=Banner"
                          }
                          style={[
                            styles.bannerThumbnail,
                            isSmallMobile && styles.bannerThumbnailMobile,
                          ]}
                          resizeMode="cover"
                          placeholderLabel="Banner"
                        />

                        <View style={styles.bannerDetails}>
                          <View style={styles.bannerTitleRow}>
                            <Text style={styles.bannerTitle} numberOfLines={1}>
                              {banner.title}
                            </Text>

                            <View
                              style={[
                                styles.statusBadge,
                                banner.isActive
                                  ? styles.activeBadge
                                  : styles.inactiveBadge,
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusDot,
                                  {
                                    backgroundColor: banner.isActive
                                      ? COLORS.green
                                      : COLORS.orange,
                                  },
                                ]}
                              />

                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: banner.isActive
                                      ? COLORS.green
                                      : COLORS.orange,
                                  },
                                ]}
                              >
                                {banner.isActive ? "Active" : "Inactive"}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.bannerSubtitle} numberOfLines={1}>
                            {banner.subtitle ||
                              banner.description ||
                              "No subtitle added"}
                          </Text>

                          <View style={styles.bannerMetaRow}>
                            <View style={styles.metaItem}>
                              <Ionicons
                                name="reorder-three-outline"
                                size={14}
                                color={COLORS.muted}
                              />

                              <Text style={styles.metaText}>
                                Order {banner.sortOrder}
                              </Text>
                            </View>

                            <View style={styles.metaItem}>
                              <Ionicons
                                name="calendar-outline"
                                size={13}
                                color={COLORS.muted}
                              />

                              <Text style={styles.metaText}>
                                {formatDate(banner.updatedAt)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.bannerActions}>
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
                              style={styles.iconActionButton}
                              onPress={() => handleToggleActive(banner)}
                            >
                              <Ionicons
                                name={
                                  banner.isActive
                                    ? "pause-outline"
                                    : "play-outline"
                                }
                                size={18}
                                color={
                                  banner.isActive ? COLORS.orange : COLORS.green
                                }
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.iconActionButton}
                              onPress={() => selectBanner(banner)}
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={COLORS.blue}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.iconActionButton,
                                styles.deleteIconButton,
                              ]}
                              onPress={() => handleDelete(banner)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={COLORS.red}
                              />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const cardShadow = Platform.select({
  web: {
    boxShadow: "0px 8px 28px rgba(31, 41, 55, 0.06)",
  },
  android: {
    elevation: 2,
  },
  default: {
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingBottom: 28,
    backgroundColor: COLORS.background,
  },

  pageDesktop: {
    paddingRight: 2,
  },

  pageHeader: {
    minHeight: 76,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    ...cardShadow,
  },

  pageHeaderMobile: {
    paddingHorizontal: 14,
  },

  headerTitleArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  headerIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTextArea: {
    flex: 1,
    minWidth: 0,
  },

  pageTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.heading,
  },

  pageDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.muted,
  },

  refreshButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  refreshButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  statsRowMobile: {
    gap: 8,
  },

  statCard: {
    flex: 1,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    ...cardShadow,
  },

  statCardCompact: {
    minHeight: 74,
    paddingHorizontal: 9,
    gap: 7,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  statContent: {
    flex: 1,
    minWidth: 0,
  },

  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },

  statValue: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.heading,
  },

  errorBox: {
    minHeight: 48,
    marginBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#991B1B",
    fontWeight: "600",
  },

  retryButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },

  retryButtonText: {
    fontSize: 11,
    color: COLORS.red,
    fontWeight: "700",
  },

  mainLayout: {
    width: "100%",
    gap: 14,
    alignItems: "stretch",
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...cardShadow,
  },

  formCardDesktop: {
    flexGrow: 38,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 340,
    maxWidth: 460,
  },

  formCardMobile: {
    width: "100%",
  },

  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...cardShadow,
  },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    ...cardShadow,
  },

  rightColumn: {
    gap: 14,
    minWidth: 0,
  },

  rightColumnDesktop: {
    flexGrow: 60,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },

  rightColumnMobile: {
    width: "100%",
  },

  cardHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.heading,
  },

  cardDescription: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.muted,
  },

  cancelEditButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cancelEditText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },

  formBody: {
    padding: 16,
  },

  fieldGroup: {
    marginBottom: 13,
  },

  label: {
    marginBottom: 6,
    marginLeft: 1,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },

  inputWrapper: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  inputDisabled: {
    opacity: 0.6,
  },

  textAreaWrapper: {
    minHeight: 88,
    alignItems: "flex-start",
    paddingTop: 12,
  },

  textAreaIcon: {
    marginTop: 1,
  },

  input: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 0,
    fontSize: 12,
    color: COLORS.heading,
    outlineStyle: "none",
  },

  textArea: {
    minHeight: 72,
    paddingTop: 0,
  },

  uploadArea: {
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primaryBorder,
    backgroundColor: "#FCFAFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  uploadContent: {
    flex: 1,
    minWidth: 0,
  },

  uploadTitle: {
    fontSize: 12,
    color: COLORS.heading,
    fontWeight: "700",
  },

  uploadDescription: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.muted,
  },

  removeImageButton: {
    marginTop: 7,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  removeImageText: {
    fontSize: 10,
    color: COLORS.red,
    fontWeight: "600",
  },

  dividerRow: {
    marginTop: -1,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.muted,
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
  },

  twoColumnMobile: {
    flexDirection: "column",
    gap: 0,
  },

  column: {
    flex: 1,
  },

  statusSetting: {
    minHeight: 64,
    marginTop: 1,
    marginBottom: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  statusSettingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  statusSettingText: {
    flex: 1,
    minWidth: 0,
  },

  statusSettingTitle: {
    fontSize: 12,
    color: COLORS.heading,
    fontWeight: "700",
  },

  statusSettingDescription: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.muted,
  },

  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 20,
    padding: 3,
    backgroundColor: "#D1D5DB",
  },

  switchTrackActive: {
    backgroundColor: COLORS.primary,
  },

  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.card,
  },

  switchThumbActive: {
    alignSelf: "flex-end",
  },

  saveButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  previewStatus: {
    minHeight: 29,
    paddingHorizontal: 9,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  previewStatusActive: {
    backgroundColor: COLORS.greenLight,
  },

  previewStatusInactive: {
    backgroundColor: COLORS.orangeLight,
  },

  previewStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  previewStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  bannerPreview: {
    marginTop: 15,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.input,
  },

  previewImage: {
    width: "100%",
    backgroundColor: COLORS.primaryLight,
  },

  previewPlaceholder: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF9FF",
  },

  placeholderIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.heading,
  },

  placeholderDescription: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.muted,
  },

  previewContent: {
    padding: 14,
    backgroundColor: COLORS.card,
  },

  previewTitle: {
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.heading,
    fontWeight: "800",
  },

  previewSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  previewDescription: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.text,
  },

  previewBottomRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  previewLinkBadge: {
    flex: 1,
    minWidth: 0,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  previewLinkText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },

  previewOrder: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
  },

  listHeader: {
    minHeight: 52,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  listHeaderMobile: {
    alignItems: "stretch",
    flexDirection: "column",
  },

  listTitleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  countBadge: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },

  countBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "800",
  },

  searchWrapper: {
    width: 260,
  },

  searchWrapperMobile: {
    width: "100%",
  },

  loadingBox: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },

  emptyBox: {
    minHeight: 190,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 11,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.heading,
  },

  emptyDescription: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "center",
  },

  bannerList: {
    gap: 9,
  },

  bannerItem: {
    padding: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  bannerItemSelected: {
    borderColor: COLORS.primaryBorder,
    backgroundColor: "#FDFCFF",
  },

  bannerMainArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  bannerMainAreaMobile: {
    alignItems: "flex-start",
  },

  bannerThumbnail: {
    width: 88,
    height: 62,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
  },

  bannerThumbnailMobile: {
    width: 70,
    height: 58,
  },

  bannerDetails: {
    flex: 1,
    minWidth: 0,
  },

  bannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  bannerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.heading,
  },

  bannerSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.text,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  activeBadge: {
    backgroundColor: COLORS.greenLight,
  },

  inactiveBadge: {
    backgroundColor: COLORS.orangeLight,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  bannerMetaRow: {
    marginTop: 7,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 9,
    color: COLORS.muted,
  },

  bannerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  deleteIconButton: {
    backgroundColor: COLORS.redLight,
    borderColor: "#FEE2E2",
  },

  actionLoading: {
    minWidth: 92,
    height: 34,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },

  actionLoadingText: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "600",
  },
});
