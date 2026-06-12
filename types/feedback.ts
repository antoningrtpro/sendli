// ─── Feedback Form Types ──────────────────────────────────────────────────────

export type FormFieldType =
  | "text"
  | "textarea"
  | "radio"
  | "checkbox"
  | "scale"
  | "email"
  | "phone"
  | "nps";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;
  options?: string[];      // for radio and checkbox
  scaleMin?: number;       // for scale and nps
  scaleMax?: number;
  scaleMinLabel?: string;  // e.g. "Pas du tout"
  scaleMaxLabel?: string;  // e.g. "Absolument"
}

export interface FormTemplate {
  id: string;
  userId: string;
  name: string;                  // internal label (visible only to sales)
  tag: "won" | "lost";
  title: string;                 // shown to prospect
  subtitle?: string;
  fields: FormField[];
  confirmationMessage: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type FieldValue = string | string[] | number;

export interface FormResponse {
  id: string;
  proposalId: string;
  formTemplateId: string;
  userId: string;                // owner of the proposal
  status: "answered" | "closed_without_answer";
  responses?: { fieldId: string; value: FieldValue }[];
  submittedAt?: Date;
  closedAt?: Date;
  visitorId: string;
}
