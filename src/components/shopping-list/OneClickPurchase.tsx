// @ts-nocheck
"use client";

import { useState } from "react";

interface CartItem {
  foodId: string;
  foodName: string;
  productId: string;
  productName: string;
  platform: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
}

interface OneClickPurchaseProps {
  items: CartItem[];
  onPurchaseComplete: (orderId: string) => void;
  onCancel: () => void;
}

export function OneClickPurchase({
  items,
  onPurchaseComplete,
  onCancel,
}: OneClickPurchaseProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("dingdong");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const platforms = [
    { id: "dingdong", name: "叮咚买菜", fee: 3 },
    { id: "hema", name: "盒马鲜生", fee: 6 },
    { id: "jd", name: "京东到家", fee: 5 },
    { id: "meituan", name: "美团买菜", fee: 4 },
  ];

  const selectedPlatformInfo = platforms.find((p) => p.id === selectedPlatform);

  const calculateTotal = () => {
    const itemsTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryFee = selectedPlatformInfo?.fee || 0;
    return itemsTotal + deliveryFee;
  };

  const handlePurchase = async () => {
    if (!deliveryAddress.trim()) {
      setError("请填写收货地址");
      return;
    }

    if (!phoneNumber.trim()) {
      setError("请填写手机号码");
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      setError("请填写正确的手机号码");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const orderData = {
        platform: selectedPlatform,
        items: items.map((item) => ({
          foodId: item.foodId,
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress: deliveryAddress.trim(),
        phoneNumber: phoneNumber.trim(),
        orderNotes: orderNotes.trim(),
        totalAmount: calculateTotal(),
      };

      const response = await fetch("/api/ecommerce/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "下单失败");
      }

      const data = await response.json();
      onPurchaseComplete(data.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "下单失败");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">一键购买</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              选择平台
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    selectedPlatform === platform.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {platform.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    配送费 ¥{platform.fee}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              商品清单
            </h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {items.map((item, index) => (
                <div key={index} className="p-3 flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {item.productName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.foodName} • {item.platform}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ¥{item.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      x{item.quantity}
                      {item.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              配送信息
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  收货地址 *
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="请输入详细收货地址"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手机号码 *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="请输入手机号码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注信息（可选）
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="如有特殊要求请在此说明"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              商品金额: ¥
              {items
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              配送费: ¥{selectedPlatformInfo?.fee || 0}
            </div>
            <div className="text-lg font-bold text-gray-900">
              总计: ¥{calculateTotal().toFixed(2)}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "处理中..." : "确认下单"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
