export const DOC_TYPES = ["fc", "insurance", "permit", "pollution", "national_permit"] as const;
export type DocType = (typeof DOC_TYPES)[number];
