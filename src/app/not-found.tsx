"use client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-700">页面未找到</h2>
        <p className="mb-8 text-gray-600">抱歉，您访问的页面不存在。</p>
        <Link href="/">
          <Button>返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
