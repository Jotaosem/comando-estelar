import { SignJWT, importJWK, jwtVerify, createRemoteJWKSet } from 'jose';

interface Env {
  CF_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  SUPABASE_JWT_SECRET?: string;
  DEV_AUTH?: string;
  DEV_AUTH_EMAIL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    let email: string | null = null;
    const isDev = env.DEV_AUTH === 'true';

    // 1. Obtener assertion de Cloudflare Access
    const assertion = request.headers.get('Cf-Access-Jwt-Assertion');

    if (assertion && env.CF_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
      const jwksUrl = new URL(`https://${env.CF_TEAM_DOMAIN}/cdn-cgi/access/certs`);
      const JWKS = createRemoteJWKSet(jwksUrl);
      const { payload } = await jwtVerify(assertion, JWKS, {
        audience: env.CF_ACCESS_AUD,
      });
      email = (payload.email as string)?.toLowerCase() || null;
    } else if (isDev) {
      // Modo desarrollo local: usa DEV_AUTH_EMAIL o query param ?email= o header x-dev-email
      const url = new URL(request.url);
      const devEmailQuery = url.searchParams.get('email');
      const devEmailHeader = request.headers.get('x-dev-email');
      email = (devEmailQuery || devEmailHeader || env.DEV_AUTH_EMAIL || 'gerencia@empresa.cl').toLowerCase();
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'No autorizado / assertion faltante' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Firmar JWT HS256 compatible con Supabase
    const jwtSecret = env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';
    const secretKey = new TextEncoder().encode(jwtSecret);

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hora de vigencia

    const token = await new SignJWT({
      sub: email,
      email: email,
      role: 'authenticated',
      aud: 'authenticated',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(secretKey);

    return new Response(
      JSON.stringify({
        access_token: token,
        expires_at: exp,
        email: email,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error en autenticación' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
