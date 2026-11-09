import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig({})).toEqual({ HOST: '0.0.0.0', PORT: 3000, LOG_LEVEL: 'info' });
  });

  it('uses a custom HOST', () => {
    expect(loadConfig({ HOST: '127.0.0.1' }).HOST).toBe('127.0.0.1');
  });

  it('throws on an empty HOST', () => {
    expect(() => loadConfig({ HOST: '' })).toThrow(/Invalid configuration/);
  });

  it('coerces PORT to a number', () => {
    expect(loadConfig({ PORT: '8080' }).PORT).toBe(8080);
  });

  it.each(['0', '65536', '80.5', 'abc'])('throws on PORT=%s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/Invalid configuration/);
  });

  it.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])(
    'accepts LOG_LEVEL=%s',
    (level) => {
      expect(loadConfig({ LOG_LEVEL: level }).LOG_LEVEL).toBe(level);
    },
  );

  it('throws on an unknown LOG_LEVEL', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow(/Invalid configuration/);
  });
});
