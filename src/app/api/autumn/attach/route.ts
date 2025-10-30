import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, productId } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json(
        { 
          error: 'Customer ID is required',
          code: 'MISSING_CUSTOMER_ID'
        },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { 
          error: 'Product ID is required',
          code: 'MISSING_PRODUCT_ID'
        },
        { status: 400 }
      );
    }

    // Get Autumn secret key
    const autumnApiKey = process.env.AUTUMN_SECRET_KEY;
    if (!autumnApiKey) {
      return NextResponse.json(
        { 
          error: 'Autumn API key not configured',
          code: 'MISSING_API_KEY'
        },
        { status: 500 }
      );
    }

    // Call Autumn API attach endpoint
    const autumnResponse = await fetch('https://api.autumn.org/attach', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${autumnApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId.trim(),
        product_id: productId.trim(),
      }),
    });

    const responseText = await autumnResponse.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    if (!autumnResponse.ok) {
      console.error('Autumn API error:', result);
      return NextResponse.json(
        { 
          error: 'Failed to attach product via Autumn API',
          code: 'AUTUMN_API_ERROR',
          status: autumnResponse.status,
          details: result
        },
        { status: autumnResponse.status }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        customerId: customerId.trim(),
        productId: productId.trim(),
        result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST /api/autumn/attach error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to attach product to customer: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'AUTUMN_API_ERROR'
      },
      { status: 500 }
    );
  }
}