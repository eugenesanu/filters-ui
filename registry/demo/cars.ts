// Demo data: 256 invented car listings, generated from a fixed seed so every
// visitor sees the same list. Make and model names are only labels for the demo.

export type Body = "SUV" | "Sedan" | "Truck" | "Hatchback" | "Coupe" | "Minivan" | "Van" | "Convertible";
export type Fuel = "Gas" | "Hybrid" | "Plug-in hybrid" | "Electric" | "Diesel";
export type Drive = "AWD" | "4WD" | "FWD" | "RWD";
export type Transmission = "Automatic" | "Manual";
export type Condition = "New" | "Used";
export type Color = "Black" | "White" | "Gray" | "Silver" | "Blue" | "Red" | "Green" | "Brown";

// A null is a detail the listing never gave, as real feeds often do.
export type Car = {
  id: string;
  make: string;
  model: string;
  body: Body;
  year: number;
  km: number | null;
  price: number;
  fuel: Fuel | null;
  drive: Drive | null;
  transmission: Transmission | null;
  color: Color | null;
  seats: number | null;
  condition: Condition;
  /** Days since the listing went up: 0 is today, 59 the oldest. */
  listed: number;
};

type Model = {
  make: string;
  model: string;
  body: Body;
  price: number;
  trims: number;
  fuels: Fuel[];
  drives: Drive[];
  seats: number;
  manual?: boolean;
};

const MODELS: Model[] = [
  { make: "Toyota", model: "RAV4", body: "SUV", price: 39000, trims: 4, fuels: ["Gas", "Hybrid"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Toyota", model: "Corolla", body: "Sedan", price: 27000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["FWD"], seats: 5 },
  { make: "Toyota", model: "Camry", body: "Sedan", price: 35000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["FWD", "AWD"], seats: 5 },
  { make: "Toyota", model: "Highlander", body: "SUV", price: 53000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["AWD"], seats: 8 },
  { make: "Toyota", model: "Tacoma", body: "Truck", price: 52000, trims: 3, fuels: ["Gas"], drives: ["4WD"], seats: 5, manual: true },
  { make: "Toyota", model: "Sienna", body: "Minivan", price: 54000, trims: 3, fuels: ["Hybrid"], drives: ["FWD", "AWD"], seats: 8 },
  { make: "Honda", model: "CR-V", body: "SUV", price: 40000, trims: 4, fuels: ["Gas", "Hybrid"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Honda", model: "Civic", body: "Sedan", price: 31000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["FWD"], seats: 5, manual: true },
  { make: "Honda", model: "Accord", body: "Sedan", price: 40000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["FWD"], seats: 5 },
  { make: "Honda", model: "Odyssey", body: "Minivan", price: 53000, trims: 3, fuels: ["Gas"], drives: ["FWD"], seats: 8 },
  { make: "Ford", model: "F-150", body: "Truck", price: 62000, trims: 4, fuels: ["Gas", "Hybrid"], drives: ["4WD"], seats: 6 },
  { make: "Ford", model: "Escape", body: "SUV", price: 37000, trims: 3, fuels: ["Gas", "Hybrid", "Plug-in hybrid"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Ford", model: "Mustang", body: "Coupe", price: 52000, trims: 2, fuels: ["Gas"], drives: ["RWD"], seats: 4, manual: true },
  { make: "Ford", model: "Mustang Mach-E", body: "SUV", price: 57000, trims: 2, fuels: ["Electric"], drives: ["AWD", "RWD"], seats: 5 },
  { make: "Ford", model: "Transit", body: "Van", price: 60000, trims: 2, fuels: ["Gas"], drives: ["RWD", "AWD"], seats: 3 },
  { make: "Chevrolet", model: "Silverado 1500", body: "Truck", price: 60000, trims: 4, fuels: ["Gas", "Diesel"], drives: ["4WD"], seats: 6 },
  { make: "Chevrolet", model: "Equinox", body: "SUV", price: 36000, trims: 3, fuels: ["Gas"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Chevrolet", model: "Bolt EUV", body: "SUV", price: 42000, trims: 2, fuels: ["Electric"], drives: ["FWD"], seats: 5 },
  { make: "Chevrolet", model: "Corvette", body: "Coupe", price: 98000, trims: 2, fuels: ["Gas"], drives: ["RWD"], seats: 2 },
  { make: "GMC", model: "Sierra 1500", body: "Truck", price: 66000, trims: 3, fuels: ["Gas", "Diesel"], drives: ["4WD"], seats: 6 },
  { make: "Hyundai", model: "Tucson", body: "SUV", price: 37000, trims: 3, fuels: ["Gas", "Hybrid", "Plug-in hybrid"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Hyundai", model: "Elantra", body: "Sedan", price: 27000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["FWD"], seats: 5, manual: true },
  { make: "Hyundai", model: "Ioniq 5", body: "SUV", price: 58000, trims: 3, fuels: ["Electric"], drives: ["AWD", "RWD"], seats: 5 },
  { make: "Kia", model: "Sportage", body: "SUV", price: 37000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Kia", model: "Telluride", body: "SUV", price: 55000, trims: 3, fuels: ["Gas"], drives: ["AWD"], seats: 8 },
  { make: "Kia", model: "EV6", body: "SUV", price: 60000, trims: 3, fuels: ["Electric"], drives: ["AWD", "RWD"], seats: 5 },
  { make: "Mazda", model: "CX-5", body: "SUV", price: 38000, trims: 3, fuels: ["Gas"], drives: ["AWD"], seats: 5 },
  { make: "Mazda", model: "Mazda3 Sport", body: "Hatchback", price: 31000, trims: 3, fuels: ["Gas"], drives: ["FWD", "AWD"], seats: 5, manual: true },
  { make: "Mazda", model: "MX-5", body: "Convertible", price: 43000, trims: 2, fuels: ["Gas"], drives: ["RWD"], seats: 2, manual: true },
  { make: "Subaru", model: "Outback", body: "SUV", price: 42000, trims: 3, fuels: ["Gas"], drives: ["AWD"], seats: 5 },
  { make: "Subaru", model: "Crosstrek", body: "SUV", price: 34000, trims: 3, fuels: ["Gas"], drives: ["AWD"], seats: 5, manual: true },
  { make: "Volkswagen", model: "Golf GTI", body: "Hatchback", price: 41000, trims: 2, fuels: ["Gas"], drives: ["FWD"], seats: 5, manual: true },
  { make: "Volkswagen", model: "Tiguan", body: "SUV", price: 40000, trims: 3, fuels: ["Gas"], drives: ["AWD"], seats: 7 },
  { make: "Tesla", model: "Model 3", body: "Sedan", price: 58000, trims: 3, fuels: ["Electric"], drives: ["RWD", "AWD"], seats: 5 },
  { make: "Tesla", model: "Model Y", body: "SUV", price: 64000, trims: 2, fuels: ["Electric"], drives: ["AWD"], seats: 5 },
  { make: "BMW", model: "3 Series", body: "Sedan", price: 58000, trims: 2, fuels: ["Gas"], drives: ["AWD"], seats: 5 },
  { make: "BMW", model: "X3", body: "SUV", price: 64000, trims: 2, fuels: ["Gas", "Plug-in hybrid"], drives: ["AWD"], seats: 5 },
  { make: "Mercedes-Benz", model: "GLC", body: "SUV", price: 66000, trims: 2, fuels: ["Gas"], drives: ["AWD"], seats: 5 },
  { make: "Audi", model: "Q5", body: "SUV", price: 63000, trims: 3, fuels: ["Gas", "Plug-in hybrid"], drives: ["AWD"], seats: 5 },
  { make: "Jeep", model: "Wrangler", body: "SUV", price: 56000, trims: 3, fuels: ["Gas", "Plug-in hybrid"], drives: ["4WD"], seats: 5, manual: true },
  { make: "Jeep", model: "Grand Cherokee", body: "SUV", price: 62000, trims: 3, fuels: ["Gas", "Plug-in hybrid"], drives: ["4WD"], seats: 5 },
  { make: "Ram", model: "1500", body: "Truck", price: 64000, trims: 3, fuels: ["Gas"], drives: ["4WD"], seats: 6 },
  { make: "Nissan", model: "Rogue", body: "SUV", price: 37000, trims: 3, fuels: ["Gas"], drives: ["AWD", "FWD"], seats: 5 },
  { make: "Nissan", model: "Sentra", body: "Sedan", price: 26000, trims: 3, fuels: ["Gas"], drives: ["FWD"], seats: 5 },
  { make: "Lexus", model: "RX", body: "SUV", price: 72000, trims: 3, fuels: ["Gas", "Hybrid"], drives: ["AWD"], seats: 5 },
  { make: "Volvo", model: "XC60", body: "SUV", price: 64000, trims: 3, fuels: ["Gas", "Plug-in hybrid"], drives: ["AWD"], seats: 5 },
  { make: "Mini", model: "Cooper Convertible", body: "Convertible", price: 44000, trims: 2, fuels: ["Gas"], drives: ["FWD"], seats: 4 },
  { make: "Chrysler", model: "Pacifica", body: "Minivan", price: 60000, trims: 3, fuels: ["Gas", "Plug-in hybrid"], drives: ["FWD", "AWD"], seats: 7 },
];

/** The paint each colour option shows as its swatch. */
export const COLOR_PAINTS: Record<Color, string> = {
  Black: "#2B2D31",
  White: "#E8E8E6",
  Gray: "#6E7379",
  Silver: "#B4B8BD",
  Blue: "#2F5AA8",
  Red: "#B5322E",
  Green: "#3E6B52",
  Brown: "#6B4F3A",
};

const COLOR_WEIGHTS: [Color, number][] = [
  ["White", 24],
  ["Black", 24],
  ["Gray", 18],
  ["Silver", 10],
  ["Blue", 10],
  ["Red", 8],
  ["Green", 3],
  ["Brown", 3],
];

export const THIS_YEAR = 2026;
const GENERATED = 240;

// A few hand-placed listings so common searches have matches.
type Fixed = Omit<Car, "id" | "condition" | "listed">;
const FIXED: Fixed[] = [
  { year: 2021, make: "Toyota", model: "RAV4", price: 29900, km: 58210, body: "SUV", fuel: "Gas", drive: "AWD", transmission: "Automatic", color: "Gray", seats: 5 },
  { year: 2021, make: "Toyota", model: "RAV4", price: 32495, km: 44120, body: "SUV", fuel: "Gas", drive: "AWD", transmission: "Automatic", color: "White", seats: 5 },
  { year: 2021, make: "Toyota", model: "RAV4", price: 36900, km: 31870, body: "SUV", fuel: "Hybrid", drive: "AWD", transmission: "Automatic", color: "Blue", seats: 5 },
  { year: 2021, make: "Toyota", model: "RAV4", price: 33795, km: 62400, body: "SUV", fuel: "Gas", drive: "AWD", transmission: "Automatic", color: "Green", seats: 5 },
  { year: 2021, make: "Toyota", model: "RAV4", price: 35995, km: 51230, body: "SUV", fuel: "Gas", drive: "AWD", transmission: "Automatic", color: "Black", seats: 5 },
  { year: 2022, make: "Honda", model: "Civic", price: 23995, km: 49800, body: "Sedan", fuel: "Gas", drive: "FWD", transmission: "Automatic", color: "White", seats: 5 },
  { year: 2022, make: "Honda", model: "Civic", price: 26495, km: 38210, body: "Sedan", fuel: "Gas", drive: "FWD", transmission: "Automatic", color: "Blue", seats: 5 },
  { year: 2022, make: "Honda", model: "Civic", price: 29895, km: 27640, body: "Sedan", fuel: "Gas", drive: "FWD", transmission: "Automatic", color: "Black", seats: 5 },
  { year: 2020, make: "Ford", model: "F-150", price: 38900, km: 84210, body: "Truck", fuel: "Gas", drive: "4WD", transmission: "Automatic", color: "White", seats: 6 },
  { year: 2020, make: "Ford", model: "F-150", price: 45495, km: 71840, body: "Truck", fuel: "Gas", drive: "4WD", transmission: "Automatic", color: "Black", seats: 6 },
  { year: 2020, make: "Ford", model: "F-150", price: 40250, km: 96300, body: "Truck", fuel: "Gas", drive: "4WD", transmission: "Automatic", color: "Red", seats: 6 },
  { year: 2022, make: "Toyota", model: "RAV4", price: 33995, km: 41200, body: "SUV", fuel: "Hybrid", drive: "AWD", transmission: "Automatic", color: "Silver", seats: 5 },
  { year: 2021, make: "Honda", model: "CR-V", price: 32900, km: 52100, body: "SUV", fuel: "Hybrid", drive: "AWD", transmission: "Automatic", color: "Gray", seats: 5 },
  { year: 2022, make: "Kia", model: "Sportage", price: 31495, km: 36700, body: "SUV", fuel: "Hybrid", drive: "AWD", transmission: "Automatic", color: "White", seats: 5 },
  { year: 2023, make: "Tesla", model: "Model 3", price: 37900, km: 28400, body: "Sedan", fuel: "Electric", drive: "RWD", transmission: "Automatic", color: "White", seats: 5 },
  { year: 2022, make: "Tesla", model: "Model 3", price: 41495, km: 44100, body: "Sedan", fuel: "Electric", drive: "AWD", transmission: "Automatic", color: "Black", seats: 5 },
];

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Each random draw stays in place even where its result is unused, so the list never shifts.
function generate(): Omit<Car, "id">[] {
  const random = seeded(20261030);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const between = (low: number, high: number) => low + random() * (high - low);
  const color = (): Color => {
    let roll = random() * COLOR_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [name, weight] of COLOR_WEIGHTS) {
      roll -= weight;
      if (roll <= 0) return name;
    }
    return "Gray";
  };

  const drafts: Omit<Car, "id" | "listed">[] = Array.from({ length: GENERATED }, (_, index) => {
    const model = MODELS[index % MODELS.length];
    const isNew = random() < 0.16;
    const age = isNew ? 0 : Math.floor(between(1, 10));
    const trimIndex = Math.floor(random() * model.trims);
    const fuel = pick(model.fuels);
    const km = isNew
      ? Math.round(between(5, 90))
      : Math.round((age * between(11000, 19000)) / 100) * 100 + Math.round(between(0, 90));
    // Value falls about 11% a year; higher trims and electrified cars cost more.
    const value =
      model.price * Math.pow(0.89, age) * (1 + trimIndex * 0.07) * (fuel === "Gas" || fuel === "Diesel" ? 1 : 1.08) - km * 0.02;
    const spread = isNew ? 0 : Math.round(between(-2800, 2200) / 50) * 50;
    const price = Math.max(4995, Math.round((value + spread) / 100) * 100 - 5);
    random();
    random();
    const drive = pick(model.drives);
    const transmission: Transmission = model.manual && random() < 0.3 ? "Manual" : "Automatic";
    return {
      make: model.make,
      model: model.model,
      body: model.body,
      year: THIS_YEAR - age,
      km,
      price,
      fuel,
      drive,
      transmission,
      color: color(),
      seats: model.seats,
      condition: isNew ? "New" : "Used",
    };
  });

  // Second pass, own seed: how many days ago each went up (newer listings are more common, as older cars sell), and
  // some listings leave details out.
  const blankRandom = seeded(20261031);
  const blank = (share: number) => blankRandom() < share;
  const skipOnce = new Set(["CR-V", "Crosstrek", "Tucson"]);
  return drafts.map((car) => {
    const listed = Math.min(120, Math.floor(-Math.log(1 - blankRandom()) * 21));
    for (let i = 0; i < 3; i++) blankRandom();
    const skips = car.condition === "Used" && skipOnce.delete(car.model);
    if (!skips) blankRandom();
    blankRandom();
    blank(0.08);
    const transmission = blank(0.45) ? null : car.transmission;
    const drive = blank(0.08) ? null : car.drive;
    const color = blank(0.07) ? null : car.color;
    const seats = blank(0.06) ? null : car.seats;
    const fuel = blank(0.03) ? null : car.fuel;
    const km = car.condition === "Used" && blank(0.03) ? null : car.km;
    return { ...car, transmission, drive, color, seats, fuel, km, listed };
  });
}

// Days since each featured listing went up.
const FIXED_LISTED = [3, 12, 27, 6, 41, 9, 2, 18, 33, 14, 51, 5, 22, 11, 7, 16];

export const CARS: Car[] = [
  ...FIXED.map((car, index) => ({ ...car, id: `fixed-${index + 1}`, condition: "Used" as const, listed: FIXED_LISTED[index] })),
  ...generate().map((car, index) => ({ ...car, id: `car-${index + 1}` })),
];

export const MAKES = [...new Set(MODELS.map((model) => model.make))].sort();
export const MODELS_OF: Record<string, string[]> = Object.fromEntries(
  MAKES.map((make) => [make, MODELS.filter((model) => model.make === make).map((model) => model.model)]),
);
export const BODIES: Body[] = ["SUV", "Sedan", "Truck", "Hatchback", "Coupe", "Minivan", "Van", "Convertible"];
export const FUELS: Fuel[] = ["Gas", "Hybrid", "Plug-in hybrid", "Electric", "Diesel"];
export const DRIVES: Drive[] = ["AWD", "4WD", "FWD", "RWD"];
export const TRANSMISSIONS: Transmission[] = ["Automatic", "Manual"];
export const CONDITIONS: Condition[] = ["New", "Used"];
export const COLORS: Color[] = ["Black", "White", "Gray", "Silver", "Blue", "Red", "Green", "Brown"];
