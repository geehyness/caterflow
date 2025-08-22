// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { client, writeClient } from '@/lib/sanity';
import { groq } from 'next-sanity';
import bcrypt from 'bcryptjs';
import { logSanityInteraction } from '@/lib/sanityLogger';

const SALT_ROUNDS = 10;

// GET handler: Fetch all AppUsers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    let query = groq`
      *[_type == "AppUser"]{
        _id,
        name,
        email,
        role,
        isActive,
        "associatedSite": associatedSite->name,
        "profileImage": profileImage.asset->url
      }
    `;

    if (userId) {
      query = groq`
        *[_type == "AppUser" && _id == $userId][0]{
          _id,
          name,
          email,
          role,
          isActive,
          "associatedSite": associatedSite->name,
          "profileImage": profileImage.asset->url
        }
      `;
      const user = await client.fetch(query, { userId });
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    const users = await client.fetch(query);
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('API Error (GET /api/users):', error);
    return NextResponse.json({ message: 'Failed to fetch users', error: error.message }, { status: 500 });
  }
}

// POST handler: Create a new AppUser
export async function POST(request: Request) {
  try {
    const { name, email, role, associatedSite, isActive, password } = await request.json();

    // Basic validation
    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existingUser = await client.fetch(groq`*[_type == "AppUser" && email == $email][0]`, { email });
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    // Hash the password if provided
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const newUser = {
      _type: 'AppUser',
      name,
      email,
      role,
      associatedSite: associatedSite ? { _type: 'reference', _ref: associatedSite } : undefined,
      isActive: isActive !== undefined ? isActive : true,
      password: hashedPassword,
    };

    const createdUser = await writeClient.create(newUser);

    // Log the creation
    await logSanityInteraction(
      'create',
      `Created new user: ${name}`,
      'AppUser',
      createdUser._id,
      'system',
      true
    );

    // Return a sanitized version without the password
    const { password: _, ...sanitizedUser } = createdUser;
    return NextResponse.json(sanitizedUser, { status: 201 });
  } catch (error: any) {
    console.error('API Error (POST /api/users):', error);
    return NextResponse.json({ message: 'Failed to create user', error: error.message }, { status: 500 });
  }
}

// PUT handler: Update an existing AppUser
export async function PUT(request: Request) {
  try {
    const { _id, name, email, role, associatedSite, isActive, password } = await request.json();

    if (!_id) {
      return NextResponse.json({ message: 'User ID is required for update' }, { status: 400 });
    }
    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Missing required fields for update' }, { status: 400 });
    }

    const patches: { [key: string]: any } = {
      name,
      email,
      role,
      isActive: isActive !== undefined ? isActive : true,
      associatedSite: associatedSite ? { _type: 'reference', _ref: associatedSite } : null,
    };

    // If a new password is provided, hash it
    if (password) {
      patches.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updatedUser = await writeClient.patch(_id).set(patches).commit();

    // Log the update
    await logSanityInteraction(
      'update',
      `Updated user: ${name}`,
      'AppUser',
      updatedUser._id,
      'system',
      true
    );

    // Return a sanitized version without the password
    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json(sanitizedUser);
  } catch (error: any) {
    console.error('API Error (PUT /api/users):', error);
    return NextResponse.json({ message: 'Failed to update user', error: error.message }, { status: 500 });
  }
}

// DELETE handler: Delete an AppUser
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'User ID is required for deletion' }, { status: 400 });
    }

    // Get user details before deletion for logging
    const user = await client.fetch(groq`*[_type == "AppUser" && _id == $id][0]{name}`, { id });

    await writeClient.delete(id);

    // Log the deletion
    await logSanityInteraction(
      'delete',
      `Deleted user: ${user.name}`,
      'AppUser',
      id,
      'system',
      true
    );

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API Error (DELETE /api/users):', error);
    return NextResponse.json({ message: 'Failed to delete user', error: error.message }, { status: 500 });
  }
}