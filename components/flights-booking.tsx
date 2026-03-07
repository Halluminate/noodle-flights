import Image from "next/image";

import FlightsForm from "./flights-form";

export default function FlightsBooking() {
  return (
    <div className="min-h-screen relative max-w-7xl mx-auto px-4">
      {/* Column layout with image on top and content below */}
      <div className="relative z-10 flex flex-col items-center justify-start">
        {/* Hero Image */}
        <Image
          src="/flights_nc_dark_theme_4.svg"
          alt="Flights hero"
          width={1600}
          height={640}
          className="w-full h-auto max-h-[40vh] object-contain"
        />
        {/* Title */}
        <div className="relative flex flex-col items-center justify-center translate-y-[-75px]">
          <h1 className="text-4xl md:text-5xl text-white mb-12 tracking-wide">
            Flights
          </h1>

          {/* Search Form */}
          <div className={`relative w-full max-w-5xl bg-[#36373A] text-[#C2C6CA] backdrop-blur-sm rounded-lg p-2 px-4 pb-10 shadow-2xl shadow-black/50`}>
          <FlightsForm />
          </div>  
        </div>
      </div>
    </div>
  );
}
