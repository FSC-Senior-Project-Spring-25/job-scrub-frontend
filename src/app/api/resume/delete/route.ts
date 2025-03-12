import { NextRequest, NextResponse } from "next/server";

export const DELETE = async (req: NextRequest) => {
    try {
      // Get the key from the URL query string
      const { searchParams } = new URL(req.url);
      const key = searchParams.get('key');
      
      if (!key) {
        return NextResponse.json(
          { detail: 'No file key provided' }, 
          { status: 400 }
        );
      }

      const response = await fetch(`${process.env.API_URL}/resume/delete?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': req.headers.get('Authorization') || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete resume');
      }

      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ detail: err.message || 'An error occurred' }, { status: 500 });
    }
};