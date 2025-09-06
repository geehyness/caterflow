// hooks/usePurchaseOrders.ts
import { useState, useEffect } from 'react';

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  status: string;
  supplier: { name: string };
  site: { name: string };
  orderedItems?: Array<{
    _key: string;
    stockItem: {
      _id: string;
      name: string;
      sku: string;
      unitOfMeasure: string;
    };
    orderedQuantity: number;
    unitPrice: number;
  }>;
  orderDate: string;
  totalAmount: number;
  hasReceipts: boolean;
}

export function usePurchaseOrders(statusFilter?: string) {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [statusFilter]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = statusFilter 
        ? `/api/purchase-orders?status=${statusFilter}`
        : '/api/purchase-orders';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders');
      }
      
      const data = await response.json();
      // Ensure data is always an array
      setData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Filter approved POs without receipts (ready for receiving)
  const readyForReceiving = data.filter(po => 
    po.status === 'approved' && !po.hasReceipts
  );

  // Filter approved POs with receipts
  const withReceipts = data.filter(po => 
    po.status === 'approved' && po.hasReceipts
  );

  return {
    purchaseOrders: data,
    readyForReceiving,
    withReceipts,
    loading,
    error,
    refetch: fetchPurchaseOrders
  };
}