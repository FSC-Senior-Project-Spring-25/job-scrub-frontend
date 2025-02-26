import { MatchResponse } from '@/types/types';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  if (!req.body) {
    return NextResponse.json({ error: "Request body is missing" }, { status: 400 });
  }

  const formData = await req.formData();
  const resumeFile = formData.get("resumeFile");
  const jobDescription = formData.get("jobDescription");

  if (!resumeFile || !jobDescription) {
    return NextResponse.json({ error: "Missing form data" }, { status: 400 });
  }

  try {
    const response = await fetch(`${process.env.API_URL}/resume/match`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data: MatchResponse = await response.json();
    return NextResponse.json({
      match_score: data.match_score,
      keyword_coverage: data.keyword_coverage,
      similarity_details: data.similarity_details,
      missing_keywords: data.missing_keywords,
      resume_keywords: data.resume_keywords,
      job_keywords: data.job_keywords,
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "An error occurred." }, { status: 500 });
  }
};

export const GET = () => {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
};