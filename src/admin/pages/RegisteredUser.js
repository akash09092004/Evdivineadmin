import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminDeleteUser,
  adminGet,
  adminSetUserBlock,
  adminSetUserVerification,
  adminSetUserStatus,
  normalizeList,
} from "../utils/adminApi";
import { normalizeUserRecord } from "../utils/user";

const shadow = {
  boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
  elevation: 3,
};

export default function RegisteredUser() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const columns = [
    { title: "ID", key: "userId", width: 170 },
    { title: "Name", key: "name", width: 160 },
    { title: "Email", key: "email", width: 230 },
    { title: "Phone", key: "phone", width: 150 },
    { title: "Address", key: "address", width: 220 },
    { title: "Verify", key: "verificationStatus", width: 120 },
    { title: "Account", key: "accountStatus", width: 120 },
    { title: "Wallet", key: "walletBalance", width: 110 },
    { title: "Joined", key: "joined", width: 140 },
  ];

  const loadUsers = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await adminGet("users");
      const list = normalizeList(data, ["users", "data", "results"]);
      setUsers(
        list.map((item, index) => {
          return normalizeUserRecord(item, index);
        })
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Users data load nahi ho paya."
      );
      setUsers([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, []);

  const filteredUsers = users.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.userId.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search) ||
      item.address.toLowerCase().includes(search.toLowerCase())
  );

  const updateLocalUser = (userId, updater) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.rawId === userId || item.userId === userId ? updater(item) : item
      )
    );
  };

  const handleActiveToggle = (user) => {
    const nextActive = !user.isActive;
    const recordId = user.rawId || user.userId;
    const previousUser = user;

    setActionLoadingId(recordId);
    updateLocalUser(recordId, (item) => ({
      ...item,
      isActive: nextActive,
      isBlocked: !nextActive,
      accountStatus: nextActive ? "active" : "inactive",
    }));

    adminSetUserStatus(recordId, nextActive)
      .catch((err) => {
        updateLocalUser(recordId, () => previousUser);
        Alert.alert(
          "Error",
          err?.response?.data?.message ||
            err?.message ||
            "User active status update nahi ho paya."
        );
      })
      .finally(() => {
        setActionLoadingId("");
      });
  };

  const handleBlockToggle = (user) => {
    const nextBlocked = !user.isBlocked;
    const recordId = user.rawId || user.userId;
    const previousUser = user;

    setActionLoadingId(recordId);
    updateLocalUser(recordId, (item) => ({
      ...item,
      isBlocked: nextBlocked,
      isActive: !nextBlocked,
      accountStatus: nextBlocked ? "blocked" : "active",
    }));

    adminSetUserBlock(recordId, nextBlocked)
      .catch((err) => {
        updateLocalUser(recordId, () => previousUser);
        Alert.alert(
          "Error",
          err?.response?.data?.message ||
            err?.message ||
            "User block update nahi ho paya."
        );
      })
      .finally(() => {
        setActionLoadingId("");
      });
  };

  const handleVerificationToggle = (user) => {
    const nextVerified = !user.isVerified;
    const recordId = user.rawId || user.userId;
    const previousUser = user;

    setActionLoadingId(recordId);
    updateLocalUser(recordId, (item) => ({
      ...item,
      isVerified: nextVerified,
      verificationStatus: nextVerified ? "verified" : "unverified",
    }));

    adminSetUserVerification(recordId, nextVerified)
      .catch((err) => {
        updateLocalUser(recordId, () => previousUser);
        Alert.alert(
          "Error",
          err?.response?.data?.message ||
            err?.message ||
            "User verification update nahi ho paya."
        );
      })
      .finally(() => {
        setActionLoadingId("");
      });
  };

  const handleDeleteUser = (user) => {
    const recordId = user.rawId || user.userId;
    const previousUsers = users;

    setActionLoadingId(recordId);
    setUsers((prev) =>
      prev.filter((item) => item.rawId !== recordId && item.userId !== recordId)
    );

    adminDeleteUser(recordId)
      .catch((err) => {
        setUsers(previousUsers);
        Alert.alert(
          "Error",
          err?.response?.data?.message ||
            err?.message ||
            "User delete nahi ho paya."
        );
      })
      .finally(() => {
        setActionLoadingId("");
      });
  };

  const renderRowActions = (user) => {
    const recordId = user.rawId || user.userId;
    const busy = actionLoadingId === recordId;
    return (
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={[styles.actionBtn, user.isActive ? styles.warnBtn : styles.successBtn]}
          onPress={() => handleActiveToggle(user)}
          disabled={busy}
        >
          <Ionicons
            name={user.isActive ? "pause-circle-outline" : "play-circle-outline"}
            size={14}
            color="#fff"
          />
          <Text style={styles.actionText}>{user.isActive ? "Inactive" : "Active"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.infoBtn]}
          onPress={() => handleVerificationToggle(user)}
          disabled={busy}
        >
          <Ionicons
            name={user.isVerified ? "shield-outline" : "shield-checkmark-outline"}
            size={14}
            color="#fff"
          />
          <Text style={styles.actionText}>{user.isVerified ? "Unverify" : "Verify"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, user.isBlocked ? styles.successBtn : styles.blockBtn]}
          onPress={() => handleBlockToggle(user)}
          disabled={busy}
        >
          <Ionicons
            name={user.isBlocked ? "lock-open-outline" : "lock-closed-outline"}
            size={14}
            color="#fff"
          />
          <Text style={styles.actionText}>{user.isBlocked ? "Unblock" : "Block"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteUser(user)}
          disabled={busy}
        >
          <Ionicons name="trash-outline" size={14} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>

        {busy ? <ActivityIndicator size="small" color="#C4B5FD" /> : null}
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Registered Users</Text>
        <Text style={styles.subtitle}>All users list with account status</Text>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>Users loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by ID, name, email, phone, address..."
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        renderRowActions={renderRowActions}
        actionColumnWidth={360}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E9FF",
    ...shadow,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2B124C",
  },
  subtitle: {
    color: "#777",
    marginTop: 3,
    fontSize: 12,
  },
  statusBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0E9FF",
    ...shadow,
  },
  statusText: {
    color: "#4B5563",
    fontWeight: "700",
    flex: 1,
  },
  actionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  successBtn: {
    backgroundColor: "#16A34A",
  },
  warnBtn: {
    backgroundColor: "#F59E0B",
  },
  infoBtn: {
    backgroundColor: "#7C3AED",
  },
  blockBtn: {
    backgroundColor: "#334155",
  },
  deleteBtn: {
    backgroundColor: "#DC2626",
  },
});
