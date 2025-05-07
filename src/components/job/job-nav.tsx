import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Briefcase, FileText, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function JobsNav() {
  const pathname = usePathname();
  
  const navItems = [
    { 
      href: "/jobs", 
      label: "Browse Jobs", 
      icon: <Briefcase className="h-4 w-4 mr-2" />,
      exact: true
    },
    { 
      href: "/jobs/report", 
      label: "Report Job", 
      icon: <FileText className="h-4 w-4 mr-2" /> 
    },
    { 
      href: "/jobs/verify", 
      label: "Verify Jobs", 
      icon: <CheckCircle className="h-4 w-4 mr-2" /> 
    }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {navItems.map((item) => {
        const isActive = item.exact 
          ? pathname === item.href 
          : pathname.startsWith(item.href);

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "default" : "outline"}
            className={cn(
              "flex items-center", 
              isActive ? "bg-green-700 hover:bg-green-800" : "border-green-200 text-green-700 hover:bg-green-50"
            )}
          >
            <Link href={item.href}>
              {item.icon}
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}