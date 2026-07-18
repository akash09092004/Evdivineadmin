import React, { useMemo } from "react";
import { View } from "react-native";
import RenderHTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import sanitizeBlogHtml from "./sanitizeHtml";

export default function BlogContentRenderer({ html }) {
  const { width } = useWindowDimensions();
  const source = useMemo(() => ({ html: sanitizeBlogHtml(html || "") }), [html]);

  return (
    <View>
      <RenderHTML contentWidth={width} source={source} />
    </View>
  );
}

