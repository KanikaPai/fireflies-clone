"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Dark, bottom-centre toasts with an inline close button, as in Fireflies ("Playlist created ×"). */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "ff-toast",
          closeButton: "ff-toast-close",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
