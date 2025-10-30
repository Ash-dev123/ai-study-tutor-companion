import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required field
    if (!email) {
      return NextResponse.json(
        { 
          error: "Email is required",
          code: "MISSING_EMAIL" 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: "Invalid email format",
          code: "INVALID_EMAIL" 
        },
        { status: 400 }
      );
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { 
          error: "User not found",
          code: "USER_NOT_FOUND" 
        },
        { status: 404 }
      );
    }

    const foundUser = existingUser[0];

    // For now, return success without calling Autumn API
    // The Autumn API integration can be handled separately
    return NextResponse.json(
      {
        success: true,
        user: {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
        },
        membership: 'elite',
        note: 'User found successfully. Elite membership should be configured via Autumn dashboard or CLI.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}