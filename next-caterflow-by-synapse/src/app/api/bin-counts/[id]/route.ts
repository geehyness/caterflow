// src/app/api/bin-counts/[id]/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import { logSanityInteraction } from '@/lib/sanityLogger';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const query = groq`*[_type == "InventoryCount" && _id == $id][0] {
          _id,
          countNumber,
          countDate,
          status,
          notes,
          "bin": bin->{
              _id,
              name,
              "site": site->{
                  _id,
                  name
              }
          },
          "countedBy": countedBy->{
              _id,
              name
          },
          "countedItems": countedItems[]{
              _key,
              "stockItem": stockItem->{
                  _id,
                  name,
                  sku
              },
              countedQuantity,
              systemQuantityAtCountTime,
              variance
          }
      }`;

    const binCount = await client.fetch(query, { id });

    if (!binCount) {
      return NextResponse.json(
        { error: 'Bin count not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(binCount);
  } catch (error) {
    console.error('Failed to fetch bin count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bin count' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updateData = await request.json();

    const result = await writeClient
      .patch(id)
      .set(updateData)
      .commit();

    await logSanityInteraction(
      'update',
      `Updated bin count: ${id}`,
      'InventoryCount',
      id,
      'system',
      true
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update bin count:', error);
    return NextResponse.json(
      { error: 'Failed to update bin count' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await writeClient.delete(id);

    await logSanityInteraction(
      'delete',
      `Deleted bin count: ${id}`,
      'InventoryCount',
      id,
      'system',
      true
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bin count:', error);
    return NextResponse.json(
      { error: 'Failed to delete bin count' },
      { status: 500 }
    );
  }
}