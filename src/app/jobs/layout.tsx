"use client";
import JobsNav from "@/components/job/job-nav";

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-center">
        <JobsNav />
      </div>
      {children}
    </div>
  );
}