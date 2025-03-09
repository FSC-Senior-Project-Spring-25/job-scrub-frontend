import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => {
  return <div className={`bg-white shadow-md rounded-lg p-4 ${className}`}>{children}</div>;
};

const CardContent = ({ children, className }: CardProps) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

export { Card, CardContent };
