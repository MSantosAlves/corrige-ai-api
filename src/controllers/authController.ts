import type { Request, Response } from "express";

import { signInUseCase, signUpUseCase } from "../usecases/auth";

export const signInController = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    const result = await signInUseCase(email, password);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credenciais inválidas.";
    return res.status(401).json({ error: message });
  }
};

export const signUpController = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Nome, email e senha são obrigatórios." });
  }

  try {
    const result = await signUpUseCase(name, email, password);
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar.";
    const status = message.includes("Email já cadastrado") ? 409 : 400;
    return res.status(status).json({ error: message });
  }
};
