import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminGet, adminPut, normalizeList } from "../utils/adminApi";
import { pageContentOptions } from "../utils/adminMenu";

const fallbackPages = [
  { title: "My Profile", file: "src/Profile/My Profile.js" },
  { title: "My Booking", file: "src/Profile/My Booking.js" },
  { title: "Booking History", file: "src/Profile/Booking History.js" },
  { title: "Payment Methods", file: "src/Profile/Payment Methods.js" },
  { title: "Notifications", file: "src/Profile/Notifications.js" },
  { title: "Help Support", file: "src/Profile/Help Support.js" },
  { title: "Contact Us", file: "src/Profile/contact us.js" },
  { title: "Legal Info", file: "src/Profile/legal info.js" },
  { title: "Logout", file: "src/Profile/Logout.js" },
  { title: "FAQ", file: "src/Profile/FAQ.js" },
  { title: "Agreement", file: "src/Profile/Agreement.js" },
  { title: "Terms and Conditions", file: "src/Profile/Terms and condition.js" },
  { title: "Privacy Policies", file: "src/Profile/Privacy Policies.js" },
  {
    title: "Advisor Terms and Conditions",
    file: "src/Profile/Advisor Terms and Condition .js",
  },
];

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function buildBasePages() {
  const optionPages = pageContentOptions.map((title) => ({
    title,
    file: "Backend content",
  }));

  const combined = [...fallbackPages, ...optionPages];
  const unique = [];
  const seen = new Set();

  combined.forEach((page) => {
    const key = normalizeTitle(page.title);
    if (!key || seen.has(key)) return;

    seen.add(key);
    unique.push(page);
  });

  return unique;
}

function mergeBackendPages(basePages, backendPages) {
  const merged = [...basePages];

  backendPages.forEach((page) => {
    const key = normalizeTitle(page.title);
    const index = merged.findIndex((item) => normalizeTitle(item.title) === key);

    if (index >= 0) {
      merged[index] = { ...merged[index], ...page };
      return;
    }

    merged.push(page);
  });

  return merged;
}

export default function PageContent() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [search, setSearch] = useState("");
  const basePages = useMemo(() => buildBasePages(), []);
  const [pageQuery, setPageQuery] = useState(basePages[0].title);
  const [selectedPage, setSelectedPage] = useState(basePages[0]);
  const [pages, setPages] = useState(basePages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "My Profile",
    keywords: "",
    description: "",
    content: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadPages = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await adminGet("pageContent");
        if (!mounted) return;

        const list = normalizeList(data, ["pages", "pageContent", "data"]);
        const backendPages = list.map((item) => ({
            title: item.title || item.page || item.name || "Untitled",
            file: item.file || item.path || "Backend content",
            keywords: item.keywords || "",
            description: item.description || "",
            content: item.content || "",
          }));
        const mergedPages = mergeBackendPages(basePages, backendPages);

        setPages(mergedPages);

        const nextSelected =
          mergedPages.find((page) => normalizeTitle(page.title) === normalizeTitle(selectedPage?.title)) ||
          mergedPages[0];

        if (nextSelected) {
          setSelectedPage(nextSelected);
          setPageQuery(nextSelected.title);
          setForm({
            title: nextSelected.title,
            keywords: nextSelected.keywords || "",
            description: nextSelected.description || "",
            content: nextSelected.content || "",
          });
        }
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Page content load nahi ho paya."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPages();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPages = useMemo(() => {
    return pages.filter((page) =>
      normalizeTitle(page.title).includes(normalizeTitle(search))
    );
  }, [search, pages]);

  const queryMatches = useMemo(() => {
    return pages.filter((page) =>
      normalizeTitle(page.title).includes(normalizeTitle(pageQuery))
    );
  }, [pageQuery, pages]);

  const openPage = (page) => {
    setSelectedPage(page);
    setPageQuery(page.title);
    setForm({
      title: page.title,
      keywords: page.keywords || "",
      description: page.description || "",
      content: page.content || `${page.title} page ka content yahan edit karo.`,
    });
  };

  const handleFind = () => {
    const term = normalizeTitle(pageQuery);
    const exactMatch = pages.find((page) => normalizeTitle(page.title) === term);
    const firstMatch = queryMatches[0];

    if (exactMatch) {
      openPage(exactMatch);
      return;
    }

    if (firstMatch) {
      openPage(firstMatch);
      return;
    }

    Alert.alert(
      "Not Found",
      "Is naam ka page nahi mila. Thoda short ya sahi naam likh ke phir try karo."
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminPut("pageContent", {
        page: selectedPage.title,
        ...form,
      });
      Alert.alert("Success", `${selectedPage.title} content saved successfully`);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Content save nahi ho paya"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.mainTitle}>Page Content Management</Text>
          <Text style={styles.mainSub}>
            Profile folder ke pages search karke content edit karo
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#A855F7" />
          <Text style={styles.statusText}>Page content loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.wrapper, { flexDirection: isDesktop ? "row" : "column" }]}>
        <View style={[styles.leftBox, { width: isDesktop ? "34%" : "100%" }]}>
          <Text style={styles.boxTitle}>Search Profile Pages</Text>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#A855F7" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search page..."
              placeholderTextColor="#8B7AA8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {filteredPages.map((page, index) => {
            const active = selectedPage?.title === page.title;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.pageItem, active && styles.activePage]}
                onPress={() => openPage(page)}
              >
                <View style={styles.pageIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={active ? "#fff" : "#A855F7"}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.pageText, active && styles.activeText]}>
                    {page.title}
                  </Text>
                  <Text style={[styles.fileText, active && styles.activeFile]}>
                    {page.file}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.rightBox, { width: isDesktop ? "64%" : "100%" }]}>
          <Text style={styles.boxTitle}>Edit Page Content</Text>

          <Text style={styles.label}>Select Page</Text>
          <View style={styles.findRow}>
            <View style={styles.findInputWrap}>
              <Ionicons name="search-outline" size={20} color="#A855F7" />
              <TextInput
                style={styles.findInput}
                value={pageQuery}
                onChangeText={setPageQuery}
                placeholder="Type page name..."
                placeholderTextColor="#8B7AA8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity style={styles.findBtn} onPress={handleFind}>
              <Text style={styles.findBtnText}>Find</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectedCard}>
            <Ionicons name="open-outline" size={22} color="#fff" />
            <View>
              <Text style={styles.selectedTitle}>{selectedPage.title}</Text>
              <Text style={styles.selectedFile}>{selectedPage.file}</Text>
            </View>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(text) => setForm({ ...form, title: text })}
            placeholder="Enter title"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Keywords</Text>
          <TextInput
            style={styles.input}
            value={form.keywords}
            onChangeText={(text) => setForm({ ...form, keywords: text })}
            placeholder="SEO keywords"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textAreaSmall]}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            placeholder="Page description"
            placeholderTextColor="#8B7AA8"
            multiline
          />

          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.content}
            onChangeText={(text) => setForm({ ...form, content: text })}
            placeholder="Write page content here..."
            placeholderTextColor="#8B7AA8"
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save Content"}</Text>
          </TouchableOpacity>
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
  headerCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  mainSub: {
    color: "#A7B0D1",
    marginTop: 6,
    fontSize: 12,
  },
  statusBox: {
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  wrapper: {
    justifyContent: "space-between",
    gap: 16,
  },
  leftBox: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 16,
  },
  rightBox: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 16,
  },
  boxTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  searchBox: {
    minHeight: 46,
    backgroundColor: "#0B1020",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2B3354",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontSize: 14,
  },
  pageItem: {
    backgroundColor: "#211B3A",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#332A55",
  },
  activePage: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  pageIcon: {
    marginRight: 12,
  },
  pageText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  activeText: {
    color: "#fff",
  },
  fileText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 4,
  },
  activeFile: {
    color: "#F3E8FF",
  },
  selectedCard: {
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  selectedTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  selectedFile: {
    color: "#F3E8FF",
    fontSize: 12,
    marginTop: 3,
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#0B1020",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 14,
    minHeight: 46,
    color: "#fff",
    marginBottom: 12,
  },
  textAreaSmall: {
    minHeight: 72,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  textArea: {
    minHeight: 130,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  saveBtn: {
    minHeight: 48,
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  findRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  findInputWrap: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#0B1020",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2B3354",
  },
  findInput: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontSize: 14,
  },
  findBtn: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
  },
  findBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
