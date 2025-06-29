export interface HexCoordinate {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export const HEX_SIZE = 30;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;

export function hexToPixel(hex: HexCoordinate): Point {
  const x = HEX_SIZE * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r);
  const y = HEX_SIZE * (3 / 2 * hex.r);
  return { x, y };
}

export function pixelToHex(point: Point): HexCoordinate {
  const q = (Math.sqrt(3) / 3 * point.x - 1 / 3 * point.y) / HEX_SIZE;
  const r = (2 / 3 * point.y) / HEX_SIZE;
  return hexRound({ q, r });
}

export function hexRound(hex: HexCoordinate): HexCoordinate {
  const s = -hex.q - hex.r;
  let rq = Math.round(hex.q);
  let rr = Math.round(hex.r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - hex.q);
  const rDiff = Math.abs(rr - hex.r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function hexDistance(a: HexCoordinate, b: HexCoordinate): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function hexNeighbors(hex: HexCoordinate): HexCoordinate[] {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  
  return directions.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }));
}

export function generateHexPath(center: Point, size: number): string {
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle)
    });
  }
  
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ') + ' Z';
}

// Helper function to create unique hex key
function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

// Helper function to check if hex exists in set
function hexExists(hexSet: Set<string>, q: number, r: number): boolean {
  return hexSet.has(hexKey(q, r));
}

// Helper function to add hex to set and array
function addHex(hexSet: Set<string>, hexes: HexCoordinate[], q: number, r: number): void {
  const key = hexKey(q, r);
  if (!hexSet.has(key)) {
    hexSet.add(key);
    hexes.push({ q, r });
  }
}

// Generate a strategic continental map layout inspired by real-world geography
export function generateWorldHexes(): HexCoordinate[] {
  const hexes: HexCoordinate[] = [];
  const hexSet = new Set<string>(); // Track unique coordinates
  
  // Create three distinct continental landmasses with strategic positioning
  const continents = [
    // Northern Continent (Union Territory) - Large northern landmass
    { 
      centerQ: -8, 
      centerR: -6, 
      size: 7, 
      nation: 'union',
      shape: 'continental' // Large, connected landmass
    },
    // Eastern Continent (Dominion Territory) - Eastern archipelago with main island
    { 
      centerQ: 6, 
      centerR: -3, 
      size: 6, 
      nation: 'dominion',
      shape: 'archipelago' // Island chain with main landmass
    },
    // Southern Continent (Syndicate Territory) - Southern industrial landmass
    { 
      centerQ: -2, 
      centerR: 8, 
      size: 6, 
      nation: 'syndicate',
      shape: 'continental' // Connected industrial region
    },
  ];

  // Generate main continental landmasses
  continents.forEach(continent => {
    const baseSize = continent.size;
    
    for (let q = continent.centerQ - baseSize; q <= continent.centerQ + baseSize; q++) {
      for (let r = continent.centerR - baseSize; r <= continent.centerR + baseSize; r++) {
        const distanceFromCenter = Math.abs(q - continent.centerQ) + Math.abs(r - continent.centerR) + Math.abs(-q - r + continent.centerQ + continent.centerR);
        
        if (distanceFromCenter <= baseSize * 2) {
          const edgeDistance = Math.min(
            Math.abs(q - continent.centerQ),
            Math.abs(r - continent.centerR),
            Math.abs(-q - r + continent.centerQ + continent.centerR)
          );
          
          // Create more realistic continent shapes
          let shouldInclude = false;
          const randomFactor = Math.random();
          
          if (continent.shape === 'continental') {
            // Large connected landmasses
            shouldInclude = edgeDistance < baseSize - 1 || 
                           (edgeDistance === baseSize - 1 && randomFactor > 0.2) ||
                           (edgeDistance === baseSize && randomFactor > 0.6);
          } else if (continent.shape === 'archipelago') {
            // Island chains with gaps
            shouldInclude = edgeDistance < baseSize - 2 || 
                           (edgeDistance === baseSize - 1 && randomFactor > 0.4) ||
                           (edgeDistance === baseSize && randomFactor > 0.8);
          }
          
          if (shouldInclude) {
            addHex(hexSet, hexes, q, r);
          }
        }
      }
    }
  });

  // Add strategic land bridges and chokepoints to ensure connectivity
  const landBridges = [
    // Central strategic corridor connecting all continents
    { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -1, r: 2 },
    { q: 0, r: 1 }, { q: 1, r: 0 }, { q: 2, r: -1 },
    
    // Northern-Eastern bridge
    { q: -1, r: -4 }, { q: 0, r: -3 }, { q: 1, r: -3 },
    
    // Eastern-Southern bridge  
    { q: 3, r: 3 }, { q: 2, r: 4 }, { q: 1, r: 5 },
    
    // Western-Southern bridge
    { q: -4, r: 4 }, { q: -3, r: 5 }, { q: -2, r: 6 },
  ];

  // Add strategic islands and outposts
  const strategicIslands = [
    // Central neutral zone
    { q: 0, r: 0 }, { q: 1, r: -1 }, { q: -1, r: 1 },
    
    // Forward operating bases
    { q: -6, r: 2 }, { q: 4, r: -6 }, { q: 2, r: 6 },
    
    // Resource-rich outposts
    { q: -10, r: 3 }, { q: 8, r: -5 }, { q: 0, r: 10 },
    
    // Strategic chokepoints
    { q: -2, r: -2 }, { q: 3, r: 0 }, { q: -1, r: 4 }
  ];

  // Add land bridges (ensuring connectivity)
  landBridges.forEach(bridge => {
    addHex(hexSet, hexes, bridge.q, bridge.r);
  });

  // Add strategic islands
  strategicIslands.forEach(island => {
    addHex(hexSet, hexes, island.q, island.r);
  });

  return hexes;
}

// Assign nations to hexes based on continental geography and strategic value
export function assignNationsToHexes(hexes: HexCoordinate[]): Array<HexCoordinate & { nation: string; type: string }> {
  return hexes.map(hex => {
    let nation = 'neutral';
    let type = 'land';
    
    // Calculate distance from each nation's heartland
    const distanceToUnion = Math.abs(hex.q + 8) + Math.abs(hex.r + 6);
    const distanceToDominion = Math.abs(hex.q - 6) + Math.abs(hex.r + 3);
    const distanceToSyndicate = Math.abs(hex.q + 2) + Math.abs(hex.r - 8);
    
    // Assign based on proximity to nation centers with some strategic considerations
    const minDistance = Math.min(distanceToUnion, distanceToDominion, distanceToSyndicate);
    
    if (minDistance === distanceToUnion && distanceToUnion <= 12) {
      nation = 'union';
    } else if (minDistance === distanceToDominion && distanceToDominion <= 10) {
      nation = 'dominion';
    } else if (minDistance === distanceToSyndicate && distanceToSyndicate <= 11) {
      nation = 'syndicate';
    } else {
      // Central strategic zones and distant outposts remain neutral
      nation = 'neutral';
    }
    
    // Override for central strategic corridor (always neutral initially)
    if (Math.abs(hex.q) <= 2 && Math.abs(hex.r) <= 2) {
      nation = 'neutral';
      type = 'strategic';
    }
    
    // Some hexes are mountainous (defensive bonuses)
    if (Math.random() < 0.12) {
      type = 'mountain';
    }
    
    // Resource-rich areas
    if (Math.random() < 0.08) {
      type = 'resource';
    }
    
    return { ...hex, nation, type };
  });
}