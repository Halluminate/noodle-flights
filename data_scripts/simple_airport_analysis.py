#!/usr/bin/env python3
"""
Simple airport popularity analysis without matplotlib dependency.
Prints statistics and creates simple text-based visualizations.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path

# Configuration
AIRPORTS_FILE = Path("data/airports.json")

def load_airports_data():
    """Load the processed airports data."""
    with open(AIRPORTS_FILE, 'r') as f:
        airports_data = json.load(f)
    return pd.DataFrame(airports_data)

def print_histogram(data, title, bins=20, width=60):
    """Print a simple ASCII histogram."""
    print(f"\n{title}")
    print("=" * len(title))
    
    # Create bins
    min_val, max_val = data.min(), data.max()
    bin_edges = np.linspace(min_val, max_val, bins + 1)
    hist, _ = np.histogram(data, bins=bin_edges)
    
    # Normalize for display
    max_count = max(hist)
    max_bar_width = width - 20  # Leave space for labels
    
    for i in range(len(hist)):
        bar_width = int((hist[i] / max_count) * max_bar_width)
        bar = "█" * bar_width
        range_start = bin_edges[i]
        range_end = bin_edges[i + 1]
        print(f"{range_start:6.0f}-{range_end:6.0f} │{bar:<{max_bar_width}} {hist[i]:,}")

def analyze_airports():
    """Analyze airport popularity and create text-based visualizations."""
    try:
        # Load data
        print("Loading airports data...")
        airports_df = load_airports_data()
        
        print("=== AIRPORT POPULARITY ANALYSIS ===\n")
        
        # Basic statistics
        print("BASIC STATISTICS")
        print("=" * 40)
        print(f"Total airports: {len(airports_df):,}")
        print(f"Route count range: {airports_df['routeCount'].min()} - {airports_df['routeCount'].max():,}")
        print(f"Mean route count: {airports_df['routeCount'].mean():.1f}")
        print(f"Median route count: {airports_df['routeCount'].median():.1f}")
        print(f"Standard deviation: {airports_df['routeCount'].std():.1f}")
        
        # Percentile analysis
        print(f"\nPERCENTILE BREAKDOWN")
        print("=" * 40)
        percentiles = [99, 95, 90, 75, 50, 25, 10, 5, 1]
        for p in percentiles:
            value = np.percentile(airports_df['routeCount'], p)
            print(f"{p:2d}th percentile: {value:6.0f} routes")
        
        # Hub score distribution
        print(f"\nHUB SCORE DISTRIBUTION")
        print("=" * 40)
        hubscore_stats = airports_df['hubScore'].value_counts().sort_index()
        total = len(airports_df)
        
        print("Score │ Count    │ Percentage │ Bar")
        print("──────┼──────────┼────────────┼────────────────────")
        for score in range(1, 6):
            count = hubscore_stats.get(score, 0)
            percentage = (count / total) * 100
            bar_length = int(percentage / 2)  # Scale to fit
            bar = "█" * bar_length
            print(f"  {score}   │ {count:7,} │   {percentage:5.1f}%   │ {bar}")
        
        # Top airports
        print(f"\nTOP 250 AIRPORTS BY ROUTE COUNT")
        print("=" * 65)
        top_250 = airports_df.nlargest(250, 'routeCount')
        
        print("Rank │ IATA │ City                  │ Country           │ Routes │ Hub")
        print("─────┼──────┼───────────────────────┼───────────────────┼────────┼────")
        for i, (_, airport) in enumerate(top_250.iterrows(), 1):
            city = airport['city'][:20].ljust(20)
            country = airport['country'][:16].ljust(16)
            print(f"{i:4d} │ {airport['iata']} │ {city} │ {country} │ {airport['routeCount']:6,} │  {airport['hubScore']}")
        
        # Route count distribution histogram
        print_histogram(airports_df['routeCount'], "ROUTE COUNT DISTRIBUTION", bins=15)
        
        # Hub score thresholds
        print(f"\nHUB SCORE THRESHOLDS")
        print("=" * 40)
        percentiles = [98, 94, 79, 50, 0]
        thresholds = np.percentile(airports_df['routeCount'], percentiles)
        
        score_names = ["Mega Hub", "Major Hub", "Regional Hub", "Secondary", "Local"]
        
        for i, (percentile, threshold, name) in enumerate(zip(percentiles, thresholds, score_names)):
            hub_score = i + 1
            if hub_score < 5:
                print(f"Hub Score {hub_score} ({name:<12}): {threshold:6.0f}+ routes ({percentile}th percentile+)")
            else:
                print(f"Hub Score {hub_score} ({name:<12}): <{thresholds[3]:5.0f} routes (below 50th percentile)")
        
        # Airlines analysis for top airports
        print(f"\nTOP 5 AIRPORTS - AIRLINE DISTRIBUTION")
        print("=" * 50)
        top_5 = airports_df.nlargest(5, 'routeCount')
        
        for _, airport in top_5.iterrows():
            print(f"\n{airport['iata']} - {airport['city']}, {airport['country']}")
            print(f"Routes: {airport['routeCount']:,} | Hub Score: {airport['hubScore']}")
            
            airlines = airport['airlines']
            if airlines:
                # Sort airlines by frequency and show top 5
                sorted_airlines = sorted(airlines.items(), key=lambda x: x[1], reverse=True)[:5]
                print("Top airlines:")
                for airline, freq in sorted_airlines:
                    print(f"  {airline}: {freq:.1%}")
            else:
                print("  No airline data available")
                
    except FileNotFoundError:
        print(f"Error: Could not find {AIRPORTS_FILE}")
        print("Please run build_airports.py first to generate the airports data.")
    except Exception as e:
        print(f"Error analyzing airports: {e}")

if __name__ == "__main__":
    analyze_airports()