"use client";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-6xl font-bold text-gray-900">500</h1>
            <h2 className="mb-4 text-2xl font-semibold text-gray-700">服务器错误</h2>
            <p className="mb-8 text-gray-600">抱歉，服务器遇到了问题。</p>
            <button
              onClick={() => reset()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
