import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JobReport } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const jobReport: JobReport = await request.json();
    
    // Validate required fields
    if (!jobReport.title || !jobReport.company || !jobReport.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${process.env.API_URL}/job/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobReport),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || 'Error creating job report' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error creating job report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}