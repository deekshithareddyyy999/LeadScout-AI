import {
  Building2,
  ChartColumn,
  Cloud,
  Code,
  FileText,
  Network,
  Palette,
  ReceiptText,
  Repeat,
  Smartphone,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "./types";

export const ICONS: Record<IconKey, LucideIcon> = {
  chart: ChartColumn,
  sync: Repeat,
  mobile: Smartphone,
  invoice: ReceiptText,
  portal: Store,
  document: FileText,
  agency: Building2,
  network: Network,
  design: Palette,
  cloud: Cloud,
  code: Code,
};
