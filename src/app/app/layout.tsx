"use client";

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/route-components/app/AppLayout";

export default function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
