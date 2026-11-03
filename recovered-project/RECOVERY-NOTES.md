# Recuperação do projeto Recreação Catanduva

Arquivos recuperados da implantação de produção da Vercel.

## Conteúdo desta pasta
- package.json, next.config.ts, next-env.d.ts e tsconfig.json: arquivos originais recuperados.
- src/app/layout.tsx: arquivo original recuperado.
- src/app/globals.css: folha de estilos publicada, recuperada do asset CSS da implantação.

## O que ainda falta
O arquivo original src/app/page.tsx foi listado na árvore da implantação, mas a API que entrega seu conteúdo o trunca. A lógica integral do componente foi preservada em ../recovery/production-client.js, dentro do bundle JavaScript compilado. O HTML publicado também está em ../recovery/production-home.html.

O bundle compilado não é equivalente ao page.tsx original editável. Não implantar esta pasta como projeto completo até reconstruir e validar page.tsx e conferir as variáveis de ambiente do Supabase.
