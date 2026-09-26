"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/services/auth";

export function DemoContinue({ label = "Continue with demo workspace" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="dark"
      size="lg"
      className="w-full"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await authService.continueAsDemo();
        router.push("/app");
      }}
    >
      {label}
    </Button>
  );
}
