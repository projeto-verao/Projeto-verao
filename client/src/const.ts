export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * getLoginUrl — mantido por compatibilidade, retorna a rota de login do Projeto Verão.
 * O projeto usa Firebase Auth, portanto o login é feito na rota /login.
 */
export const getLoginUrl = (_returnPath?: string): string => "/login";
