import { Menu, Luggage, Compass, Plane, Bed, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuBarBase } from "./menu-bar-base";

export function MenuBar() {
  const leftContent = (
    <Button variant="ghost" size="icon" className="hover:bg-gray-700/50 rounded-full">
      <Menu className="!size-5 text-[#E8EAED]" />
    </Button>
  );

  const middleContent = (
    <div className="flex justify-start gap-2 items-center flex-1">
      <Button variant="outline" className="rounded-full border-gray-600 text-[#E8EAED] hover:bg-gray-800/50 hover:text-[#8AB4F8] bg-transparent font-normal">
        <Luggage className="h-5 w-5 text-[#8AB4F8]" />
        Travel
      </Button>
      <Button variant="outline" className="rounded-full border-gray-600 text-[#E8EAED] hover:bg-gray-800/50 hover:text-[#8AB4F8] bg-transparent font-normal">
        <Compass className="h-5 w-5 text-[#8AB4F8]" />
        Explore
      </Button>
      <Button variant="google-blue" className="text-[#8AB4F8] rounded-full bg-[#3C485F] hover:bg-[#3f4c64] font-normal">
        <Plane className="h-5 w-5 text-[#8AB4F8] fill-[#8AB4F8]" />
        Flights
      </Button>
      <Button variant="outline" className="rounded-full border-gray-600 text-[#E8EAED] hover:bg-gray-800/50 hover:text-[#8AB4F8] bg-transparent font-normal">
        <Bed className="h-5 w-5 text-[#8AB4F8]" />
        Hotels
      </Button>
      <Button variant="outline" className="rounded-full border-gray-600 text-[#E8EAED] hover:bg-gray-800/50 hover:text-[#8AB4F8] bg-transparent font-normal">
        <Home className="h-5 w-5 text-[#8AB4F8]" />
        Vacation rentals
      </Button>
    </div>
  );

  return <MenuBarBase leftContent={leftContent} middleContent={middleContent} />;
}