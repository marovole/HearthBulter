'use client';

import { use } from 'react';
import { ShoppingListView } from '@/components/shopping/ShoppingListView';

interface ShoppingListDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * Shopping List Detail Page Component
 *
 * Displays a specific shopping list with items and management features.
 * Authentication is handled within the ShoppingListView component.
 *
 * IMPORTANT: Client component for Cloudflare Pages static export compatibility.
 */
export default function ShoppingListDetailPage({
  params,
}: ShoppingListDetailPageProps) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ShoppingListView shoppingListId={id} />
      </div>
    </div>
  );
}
