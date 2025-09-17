import { NextResponse } from 'next/server';
import { client } from '@/lib/sanity';
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
    "site": site->{name, _id}, // Get the full site object for filtering
    "poNumber": poNumber,
    "orderedByName": orderedBy->name, // Explicitly name the key for orderedBy
    orderedItems[]{
        _key,
        orderedQuantity,
        unitPrice,
        "stockItem": stockItem->{name},
        "supplier": supplier->{name}
    }
  }
`;

// Define a separate GROQ query for Internal Transfers that require approval
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

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userSite = searchParams.get('userSite');
        const userRole = searchParams.get('userRole');

        console.log("➡️ /api/approvals: Request received.");
        console.log("➡️ /api/approvals: Fetching approvals for:", { userRole, userSite });

        const [purchaseOrders, internalTransfers] = await Promise.all([
            client.fetch(purchaseOrderApprovalQuery),
            client.fetch(internalTransferApprovalQuery),
        ]);

        let approvals = [...purchaseOrders, ...internalTransfers];
        console.log(`✅ /api/approvals: Raw approvals from Sanity fetched. Count: ${approvals.length}`);

        // Use a more generic description for POs since suppliers are item-specific
        approvals = approvals.map(approval => {
            if (approval._type === 'PurchaseOrder') {
                const supplierNames = [...new Set(approval.orderedItems.map((item: any) => item.supplier?.name))].filter(Boolean);
                return {
                    ...approval,
                    description: ``,
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
                return isPurchaseOrderForSite || isInternalTransferForSite;
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
        return new NextResponse(JSON.stringify({ error: "Failed to fetch pending approvals", details: error.message }), { status: 500 });
    }
}