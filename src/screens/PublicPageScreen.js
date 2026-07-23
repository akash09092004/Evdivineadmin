import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import RenderHTML from "react-native-render-html";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getPageContentByKey, normalizePageContent } from "../services/pageContentApi";
import sanitizeBlogHtml from "../admin/components/blogs/sanitizeHtml";

function normalizePlainText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasVisibleContent(html) {
  const text = normalizePlainText(String(html || "").replace(/<[^>]*>/g, ""));
  return text.length > 0;
}

export default function PublicPageScreen() {
  const route = useRoute();
  const { width } = useWindowDimensions();
  const pageKey = route?.params?.pageKey || "my-profile";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState({
    title: "My Profile",
    description: "Personal details",
    content: "",
  });

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getPageContentByKey(pageKey, { skipAuth: true });

        if (!mounted) {
          return;
        }

        const normalized = normalizePageContent(data);

        setPage({
          title: normalized.title || "My Profile",
          description: normalized.description || "",
          content: normalized.content || "",
        });
      } catch (err) {
        if (!mounted) {
          return;
        }

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

    loadPage();

    return () => {
      mounted = false;
    };
  }, [pageKey]);

  const htmlSource = useMemo(
    () => ({ html: sanitizeBlogHtml(page.content || "") }),
    [page.content]
  );

  const plainText = useMemo(
    () => normalizePlainText(page.content).replace(/<[^>]+>/g, ""),
    [page.content]
  );

  const visibleContentExists = useMemo(
    () => hasVisibleContent(page.content),
    [page.content]
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Page Content</Text>
        <Text style={styles.title}>{page.title}</Text>
        {page.description ? (
          <Text style={styles.subtitle}>{page.description}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator color="#AF5F2E" />
          <Text style={styles.statusText}>Content loading...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.statusCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#AF5F2E" />
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Content</Text>
        {visibleContentExists ? (
          <RenderHTML
            contentWidth={width - 32}
            source={htmlSource}
            tagsStyles={htmlStyles}
          />
        ) : (
          <Text style={styles.emptyText}>
            {plainText || "Yahan admin me likha hua page content show hoga."}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const htmlStyles = {
  body: {
    color: "#2C1E15",
    fontSize: 16,
    lineHeight: 24,
  },
  p: {
    color: "#2C1E15",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  h1: {
    color: "#7F3B10",
    marginBottom: 12,
  },
  h2: {
    color: "#7F3B10",
    marginBottom: 10,
  },
  h3: {
    color: "#7F3B10",
    marginBottom: 8,
  },
  li: {
    color: "#2C1E15",
    marginBottom: 6,
  },
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8E9CF",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  hero: {
    backgroundColor: "#AF5F2E",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  kicker: {
    color: "#FEEEDC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: "#F8DCC6",
    marginTop: 6,
    fontSize: 14,
  },
  statusCard: {
    minHeight: 46,
    backgroundColor: "#FFF7EE",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EFCDAF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: "#8A4C1D",
    fontWeight: "700",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0DDC6",
  },
  cardTitle: {
    color: "#7F3B10",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyText: {
    color: "#6B5A49",
    fontSize: 15,
    lineHeight: 22,
  },
});
