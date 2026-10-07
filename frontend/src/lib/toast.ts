import { toast } from "sonner";

/** Thin wrapper so every toast in the app goes through one place (and one style). */
export const notify = {
  success: (message: string) => toast(message),
  error: (message: string) => toast(message),
  info: (message: string) => toast(message),
  comingSoon: (feature?: string) => toast(feature ? `${feature} is coming soon` : "Coming soon"),
  nextStep: (feature: string) => toast(`${feature} is coming in the next step`),
};
