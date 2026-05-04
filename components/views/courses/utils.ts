import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "./constants";

export function getCategoryIcon(category: string) {
	const normalized = category.toLowerCase();
	return CATEGORY_ICONS[normalized] || DEFAULT_CATEGORY_ICON;
}
