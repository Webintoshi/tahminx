import { Injectable } from '@nestjs/common';

@Injectable()
export class ProxyXGService {
  resolve(input: {
    existingXg?: number | null;
    shots?: number | null;
    shotsOnTarget?: number | null;
    bigChances?: number | null;
    corners?: number | null;
  }): { value: number; usedProxy: boolean } {
    if (Number.isFinite(input.existingXg)) {
      return {
        value: round3(Number(input.existingXg)),
        usedProxy: false,
      };
    }

    const shots = safe(input.shots);
    const shotsOnTarget = safe(input.shotsOnTarget);
    const bigChances = safe(input.bigChances);
    const corners = safe(input.corners);

    const proxy =
      shots * 0.04 +
      shotsOnTarget * 0.16 +
      bigChances * 0.22 +
      corners * 0.06;

    return {
      value: round3(Math.max(0.1, proxy)),
      usedProxy: true,
    };
  }
}

const safe = (value: number | null | undefined) => (Number.isFinite(value) ? Number(value) : 0);
const round3 = (value: number) => Number(value.toFixed(3));
