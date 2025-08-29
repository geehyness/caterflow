// src/app/dashboard/page.tsx
import { getStockItems, getPurchaseOrders, getAppUsers } from '@/lib/queries';
import Link from 'next/link';
import { AppUser } from '@/lib/sanityTypes';

export default async function DashboardPage() {
    const [stockItems, purchaseOrders, appUsers] = await Promise.all([
        getStockItems(),
        getPurchaseOrders(),
        getAppUsers()
    ]);

    const activeUsers = appUsers.filter((user: AppUser) => user.isActive);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Caterflow Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Stock Items</h2>
                    <p className="text-3xl">{stockItems.length}</p>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Active Users</h2>
                    <p className="text-3xl">{activeUsers.length}</p>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Purchase Orders</h2>
                    <p className="text-3xl">{purchaseOrders.length}</p>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Pending Orders</h2>
                    <p className="text-3xl">
                        {purchaseOrders.filter((po: any) => po.status === 'ordered').length}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold mb-4">Recent Stock Items</h2>
                    <ul>
                        {stockItems.slice(0, 5).map((item: any) => (
                            <li key={item._id} className="flex justify-between py-2 border-b">
                                <span>{item.name}</span>
                                <span>{item.sku}</span>
                            </li>
                        ))}
                    </ul>
                    <Link href="/inventory" className="text-blue-500 mt-4 block">
                        View All Inventory
                    </Link>
                </div>

                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
                    <ul>
                        {purchaseOrders.slice(0, 5).map((order: any) => (
                            <li key={order._id} className="py-2 border-b">
                                <div className="flex justify-between">
                                    <span>{order.poNumber}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${order.status === 'received' ? 'bg-green-100 text-green-800' :
                                        order.status === 'ordered' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {order.supplier.name} • {new Date(order.orderDate).toLocaleDateString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Link href="/operations/purchases" className="text-blue-500 mt-4 block">
                        View All Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}