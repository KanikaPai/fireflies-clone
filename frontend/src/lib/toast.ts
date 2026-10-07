import { toast } from "sonner";

/** Thin wrapper so every toast in the app goes through one place (and one style). */
export const notify = {
  success: (message: string) => toast(message),
  error: (message: string) => toast(message),
  info: (message: string) => toast(message),
  /** A toast with one action button (e.g. Undo). */
  withAction: (message: string, label: string, onClick: () => void) =>
    toast(message, { action: { label, onClick }, duration: 6000 }),
  comingSoon: (feature?: string) => toast(feature ? `${feature} coming soon` : "Coming soon"),
  nextStep: (feature: string) => toast(`${feature} is coming in the next step`),
};
