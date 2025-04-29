import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    const limit = req.nextUrl.searchParams.get('limit') || '1000';
    try {
        const response = await fetch(`${process.env.API_URL}/job/unverified?limit=${encodeURIComponent(limit)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { error: errorData.detail || 'Error fetching unverified jobs' }, 
                { status: response.status }
            );
        }

        const data = await response.json();
        const jobMap = data.reduce((acc: Record<string, any>, job: any) => {
            acc[job.id] = job.metadata;
            return acc;
        }, {});
        console.log('Unverified jobs:', jobMap);
        return NextResponse.json(jobMap);

    } catch (error) {
        console.error('Error creating job report:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}