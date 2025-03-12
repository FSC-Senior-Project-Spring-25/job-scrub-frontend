import { NextRequest, NextResponse } from "next/server";


export async function GET(req: NextRequest) {
    try {
        const response = await fetch(`${process.env.API_URL}/job/unverified`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || ''
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            return {
                status: response.status,
                body: { error: errorData.detail || 'Error fetching unverified jobs' }
            };
        }

        const data = await response.json();
        const jobMap = data.reduce((acc: Record<string, any>, job: any) => {
            acc[job.id] = job.metadata;
            return acc;
        }, {});

        return NextResponse.json(jobMap);

    } catch (error) {
        console.error('Error creating job report:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}