import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// The DOM build passes flushSync, which React Router uses for view transitions.
// The DOM build passes flushSync, which React Router uses for view transitions.
import { RouterProvider } from "react-router/dom";
import { router } from "@/app/router";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { MotionProvider } from "@/motion/MotionProvider";
import { ToastProvider } from "@/ui";
import "@/styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ToastProvider>
      </MotionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
