import React, { useEffect, useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({
  title,
  activeScreen,
  onSelectScreen,
  children,
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLargeScreen = width >= 900;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return undefined;
    }

    const previousZoom = document.body.style.zoom;

    if (isLargeScreen) {
      document.body.style.zoom = "75%";
      document.body.style.overflowX = "hidden";
    } else {
      document.body.style.zoom = "100%";
      document.body.style.overflowX = "";
    }

    return () => {
      document.body.style.zoom = previousZoom;
      document.body.style.overflowX = "";
    };
  }, [isLargeScreen]);

  return (
    <View style={styles.container}>
      {isLargeScreen && (
        <View style={styles.desktopSidebar}>
          <AdminSidebar
            activeScreen={activeScreen}
            onSelect={onSelectScreen}
            onClose={() => {}}
          />
        </View>
      )}

      {!isLargeScreen && (
        <Modal visible={sidebarOpen} transparent animationType="slide">
          <View style={styles.modalWrapper}>
            <View style={styles.mobileSidebar}>
              <AdminSidebar
                activeScreen={activeScreen}
                onSelect={(item) => {
                  onSelectScreen(item);
                  setSidebarOpen(false);
                }}
                onClose={() => setSidebarOpen(false)}
              />
            </View>

            <TouchableOpacity
              style={styles.modalBlank}
              onPress={() => setSidebarOpen(false)}
            />
          </View>
        </Modal>
      )}

      <View style={styles.mainArea}>
        <AdminHeader
          title={title}
          showMenu={!isLargeScreen}
          onMenuPress={() => setSidebarOpen(true)}
          safeTopInset={insets.top}
        />

        <View
          style={[
            styles.content,
            {
              paddingBottom: Math.max(14, insets.bottom),
              paddingHorizontal: isLargeScreen ? 16 : 12,
            },
          ]}
        >
          <View style={[styles.contentShell, isLargeScreen && styles.contentShellLarge]}>
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#06040F",
  },
  desktopSidebar: {
    width: 248,
  },
  mainArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: "#06040F",
  },
  contentShell: {
    flex: 1,
  },
  contentShellLarge: {
    maxWidth: 1600,
    width: "100%",
    alignSelf: "center",
  },
  modalWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  mobileSidebar: {
    width: 280,
    height: "100%",
  },
  modalBlank: {
    flex: 1,
  },
});
