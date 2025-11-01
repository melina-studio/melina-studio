// app/playground/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { StepBack } from "lucide-react";

export default function BoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const id = params.id;

  const handleBack = () => router.back();

  return (
    <div className="p-4">
      <div className="cursor-pointer flex gap-4 items-center">
        <div onClick={handleBack}>
          <StepBack className="w-4 h-4" />
        </div>
        <h1 className="text-xl font-semibold">Board ID: {id}</h1>
      </div>
    </div>
  );
}
