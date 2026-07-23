const appJson = require("./app.json");

module.exports = () => {
  const expo = appJson.expo || {};
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || expo.extra?.apiUrl || "";

  return {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      apiUrl,
    },
  };
};
