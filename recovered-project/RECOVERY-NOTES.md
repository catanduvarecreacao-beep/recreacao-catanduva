# Recuperação do projeto Recreação Catanduva

Arquivos recuperados da implantação de produção da Vercel e reconstrução documentada no GitHub.

## Conteúdo
- `package.json`, `next.config.ts`, `next-env.d.ts` e `tsconfig.json`: arquivos originais recuperados da implantação.
- `src/app/layout.tsx`: arquivo original recuperado.
- `src/app/globals.css`: folha de estilos publicada, recuperada do asset CSS da implantação.
- `src/app/page.tsx`: reconstrução editável feita a partir do módulo React compilado recuperado. Não é uma cópia literal do TSX original.
- `../recovery/production-client.js` e `../recovery/production-page-module.js`: bundles/módulos compilados que serviram de referência para a reconstrução.
- `../recovery/production-home.html`: HTML publicado.
- `../recovery/PRODUCTION-FUNCTIONAL-MAP.md`: mapa dos fluxos identificados na versão publicada.

## Estado da recuperação
O arquivo original `src/app/page.tsx` foi listado na árvore da implantação, mas a API da Vercel trunca seu conteúdo. A versão atual de `page.tsx` é uma reconstrução legível, tipada e editável com base no comportamento observado no bundle. Ela precisa passar por instalação de dependências, build e testes funcionais antes de ser considerada pronta para produção.

## Cuidados antes de publicar
1. Conferir as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente de Preview.
2. Confirmar as políticas RLS e o fluxo de criação de perfil no Supabase.
3. Testar cadastro, login, seleção de aulas, gravação/substituição de avaliação e consulta do diretor.
4. Fazer primeiro um deploy de Preview. Não promover para Production sem validação explícita.

Nenhuma alteração foi feita na implantação de produção durante esta recuperação.
