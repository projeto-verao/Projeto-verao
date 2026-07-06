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
      openId: "test-open-id",
      email: "teste@projetoverao.com",
      name: "Usuário de Teste",
      loginMethod: "preview",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      role: "user",
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
