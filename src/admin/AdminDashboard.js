import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";

import AdminLayout from "./components/AdminLayout";
import DashboardCard from "./components/DashboardCard";
import SearchBar from "./components/SearchBar";
import DataTable from "./components/DataTable";
import { adminMenu, dashboardStats } from "./utils/adminMenu";
import {
  adminGet,
  normalizeDashboardStats,
  normalizeList,
} from "./utils/adminApi";
import MyProfile from "./pages/MyProfile";
import RegisteredUser from "./pages/RegisteredUser";
import UserCredit from "./pages/UserCredit";
import RefundTransactionsList from "./pages/RefundTransactionsList";
import RefundAmount from "./pages/RefundAmount";
import Coupons from "./pages/Coupons";
import RechargePlans from "./pages/RechargePlans";
import SlotPlans from "./pages/SlotPlans";
import Availability from "./pages/Availability";
import Leaves from "./pages/Leaves";
import BlockedTimes from "./pages/BlockedTimes";
import BonusesConfig from "./pages/BonusesConfig";
import Banners from "./pages/Banners";
import Rashis from "./pages/Rashis";
import PageContent from "./pages/PageContent";
import DropMeList from "./pages/DropMeList";
import SubscriberList from "./pages/SubscriberList.js";
import HistoryNotes from "./pages/HistoryNotes";
import CloseRequest from "./pages/CloseRequest";
import ChatRequests from "./pages/ChatRequests";
import ChangePassword from "./pages/ChangePassword";
import Logout from "./pages/Logout";
import BlogList from "./pages/blogs/BlogList";
import BlogCreate from "./pages/blogs/BlogCreate";
import BlogEdit from "./pages/blogs/BlogEdit";
import BlogPreview from "./pages/blogs/BlogPreview";
import BlogCategories from "./pages/blogs/BlogCategories";
import { useAuth } from "../context/AuthContext";
import { normalizeUserRecord } from "./utils/user";

const routeScreenMap = {
  AdminBlogs: "BlogList",
  AdminBlogCreate: "BlogCreate",
  AdminBlogEdit: "BlogEdit",
  AdminBlogPreview: "BlogPreview",
  AdminBlogCategories: "BlogCategories",
};

function findMenuTitle(screen) {
  for (const item of adminMenu) {
    if (item.screen === screen) {
      return item.title;
    }

    if (Array.isArray(item.children)) {
      const match = item.children.find((child) => child.screen === screen);
      if (match) {
        return match.title;
      }
    }
  }

  return screen;
}

export default function AdminDashboard({ navigation, route }) {
  const { logout } = useAuth();
  const [activeScreen, setActiveScreen] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [dashboardRows, setDashboardRows] = useState([]);
  const [dashboardCards, setDashboardCards] = useState(dashboardStats);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const routeScreen = routeScreenMap[route?.name];
  const currentScreen = routeScreen || route?.params?.screen || activeScreen;
  const activeLabel = findMenuTitle(currentScreen);

  useEffect(() => {
    if (route?.name === "AdminHome") {
      const nextScreen = route?.params?.screen;

      if (nextScreen && nextScreen !== activeScreen) {
        setActiveScreen(nextScreen);
      }
    }
  }, [activeScreen, route?.name, route?.params?.screen]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const [dashboardData, usersData] = await Promise.all([
          adminGet("dashboard"),
          adminGet("users").catch(() => null),
        ]);

        if (!mounted) return;

        const cards = normalizeDashboardStats(dashboardData);
        setDashboardCards(
          cards.map((item, index) => ({
            ...dashboardStats[index % dashboardStats.length],
            ...item,
            value:
              item.value !== undefined && item.value !== null
                ? String(item.value)
                : "0",
          }))
        );

        const recentUsers = normalizeList(dashboardData, [
          "recentUsers",
          "users",
          "items",
        ]);
        const sourceRows =
          recentUsers.length > 0 ? recentUsers : normalizeList(usersData);

        setDashboardRows(
          sourceRows
            .slice(0, 5)
            .map((item, index) => normalizeUserRecord(item, index))
        );
      } catch (error) {
        if (!mounted) return;

        setDashboardError(
          error?.response?.data?.message ||
            error?.message ||
            "Dashboard data load nahi ho paya."
        );
        setDashboardCards(dashboardStats);
        setDashboardRows([]);
      } finally {
        if (mounted) {
          setDashboardLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const columns = [
    { title: "ID", key: "userId", width: 170 },
    { title: "Name", key: "name", width: 160 },
    { title: "Email", key: "email", width: 220 },
    { title: "Phone", key: "phone", width: 140 },
    { title: "Status", key: "status", width: 120 },
    { title: "Joined", key: "joined", width: 140 },
  ];

  const filteredUsers = dashboardRows.filter(
    (item) =>
      item.userId.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search)
  );

  const renderDashboard = () => {
    return (
      <>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.welcomeText}>Welcome Admin!</Text>
            <Text style={styles.pageTitle}>Dashboard Overview</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {dashboardCards.map((item) => (
            <DashboardCard
              key={item.id}
              title={item.title}
              value={item.value}
              icon={item.icon}
              color={item.color}
            />
          ))}
        </View>

        <View style={styles.middleGrid}>
          <View style={styles.chartCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Booking Analytics</Text>
              <Text style={styles.cardSub}>Monthly overview</Text>
            </View>

            <View style={styles.chartBox}>
              <View style={[styles.bar, { height: 80 }]} />
              <View style={[styles.bar, { height: 120 }]} />
              <View style={[styles.bar, { height: 95 }]} />
              <View style={[styles.bar, { height: 150 }]} />
              <View style={[styles.bar, { height: 110 }]} />
              <View style={[styles.bar, { height: 170 }]} />
              <View style={[styles.bar, { height: 135 }]} />
            </View>

            <View style={styles.monthRow}>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m) => (
                <Text key={m} style={styles.monthText}>
                  {m}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.sideCard}>
            <Text style={styles.cardTitle}>Total Revenue</Text>

            <View style={styles.circleBox}>
              <View style={styles.circle}>
                <Text style={styles.circleValue}>78%</Text>
              </View>
            </View>

            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>Chat</Text>
              <Text style={styles.revenueValue}>35%</Text>
            </View>

            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>Call</Text>
              <Text style={styles.revenueValue}>45%</Text>
            </View>

            <View style={styles.revenueRow}>
              <Text style={styles.revenueLabel}>Video</Text>
              <Text style={styles.revenueValue}>20%</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.activityCard}>
            <Text style={styles.cardTitle}>Recent Activities</Text>

            {[
              "New user registered",
              "Refund request received",
              "Booking completed",
              "New subscriber added",
            ].map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View>
                  <Text style={styles.activityText}>{item}</Text>
                  <Text style={styles.activityTime}>{index + 1} hours ago</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tableCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Registered Users</Text>
              <Text style={styles.cardSub}>Latest user activity</Text>
            </View>

            {dashboardLoading ? (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.statusText}>Dashboard loading...</Text>
              </View>
            ) : null}

            {dashboardError ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{dashboardError}</Text>
              </View>
            ) : null}

            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search user..."
            />

            <DataTable columns={columns} data={filteredUsers} />
          </View>
        </View>
      </>
    );
  };

  const handleSelectScreen = (item) => {
    if (!item) return;

    if (item.screen === "Logout") {
      (async () => {
        try {
          await logout();
        } catch (error) {
          // Local auth clear should still proceed via auth state update.
        }
      })();
      return;
    }

    if (item.routeName && item.routeName !== "AdminHome") {
      navigation.navigate(item.routeName, item.params || {});
      return;
    }

    if (item.routeName === "AdminHome" || !item.routeName) {
      navigation.navigate("AdminHome", { screen: item.screen });
      setActiveScreen(item.screen);
    }
  };

  const renderPage = () => {
    if (currentScreen === "Dashboard") {
      return renderDashboard();
    }

    if (currentScreen === "BlogList") return <BlogList />;
    if (currentScreen === "BlogCreate") return <BlogCreate />;
    if (currentScreen === "BlogEdit") return <BlogEdit />;
    if (currentScreen === "BlogPreview") return <BlogPreview />;
    if (currentScreen === "BlogCategories") return <BlogCategories />;

    if (currentScreen === "MyProfile") return <MyProfile />;
    if (currentScreen === "RegisteredUser") return <RegisteredUser />;
    if (currentScreen === "UserCredit") {
      return <UserCredit onNavigateScreen={setActiveScreen} />;
    }
    if (currentScreen === "RefundTransactionsList")
      return <RefundTransactionsList />;
    if (currentScreen === "RefundAmount") return <RefundAmount />;
    if (currentScreen === "Coupons") return <Coupons />;
    if (currentScreen === "RechargePlans") return <RechargePlans />;
    if (currentScreen === "SlotPlans") return <SlotPlans />;
    if (currentScreen === "Availability") return <Availability />;
    if (currentScreen === "Leaves") return <Leaves />;
    if (currentScreen === "BlockedTimes") return <BlockedTimes />;
    if (currentScreen === "BonusesConfig") return <BonusesConfig />;
    if (currentScreen === "Banners") return <Banners />;
    if (currentScreen === "Rashis") return <Rashis />;
    if (currentScreen === "PageContent") return <PageContent />;
    if (currentScreen === "DropMeList") return <DropMeList />;
    if (currentScreen === "SubscriberList") return <SubscriberList />;
    if (currentScreen === "HistoryNotes") return <HistoryNotes />;
    if (currentScreen === "CloseRequest") return <CloseRequest />;
    if (currentScreen === "ChatRequests") return <ChatRequests />;
    if (currentScreen === "ChangePassword") return <ChangePassword />;
    if (currentScreen === "Logout") return <Logout navigation={navigation} />;

    return (
      <View style={styles.pageBox}>
        <Text style={styles.pageTitle}>{currentScreen}</Text>
        <Text style={styles.pageText}>
          Yahan {currentScreen} ka form/table add hoga.
        </Text>
      </View>
    );
  };

  return (
    <AdminLayout
      title={activeLabel}
      activeScreen={currentScreen}
      onSelectScreen={handleSelectScreen}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderPage()}
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 22,
  },

  topHeader: {
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 24px rgba(0,0,0,0.35)" },
      default: { elevation: 6 },
    }),
  },

  welcomeText: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 6,
  },

  middleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  chartCard: {
    flexGrow: 65,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 320,
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242B45",
  },

  sideCard: {
    flexGrow: 35,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 260,
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242B45",
  },

  cardHeader: {
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  cardSub: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
  },

  chartBox: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 14,
  },

  bar: {
    width: "10%",
    backgroundColor: "#7C3AED",
    borderRadius: 12,
  },

  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  monthText: {
    color: "#9CA3AF",
    fontSize: 11,
  },

  circleBox: {
    alignItems: "center",
    marginVertical: 12,
  },

  circle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 14,
    borderColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
  },

  circleValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#242B45",
  },

  revenueLabel: {
    color: "#9CA3AF",
    fontWeight: "700",
  },

  revenueValue: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  bottomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },

  activityCard: {
    flexGrow: 38,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 300,
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
  },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7C3AED",
    marginRight: 10,
  },

  activityText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  activityTime: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
  },

  tableCard: {
    flexGrow: 60,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 360,
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
  },

  pageBox: {
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
  },

  pageText: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 20,
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
