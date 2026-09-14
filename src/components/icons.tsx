import { forwardRef } from "react";
import {
  HugeiconsIcon,
  type HugeiconsProps,
  type IconSvgElement,
} from "@hugeicons/react";
import {
  AlertCircleIcon as HiAlertCircle,
  ArrowLeft02Icon as HiArrowLeft,
  ArrowRight02Icon as HiArrowRight,
  ArrowUpLeft01Icon as HiArrowUpLeft,
  ArrowUpRight01Icon as HiArrowUpRight,
  BookOpen01Icon as HiBookOpen,
  CheckIcon as HiCheck,
  CheckmarkCircle02Icon as HiCheckCircle,
  ChevronLeftIcon as HiChevronLeft,
  ChevronRightIcon as HiChevronRight,
  Clock01Icon as HiClock,
  Coffee02Icon as HiCoffee,
  Copy01Icon as HiCopy,
  CreditCardIcon as HiCreditCard,
  ExternalLinkIcon as HiExternalLink,
  Facebook01Icon as HiFacebook,
  FileTextIcon as HiFileText,
  GlobeIcon as HiGlobe,
  Image01Icon as HiImage,
  ImagePlusIcon as HiImagePlus,
  InstagramIcon as HiInstagram,
  LayoutDashboardIcon as HiLayoutDashboard,
  LayoutGridIcon as HiLayoutGrid,
  Linkedin01Icon as HiLinkedin,
  LoaderCircleIcon as HiLoaderCircle,
  Menu01Icon as HiMenu,
  MessageCircleIcon as HiMessageCircle,
  Mic01Icon as HiMic,
  MinusIcon as HiMinus,
  AttachmentIcon as HiPaperclip,
  PenLineIcon as HiPenLine,
  PencilEdit01Icon as HiPencil,
  PhoneIcon as HiPhone,
  PlusIcon as HiPlus,
  Rocket01Icon as HiRocket,
  RotateCcwIcon as HiRotateCcw,
  SendIcon as HiSend,
  Settings01Icon as HiSettings,
  Share01Icon as HiShare,
  ShieldCheckIcon as HiShieldCheck,
  MagicWand01Icon as HiSparkle,
  SparklesIcon as HiSparkles,
  SquareIcon as HiSquare,
  StarIcon as HiStar,
  Store01Icon as HiStore,
  TrashIcon as HiTrash,
  TriangleAlertIcon as HiTriangleAlert,
  TwitterIcon as HiTwitter,
  XIcon as HiX,
  YoutubeIcon as HiYoutube,
} from "@hugeicons/core-free-icons";

/**
 * The app's icon set: HugeIcons, behind the component shape the codebase
 * already calls — `<Mic size={18} className="…" />`.
 *
 * HugeIcons ships its glyphs as data (`icon={…}` on one `HugeiconsIcon`
 * component) rather than as a component per glyph. Wrapping each one here
 * instead of rewriting ~120 call sites means the JSX at those sites is
 * unchanged, dynamic use like `<channel.icon size={22} />` keeps working, and
 * the whole mapping stays in one auditable place.
 *
 * Every hugeicons import above is aliased `Hi*` so that names which collide
 * with the exported ones (`ImageIcon`, `ArrowLeftIcon`) cannot shadow them,
 * and so the imports stay named — a namespace import of a 14k-export module
 * leans on the bundler to shake it back out.
 *
 * Props are HugeIcons' own, which already cover what was being passed:
 * `size`, `strokeWidth`, `className`, `color`, plus anything else spread onto
 * the <svg>. Note the default stroke is HugeIcons' 1.5 rather than Lucide's
 * 2, so the whole set reads a little lighter than before.
 */
export type IconProps = Omit<HugeiconsProps, "icon" | "altIcon" | "showAlt">;

function icon(glyph: IconSvgElement, name: string) {
  const Component = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <HugeiconsIcon ref={ref} icon={glyph} {...props} />
  ));
  // Without this the whole set shows up as "ForwardRef" in React DevTools.
  Component.displayName = name;
  return Component;
}

export const AlertCircle = icon(HiAlertCircle, "AlertCircle");
export const AlertTriangle = icon(HiTriangleAlert, "AlertTriangle");
export const ArrowLeftIcon = icon(HiArrowLeft, "ArrowLeftIcon");
export const ArrowRightIcon = icon(HiArrowRight, "ArrowRightIcon");
export const ArrowUpLeft = icon(HiArrowUpLeft, "ArrowUpLeft");
export const ArrowUpRight = icon(HiArrowUpRight, "ArrowUpRight");
export const BookOpen = icon(HiBookOpen, "BookOpen");
export const Check = icon(HiCheck, "Check");
export const CheckCircle2 = icon(HiCheckCircle, "CheckCircle2");
export const ChevronLeft = icon(HiChevronLeft, "ChevronLeft");
export const ChevronRight = icon(HiChevronRight, "ChevronRight");
export const Clock = icon(HiClock, "Clock");
export const Coffee = icon(HiCoffee, "Coffee");
export const Copy = icon(HiCopy, "Copy");
export const CreditCard = icon(HiCreditCard, "CreditCard");
export const ExternalLink = icon(HiExternalLink, "ExternalLink");
export const Facebook = icon(HiFacebook, "Facebook");
export const FileText = icon(HiFileText, "FileText");
export const Globe = icon(HiGlobe, "Globe");
export const ImageIcon = icon(HiImage, "ImageIcon");
export const ImagePlus = icon(HiImagePlus, "ImagePlus");
export const Instagram = icon(HiInstagram, "Instagram");
export const LayoutDashboard = icon(HiLayoutDashboard, "LayoutDashboard");
export const LayoutGrid = icon(HiLayoutGrid, "LayoutGrid");
export const Linkedin = icon(HiLinkedin, "Linkedin");
/** Spun by an `animate-spin` class at every call site, as before. */
export const Loader2 = icon(HiLoaderCircle, "Loader2");
export const Menu = icon(HiMenu, "Menu");
export const MessageCircle = icon(HiMessageCircle, "MessageCircle");
export const Mic = icon(HiMic, "Mic");
export const Minus = icon(HiMinus, "Minus");
export const Paperclip = icon(HiPaperclip, "Paperclip");
export const PenLine = icon(HiPenLine, "PenLine");
export const Pencil = icon(HiPencil, "Pencil");
export const Phone = icon(HiPhone, "Phone");
export const Plus = icon(HiPlus, "Plus");
export const Rocket = icon(HiRocket, "Rocket");
export const RotateCcw = icon(HiRotateCcw, "RotateCcw");
export const Send = icon(HiSend, "Send");
export const Settings = icon(HiSettings, "Settings");
export const Share2 = icon(HiShare, "Share2");
export const ShieldCheck = icon(HiShieldCheck, "ShieldCheck");
export const Sparkle = icon(HiSparkle, "Sparkle");
export const Sparkles = icon(HiSparkles, "Sparkles");
/** The stop-recording glyph; filled by a `fill="currentColor"` at its site. */
export const Square = icon(HiSquare, "Square");
export const Star = icon(HiStar, "Star");
export const Store = icon(HiStore, "Store");
export const Trash2 = icon(HiTrash, "Trash2");
export const Twitter = icon(HiTwitter, "Twitter");
export const X = icon(HiX, "X");
export const Youtube = icon(HiYoutube, "Youtube");
