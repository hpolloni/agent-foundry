import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({})).toEqual({ HOST: '0.0.0.0', PORT: 3000, LOG_LEVEL: 'info' });
  });

  it('coerces PORT to a number', () => {
    expect(loadConfig({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('throws on an invalid PORT', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid configuration/);
  });
});
