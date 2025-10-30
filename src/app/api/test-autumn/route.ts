import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const testData = {
      customerId: "7cd45dc7-192f-418c-918f-8c0d4aa1e184",
      productId: "study_elite"
    };

    const response = await fetch('http://localhost:3000/api/autumn/attach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json({
        error: 'Autumn API attach request failed',
        status: response.status,
        body: responseBody,
        headers: responseHeaders,
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      response: responseBody,
      headers: responseHeaders,
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'FETCH_ERROR'
    }, { status: 500 });
  }
}