import { NextPageContext } from "next";

/**
 * Custom Error Page for Pages Router
 * This file prevents Next.js from using the default _error page
 * which imports <Html> from next/document causing build errors.
 *
 * The actual error handling is done by App Router (src/app/global-error.tsx and not-found.tsx).
 * This file exists only to satisfy Next.js's Pages Router requirements during static export.
 */

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <h1 style={{ fontSize: "3rem", margin: "0" }}>
        {statusCode || "Error"}
      </h1>
      <p style={{ fontSize: "1.5rem", color: "#666" }}>
        {statusCode
          ? `服务器错误 ${statusCode}`
          : "客户端错误"}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
