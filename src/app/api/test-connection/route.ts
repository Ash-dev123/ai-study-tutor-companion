import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  let sql: ReturnType<typeof postgres> | null = null;
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL environment variable is not configured',
        code: 'MISSING_DATABASE_URL'
      }, { status: 500 });
    }

    sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    const currentTimeResult = await sql`SELECT NOW() as current_time`;
    const currentTime = currentTimeResult[0]?.current_time;

    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const tables = tablesResult.map(row => row.table_name);

    await sql.end();

    return NextResponse.json({
      success: true,
      currentTime: currentTime ? new Date(currentTime).toISOString() : null,
      tables: tables,
      tableCount: tables.length,
      connectionInfo: {
        database: 'PostgreSQL',
        connected: true,
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('PostgreSQL connection test error:', error);
    
    if (sql) {
      try {
        await sql.end();
      } catch (endError) {
        console.error('Error closing SQL connection:', endError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : error;

    return NextResponse.json({
      error: 'Failed to connect to PostgreSQL database',
      details: errorDetails,
      message: errorMessage,
      code: 'DATABASE_CONNECTION_ERROR'
    }, { status: 500 });
  }
}