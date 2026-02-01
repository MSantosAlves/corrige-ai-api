import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { env } from "../../config/env";
import { UserRepository, type PublicUserEntity } from "../../repositories";

const jwtSecret = env.JWT_SECRET;
const signUpSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6).max(32)
});

export const signUpUseCase = async (
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: PublicUserEntity }> => {
  const input = signUpSchema.parse({ name, email, password });
  const existing = await UserRepository.findByEmail(input.email);
  if (existing) {
    throw new Error("Email já cadastrado.");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await UserRepository.create({
    name: input.name,
    email: input.email,
    password: hashedPassword
  });

  return {
    token: jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name
      },
      jwtSecret,
      { expiresIn: "7d" }
    ),
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
};
