import { MongoClient, ObjectId, type Filter } from 'mongodb';
import { Resend } from 'resend';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { APIError, createAuthMiddleware } from 'better-auth/api';

import { env, isProduction } from '@/infra/config/env';
import { PlanType } from '@/domain/entities';
import { buildVerificationEmailHtml } from '@/infra/auth/email-templates/verification-email';
import { logger } from '@/shared/logger';

const signUpCookieName = 'signup_key';

const authMongoUri = `${env.MONGODB_URI}/${env.MONGODB_DATABASE_NAME}`;
const mongoClient = new MongoClient(authMongoUri);
void mongoClient.connect();
const enableAuthTransactions = env.BETTER_AUTH_USE_TRANSACTIONS === 'true';

const resend = new Resend(env.RESEND_API_KEY);

const parseCookieHeader = (cookieHeader: string | null | undefined): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }
    acc[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

type AuthUserDocument = {
  _id: ObjectId | string;
  plan_type?: PlanType;
  plan_quota?: number;
  plan_usage?: number;
};

const buildUserIdQuery = (userId: string): Filter<AuthUserDocument> => {
  if (ObjectId.isValid(userId)) {
    return { $or: [{ _id: new ObjectId(userId) }, { _id: userId }] };
  }
  return { _id: userId };
};

const buildTrustedOrigins = (): string[] => {
  const origins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.ENV === 'development') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return Array.from(new Set(origins));
};

const buildFrontendVerificationUrl = (url: string, token?: string): string => {
  if (!env.FRONTEND_BASE_URL) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const nextToken = token ?? parsed.searchParams.get('token') ?? '';
    if (nextToken && !parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', nextToken);
    }

    const frontendUrl = new URL('/auth/verify-email', env.FRONTEND_BASE_URL);
    parsed.searchParams.set('callbackURL', frontendUrl.toString());
    return parsed.toString();
  } catch {
    return url;
  }
};

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: buildTrustedOrigins(),
  database: enableAuthTransactions
    ? mongodbAdapter(mongoClient.db(env.MONGODB_DATABASE_NAME), { client: mongoClient })
    : mongodbAdapter(mongoClient.db(env.MONGODB_DATABASE_NAME)),
  advanced: {
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? '.revisafacil.com' : undefined,
    },
  },
  user: {
    modelName: 'users',
    additionalFields: {
      plan_type: {
        type: 'string',
        required: false,
        defaultValue: PlanType.FREE,
        input: false,
      },
      plan_quota: {
        type: 'number',
        required: false,
        defaultValue: 10,
        input: false,
      },
      plan_usage: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      if (!user.email) {
        return;
      }
      const verificationUrl = buildFrontendVerificationUrl(url, token);
      try {
        logger.info({ email: user.email }, 'Sending verification email');
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: user.email,
          subject: 'Confirme seu e-mail na Revisa Fácil',
          html: buildVerificationEmailHtml(verificationUrl),
        });
        logger.info({ email: user.email, result }, 'Verification email send result');
      } catch (err) {
        logger.error({ err, email: user.email }, 'Failed to send verification email');
      }
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith('/sign-in/social')) {
        return;
      }

      const expectedKey = env.SIGN_UP_KEY.trim();
      if (!expectedKey) {
        return;
      }

      const cookieHeader = ctx.request?.headers.get('cookie');
      const cookies = parseCookieHeader(cookieHeader);
      const providedKey = cookies[signUpCookieName] ?? '';

      if (providedKey !== expectedKey) {
        throw new APIError('BAD_REQUEST', {
          message: 'Chave de acesso inválida.',
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.context.newSession?.user?.id) {
        return;
      }

      const userId = ctx.context.newSession.user.id;
      const usersCollection = mongoClient
        .db(env.MONGODB_DATABASE_NAME)
        .collection<AuthUserDocument>('users');
      const user = await usersCollection.findOne(buildUserIdQuery(userId));
      if (!user) {
        return;
      }

      const nextPlanType = (user.plan_type as PlanType | undefined) ?? PlanType.FREE;
      const nextPlanQuota = typeof user.plan_quota === 'number' ? user.plan_quota : 10;
      const nextPlanUsage = typeof user.plan_usage === 'number' ? user.plan_usage : 0;

      if (
        user.plan_type !== nextPlanType ||
        user.plan_quota !== nextPlanQuota ||
        user.plan_usage !== nextPlanUsage
      ) {
        await usersCollection.updateOne(buildUserIdQuery(userId), {
          $set: {
            plan_type: nextPlanType,
            plan_quota: nextPlanQuota,
            plan_usage: nextPlanUsage,
          },
        });
      }
    }),
  },
});

export { signUpCookieName };
