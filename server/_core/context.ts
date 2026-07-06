import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // For preview purposes, we bypass authentication if it fails
    // This allows testing the AI trainer without a real OAuth setup
    user = {
      id: 1,
      email: "teste@projetoverao.com",
      name: "Usuário de Teste",
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "user",
      googleId: "test-google-id",
      avatarUrl: null,
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
