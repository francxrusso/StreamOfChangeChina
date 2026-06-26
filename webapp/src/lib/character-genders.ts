export const CHARACTER_GENDER_OPTIONS = [
  { value: "maschile", it: "maschile", zh: "男性" },
  { value: "femminile", it: "femminile", zh: "女性" },
  { value: "altro", it: "altro", zh: "其他" },
  { value: "non definito", it: "non definito", zh: "未定义" }
];

const aliases = new Map(
  [
    ["m", "maschile"],
    ["male", "maschile"],
    ["maschio", "maschile"],
    ["maschile", "maschile"],
    ["uomo", "maschile"],
    ["男", "maschile"],
    ["男性", "maschile"],
    ["f", "femminile"],
    ["female", "femminile"],
    ["femmina", "femminile"],
    ["femminile", "femminile"],
    ["donna", "femminile"],
    ["女", "femminile"],
    ["女性", "femminile"],
    ["altro", "altro"],
    ["other", "altro"],
    ["其他", "altro"],
    ["non definito", "non definito"],
    ["non definita", "non definito"],
    ["nd", "non definito"],
    ["n/d", "non definito"],
    ["unknown", "non definito"],
    ["sconosciuto", "non definito"],
    ["sconosciuta", "non definito"],
    ["未定义", "non definito"]
  ].map(([key, value]) => [key.toLowerCase(), value])
);

export function normalizeCharacterGender(value: string | null | undefined) {
  const cleanValue = value?.trim().toLowerCase();

  if (!cleanValue) {
    return null;
  }

  return aliases.get(cleanValue) ?? cleanValue;
}

export function getCharacterGenderLabel(value: string | null | undefined) {
  const normalized = normalizeCharacterGender(value);
  const option = CHARACTER_GENDER_OPTIONS.find((gender) => gender.value === normalized);

  return option ? `${option.it} · ${option.zh}` : value ?? "";
}
