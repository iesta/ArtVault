import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "artvault_theme";

export function loadTheme() {
  return localStorage.getItem(STORAGE_KEY) || "tokyonight";
}

export function saveTheme(name) {
  localStorage.setItem(STORAGE_KEY, name);
}

export const themes = {
  spaceoneplus: {
    mode: "dark",
    bg: "#122c44", s1: "#336699", s2: "#244d6b", s3: "#4d7fa6",
    border: "#4a6a80", accent: "#3fc1c9", cream: "#f0e6d2",
    dim: "#a8b8c0", dim2: "#7a8a90", green: "#3a8050", red: "#b03535",
    cyan: "#3fc1c9", blue: "#7ec8e3",
  },

  gruvbox: {
    mode: "dark",
    bg: "#282828", s1: "#3c3836", s2: "#504945", s3: "#665c54",
    border: "#7c6f64", accent: "#83a598", cream: "#ebdbb2",
    dim: "#a89984", dim2: "#928374", green: "#b8bb26", red: "#fb4934",
    cyan: "#8ec07c", blue: "#83a598",
  },

  tokyonight: {
    mode: "dark",
    bg: "#1a1b26", s1: "#24283b", s2: "#2f3546", s3: "#3b4053",
    border: "#565f89", accent: "#7aa2f7", cream: "#c0caf5",
    dim: "#a9b1d6", dim2: "#9aa5ce", green: "#9ece6a", red: "#f7768e",
    cyan: "#73daca", blue: "#7aa2f7",
  },

  nord: {
    mode: "dark",
    bg: "#2e3440", s1: "#3b4252", s2: "#434c5e", s3: "#4c566a",
    border: "#616e88", accent: "#88c0d0", cream: "#eceff4",
    dim: "#d8dee9", dim2: "#e5e9f0", green: "#a3be8c", red: "#bf616a",
    cyan: "#8fbcbb", blue: "#81a1c1",
  },

  dracula: {
    mode: "dark",
    bg: "#282a36", s1: "#343746", s2: "#3d4052", s3: "#464960",
    border: "#565a74", accent: "#bd93f9", cream: "#f8f8f2",
    dim: "#cccccc", dim2: "#b8b8b8", green: "#50fa7b", red: "#ff5555",
    cyan: "#8be9fd", blue: "#6272a4",
  },

  rosepine: {
    mode: "dark",
    bg: "#191724", s1: "#232136", s2: "#2a273f", s3: "#312f44",
    border: "#47435a", accent: "#ebbcba", cream: "#e0def4",
    dim: "#908caa", dim2: "#6e6a86", green: "#31748f", red: "#eb6f92",
    cyan: "#9ccfd8", blue: "#c4a7e7",
  },

  kanagawa: {
    mode: "dark",
    bg: "#1f1f28", s1: "#2a2a37", s2: "#363646", s3: "#424256",
    border: "#54546d", accent: "#7fb4ca", cream: "#dcd7ba",
    dim: "#a6a69c", dim2: "#8a8a80", green: "#76946a", red: "#c34043",
    cyan: "#7e9cd8", blue: "#7fb4ca",
  },

  gruvboxlight: {
    mode: "light",
    bg: "#fbf1c7", s1: "#ebdbb2", s2: "#d5c4a1", s3: "#bdae93",
    border: "#a89984", accent: "#458588", cream: "#3c3836",
    dim: "#665c54", dim2: "#7c6f64", green: "#98971a", red: "#cc241d",
    cyan: "#689d6a", blue: "#458588",
  },

  solarizedlight: {
    mode: "light",
    bg: "#fdf6e3", s1: "#eee8d5", s2: "#e0dbc5", s3: "#d3cdb5",
    border: "#93a1a1", accent: "#268bd2", cream: "#073642",
    dim: "#586e75", dim2: "#657b83", green: "#859900", red: "#dc322f",
    cyan: "#2aa198", blue: "#268bd2",
  },

  onelight: {
    mode: "light",
    bg: "#fafafa", s1: "#f0f0f0", s2: "#e5e5e5", s3: "#d8d8d8",
    border: "#c8c8c8", accent: "#4078f2", cream: "#383a42",
    dim: "#696c77", dim2: "#9899a0", green: "#50a14f", red: "#e45649",
    cyan: "#0184bc", blue: "#4078f2",
  },

  rosepinedawn: {
    mode: "light",
    bg: "#faf4ed", s1: "#f2e9e1", s2: "#e5dbd1", s3: "#d7ccc0",
    border: "#cecacd", accent: "#d7827e", cream: "#26233a",
    dim: "#6e6a86", dim2: "#908caa", green: "#286983", red: "#b4637a",
    cyan: "#56949f", blue: "#d7827e",
  },

  githublight: {
    mode: "light",
    bg: "#ffffff", s1: "#f6f8fa", s2: "#eaeef2", s3: "#d0d7de",
    border: "#d0d7de", accent: "#0969da", cream: "#1f2328",
    dim: "#656d76", dim2: "#8b949e", green: "#1a7f37", red: "#cf222e",
    cyan: "#0969da", blue: "#0969da",
  },

  achromaticlight: {
    mode: "light",
    bg: "#f9f9f9", s1: "#eeeeee", s2: "#e0e0e0", s3: "#d0d0d0",
    border: "#bdbdbd", accent: "#607d8b", cream: "#212121",
    dim: "#616161", dim2: "#9e9e9e", green: "#388e3c", red: "#d32f2f",
    cyan: "#00acc1", blue: "#607d8b",
  },

  carbon: {
    mode: "dark",
    bg: "#161616", s1: "#262626", s2: "#393939", s3: "#525252",
    border: "#6f6f6f", accent: "#78a9ff", cream: "#f4f4f4",
    dim: "#c6c6c6", dim2: "#a8a8a8", green: "#42be65", red: "#fa4d56",
    cyan: "#33b1ff", blue: "#78a9ff",
  },

  modusvivendi: {
    mode: "dark",
    bg: "#181819", s1: "#282829", s2: "#353536", s3: "#454546",
    border: "#5a5a5b", accent: "#79a8ff", cream: "#e0e0e0",
    dim: "#a0a0a0", dim2: "#c0c0c0", green: "#5abf5a", red: "#ef5350",
    cyan: "#00bcd4", blue: "#79a8ff",
  },

  vsdark: {
    mode: "dark",
    bg: "#1e1e1e", s1: "#252526", s2: "#2d2d2d", s3: "#3c3c3c",
    border: "#474747", accent: "#007acc", cream: "#cccccc",
    dim: "#969696", dim2: "#707070", green: "#4ec9b0", red: "#f14c4c",
    cyan: "#4fc1ff", blue: "#007acc",
  },
};

export const themeLabels = {
  spaceoneplus: "Spaceoneplus",
  gruvbox: "Gruvbox Dark",
  tokyonight: "Tokyo Night",
  nord: "Nord",
  dracula: "Dracula",
  rosepine: "Rose Pine",
  kanagawa: "Kanagawa",
  carbon: "Carbon",
  modusvivendi: "Modus Vivendi",
  vsdark: "VS Dark",
  gruvboxlight: "Gruvbox Light",
  solarizedlight: "Solarized Light",
  onelight: "One Light",
  rosepinedawn: "Rose Pine Dawn",
  githublight: "GitHub Light",
  achromaticlight: "Achromatic Light",
};

export const themeGroups = [
  { label: "Dark", keys: ["spaceoneplus", "gruvbox", "tokyonight", "nord", "dracula", "rosepine", "kanagawa", "carbon", "modusvivendi", "vsdark"] },
  { label: "Light", keys: ["gruvboxlight", "solarizedlight", "onelight", "rosepinedawn", "githublight", "achromaticlight"] },
];
