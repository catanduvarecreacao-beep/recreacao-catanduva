# Mapa funcional recuperado da implantação

Fonte: bundle público da implantação de produção, módulo React da página.

## Integração Supabase
- URL: https://dtonegqpsnzipypjlffk.supabase.co
- Cliente Supabase JS 2.x.
- Chave pública publishable embutida no bundle de produção (não é uma senha administrativa).

## Dados e perfis
- Tabelas consultadas: profiles, lessons, evaluations.
- Perfil: id, full_name, email, role, school_name, segment, class_name.
- Papéis reconhecidos: professor, diretor e admin.
- Segmentos: Jardim, Pré I, Pré II.
- Turmas: A, B, C, D, E, F.
- Cadastro de professor coleta nome, escola, segmento, turma, e-mail e senha.

## Fluxos identificados
1. Na inicialização, recupera a sessão do Supabase e observa mudanças de autenticação.
2. Após login, busca o perfil na tabela profiles.
3. Para professor, busca aulas por segmento e bimestre, e avaliações por professor, segmento, turma e bimestre.
4. O professor escolhe avaliação Boa, Regular ou Revisar, escreve observações e registra.
5. Se a aula já tem avaliação, pergunta se deseja substituir; se confirmado, atualiza o registro existente.
6. Diretor/admin consultam avaliações por segmento e bimestre; diretor também filtra pela escola do próprio perfil.
7. Logout encerra sessão e retorna à tela inicial.

## Limitação
Este mapa e o módulo JS compilado preservam a lógica observável, mas não são uma cópia do page.tsx original em TSX. A leitura do arquivo-fonte original pela API da implantação está sendo truncada. Não usar o módulo compilado como substituto direto do arquivo-fonte nem publicar uma reconstrução sem testes.
