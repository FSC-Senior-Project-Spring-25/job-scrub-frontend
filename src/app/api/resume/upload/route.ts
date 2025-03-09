import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    try {      
      // Parse form data
      const formData = await req.formData();
      const file = formData.get('file');
      
      if (!file) {
        return NextResponse.json(
          { detail: 'No file provided' }, 
          { status: 400 }
        );
      }

      const response = await fetch(`${process.env.API_URL}/upload-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload resume');
      }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ detail: err.message || 'An error occurred' }, { status: 500 });
    }
};
    
    