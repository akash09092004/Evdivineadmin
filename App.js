import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ChatRequestProvider } from "./src/context/ChatRequestContext";
import { navigationRef } from "./src/navigation/navigationRef";
import { bootstrapApiConfig } from "./src/config/api";

const linking = {
  prefixes: ["/"],
  config: {
    screens: {
      AdminHome: {
        path: "admin",
      },
      AdminBlogs: "admin/blogs",
      AdminBlogCreate: "admin/blogs/create",
      AdminBlogEdit: "admin/blogs/edit/:id",
      AdminBlogPreview: "admin/blogs/preview/:id",
      AdminBlogCategories: "admin/blog-categories",
      AdminLogin: "Login",
    },
  },
};

export default function App() {
  const [apiReady, setApiReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    bootstrapApiConfig()
      .catch(() => {})
      .finally(() => {
        if (mounted) {
          setApiReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const authPaths = [
      "/Login",
      "/Signup",
      "/ForgotPassword",
      "/ResetPassword",
      "/my-profile",
    ];

    if (authPaths.includes(window.location.pathname)) {
      window.history.replaceState({}, "", "/");
    }
  }

  if (!apiReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#C084FC" />
        <Text style={styles.loadingText}>Loading admin panel...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChatRequestProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <AppNavigator />
          </NavigationContainer>
        </ChatRequestProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: "#12092E",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    color: "#F3E8FF",
    fontSize: 14,
    fontWeight: "700",
  },
});
