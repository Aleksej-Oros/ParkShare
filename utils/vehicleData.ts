/**
 * Vehicle Data
 * Car brands and their corresponding models for validation
 */

export interface VehicleBrand {
  name: string;
  models: string[];
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  {
    name: 'Toyota',
    models: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Sienna', 'Tacoma', 'Tundra', '4Runner', 'Sequoia', 'Land Cruiser', 'Avalon', 'Yaris', 'C-HR', 'Venza'],
  },
  {
    name: 'Honda',
    models: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Passport', 'HR-V', 'Insight', 'Clarity', 'Fit', 'Element'],
  },
  {
    name: 'Ford',
    models: ['F-150', 'Escape', 'Explorer', 'Mustang', 'Edge', 'Expedition', 'Ranger', 'Bronco', 'Fusion', 'Focus', 'Fiesta', 'Taurus'],
  },
  {
    name: 'Chevrolet',
    models: ['Silverado', 'Equinox', 'Tahoe', 'Suburban', 'Traverse', 'Malibu', 'Cruze', 'Impala', 'Camaro', 'Corvette', 'Blazer', 'Trailblazer'],
  },
  {
    name: 'BMW',
    models: ['3 Series', '5 Series', 'X3', 'X5', 'X1', 'X7', '7 Series', '4 Series', 'M3', 'M5', 'iX', 'i4'],
  },
  {
    name: 'Mercedes-Benz',
    models: ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'A-Class', 'CLA', 'GLA', 'GLB', 'AMG GT', 'EQC'],
  },
  {
    name: 'Audi',
    models: ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3', 'A5', 'Q8', 'e-tron', 'TT', 'R8', 'A8'],
  },
  {
    name: 'Volkswagen',
    models: ['Jetta', 'Passat', 'Tiguan', 'Atlas', 'Golf', 'Beetle', 'Arteon', 'ID.4', 'Taos', 'Atlas Cross Sport'],
  },
  {
    name: 'Nissan',
    models: ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Armada', 'Frontier', 'Titan', 'Murano', 'Maxima', 'Versa', 'Kicks', 'Leaf'],
  },
  {
    name: 'Hyundai',
    models: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade', 'Kona', 'Venue', 'Ioniq', 'Veloster', 'Genesis', 'Nexo'],
  },
  {
    name: 'Kia',
    models: ['Forte', 'Optima', 'Sorento', 'Telluride', 'Sportage', 'Soul', 'Rio', 'Stinger', 'EV6', 'Niro', 'Carnival'],
  },
  {
    name: 'Mazda',
    models: ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'CX-30', 'MX-5 Miata', 'CX-3', 'CX-50'],
  },
  {
    name: 'Subaru',
    models: ['Outback', 'Forester', 'Crosstrek', 'Ascent', 'Legacy', 'Impreza', 'WRX', 'BRZ'],
  },
  {
    name: 'Jeep',
    models: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Wagoneer', 'Grand Wagoneer'],
  },
  {
    name: 'Ram',
    models: ['1500', '2500', '3500', 'ProMaster', 'ProMaster City'],
  },
  {
    name: 'GMC',
    models: ['Sierra', 'Yukon', 'Acadia', 'Terrain', 'Canyon', 'Sierra HD', 'Yukon XL'],
  },
  {
    name: 'Dodge',
    models: ['Charger', 'Challenger', 'Durango', 'Journey', 'Grand Caravan', 'Hornet'],
  },
  {
    name: 'Lexus',
    models: ['RX', 'NX', 'ES', 'GX', 'LX', 'IS', 'LS', 'UX', 'RC', 'LC'],
  },
  {
    name: 'Acura',
    models: ['MDX', 'RDX', 'TLX', 'ILX', 'NSX', 'Integra'],
  },
  {
    name: 'Infiniti',
    models: ['QX60', 'QX50', 'QX80', 'Q50', 'Q60', 'QX55', 'QX30'],
  },
  {
    name: 'Tesla',
    models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  },
];

/**
 * Get models for a specific brand
 */
export function getModelsForBrand(brandName: string): string[] {
  const brand = VEHICLE_BRANDS.find(
    (b) => b.name.toLowerCase() === brandName.toLowerCase().trim()
  );
  return brand ? brand.models : [];
}

/**
 * Check if a brand exists
 */
export function isValidBrand(brandName: string): boolean {
  return VEHICLE_BRANDS.some(
    (b) => b.name.toLowerCase() === brandName.toLowerCase().trim()
  );
}

/**
 * Check if a model exists for a brand
 */
export function isValidModelForBrand(brandName: string, modelName: string): boolean {
  const models = getModelsForBrand(brandName);
  return models.some(
    (m) => m.toLowerCase() === modelName.toLowerCase().trim()
  );
}

/**
 * Get all brand names
 */
export function getAllBrands(): string[] {
  return VEHICLE_BRANDS.map((b) => b.name);
}






