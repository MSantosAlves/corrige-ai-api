import { env } from '../config/env';

type AnthropicMessageContent = {
  type: 'text';
  text: string;
};

type AnthropicResponse = {
  content: AnthropicMessageContent[];
};

type LlmClientConfig = {
  anthropicApiKey?: string;
  documentType?: string;
};

export class LlmClient {
  private anthropicApiKey?: string;

  constructor(config: LlmClientConfig = {}) {
    this.anthropicApiKey = config.anthropicApiKey ?? env.ANTHROPIC_API_KEY;
  }

  async analyzeText(text: string, documentType?: string): Promise<string> {
    if (!this.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for text analysis.');
    }

    const data = await this.requestAnthropic({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Voce e um professor avaliando a resposta do aluno.',
                'Analise de forma resumida se o texto do aluno está correto, com uma nota de 0 a 10.',
                documentType
                  ? `Tipo de documento informado: ${documentType}.`
                  : 'Tipo de documento informado: nao especificado.',
                'Inclua tambem um alerta de possivel plagio caso identifique trechos',
                'muito genericos, padrao ou que parecam copiados de materiais comuns.',
                'Se nao for possivel inferir plagio sem fontes externas, diga',
                "'Nao e possivel confirmar plagio sem verificacao externa'.",
                'Responda em portugues com um feedback curto, em uma unica frase.',
                '',
                text,
              ].join('\n'),
            },
          ],
        },
      ],
    });
    return (
      data.content
        ?.map((item) => item.text)
        .join('\n')
        .trim() || ''
    );
  }

  private async requestAnthropic(payload: Record<string, unknown>): Promise<AnthropicResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.anthropicApiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as AnthropicResponse;
      const model = typeof payload.model === 'string' ? payload.model : 'unknown-model';
      const text = data.content
        ?.map((item) => item.text)
        .join('\n')
        .trim();
      console.log(`[Anthropic:${model}]`, text || '(empty response)');
      return data;
    }

    let errorPayload: unknown = null;
    let errorText = '';

    try {
      errorPayload = await response.json();
      errorText = JSON.stringify(errorPayload);
    } catch {
      errorText = await response.text();
    }

    const shouldFallback =
      response.status === 404 &&
      JSON.stringify(errorPayload ?? errorText).includes('model') &&
      payload.model === env.ANTHROPIC_FALLBACK_MODEL;

    if (shouldFallback) {
      return this.requestAnthropic({
        ...payload,
        model: env.ANTHROPIC_FALLBACK_MODEL,
      });
    }

    throw new Error(`Anthropic error ${response.status}: ${errorText}`);
  }
}
