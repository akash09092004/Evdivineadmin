import { Platform } from "react-native";

export const BLOG_COLORS = {
  background: "#120908",
  panel: "#1C1110",
  panelAlt: "#261514",
  panelSoft: "#321B18",
  border: "#4A2923",
  borderSoft: "#5E372E",
  text: "#FFF7EE",
  textSoft: "#D8C6B5",
  muted: "#A89182",
  gold: "#D6B04B",
  goldSoft: "#F5E2A5",
  cream: "#FFF2DD",
  red: "#8B1E1E",
  redSoft: "#F8D8D5",
  redLight: "#F7E1DE",
  success: "#1F8A70",
  successSoft: "#DDF4ED",
  warning: "#B7791F",
  warningSoft: "#F8E8C6",
  info: "#2457D6",
  infoSoft: "#DCE7FF",
  danger: "#C2410C",
  dangerSoft: "#FBE3D3",
  white: "#FFFFFF",
};

export const blogShadow = Platform.select({
  web: {
    boxShadow: "0px 16px 44px rgba(18, 9, 8, 0.22)",
  },
  default: {
    elevation: 4,
  },
});

