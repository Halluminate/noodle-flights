import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Airport } from "@/lib/types/airport";

let airportData: Airport[] = [];

function loadAirports(): Airport[] {
  if (airportData.length === 0) {
    try {
      const filePath = path.join(process.cwd(), "data", "airports.json");
      const jsonContent = fs.readFileSync(filePath, "utf8");
      airportData = JSON.parse(jsonContent) as Airport[];
    } catch {
      throw new Error("Failed to load airport data");
    }
  }
  return airportData;
}

function searchAirports(query: string, limit: number = 20): Airport[] {
  const airports = loadAirports();
  if (!query) {
    return airports.slice(0, limit);
  }

  const searchQuery = query.toLowerCase().trim();

  const results = airports.filter((airport) => {
    const searchableText = [
      airport.iata,
      airport.name,
      airport.city,
      airport.country,
      airport.state_name,
      airport.state_code,
    ]
      .filter(Boolean) // Remove undefined/null values
      .join(" ")
      .toLowerCase();
    return searchableText.includes(searchQuery);
  });
  return results
    .sort((a, b) => {
      const aCodeMatch = a.iata.toLowerCase() === searchQuery;
      const bCodeMatch = b.iata.toLowerCase() === searchQuery;
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      return a.name.length - b.name.length;
    })
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const results = searchAirports(query, limit);
    return NextResponse.json({
      query,
      results,
      total: results.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to search airports" },
      { status: 500 }
    );
  }
}
