import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAdminAuthToken, resolveAssetUrl } from "../../api/api";

function isUsableLocalUri(value) {
  return (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  );
}

export default function AdminImage({
  uri,
  style,
  resizeMode = "cover",
  placeholderLabel = "No image",
  placeholderIcon = "image-outline",
  placeholderIconSize = 20,
  placeholderIconColor = "#8B91A1",
  placeholderTextStyle,
  renderFallback,
  onLoad,
  onError,
}) {
  const resolvedUri = uri ? resolveAssetUrl(uri) : "";
  const [displayUri, setDisplayUri] = useState(resolvedUri);
  const [authRetrying, setAuthRetrying] = useState(false);
  const [failed, setFailed] = useState(false);
  const blobUrlRef = useRef("");

  useEffect(() => {
    setDisplayUri(resolvedUri);
    setAuthRetrying(false);
    setFailed(false);

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    };
  }, [resolvedUri]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = "";
      }
    };
  }, []);

  const loadWithAuth = async () => {
    if (!resolvedUri || authRetrying || isUsableLocalUri(resolvedUri)) {
      setFailed(true);
      return;
    }

    setAuthRetrying(true);

    try {
      const token = await getAdminAuthToken();
      if (!token) {
        setFailed(true);
        return;
      }

      const response = await fetch(resolvedUri, {
        headers: {
          "x-auth-token": token,
          Authorization: token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Image request failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      blobUrlRef.current = objectUrl;
      setDisplayUri(objectUrl);
      setFailed(false);
      onLoad?.();
    } catch (error) {
      setFailed(true);
      onError?.(error);
    } finally {
      setAuthRetrying(false);
    }
  };

  const handleError = (error) => {
    if (failed) {
      onError?.(error);
      return;
    }

    if (!resolvedUri || isUsableLocalUri(resolvedUri)) {
      setFailed(true);
      onError?.(error);
      return;
    }

    loadWithAuth();
  };

  if (!displayUri || failed) {
    if (typeof renderFallback === "function") {
      return renderFallback();
    }

    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons
          name={placeholderIcon}
          size={placeholderIconSize}
          color={placeholderIconColor}
        />
        <Text style={[styles.placeholderText, placeholderTextStyle]}>
          {placeholderLabel}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      onLoad={onLoad}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F7F8FC",
  },
  placeholderText: {
    color: "#8B91A1",
    fontSize: 11,
    fontWeight: "600",
  },
});
