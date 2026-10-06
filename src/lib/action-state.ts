// Result of a form server action. "field" names the input an error belongs to, so the form can
// show the message right next to it.
export type ActionState = { ok?: boolean; error?: string; field?: string; message?: string; data?: Record<string, string> };
