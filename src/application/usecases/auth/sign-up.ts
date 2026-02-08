import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env, isProduction } from '@/infra/config/env';
import { UserRepository } from '@/infra/db/repositories';
import { type PublicUserEntity } from '@/domain/entities';

const jwtSecret = env.JWT_SECRET;
const signUpSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6).max(32),
  signUpKey: z.string().min(1).max(128),
});

export const signUpUseCase = async (
  name: string,
  email: string,
  password: string,
  signUpKey: string,
): Promise<{ token: string; user: PublicUserEntity }> => {
  const input = signUpSchema.parse({ name, email, password, signUpKey });

  if (isProduction) {
    if (!env.SIGN_UP_KEY) {
      throw new Error('Cadastro indisponível.');
    }
    if (input.signUpKey !== env.SIGN_UP_KEY) {
      throw new Error('Código de acesso inválido.');
    }
  }
  const existing = await UserRepository.findByEmail(input.email);
  if (existing) {
    throw new Error('Email já cadastrado.');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await UserRepository.create({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return {
    token: jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: '7d' },
    ),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      planType: user.planType,
      planQuota: user.planQuota,
      planUsage: user.planUsage,
    },
  };
};
