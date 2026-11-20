import { describe, expect, it } from 'vitest';
import { checkPublicKey, checkUrl, normalizeUrl } from './cloud';

const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.firma`;

describe('configuración de Supabase', () => {
  it('normaliza la URL del proyecto', () => {
    expect(normalizeUrl(' abcd.supabase.co/ ')).toBe('https://abcd.supabase.co');
    expect(normalizeUrl('https://abcd.supabase.co///')).toBe('https://abcd.supabase.co');
    expect(checkUrl('abcd.supabase.co')).toBeNull();
    expect(checkUrl('no es una url')).not.toBeNull();
  });

  it('acepta solo claves públicas', () => {
    expect(checkPublicKey(jwt({ role: 'anon' }))).toBeNull();
    expect(checkPublicKey('sb_publishable_abc123')).toBeNull();
    expect(checkPublicKey(jwt({ role: 'service_role' }))).toMatch(/secreta/);
    expect(checkPublicKey('sb_secret_abc123')).toMatch(/secreta/);
    expect(checkPublicKey('')).not.toBeNull();
    expect(checkPublicKey('hola')).not.toBeNull();
  });
});
