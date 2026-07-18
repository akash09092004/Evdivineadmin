import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme/colors";
import { adminMenu } from "../utils/adminMenu";

export default function AdminSidebar({ activeScreen, onSelect, onClose }) {
  const insets = useSafeAreaInsets();
  const blogScreens = useMemo(
    () =>
      adminMenu
        .filter((item) => Array.isArray(item.children))
        .flatMap((item) => item.children.map((child) => child.screen)),
    []
  );
  const [expandedGroups, setExpandedGroups] = useState({
    "Blog Management": blogScreens.includes(activeScreen),
  });

  useEffect(() => {
    setExpandedGroups((current) => ({
      ...current,
      "Blog Management":
        blogScreens.includes(activeScreen) ||
        current["Blog Management"] === true,
    }));
  }, [activeScreen, blogScreens]);

  const handleSelect = (item) => {
    if (typeof onSelect === "function") {
      onSelect(item);
    }
  };

  return (
    <View
      style={[
        styles.sidebar,
        { paddingTop: 22 + insets.top, paddingBottom: 14 + insets.bottom },
      ]}
    >
      <View style={styles.logoRow}>
        <View>
          <Text style={styles.logo}>EV DIVINE</Text>
          <Text style={styles.logoSub}>Admin Dashboard</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.menuHeading}>MY ACCOUNT</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {adminMenu.map((item) => {
          if (Array.isArray(item.children)) {
            const expanded = Boolean(expandedGroups[item.title]);
            const activeChild = item.children.some(
              (child) => activeScreen === child.screen
            );

            return (
              <View key={item.id} style={styles.groupBlock}>
                <TouchableOpacity
                  style={[styles.groupHeader, activeChild && styles.activeItem]}
                  onPress={() =>
                    setExpandedGroups((current) => ({
                      ...current,
                      [item.title]: !current[item.title],
                    }))
                  }
                >
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons
                      name={item.icon}
                      size={17}
                      color={activeChild ? "#fff" : Colors.primaryLight}
                    />
                    <Text style={[styles.menuText, activeChild && styles.activeText]}>
                      {item.title}
                    </Text>
                  </View>

                  <Ionicons
                    name={expanded ? "chevron-down-outline" : "chevron-forward-outline"}
                    size={16}
                    color={activeChild ? "#fff" : Colors.primaryLight}
                  />
                </TouchableOpacity>

                {expanded ? (
                  <View style={styles.submenu}>
                    {item.children.map((child) => {
                      const active = activeScreen === child.screen;

                      return (
                        <TouchableOpacity
                          key={child.id}
                          style={[styles.submenuItem, active && styles.activeSubmenuItem]}
                          onPress={() => handleSelect(child)}
                        >
                          <Ionicons
                            name={child.icon}
                            size={16}
                            color={active ? "#fff" : Colors.primaryLight}
                          />
                          <Text
                            style={[styles.submenuText, active && styles.activeText]}
                            numberOfLines={1}
                          >
                            {child.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          }

          const active = activeScreen === item.screen;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, active && styles.activeItem, item.danger && styles.dangerItem]}
              onPress={() => handleSelect(item)}
            >
              <Ionicons
                name={item.icon}
                size={17}
                color={active || item.danger ? "#fff" : Colors.primaryLight}
              />
              <Text
                style={[
                  styles.menuText,
                  active && styles.activeText,
                  item.danger && styles.dangerText,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: "#0C0818",
    paddingHorizontal: 12,
  },
  logoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.10)",
  },
  logo: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  logoSub: {
    color: Colors.primaryLight,
    fontSize: 11,
    marginTop: 3,
  },
  closeBtn: {
    padding: 4,
  },
  menuHeading: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 1,
  },
  menuItem: {
    minHeight: 40,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  dangerItem: {
    backgroundColor: "rgba(185,28,28,0.18)",
    borderColor: "rgba(239,68,68,0.30)",
  },
  activeItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groupBlock: {
    marginBottom: 8,
  },
  groupHeader: {
    minHeight: 42,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  menuText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F5EAFF",
    flex: 1,
  },
  dangerText: {
    color: "#fff",
  },
  activeText: {
    color: "#fff",
  },
  submenu: {
    paddingLeft: 10,
    marginTop: 8,
    gap: 8,
  },
  submenuItem: {
    minHeight: 38,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 11,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  activeSubmenuItem: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  submenuText: {
    flex: 1,
    color: "#F5EAFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
