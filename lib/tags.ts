export const TAG_DEFINITIONS = [
	{ id: "read" as const, label: "to Read", emoji: "📚" },
	{ id: "learn" as const, label: "to Learn", emoji: "🎓" },
	{ id: "file" as const, label: "to File", emoji: "📁" },
] as const;

export type TagId = (typeof TAG_DEFINITIONS)[number]["id"];

export function getTagDefinition(tagId: TagId | null) {
	return TAG_DEFINITIONS.find((t) => t.id === tagId) || null;
}
