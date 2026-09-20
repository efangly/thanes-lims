"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api-client";

// devtools (devDependency) โหลดเฉพาะตอน dev — เงื่อนไข NODE_ENV คงที่ ทำให้ bundler ตัดทิ้งใน production build
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })))
    : null;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        // 4xx = คำขอผิด/ไม่มีสิทธิ์ ลองซ้ำไม่ช่วย
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // สร้างครั้งเดียวต่อ client session (กัน cache รั่วข้ามคนตอน SSR)
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      {children}
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
