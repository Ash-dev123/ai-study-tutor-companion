import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, notInArray } from 'drizzle-orm';

export async function GET() {
  try {
    // Use service role key to access auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Get all existing user IDs from public.users
    const existingUsers = await db.select({ id: users.id }).from(users);
    const existingUserIds = new Set(existingUsers.map(u => u.id));

    // Filter auth users that don't exist in public.users
    const usersToSync = authUsers.users.filter(authUser => !existingUserIds.has(authUser.id));

    // Sync each missing user to public.users table
    const syncedUsers = [];
    for (const authUser of usersToSync) {
      try {
        await db.insert(users).values({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          createdAt: new Date(authUser.created_at),
          updatedAt: new Date(),
        });
        syncedUsers.push(authUser.email);
      } catch (error) {
        console.error(`Error syncing user ${authUser.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedUsers.length} users from auth.users to public.users`,
      syncedUsers,
      totalAuthUsers: authUsers.users.length,
      totalPublicUsers: existingUsers.length,
      newUsersSynced: syncedUsers.length
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}