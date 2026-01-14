import { Suspense } from "react";
import PlaygroundContent from "./PlaygroundContent";
import { ProcessingRequest } from "@/components/custom/Loader/ProcessingRequest";

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <ProcessingRequest />
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
