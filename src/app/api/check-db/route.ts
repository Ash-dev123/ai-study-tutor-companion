import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Query all users from the database
    const allUsers = await db.select().from(user).orderBy(desc(user.createdAt));

    // Get total count
    const count = allUsers.length;

    // Get first 5 users
    const users = allUsers.slice(0, 5);

    return NextResponse.json({
      success: true,
      count,
      users
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}