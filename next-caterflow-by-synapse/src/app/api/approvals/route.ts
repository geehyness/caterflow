// src/app/api/approvals/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';

// Corrected GROQ query to fix the syntax error
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

const internalTransferApprovalQuery = groq`
  *[_type == "InternalTransfer" && status == "pending"] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    "title": "Approve Internal Transfer",
    "description": "Transfer request from " + coalesce(fromBin->site->name, "Unknown") + " to " + coalesce(toBin->site->name, "Unknown"),
    "priority": "high",
    "fromSite": fromBin->site->{name, _id},
    "toSite": toBin->site->{name, _id}
  }
`;

const dispatchApprovalQuery = groq`
  *[_type == "DispatchLog" && status == "pending"] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    "title": "Approve Dispatch",
    "description": "Dispatch request from " + coalesce(sourceBin->site->name, "Unknown") + " to " + coalesce(destinationSite->name, "Unknown"),
    "priority": "medium",
    "dispatchNumber": dispatchNumber,
    "sourceSite": sourceBin->site->{name, _id},
    "destinationSite": destinationSite->{name, _id},
    dispatchedItems[]{
        _key,
        dispatchedQuantity,
        "stockItem": stockItem->{name}
    }
  }
`;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userSite = searchParams.get('userSite');
        const userRole = searchParams.get('userRole');

        console.log("➡️ /api/approvals: Request received.");
        console.log("➡️ /api/approvals: Fetching approvals for:", { userRole, userSite });

        const [purchaseOrders, internalTransfers, dispatches] = await Promise.all([
            client.fetch(purchaseOrderApprovalQuery),
            client.fetch(internalTransferApprovalQuery),
            client.fetch(dispatchApprovalQuery),
        ]);

        let approvals = [...purchaseOrders, ...internalTransfers, ...dispatches];
        console.log(`✅ /api/approvals: Raw approvals from Sanity fetched. Count: ${approvals.length}`);

        // Format descriptions
        approvals = approvals.map(approval => {
            if (approval._type === 'PurchaseOrder') {
                const supplierNames = [...new Set(approval.orderedItems.map((item: any) => item.supplier?.name))].filter(Boolean);
                return {
                    ...approval,
                    description: supplierNames.length > 0 ? `Purchase order from ${supplierNames.join(', ')}` : 'Purchase order',
                    siteName: approval.site?.name || 'Unknown',
                };
            }
            if (approval._type === 'InternalTransfer') {
                return {
                    ...approval,
                    siteName: approval.fromSite?.name || 'Unknown',
                };
            }
            if (approval._type === 'DispatchLog') {
                return {
                    ...approval,
                    siteName: approval.sourceSite?.name || 'Unknown',
                };
            }
            return approval;
        });

        if (userRole === "admin" || userRole === "auditor") {
            console.log("👤 User Role: Admin/Auditor. No filtering applied.");
        } else if (userRole === "siteManager" && userSite) {
            approvals = approvals.filter((approval: any) => {
                const isPurchaseOrderForSite = approval._type === 'PurchaseOrder' && approval.site?._id === userSite;
                const isInternalTransferForSite = approval._type === 'InternalTransfer' && (approval.fromSite?._id === userSite || approval.toSite?._id === userSite);
                const isDispatchForSite = approval._type === 'DispatchLog' && approval.sourceSite?._id === userSite;
                return isPurchaseOrderForSite || isInternalTransferForSite || isDispatchForSite;
            });
            console.log(`👤 Site Manager. Filtered approvals for site ${userSite}: ${approvals.length}`);
        } else {
            approvals = [];
            console.log("⚠️ Unknown role or insufficient permissions. No approvals returned.");
        }

        approvals.sort((a: any, b: any) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime());
        console.log(`✅ /api/approvals: Sorting complete. Returning ${approvals.length} approvals.`);

        return NextResponse.json(approvals);
    } catch (error: any) {
        console.error("❌ Failed to fetch pending approvals:", error);
        return NextResponse.json(
            { error: "Failed to fetch pending approvals", details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { actionId, actionType, status, approvedBy, rejectedBy, rejectionReason } = body;

        // Update the action status in Sanity
        let updateData: any = { status };

        if (status === 'approved') {
            updateData.approvedBy = {
                _type: 'reference',
                _ref: approvedBy,
            };
            updateData.approvedAt = new Date().toISOString();
        } else if (status === 'rejected') {
            updateData.rejectedBy = {
                _type: 'reference',
                _ref: rejectedBy,
            };
            updateData.rejectedAt = new Date().toISOString();
            updateData.rejectionReason = rejectionReason;
        }

        const result = await writeClient
            .patch(actionId)
            .set(updateData)
            .commit();

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("❌ Failed to update approval status:", error);
        return NextResponse.json(
            { error: "Failed to update approval status", details: error.message },
            { status: 500 }
        );
    }
}