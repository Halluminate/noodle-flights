"use client";

import { Check } from "lucide-react";

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-[#202124] flex items-center justify-center">
      <div className="bg-[#36373A] text-[#C2C6CA] rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-16 w-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">
              Search successfully completed!
            </h1>
            <p className="text-[#C2C6CA]">
              Your flight search has been processed successfully.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
