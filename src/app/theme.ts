import { BrandVariants, createDarkTheme, createLightTheme, Theme } from "@fluentui/react-components";

const powerBI: BrandVariants = {
  10: "#000000",
  20: "#0D141F",
  30: "#102138",
  40: "#0E2F52",
  50: "#023E6F",
  60: "#1A4C80",
  70: "#305B90",
  80: "#446A9E",
  90: "#5779AC",
  100: "#6B89BA",
  110: "#7F99C6",
  120: "#93AAD2",
  130: "#A8BADD",
  140: "#BDCBE7",
  150: "#D3DCF0",
  160: "#E9EEF8"
};

export const lightTheme: Theme = {
  ...createLightTheme(powerBI),
};

export const darkTheme: Theme = {
  ...createDarkTheme(powerBI),
};