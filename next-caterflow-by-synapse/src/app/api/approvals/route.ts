// src/app/api/approvals/route.ts
import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
import { groq } from 'next-sanity';

// Purchase orders pending approval
const purchaseOrderApprovalQuery = groq`
  *[_type == "PurchaseOrder" && status == "pending-approval"] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    "title": "Approve Purchase Order",
    "description": "Purchase order for items",
    "priority": "high",
    "site": site->{name, _id},
    "poNumber": poNumber,
    "orderedByName": orderedBy->name,
    orderedItems[]{
        _key,
        orderedQuantity,
        unitPrice,
        "stockItem": stockItem->{name},
        "supplier": supplier->{name}
    }
  }
`;

// Internal transfers pending approval
const internalTransferApprovalQuery = groq`
  *[_type == "InternalTransfer" && status == "pending-approval"] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    "title": "Approve Internal Transfer",
    "description": "Transfer request from " + coalesce(fromBin->site->name, "Unknown") + " to " + coalesce(toBin->site->name, "Unknown"),
    "priority": "high",
    "fromSite": fromBin->site->{name, _id},
    "toSite": toBin->site->{name, _id},
    transferNumber
  }
`;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userSite = searchParams.get('userSite');
        const userRole = searchParams.get('userRole');

        const [purchaseOrders, internalTransfers] = await Promise.all([
            client.fetch(purchaseOrderApprovalQuery),
            client.fetch(internalTransferApprovalQuery),
        ]);

        let approvals = [...purchaseOrders, ...internalTransfers];

        // Normalize items
        approvals = approvals.map((approval: any) => {
            if (approval._type === 'PurchaseOrder') {
                const supplierNames = [...new Set((approval.orderedItems || []).map((i: any) => i.supplier?.name).filter(Boolean))];
                return {
                    ...approval,
                    siteName: approval.site?.name || 'Unknown Site',
                    description: supplierNames.length > 0
                        ? `Purchase order from ${supplierNames.join(', ')}`
                        : (approval.description || 'Purchase order'),
                };
            } else if (approval._type === 'InternalTransfer') {
                return {
                    ...approval,
                    siteName: approval.fromSite?.name || 'Unknown Site',
                };
            }
            return approval;
        });

        // Filter by role/site
        if (userRole === 'admin' || userRole === 'auditor') {
            // no filter
        } else if (userRole === 'siteManager' && userSite) {
            approvals = approvals.filter((approval: any) => {
                if (approval._type === 'PurchaseOrder') {
                    return approval.site?._id === userSite;
                }
                if (approval._type === 'InternalTransfer') {
                    return (approval.fromSite?._id === userSite) || (approval.toSite?._id === userSite);
                }
                return false;
            });
        } else {
            approvals = []; // not authorized
        }

        approvals.sort((a: any, b: any) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime());

        return NextResponse.json(approvals);
    } catch (error: any) {
        console.error('Failed to fetch pending approvals:', error);
        return NextResponse.json({ error: 'Failed to fetch pending approvals', details: error.message }, { status: 500 });
    }
}
