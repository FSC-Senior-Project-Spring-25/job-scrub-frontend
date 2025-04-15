'use client';

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase";

const LOGO_DEV_API_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY!;

interface Props {
  companyName: string;
}

export default function CompanyMetrics({ companyName }: Props) {
  const [logoUrl, setLogoUrl] = useState<string>("/default-logo.png");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    accepted: number;
    ghosted: number;
    rejected: number;
    totalApplicants: number;
  } | null>(null);

  // Fetch company logo from Clearbit
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(
          `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`
        );
        const suggestions = await res.json();
        const domain = suggestions?.[0]?.domain;

        if (domain) {
          const finalUrl = `https://img.logo.dev/${domain}?token=${LOGO_DEV_API_KEY}&size=200&format=png`;
          setLogoUrl(finalUrl);
        } else {
          console.warn("⚠️ No domain found for", companyName);
          setLogoUrl("/default-logo.png");
        }
      } catch (error) {
        console.error("❌ Failed to fetch domain/logo:", error);
        setLogoUrl("/default-logo.png");
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [companyName]);

  // Fetch metrics from Firestore
  useEffect(() => {
    const loadMetrics = async () => {
      const companyId = companyName.toLowerCase().replace(/[^\w]/g, "");
      const ref = doc(db, "companies", companyId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        const accepted = Math.max(0, data.accepted || 0);
        const ghosted = Math.max(0, data.no_response || 0);
        const rejected = Math.max(0, data.rejected || 0);
        const total = accepted + ghosted + rejected;

        setMetrics({
          accepted,
          ghosted,
          rejected,
          totalApplicants: total,
        });
      }
    };

    loadMetrics();
  }, [companyName]);

  const formatRate = (count: number, total: number) =>
    total === 0 ? "—%" : `${Math.round((count / total) * 100)}%`;

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-md mb-2">Company Metrics</h3>

      <div className="w-16 h-16 mb-3 rounded bg-gray-100 flex items-center justify-center">
        {loading ? (
          <div className="animate-pulse w-10 h-10 bg-gray-300 rounded" />
        ) : (
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="w-full h-full object-contain"
            onError={() => setLogoUrl("/default-logo.png")}
          />
        )}
      </div>

      <div className="text-sm text-gray-700 space-y-1">
        <p>
          <strong>Acceptance Rate:</strong>{" "}
          {metrics ? formatRate(metrics.accepted, metrics.totalApplicants) : "—%"}
        </p>
        <p>
          <strong>Ghosting Reports:</strong>{" "}
          {metrics ? formatRate(metrics.ghosted, metrics.totalApplicants) : "—%"}
        </p>
        <p>
          <strong>Rejection Rate:</strong>{" "}
          {metrics ? formatRate(metrics.rejected, metrics.totalApplicants) : "—%"}
        </p>
        <p>
          <strong>Total Applicants:</strong>{" "}
          {metrics?.totalApplicants ?? "—"}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          *Metrics provided by the communit
        </p>
      </div>
    </div>
  );
}
