import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ChatRequestProvider } from "./src/context/ChatRequestContext";
import { navigationRef } from "./src/navigation/navigationRef";

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
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const authPaths = [
      "/Login",
      "/Signup",
      "/ForgotPassword",
      "/ResetPassword",
    ];

    if (authPaths.includes(window.location.pathname)) {
      window.history.replaceState({}, "", "/");
    }
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
