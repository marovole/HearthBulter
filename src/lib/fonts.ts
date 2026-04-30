import { Noto_Sans_SC, Outfit, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

export const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** 中文 UI 主回退；latin 子集减少首包，复杂汉字仍可依赖系统回退 */
export const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sc",
  display: "swap",
  preload: false,
});

export const rootFontVariableClassName = [
  outfit.variable,
  plusJakarta.variable,
  spaceGrotesk.variable,
  notoSansSC.variable,
].join(" ");
