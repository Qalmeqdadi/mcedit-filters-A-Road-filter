import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy-500">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="font-serif text-2xl font-semibold text-navy-900">Page not found</h1>
      <p className="mt-1 text-sm text-navy-500">This area is not part of the demonstration.</p>
      <Button className="mt-5" asChild>
        <Link href="/">Back to Command Center</Link>
      </Button>
    </div>
  );
}
