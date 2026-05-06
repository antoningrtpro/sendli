export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "video"
  | "pdf"
  | "embed"
  | "divider"
  | "pricing"
  | "cta"
  | "spacer"
  | "metrics"
  | "testimonial"
  | "timeline"
  | "faq"
  | "signature"
  | "team"
  | "enjeux"
  | "case-study";

export type BlockWidth = "full" | "two-thirds" | "half" | "one-third";

export interface PricingItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface MetricItem {
  id: string;
  value: string;   // e.g. "10x", "+200%", "$1M"
  label: string;   // e.g. "ROI", "Growth"
  description?: string;
}

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface KeyMetric {
  id: string;
  value: string;  // e.g. "10x", "+200%", "$1M"
  label: string;  // e.g. "ROI", "Growth"
}

export interface TestimonialData {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
  rating?: number;   // 1–5 stars
  mediaUrl?: string; // optional image shown in the card
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  width: BlockWidth;
  paddingTop: number;
  paddingBottom: number;
  anchorLabel?: string;
  analyticsSection?: string; // optional section label for analytics grouping
  // Saved-block link (ultra mode only — stripped before public render)
  _savedBlockId?: string;
  _savedMode?: "ultra" | "template";
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  align?: "left" | "center" | "right";
}

export interface TextBlock extends BaseBlock {
  type: "text";
  content: string; // TipTap JSON string
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

export interface VideoBlock extends BaseBlock {
  type: "video";
  url: string;
  caption?: string;
}

export interface PdfBlock extends BaseBlock {
  type: "pdf";
  url: string;
  label?: string;
  height?: number; // viewer height in px
}

export interface EmbedBlock extends BaseBlock {
  type: "embed";
  html: string;         // raw embed code (iframe, script+div, etc.)
  caption?: string;
  downloadUrl?: string; // optional link shown as "Télécharger" button
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  color?: string;
  thickness?: number;
}

export interface PricingBlock extends BaseBlock {
  type: "pricing";
  title?: string;
  items: PricingItem[];
  currency: string;
  showTotal: boolean;
}

export interface CtaBlock extends BaseBlock {
  type: "cta";
  label: string;
  url: string;
  align: "left" | "center" | "right";
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  height: number;
}

export interface MetricsBlock extends BaseBlock {
  type: "metrics";
  items: MetricItem[];  // always 3
}

export interface TestimonialBlock extends BaseBlock {
  type: "testimonial";
  title?: string;
  description?: string;
  testimonials: TestimonialData[]; // 1–3 displayed side-by-side
}

export interface TimelineBlock extends BaseBlock {
  type: "timeline";
  title?: string;
  items: TimelineItem[];
}

export interface FaqBlock extends BaseBlock {
  type: "faq";
  title?: string;
  items: FaqItem[];
}

export interface SignatureBlock extends BaseBlock {
  type: "signature";
  contractUrl: string;  // Link to sign (DocuSign, HelloSign, etc.)
  buttonLabel: string;
  description?: string;
}

export interface CaseStudyMetric {
  id: string;
  value: string;  // e.g. "+200%", "x3"
  label: string;  // e.g. "Revenue growth"
}

export interface CaseStudyBlock extends BaseBlock {
  type: "case-study";
  title: string;
  tags: string[];               // service name pills
  description: string;
  quote?: string;               // client testimonial text
  authorName?: string;
  authorRole?: string;
  authorAvatarUrl?: string;
  linkLabel?: string;           // CTA button label
  linkUrl?: string;             // CTA button URL
  mediaUrl?: string;            // right-side image or video URL
  metrics?: CaseStudyMetric[];  // up to 3 key figures (optional)
}

export interface EnjeuxItem {
  id: string;
  title: string;
  description: string;
  icon?: string; // emoji — utilisé quand markerType === "icon"
}

export interface EnjeuxSection {
  id: string;
  tag?: string;
  title?: string;
  subtitle?: string;
  items: EnjeuxItem[];
  markerType?: "number" | "icon"; // défaut "number"
}

export interface EnjeuxBlock extends BaseBlock {
  type: "enjeux";
  resetPerSection?: boolean; // défaut false — numérotation continue entre sections "number"
  // Multi-section mode (new — preferred)
  sections?: EnjeuxSection[];
  // Legacy flat mode (backward compat — used when sections is undefined)
  tag?: string;
  title?: string;
  subtitle?: string;
  items?: EnjeuxItem[];
}


export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
}

export interface TeamBlock extends BaseBlock {
  type: "team";
  members: TeamMember[];
}

export type ProposalBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | PdfBlock
  | EmbedBlock
  | DividerBlock
  | PricingBlock
  | CtaBlock
  | SpacerBlock
  | MetricsBlock
  | TestimonialBlock
  | TimelineBlock
  | FaqBlock
  | SignatureBlock
  | TeamBlock
  | EnjeuxBlock
  | CaseStudyBlock;

export interface BrandKitData {
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  bgColor: string;
  textColor: string;
}

export interface BannerData {
  id: string;
  name: string;
  bgColor: string;
  bgImageUrl?: string | null;
  title: string;
  subtitle: string;
  textColor: string;
  logoUrl?: string | null;
  imageOnly?: boolean;
}

export interface LibraryTestimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string | null;
}

export interface LibraryCaseStudy {
  id: string;
  title: string;
  tags: string[];
  description: string;
  quote?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorAvatarUrl?: string | null;
  linkLabel?: string | null;
  linkUrl?: string | null;
  mediaUrl?: string | null;
  metrics: CaseStudyMetric[];
}

export interface LibrarySavedBlock {
  id: string;
  name: string;
  blockType: string;
  data: string; // JSON
  mode: "ultra" | "template";
}
