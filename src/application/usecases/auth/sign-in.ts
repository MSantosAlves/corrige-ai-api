import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '@/infra/config/env';
import { UserRepository } from '@/infra/db/repositories';
import { type PublicUserEntity } from '@/domain/entities';

const jwtSecret = env.JWT_SECRET;
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signInUseCase = async (
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUserEntity }> => {
  const input = signInSchema.parse({ email, password });

  const user = await UserRepository.findByEmail(input.email);
  const isValidPassword = user ? await bcrypt.compare(input.password, user.password) : false;
  if (!user || !isValidPassword) {
    throw new Error('Credenciais inválidas.');
  }

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
