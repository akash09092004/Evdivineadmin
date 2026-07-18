import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAdminAuthToken, setAdminAuthToken } from "../api/api";

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isAuthReady: false,
  login: () => {},
  signIn: () => {},
  logout: () => {},
});

const TOKEN_KEY = "evdivine_admin_token";
const USER_KEY = "evdivine_admin_user";

function normalizeStoredUser(value, token) {
  if (!value || typeof value !== "object") {
    return token ? { role: "admin", token } : null;
  }

  return {
    ...value,
    token: value.token || token || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!mounted) {
          return;
        }

        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const nextUser = normalizeStoredUser(parsedUser, storedToken);

        if (nextUser) {
          setUser(nextUser);
          setAdminAuthToken(nextUser.token || storedToken || "");
        } else {
          clearAdminAuthToken();
        }
      } catch (error) {
        // If stored auth is corrupted, fall back to logged out state.
        setUser(null);
        clearAdminAuthToken();
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (tokenOrAuthData, refreshToken, nextUser) => {
    const authData =
      tokenOrAuthData && typeof tokenOrAuthData === "object"
        ? tokenOrAuthData
        : {
            token: tokenOrAuthData,
            refreshToken,
            user: nextUser,
          };

    const nextState = {
      ...(authData.user && typeof authData.user === "object"
        ? authData.user
        : {}),
      token: authData.token || null,
      refreshToken: authData.refreshToken || null,
    };

    setUser(nextState);
    setAdminAuthToken(nextState.token || "");

    if (authData.token) {
      await AsyncStorage.setItem(TOKEN_KEY, authData.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextState));
    }
  };

  const login = async (nextUser) => {
    const nextState =
      nextUser && typeof nextUser === "object" ? nextUser : { role: "admin" };
    setUser(nextState);
    setAdminAuthToken(nextState.token || "");

    if (nextState?.token) {
      await AsyncStorage.setItem(TOKEN_KEY, nextState.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextState));
    }
  };

  const logout = async () => {
    setUser(null);
    clearAdminAuthToken();

    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      } catch (error) {
        // Ignore localStorage failures and still redirect.
      }

      AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      AsyncStorage.removeItem(USER_KEY).catch(() => {});
      window.location.replace("/");
      return;
    }

    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      // Ignore storage failures and keep logging out.
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthReady,
      login,
      signIn,
      logout,
    }),
    [user, isAuthReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
