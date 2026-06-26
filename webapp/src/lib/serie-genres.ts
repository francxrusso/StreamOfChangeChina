export const SERIE_GENRE_OPTIONS = [
  { value: "Drama", zh: "剧情" },
  { value: "Romance", zh: "爱情" },
  { value: "Comedy", zh: "喜剧" },
  { value: "Animation", zh: "动画" },
  { value: "Documentary", zh: "纪录片" },
  { value: "Crime", zh: "犯罪" },
  { value: "Thriller", zh: "惊悚" },
  { value: "Mystery", zh: "悬疑" },
  { value: "Investigation", zh: "探案" },
  { value: "BL/Danmei", zh: "耽美" },
  { value: "Fantasy", zh: "奇幻" },
  { value: "Historical", zh: "古装" },
  { value: "Wuxia", zh: "武侠" },
  { value: "Xianxia", zh: "仙侠" },
  { value: "Urban", zh: "都市" },
  { value: "Youth", zh: "青春" },
  { value: "Family", zh: "家庭" },
  { value: "Workplace", zh: "职场" },
  { value: "School", zh: "校园" },
  { value: "Sci-fi", zh: "科幻" },
  { value: "Action", zh: "动作" },
  { value: "Adventure", zh: "冒险" },
  { value: "Slice of life", zh: "生活" }
];

export function getSerieGenreLabel(value: string) {
  const option = SERIE_GENRE_OPTIONS.find((genre) => genre.value === value);
  return option ? `${option.value} · ${option.zh}` : value;
}

export function getSerieGenreValue(value: string) {
  return value.trim();
}

export function splitSerieGenres(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map(getSerieGenreValue)
    .filter(Boolean);
}

export function formatSerieGenres(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

export function formatSerieGenreLabels(value: string | null | undefined) {
  return splitSerieGenres(value).map(getSerieGenreLabel).join(", ");
}
