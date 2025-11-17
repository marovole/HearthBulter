import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document for Pages Router
 * This minimal _document.tsx is required to prevent Next.js from attempting
 * to prerender the default /_error route during static export.
 *
 * The actual routing is handled by App Router (src/app directory).
 * This file exists only to satisfy Next.js's Pages Router requirements.
 */
export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
