import { describe, expect, it } from "vitest";
import { canLaunch, chooseOption, DEFAULT_LOADOUT, landingOutcome, loadoutMass, newCruise, newLanding, SITES, stepCruise, stepLanding, CRUISE_SECONDS } from "./sim";

describe("landing rules", () => {
  it("touching down at or under the site's safe speed is a safe landing", () => {
    expect(landingOutcome(2.5, 2.5)).toBe("landed");
  });
  it("up to 2.2x the safe speed is a hard landing, faster is a crash", () => {
    expect(landingOutcome(5, 2.5)).toBe("hard");
    expect(landingOutcome(6, 2.5)).toBe("crashed");
  });
  it("falling with the engine off crashes", () => {
    const l = newLanding(80, 100, SITES[3]!);
    l.running = true;
    for (let i = 0; i < 2000 && !l.done; i++) stepLanding(l, 0.05);
    expect(l.outcome).toBe("crashed");
  });
});

describe("cruise rules", () => {
  it("pauses the journey when a problem appears", () => {
    const c = newCruise();
    for (let i = 0; i < 200; i++) stepCruise(c, 0.05);
    expect(c.active).toBe(0);
    const p = c.progress;
    stepCruise(c, 1);
    expect(c.progress).toBe(p);
  });
  it("closing the valve on the leak costs exactly 4% fuel", () => {
    const c = newCruise();
    c.active = 2;
    c.nextEvent = 2;
    const before = c.t.fuel;
    chooseOption(c, 0);
    expect(c.t.fuel).toBe(before - 4);
  });
  it("finishes the trip after the planned time when every choice is made", () => {
    const c = newCruise();
    for (let i = 0; i < CRUISE_SECONDS * 40 && c.progress < 1; i++) {
      stepCruise(c, 0.05);
      if (c.active !== null) chooseOption(c, 0);
    }
    expect(c.progress).toBe(1);
    expect(c.failed).toBeNull();
  });
});

describe("spacecraft design", () => {
  it("the standard design weighs exactly the 4,000 kg the rocket can carry", () => {
    expect(loadoutMass(DEFAULT_LOADOUT)).toBe(4000);
    expect(canLaunch(DEFAULT_LOADOUT)).toBe(true);
  });
  it("a design over 4,000 kg cannot launch", () => {
    expect(canLaunch({ ...DEFAULT_LOADOUT, fuel: 2 })).toBe(false);
  });
  it("a large fuel tank starts at 100% fuel, a small one at 75%", () => {
    expect(newCruise({ ...DEFAULT_LOADOUT, fuel: 2 }).t.fuel).toBe(100);
    expect(newCruise({ ...DEFAULT_LOADOUT, fuel: 0 }).t.fuel).toBe(75);
  });
  it("thick shielding cuts solar flare damage to 0.6x", () => {
    const c = newCruise({ ...DEFAULT_LOADOUT, shield: 2 });
    c.active = 3;
    c.nextEvent = 3;
    chooseOption(c, 2); // keep flying normally: -28 hull
    expect(c.t.hull).toBeCloseTo(100 - 28 * 0.6);
  });
});
