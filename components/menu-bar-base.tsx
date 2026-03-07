import Link from "next/link";
import { Sun, Grip, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface MenuBarBaseProps {
  leftContent: ReactNode;
  middleContent?: ReactNode;
}

export function MenuBarBase({ leftContent, middleContent }: MenuBarBaseProps) {
  return (
    <div className="p-2 fixed top-0 left-0 border-b border-[#5F6368] right-0 h-16 bg-[#202124] z-50">
      <div className="flex h-full">
        {/* Left container */}
        <div className="flex items-center pr-8 pl-2">
          {leftContent}
          <Link href="/" className="text-2xl text-gray-200 pl-1">
            Noodle
          </Link>
        </div>
        
        {/* Middle container */}
        {middleContent ? (
          middleContent
        ) : (
          <div className="flex-1" />
        )}
        
        {/* Right container - shared across all menu bars */}
        <div className="flex items-center ml-auto gap-2 pr-2">
          <Button variant="ghost" size="icon" className="hover:bg-gray-700/50 rounded-full">
            <Sun className="h-5 w-5 text-[#E7E8E7]" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-700/50 rounded-full">
            <Grip className="h-5 w-5 text-[#E7E8E7]" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-700/50 rounded-full">
            <CircleUserRound className="h-5 w-5 text-[#E7E8E7]" />
          </Button>
        </div>
      </div>
    </div>
  );
}