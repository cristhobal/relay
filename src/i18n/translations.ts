export type Lang = "en" | "zh" | "hi" | "es" | "fr"

export function detectLanguage(): Lang {
  if (typeof navigator === "undefined") return "en"
  const lang = navigator.language?.split("-")[0]?.toLowerCase() ?? "en"
  if (lang === "zh") return "zh"
  if (lang === "hi") return "hi"
  if (lang === "es") return "es"
  if (lang === "fr") return "fr"
  return "en"
}
