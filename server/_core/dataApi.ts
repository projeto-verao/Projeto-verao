/**
 * dataApi.ts — Stub do módulo de Data API.
 *
 * O Projeto Verão não utiliza a Data API da plataforma Manus/Base44.
 * Este arquivo é mantido apenas para compatibilidade de importações legadas.
 * Não há dependência ativa deste módulo no projeto.
 */

/**
 * @deprecated Não utilizado no Projeto Verão.
 * O projeto usa Firebase Firestore diretamente para acesso a dados.
 */
export async function callDataApi(
  _apiId: string,
  _options: {
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    pathParams?: Record<string, string>;
    formData?: Record<string, unknown>;
  } = {}
): Promise<unknown> {
  throw new Error(
    "callDataApi não está disponível. O Projeto Verão usa Firebase Firestore diretamente."
  );
}
