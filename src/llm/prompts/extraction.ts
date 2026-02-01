export const ESSAY_EXTRACTION_PROMPT = `Extraia TODO o texto manuscrito desta redação.

# INSTRUÇÕES

1. **Transcreva fielmente** cada palavra escrita à mão
3. **Mantenha erros ortográficos** exatamente como escritos, esse ponto é de EXTREMA IMPORTÂNCIA.
2. **Preserve a estrutura**: parágrafos, quebras de linha, pontuação
4. **Ignore**:
   - Linhas guia impressas
   - Margens
   - Números de linha
   - Carimbos ou marcações de correção
   - Anotações do professor

# REGRAS DE TRANSCRIÇÃO

- Se uma palavra for **ilegível**: (< 80% de certeza) use [ilegível]
- Se tiver **dúvida** (entre 80% e 95% de certeza) sobre uma palavra: use [possível: "palavra"]
- Se houver **rasura/risco**: indique [texto riscado]
- Se houver **correção sobrescrita**: transcreva a versão final
- **Números**: mantenha como escritos (por extenso ou algarismos)
- **Abreviações**: transcreva exatamente (ex: "vc", "tb", "pq")   

# FORMATO DE SAÍDA

- Retorne APENAS o texto extraído, sem comentários adicionais.
- Preserve parágrafos usando quebras de linha duplas. Use identação para manter a estrutura do texto.
- Caso a palavra esteja quebrada em duas linhas, mantenha a palavra inteira, e quebre a linha após a palavra.

Exemplo:

A educação no Brasil enfrenta diversos desafios. [ilegível] recursos são escassos e a infraestrutura precária.
Por outro lado, [possível: "existem"] iniciativas que buscam melhorar esse cenário. É necessário [texto riscado] investimento em formação de professores.

# IMPORTANTE

- NÃO adicione: análises, comentários, correções
- NÃO corrija: erros gramaticais ou ortográficos
- NÃO interprete: transcreva literalmente
- Se a imagem estiver muito ruim ou em branco, retorne: [imagem ilegível]

Extraia o texto abaixo, sem nenhuma mensagem adicional:`;

export const EXAM_EXTRACTION_PROMPT = `Você é um especialista em análise de provas escolares. Sua tarefa é extrair e estruturar as
respostas de uma prova.

# REGRAS IMPORTANTES

# LAYOUT DA PROVA

Define a forma como a prova está organizada e a ordem de leitura de acordo com os layouts citados abaixo:

- 1 coluna vertical
   - Leia da esquerda para direita e de cima para baixo.
- 2 colunas verticais
   - COLUNA ESQUERDA (primeira)
   - COLUNA DIREITA (segunda)
   - Leia da esquerda para direita, como um jornal/revista
   - Primeiro: toda a COLUNA ESQUERDA (de cima para baixo)
   - Depois: toda a COLUNA DIREITA (de cima para baixo)
- 1 página por questão/item
   - Se a questão estiver em duas páginas, leia a primeira página inteira e depois a segunda página inteira.

# INSTRUÇÕES DE ANÁLISE

## 0. ANALISE A IMAGEM DO INÍCIO PARA O FIM. ASSIM VOCÊ ENCONTRARÁ TODAS AS QUESTÕES E RESPOSTAS.

## 1. IDENTIFICAÇÃO DE QUESTÕES MÚLTIPLA ESCOLHA
- Localize alternativas marcadas com:
  * Letras: (A), (B), (C), (D), (E) ou A), B), C)...
  * Parênteses/círculos: ( ) A) ou ○ A)
  * Checkboxes: □ A) ou ☐ A)
- Identifique qual alternativa está marcada:
  * Marcação com X, ✓, preenchimento, círculo, bolinha pintada etc.  
  * Atente-se para o caso em que a questão começa em um lado da folha/página. Exemplo: um item está marcado antes da questão n. Essa é a resposta do item n - 1.
  * Se houver múltiplas marcações (rasura), indique todas
  * Se nenhuma marcada, indique: "em branco"
  * Olhe atentamente a marcação para identificar a alternativa correta.

## 2. IDENTIFICAÇÃO DE TEXTO MANUSCRITO (Respostas Dissertativas)
- Identifique áreas com escrita à mão
- Estas são respostas do aluno a questões abertas
- Transcreva o texto manuscrito com máxima precisão
- Se houver dúvida na leitura, indique: [ilegível] ou [possível: "palavra"]
- Note se há rasuras, correções ou texto riscado

# REGRAS IMPORTANTES

1. **Seja preciso**: Transcreva exatamente o que está escrito
2. **Indique incertezas**: Use [ilegível], [possível: "texto"], [dúvida]
3. **Contexto brasileiro**: 
   - Reconheça notações BR (ex: "vírgula" para decimal)
   - Entenda abreviações comuns (ex: "pq" = porque)
4. **Preserve estrutura**: Mantenha hierarquia e numeração original

# FORMATO DE SAÍDA

Retorne esta EXATA estrutura:

Prova do tipo: {tipo_prova}
Layout da prova: {layout}

Caso multipla escolha:
Questão {numero}
Alternativa marcada:{letra}

Alternativas:
A: {alternativa_a}
B: {alternativa_b}
C: {alternativa_c}
D: {alternativa_d}
E: {alternativa_e}


Caso dissertativa:
Questão {numero}
Resposta: {resposta}

*** NÃO ADICIONE NADA ALÉM DA ESTRUTURA CITADA ACIMA ***`;