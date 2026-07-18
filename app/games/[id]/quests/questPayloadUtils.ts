export function stripQuestUiFields<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((entry) => stripQuestUiFields(entry)) as T;
    }
    if (!value || typeof value !== "object") {
        return value;
    }

    const cleanedRecord = { ...(value as Record<string, unknown>) };
    delete cleanedRecord.item_definition_name;
    delete cleanedRecord.item_definition_code;

    if (Array.isArray(cleanedRecord.clauses)) {
        cleanedRecord.clauses = cleanedRecord.clauses.map((clause) => stripQuestUiFields(clause));
    }
    if (Array.isArray(cleanedRecord.items)) {
        cleanedRecord.items = cleanedRecord.items.map((item) => stripQuestUiFields(item));
    }
    if (Array.isArray(cleanedRecord.rewards)) {
        cleanedRecord.rewards = cleanedRecord.rewards.map((reward) => stripQuestUiFields(reward));
    }
    if (cleanedRecord.conditions && typeof cleanedRecord.conditions === "object") {
        cleanedRecord.conditions = stripQuestUiFields(cleanedRecord.conditions);
    }

    const isConditionLeaf = typeof cleanedRecord.clause_id === "string" && typeof cleanedRecord.type === "string";
    if (isConditionLeaf && typeof cleanedRecord.item_definition_id === "string") {
        delete cleanedRecord.item_definition_id;
    }

    return cleanedRecord as T;
}
