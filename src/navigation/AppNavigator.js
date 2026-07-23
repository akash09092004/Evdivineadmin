import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../auth/LoginScreen";
import AdminDashboard from "../admin/AdminDashboard";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#12092E",
        }}
      >
        <ActivityIndicator size="large" color="#C4B5FD" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? "admin" : "guest"}
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="AdminHome" component={AdminDashboard} />
          <Stack.Screen
            name="AdminBlogs"
            component={AdminDashboard}
            initialParams={{ screen: "BlogList" }}
          />
          <Stack.Screen
            name="AdminBlogCreate"
            component={AdminDashboard}
            initialParams={{ screen: "BlogCreate" }}
          />
          <Stack.Screen
            name="AdminBlogEdit"
            component={AdminDashboard}
            initialParams={{ screen: "BlogEdit" }}
          />
          <Stack.Screen
            name="AdminBlogPreview"
            component={AdminDashboard}
            initialParams={{ screen: "BlogPreview" }}
          />
          <Stack.Screen
            name="AdminBlogCategories"
            component={AdminDashboard}
            initialParams={{ screen: "BlogCategories" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="AdminLogin"
            component={LoginScreen}
            initialParams={{
              redirectTo: "AdminHome",
              successMessage: "Please login to open Admin Dashboard.",
              requireAdmin: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
