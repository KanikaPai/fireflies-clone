import type { Metadata } from "next";

import { PlaylistPage } from "@/components/pages/PlaylistPage";

export const metadata: Metadata = { title: "Playlist" };

export default function Page() {
  return <PlaylistPage />;
}
