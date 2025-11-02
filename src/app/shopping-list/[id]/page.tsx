'use client';

import { ShoppingListView } from '@/components/shopping/ShoppingListView';

interface ShoppingListDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ShoppingListDetailPage({
  params,
}: ShoppingListDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ShoppingListView shoppingListId={id} />
      </div>
    </div>
  );
}
