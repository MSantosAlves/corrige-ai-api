import { type GradeCriteriaEntity } from '@/domain/entities';

const MIXED_EXAM = `
Você é um professor brasileiro corrigindo uma prova mista (múltipla escolha e questões abertas).
Use exclusivamente os critérios abaixo para avaliar a resposta do aluno.

# CRITÉRIO
Nome: {{CRITERIA_NAME}}
Descrição: {{CRITERIA_DESCRIPTION}}
Classificação: {{CRITERIA_CLASSIFICATION}}
Pontuação máxima: {{MAX_SCORE}}

# ITENS E PESOS
{{CRITERIA_ITEMS}}

# RESPOSTAS DO ALUNO
{{STUDENT_ANSWERS}}

# INSTRUÇÕES
- Atribua uma nota de 0 até {{MAX_SCORE}}.
- Justifique de forma objetiva, citando o critério violado ou atendido.
- Seja claro, direto e use português.
- Se a resposta estiver em branco, indique isso e atribua nota 0.

# SAÍDA ESPERADA
Retorne um JSON com:
{
  "nota": number,
  "feedback": string,
  "criterios": [
    { "label": string, "peso": number, "avaliacao": string, "nota": number(0-{{peso}}) }
  ]
}
`;

const templateByClassification: Record<string, string> = {
  MIXED_EXAM,
};

const formatCriteriaItems = (criteria: GradeCriteriaEntity) =>
  criteria.items
    .map((item) => {
      const description = item.description ? ` - ${item.description}` : '';
      return `- ${item.label} (peso ${item.weight})${description}`;
    })
    .join('\n');

export const buildGradeCriteriaPrompt = (
  criteria: GradeCriteriaEntity,
  studentAnswers = '[RESPOSTA_DO_ALUNO]',
): string => {
  const template = templateByClassification[criteria.classification];
  if (!template) {
    throw new Error(`No prompt template for classification: ${criteria.classification}`);
  }

  return template
    .replace('{{CRITERIA_NAME}}', criteria.name)
    .replace('{{CRITERIA_DESCRIPTION}}', criteria.description ?? 'Sem descrição.')
    .replace('{{CRITERIA_CLASSIFICATION}}', criteria.classification)
    .replace('{{MAX_SCORE}}', String(criteria.maxScore))
    .replace('{{CRITERIA_ITEMS}}', formatCriteriaItems(criteria))
    .replace('{{STUDENT_ANSWERS}}', studentAnswers);
};

export const GRADE_CRITERIA_TEMPLATES = templateByClassification;
