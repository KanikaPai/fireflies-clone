import type { Metadata } from "next";

import { ContactsPage } from "@/components/pages/ContactsPage";

export const metadata: Metadata = { title: "Contacts" };

export default function Page() {
  return <ContactsPage />;
}
