/**
 * Minimal solar astronomy for solar-term (节气) instants.
 *
 * Two Sun models from Jean Meeus, *Astronomical Algorithms* (2nd ed.), ch. 25, both returning
 * the apparent geocentric ecliptic longitude of date (nutation and aberration applied):
 *
 *  - {@link sunApparentLongitudeLowAccuracy}: the chapter's "low accuracy" method (mean
 *    longitude + equation of centre), stated accuracy ≈ 0.01°. Measured against PyEphem for
 *    every jie term 1950–2050 it puts solar terms up to 14 min (mean 4 min) early or late —
 *    enough to flip month/year pillars for births near a boundary.
 *  - {@link sunApparentLongitude} (the default): the chapter's "higher accuracy" method, with
 *    the Earth's longitude from the truncated VSOP87 series of Appendix III (≈1″). Measured
 *    the same way: max 0.5 min, mean 0.1 min. This is what the chart uses.
 *
 * Time scales: callers work in UTC (Unix milliseconds). The theories run in Terrestrial
 * (Dynamical) Time, TT = UT + ΔT, with ΔT from the Espenak & Meeus (2006) polynomials.
 * Leap seconds are ignored (|UTC − UT1| < 1 s), which is far below the models' accuracy.
 */

import { earthHeliocentricLongitude } from "./vsop87";

/** Julian Day of the J2000.0 epoch (2000-01-01 12:00 TT). */
export const J2000 = 2451545.0;
/** Julian Day of the Unix epoch, 1970-01-01T00:00:00Z. */
export const UNIX_EPOCH_JD = 2440587.5;
export const MS_PER_DAY = 86_400_000;
/** Mean motion of the Sun in longitude, degrees per day (360° / tropical year). */
export const SUN_MEAN_MOTION_DEG_PER_DAY = 360 / 365.242189;

/** A Sun model: Julian Ephemeris Day (TT) → apparent geocentric ecliptic longitude in degrees. */
export type SolarLongitudeModel = (jde: number) => number;

const DEG = Math.PI / 180;

/** Normalizes an angle to [0, 360). */
export function normalizeDegrees(deg: number): number {
  const r = deg % 360;
  const n = r < 0 ? r + 360 : r;
  return n >= 360 ? 0 : n; // a tiny negative remainder can round up to exactly 360
}

/** Normalizes an angle difference to (−180, 180]. */
export function signedDegrees(deg: number): number {
  const r = normalizeDegrees(deg);
  return r > 180 ? r - 360 : r;
}

/** Julian Day (UT) of a UTC instant given as Unix milliseconds. */
export function julianDay(utcMs: number): number {
  return utcMs / MS_PER_DAY + UNIX_EPOCH_JD;
}

/** Inverse of {@link julianDay}: Unix milliseconds of a Julian Day (UT). */
export function utcMsFromJulianDay(jd: number): number {
  return (jd - UNIX_EPOCH_JD) * MS_PER_DAY;
}

/**
 * Julian Day Number (the integer JD at noon) of a proleptic Gregorian calendar date.
 * 2000-01-01 → 2451545.
 */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * ΔT = TT − UT in seconds for a decimal year, from the polynomial fits of
 * F. Espenak & J. Meeus (NASA, *Five Millennium Canon of Solar Eclipses*, 2006).
 * Piecewise for 1600–2150; the long-term parabola outside that range.
 * (The 2005–2050 branch overestimates the observed ΔT of the 2020s by ~5 s — negligible here.)
 */
export function deltaTSeconds(year: number): number {
  const y = year;
  if (y < 1600 || y >= 2150) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
  }
  if (y < 1800) {
    const t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1_174_000;
  }
  if (y < 1860) {
    const t = y - 1800;
    return (
      13.72 -
      0.332447 * t +
      0.0068612 * t ** 2 +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7
    );
  }
  if (y < 1900) {
    const t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233_174;
  }
  if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    return (
      63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5
    );
  }
  if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u - 0.5628 * (2150 - y);
}

/** Julian Ephemeris Day (TT) for a Julian Day in UT, applying ΔT. */
export function julianEphemerisDay(jdUT: number): number {
  const decimalYear = 2000 + (jdUT - J2000) / 365.25;
  return jdUT + deltaTSeconds(decimalYear) / 86_400;
}

/**
 * Meeus ch. 25 low-accuracy Sun, T in Julian centuries (TT) from J2000.0:
 *   L0 = 280.46646° + 36000.76983° T + 0.0003032° T²      geometric mean longitude
 *   M  = 357.52911° + 35999.05029° T − 0.0001537° T²      mean anomaly
 *   e  = 0.016708634 − 0.000042037 T − 0.0000001267 T²    orbital eccentricity
 *   C  = (1.914602° − 0.004817° T − 0.000014° T²) sin M
 *      + (0.019993° − 0.000101° T) sin 2M + 0.000289° sin 3M   equation of centre
 *   true longitude ☉ = L0 + C;  radius vector R = 1.000001018 (1 − e²) / (1 + e cos(M + C)) AU
 */
function lowAccuracySun(T: number): { trueLongitude: number; radiusAU: number } {
  const L0 = 280.46646 + 36_000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35_999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const mRad = M * DEG;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(mRad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);
  const radiusAU = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos((M + C) * DEG));
  return { trueLongitude: L0 + C, radiusAU };
}

/**
 * Nutation + aberration, in arcseconds, turning a geometric longitude (mean equinox of date)
 * into an apparent one: Δψ from Meeus ch. 22 (four terms, ≈0.5″)
 *   Δψ = −17.20″ sin Ω − 1.32″ sin 2L − 0.23″ sin 2L′ + 0.21″ sin 2Ω
 * plus annual aberration −20.4898″ / R (ch. 25). This is the fuller form of Meeus's rounded
 * shortcut λ = ☉ − 0.00569° − 0.00478° sin Ω (they differ by < 0.0005°).
 */
function apparentCorrectionArcsec(T: number, radiusAU: number): number {
  const omega = (125.04452 - 1_934.136261 * T) * DEG; // longitude of the Moon's ascending node
  const sunMeanLongitude = (280.4665 + 36_000.7698 * T) * DEG;
  const moonMeanLongitude = (218.3165 + 481_267.8813 * T) * DEG;
  const nutation =
    -17.2 * Math.sin(omega) -
    1.32 * Math.sin(2 * sunMeanLongitude) -
    0.23 * Math.sin(2 * moonMeanLongitude) +
    0.21 * Math.sin(2 * omega);
  return nutation - 20.4898 / radiusAU;
}

/**
 * Apparent solar longitude in degrees [0, 360) by Meeus's ch. 25 **low-accuracy** method
 * (≈0.01°), for a Julian Ephemeris Day (TT). Kept for reference and comparison; the chart
 * uses the more accurate {@link sunApparentLongitude}.
 */
export function sunApparentLongitudeLowAccuracy(jde: number): number {
  const T = (jde - J2000) / 36_525;
  const { trueLongitude, radiusAU } = lowAccuracySun(T);
  return normalizeDegrees(trueLongitude + apparentCorrectionArcsec(T, radiusAU) / 3600);
}

/**
 * Apparent solar longitude in degrees [0, 360), referred to the true equinox of date, for a
 * Julian Ephemeris Day (TT), by Meeus's ch. 25 **higher-accuracy** method: the Earth's
 * heliocentric longitude from truncated VSOP87 (Appendix III), + 180° for the geocentric Sun,
 * −0.09033″ to the FK5 frame, then nutation and aberration as above. Accuracy ≈ 1″ (≈ 0.5 min
 * in solar-term instants). The radius vector for aberration comes from the Keplerian orbit,
 * whose ~10⁻⁵ AU error changes the aberration by < 0.001″.
 */
export function sunApparentLongitude(jde: number): number {
  const T = (jde - J2000) / 36_525;
  const geometric = earthHeliocentricLongitude(T / 10) / DEG + 180 - 0.09033 / 3600;
  const { radiusAU } = lowAccuracySun(T);
  return normalizeDegrees(geometric + apparentCorrectionArcsec(T, radiusAU) / 3600);
}

/** Apparent solar longitude (degrees) at a UTC instant given as Unix milliseconds. */
export function sunApparentLongitudeAt(utcMs: number, model: SolarLongitudeModel = sunApparentLongitude): number {
  return model(julianEphemerisDay(julianDay(utcMs)));
}

/**
 * Finds the UTC instant (Unix ms) at which the Sun's apparent longitude equals
 * `targetLongitudeDeg`, choosing the crossing nearest to `nearUtcMs` (the Sun takes a
 * year per lap, so any seed within ~±5 months of the crossing selects it).
 *
 * Newton's method on f(t) = λ(t) − target (wrapped to ±180°) with a numerical derivative.
 * λ(t) is smooth and strictly increasing (~0.95–1.02°/day), so this converges in a handful
 * of iterations; we stop once the correction is under 1 ms — far below the model's own error.
 */
export function findSunLongitudeInstant(
  targetLongitudeDeg: number,
  nearUtcMs: number,
  model: SolarLongitudeModel = sunApparentLongitude,
): number {
  if (!Number.isFinite(targetLongitudeDeg) || !Number.isFinite(nearUtcMs)) {
    throw new RangeError("findSunLongitudeInstant: target longitude and seed instant must be finite numbers.");
  }
  const target = normalizeDegrees(targetLongitudeDeg);
  const lon = (ms: number) => sunApparentLongitudeAt(ms, model);
  const h = MS_PER_DAY / 24; // derivative step: one hour
  // First step at mean motion, so a distant seed snaps to the nearest crossing.
  let t = nearUtcMs + (signedDegrees(target - lon(nearUtcMs)) / SUN_MEAN_MOTION_DEG_PER_DAY) * MS_PER_DAY;
  for (let i = 0; i < 30; i++) {
    const ratePerMs = signedDegrees(lon(t + h) - lon(t - h)) / (2 * h);
    const step = signedDegrees(target - lon(t)) / ratePerMs;
    t += step;
    if (Math.abs(step) < 1) return t;
  }
  throw new Error(`findSunLongitudeInstant: no convergence for λ = ${targetLongitudeDeg}° near Unix ms ${nearUtcMs}.`);
}
