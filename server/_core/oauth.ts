/**
 * oauth.ts — Rotas OAuth do Projeto Verão.
 *
 * O projeto usa Firebase Auth para autenticação.
 * Este arquivo mantém apenas a rota de callback OAuth como stub
 * para compatibilidade com eventuais redirects antigos.
 */
import type { Express, Request, Response } from "express";

export function registerOAuthRoutes(app: Express) {
  // Rota de callback OAuth legada — redireciona para login Firebase
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    console.warn("[OAuth] Callback OAuth legado acessado. O projeto usa Firebase Auth.");
    res.redirect(302, "/login");
  });
}
