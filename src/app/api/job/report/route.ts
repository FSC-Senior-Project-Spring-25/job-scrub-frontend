import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { JobReport } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Format the data to match the backend schema
    const jobReport: JobReport = {
      title: data.title,
      company: data.company,
      url: data.url,
      description: data.description,
      jobType: data.jobType,
      skills: data.skills,
      location: data.location.type === 'remote' ? null : {
        address: data.location.address,
        lat: data.location.coordinates?.lat || 0,
        lon: data.location.coordinates?.lon || 0,
      },
      locationType: data.locationType,
      benefits: data.benefits,
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : undefined,
      salary: data.salary || undefined,
    };
    
    // Validate required fields
    if (!jobReport.title || !jobReport.company || !jobReport.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate location data for non-remote positions
    if (jobReport.locationType !== 'remote' && 
        (!jobReport.location?.address || 
         !jobReport.location?.lat || 
         !jobReport.location?.lon)) {
      return NextResponse.json(
        { error: 'Location coordinates required for non-remote positions' },
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
    
    const responseData = await response.json();
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error creating job report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}