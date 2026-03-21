"use client";

// ============================================================================
// Instacart 购物车预览页面
// 显示匹配结果，允许用户修正，确认后跳转 Instacart
// ============================================================================

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// ============================================================================
// 类型定义
// ============================================================================

interface MatchedItem {
  ingredientName: string;
  productName: string;
  productId: string;
  quantity: number;
  price: number;
  confidence: number;
  matchType: "exact" | "fuzzy" | "category" | "none";
  imageUrl?: string;
}

interface CartData {
  items: MatchedItem[];
  retailer: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  checkoutUrl: string;
  deepLink: string;
}

// ============================================================================
// 主组件
// ============================================================================

export default function InstacartCartPage() {
  const searchParams = useSearchParams();
  const planId = searchParams?.get("planId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [creating] = useState(false);

  useEffect(() => {
    if (planId) {
      loadCartPreview(planId);
    } else {
      setError("No meal plan specified");
      setLoading(false);
    }
  }, [planId]);

  const loadCartPreview = async (mealPlanId: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/instacart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create cart");
      }

      const data = await response.json();
      setCartData({
        items: [],
        retailer: data.retailer || "Instacart",
        subtotal: 0,
        deliveryFee: 5.99,
        total: 0,
        checkoutUrl: data.checkoutUrl,
        deepLink: data.deepLink,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (cartData?.checkoutUrl) {
      window.open(cartData.checkoutUrl, "_blank");
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!cartData) {
    return <EmptyState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* 头部 */}
        <div className="mb-8">
          <Link
            href="/dashboard/meal-plans"
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Meal Plans
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Review Your Cart</h1>
          <p className="mt-1 text-gray-500">
            We&apos;ve matched your ingredients to products on Instacart. Review and adjust before
            checkout.
          </p>
        </div>

        {/* 零售商信息 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <span className="text-xl">🛒</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{cartData.retailer}</p>
                <p className="text-sm text-gray-500">Delivery available</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Estimated delivery</p>
              <p className="font-medium text-gray-900">1-2 hours</p>
            </div>
          </div>
        </div>

        {/* 商品列表 */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="font-medium text-gray-900">
              {cartData.items.length > 0 ? `${cartData.items.length} items` : "Cart ready"}
            </h2>
          </div>

          {cartData.items.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {cartData.items.map((item, index) => (
                <CartItemRow key={index} item={item} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">Your cart has been created on Instacart.</p>
              <p className="mt-2 text-sm text-gray-400">
                Click the button below to review and complete your order.
              </p>
            </div>
          )}
        </div>

        {/* 价格汇总 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${cartData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery fee</span>
              <span>${cartData.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Estimated total</span>
                <span>${cartData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={handleCheckout}
            disabled={creating}
            className="flex-1 rounded-lg bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 disabled:bg-gray-300"
          >
            {creating ? "Creating..." : "Continue to Instacart"}
          </button>
          <Link
            href="/dashboard/meal-plans"
            className="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>

        {/* 提示信息 */}
        <p className="mt-4 text-center text-sm text-gray-500">
          You&apos;ll be redirected to Instacart to complete your purchase. Prices may vary.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件
// ============================================================================

function CartItemRow({ item }: { item: MatchedItem }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={64}
            height={64}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🥬</div>
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{item.productName}</p>
        <p className="text-sm text-gray-500">
          For: {item.ingredientName} × {item.quantity}
        </p>
        <ConfidenceBadge confidence={item.confidence} matchType={item.matchType} />
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence, matchType }: { confidence: number; matchType: string }) {
  const colors = {
    exact: "bg-green-100 text-green-700",
    fuzzy: "bg-yellow-100 text-yellow-700",
    category: "bg-orange-100 text-orange-700",
    none: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${colors[matchType as keyof typeof colors]}`}
    >
      {Math.round(confidence * 100)}% match
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-gray-600">Creating your cart...</p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 text-4xl">😕</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="mb-4 text-gray-500">{error}</p>
        <Link
          href="/dashboard/meal-plans"
          className="inline-block rounded-lg bg-emerald-500 px-6 py-2 text-white hover:bg-emerald-600"
        >
          Back to Meal Plans
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 text-4xl">🛒</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">No cart data</h2>
        <p className="mb-4 text-gray-500">Please select a meal plan first.</p>
        <Link
          href="/dashboard/meal-plans"
          className="inline-block rounded-lg bg-emerald-500 px-6 py-2 text-white hover:bg-emerald-600"
        >
          View Meal Plans
        </Link>
      </div>
    </div>
  );
}
