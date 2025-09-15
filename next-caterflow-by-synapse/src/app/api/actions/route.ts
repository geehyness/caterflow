// src/app/api/actions/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { client } from "@/lib/sanity";

// Define separate GROQ queries for each document type
const internalTransferQuery = `
  *[ _type == "InternalTransfer" && (status == "pending" || status == "draft" || status == "pending-approval") ] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    status,
    completedSteps,
    "title": "Pending Transfer",
    "description": "Transfer request from " + coalesce(fromBin->site->name, "Unknown") + " to " + coalesce(toBin->site->name, "Unknown"),
    "priority": "medium",
    "siteName": coalesce(fromBin->site->name, "Unknown") + " → " + coalesce(toBin->site->name, "Unknown"),
    "evidenceRequired": false,
    "fromSite": fromBin->site->_id,
    "toSite": toBin->site->_id,
    "transferItems": transferredItems[]{
      _key,
      "stockItem": stockItem->name,
      transferredQuantity
    },
    "completedSteps": completedSteps
  }
`;

const purchaseOrderQuery = `
  *[_type == "PurchaseOrder" && (status == "pending" || status == "draft" || status == "pending-approval") ] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    status,
    completedSteps,
    "title": "Purchase Order",
    "description": "Purchase order for " + coalesce(supplier->name, "N/A"),
    "priority": "high",
    "poNumber": poNumber,
    "supplierName": supplier->name,
    "orderedBy": orderedBy->name,
    "siteName": site->name,
    "orderedItems": orderedItems[] {
      _key,
      orderedQuantity,
      "unitPrice": coalesce(unitPrice, stockItem->unitPrice),
      "stockItem": {
        "name": stockItem->name,
        "sku": stockItem->sku,
        "unitOfMeasure": stockItem->unitOfMeasure,
        "_ref": stockItem._ref
      },
    },
    "completedSteps": completedSteps
  }
`;

const goodsReceiptQuery = `
  *[ _type == "GoodsReceipt" && (status == "pending" || status == "draft" || status == "pending-approval") ] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    status,
    completedSteps,
    "title": "Pending Goods Receipt",
    "description": "Awaiting receipt of goods at " + coalesce(receivingBin->site->name, "Unknown Site"),
    "priority": "high",
    "siteName": coalesce(receivingBin->site->name, "Unknown Site"),
    "evidenceRequired": true,
    "site": receivingBin->site->_id,
    "grnNumber": receiptNumber,
    evidenceTypes,
    evidenceStatus,
    "receivedItems": receivedItems[]{
      _key,
      "stockItem": stockItem->name,
      receivedQuantity
    },
    attachments[]->{
      _id,
      fileName,
      fileType,
      file,
      uploadedBy->{_id, name},
      uploadedAt
    },
    "completedSteps": completedSteps
  }
`;

const stockAdjustmentQuery = `
  *[ _type == "StockAdjustment" && (status == "pending" || status == "draft" || status == "pending-approval") ] {
    _id,
    _type,
    _createdAt,
    "createdAt": _createdAt,
    status,
    completedSteps,
    "title": "Pending Stock Adjustment",
    "description": "A stock adjustment requires approval or completion.",
    "priority": "high",
    "siteName": coalesce(bin->site->name, "Unknown Site"),
    "evidenceRequired": true,
    "site": bin->site->_id,
    "adjustmentNumber": adjustmentNumber,
    evidenceTypes,
    evidenceStatus,
    "adjustmentItems": adjustedItems[]{
      _key,
      "stockItem": stockItem->name,
      adjustedQuantity,
      reason
    },
    attachments[]->{
      _id,
      fileName,
      fileType,
      file,
      uploadedBy->{_id, name},
      uploadedAt
    },
    "completedSteps": completedSteps
  }
`;

export async function GET(request: Request) {
  // Tell Next.js not to cache anything for this handler
  try {
    noStore();
  } catch (e) {
    // unstable_noStore can throw in some environments; fail-safe: continue
    console.warn("noStore() call failed (non-fatal). Proceeding anyway.");
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const userRole = searchParams.get("userRole");
    const userSite = searchParams.get("userSite");

    console.log("➡️ /api/actions: Request received.");
    console.log("➡️ /api/actions: Fetching actions for:", { userId, userRole, userSite });

    // Execute all queries concurrently (fresh fetches)
    const [transfers, purchaseOrders, goodsReceipts, stockAdjustments] = await Promise.all([
      client.fetch(internalTransferQuery),
      client.fetch(purchaseOrderQuery),
      client.fetch(goodsReceiptQuery),
      client.fetch(stockAdjustmentQuery),
    ]);

    // Combine the results into a single array
    let actions = [...transfers, ...purchaseOrders, ...goodsReceipts, ...stockAdjustments];
    console.log(`✅ /api/actions: Raw actions from Sanity fetched. Count: ${actions.length}`);

    // Filter actions based on user role and site
    if (userRole === "admin") {
      console.log("👤 User Role: Admin. No filtering applied.");
    } else if (["siteManager", "stockController", "dispatchStaff"].includes(userRole || "") && userSite) {
      actions = actions.filter((action: any) => {
        return action.site === userSite ||
          action.fromSite === userSite ||
          action.toSite === userSite;
      });
      console.log(`👤 ${userRole}. Filtered actions for site ${userSite}: ${actions.length}`);
    } else if (userRole === "auditor") {
      console.log("👤 Auditor. No filtering applied.");
    } else {
      actions = [];
      console.log("⚠️ Unknown role or missing site. No actions returned.");
    }

    // Sort newest first
    actions.sort((a: any, b: any) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime());
    console.log(`✅ /api/actions: Sorting complete. Returning ${actions.length} actions.`);

    // Build response and explicitly prevent caching at HTTP level
    const response = NextResponse.json(actions);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    console.error("❌ Error in /api/actions:", error);

    let errorMessage = "Unknown server error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    const errRes = NextResponse.json(
      { error: "Failed to fetch pending actions", details: errorMessage },
      { status: 500 }
    );
    errRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    errRes.headers.set("Pragma", "no-cache");
    errRes.headers.set("Expires", "0");

    return errRes;
  }
}
