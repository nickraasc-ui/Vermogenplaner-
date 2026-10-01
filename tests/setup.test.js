import { describe, it, expect } from "vitest";
import { buildProfileFromSetup, emptyAnswers } from "../src/model/setup.js";
import { deriveAll } from "../src/model/derive.js";
import { parseAmount } from "../src/format.js";

describe("parseAmount", () => {
  it.each([["1.234,56", 1234.56], ["250.000", 250000], ["3,5", 3.5], ["1234.5", 1234.5], ["", 0], ["abc", 0], ["2.500 €", 2500], ["−", 0]])(
    "%s → %s", (input, out) => expect(parseAmount(input)).toBe(out));
});

const couple = () => {
  const a = emptyAnswers();
  a.household = "couple";
  a.people = [{ name: "Anna", birthYear: 1985 }, { name: "Ben", birthYear: 1983 }];
  a.income = [4200, 3100];
  a.expenses = 3800;
  a.investments.cash = { amount: 25000, owner: "both" };
  a.investments.etf = { amount: 80000, owner: "p1" };
  a.property = { has: true, value: 450000, debt: 280000, rate: 3.2, payment: 1500, rented: false, rent: 0, owner: "both" };
  a.loan = { has: true, name: "Auto", debt: 12000, rate: 5, payment: 350 };
  return a;
};

describe("buildProfileFromSetup", () => {
  it("creates a profile with only the user's data — no demo positions or owners", () => {
    const s = buildProfileFromSetup(couple());
    expect(s.owners.map(o => o.label)).toEqual(["Anna", "Ben"]);
    expect(s.assets.map(a => a.name)).toEqual(["Tagesgeld & Konten", "ETF-Depot", "Selbstgenutzte Immobilie"]);
    expect(s.incomeStreams.map(i => i.amount)).toEqual([4200, 3100]);
    expect(s.buckets).toEqual([]);
    expect(s.birthYear).toBe(1985);
  });

  it("splits joint ownership 50/50 and links the couple", () => {
    const s = buildProfileFromSetup(couple());
    const [anna, ben] = s.owners;
    expect(s.assets[0].ownership).toEqual([{ ownerId: anna.id, share: 0.5 }, { ownerId: ben.id, share: 0.5 }]);
    expect(s.assets[1].ownership).toEqual([{ ownerId: anna.id, share: 1 }]);
    expect(anna.relations).toEqual([{ targetId: ben.id, type: "Ehepartner" }]);
  });

  it("produces correct figures: net worth, owner-occupied property without rent, loan payments", () => {
    const d = deriveAll(buildProfileFromSetup(couple()));
    expect(d.agg.net).toBe(25000 + 80000 + 450000 - 280000 - 12000);
    expect(d.cf.immoGross).toBe(0);
    expect(d.cf.immoAnnuitat).toBe(1500);
    expect(d.cf.otherAnnuitat).toBe(350);
    expect(d.cf.avail).toBe(4200 + 3100 - 1500);
    expect(d.projection[0].base).toBeCloseTo(d.agg.net, -1);
  });

  it("works for a single person with nothing but an income", () => {
    const a = emptyAnswers();
    a.income = [3000, ""];
    const s = buildProfileFromSetup(a);
    expect(s.owners).toHaveLength(1);
    expect(s.owners[0].label).toBe("Ich");
    expect(s.assets).toEqual([]);
    expect(deriveAll(s).agg.net).toBe(0);
  });

  it("estimates a mortgage payment when the user leaves it empty", () => {
    const a = couple();
    a.property.payment = "";
    const s = buildProfileFromSetup(a);
    expect(s.assets.at(-1).loanAnnuitat).toBeGreaterThan(1300);
    expect(s.assets.at(-1).loanAnnuitat).toBeLessThan(1400);
  });
});
