import { NextRequest, NextResponse } from 'next/server';
import {
  validateQuery,
  getAllowedIndices,
  fetchFromOpenSearch,
} from '@toyo/shared-lib';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const { index } = await params;

  // Validate index
  const allowedIndices = getAllowedIndices();
  if (!allowedIndices.includes(index)) {
    return NextResponse.json({ error: 'Index not allowed' }, { status: 403 });
  }

  // Parse request body
  let body: unknown;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : { query: { match_all: {} } };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate query
  const validation = validateQuery(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const response = await fetchFromOpenSearch(`/${index}/_search`, {
      method: 'POST',
      body: JSON.stringify(validation.data),
    });

    const text = await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        console.error('OpenSearch authentication failed');
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      try {
        const errorData = JSON.parse(text);
        const message = errorData?.error?.reason || 'Search failed';
        return NextResponse.json({ error: message }, { status: response.status });
      } catch {
        return NextResponse.json({ error: text || 'Search failed' }, { status: response.status });
      }
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenSearch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const { index } = await params;

  const allowedIndices = getAllowedIndices();
  if (!allowedIndices.includes(index)) {
    return NextResponse.json({ error: 'Index not allowed' }, { status: 403 });
  }

  const body = { query: { match_all: {} } };

  try {
    const response = await fetchFromOpenSearch(`/${index}/_search`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        console.error('OpenSearch authentication failed');
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
      try {
        const errorData = JSON.parse(text);
        const message = errorData?.error?.reason || 'Search failed';
        return NextResponse.json({ error: message }, { status: response.status });
      } catch {
        return NextResponse.json({ error: text || 'Search failed' }, { status: response.status });
      }
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (error) {
    console.error('OpenSearch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
