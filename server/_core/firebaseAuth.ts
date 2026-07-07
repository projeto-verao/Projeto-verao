import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerFirebaseAuthRoutes(app: Express) {
  /**
   * POST /api/auth/firebase
   * Recebe um Firebase ID token do cliente e cria uma sessão de backend
   */
  app.post("/api/auth/firebase", async (req: Request, res: Response) => {
    try {
      const { idToken, email, name, uid } = req.body;

      console.log("[Firebase Auth] Recebido request com uid:", uid);

      if (!idToken || !uid) {
        console.error("[Firebase Auth] Faltam idToken ou uid");
        res.status(400).json({ error: "idToken and uid are required" });
        return;
      }

      // Usar o Firebase UID como openId para manter compatibilidade
      const openId = `firebase:${uid}`;

      console.log("[Firebase Auth] Criando/atualizando usuário com openId:", openId);

      // Criar ou atualizar usuário no banco de dados
      await db.upsertUser({
        openId,
        name: name || null,
        email: email || null,
        loginMethod: "firebase",
        lastSignedIn: new Date(),
      });

      console.log("[Firebase Auth] Usuário criado/atualizado com sucesso");

      // Criar um session token JWT
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      console.log("[Firebase Auth] Session token criado:", sessionToken.substring(0, 20) + "...");

      // Definir o cookie de sessão
      const cookieOptions = getSessionCookieOptions(req);
      console.log("[Firebase Auth] Cookie options:", cookieOptions);
      
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      console.log("[Firebase Auth] Cookie definido com sucesso");

      res.json({
        success: true,
        token: sessionToken,
        user: {
          uid,
          email,
          name,
        },
      });
    } catch (error) {
      console.error("[Firebase Auth] Error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
}
