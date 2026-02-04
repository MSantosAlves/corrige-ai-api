import { readFile } from 'fs/promises';
import { Blob } from 'buffer';
import { FormData, fetch } from 'undici';
import type { Response } from 'undici';

type TestResult = {
  label: string;
  total: number;
  ok: number;
  rateLimited: number;
  otherErrors: number;
};

const BASE_URL =  'http://localhost:3001';
const AUTH_TOKEN =  '';
const PUBLIC_BURST = 35;
const GLOBAL_BURST = 70;
const LLM_BURST = 5;
const SLEEP_MS = 0;

const LLM_ENDPOINT = '/extract-text';
const LLM_FILE_PATH = '/test.jpg';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getContentType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'pdf') {
    return 'application/pdf';
  }
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
};

const runBurst = async (
  label: string,
  requestFactory: () => Promise<Response>,
  count: number,
): Promise<TestResult> => {
  let ok = 0;
  let rateLimited = 0;
  let otherErrors = 0;

  for (let i = 0; i < count; i += 1) {
    const response = await requestFactory();
    if (response.status === 429) {
      rateLimited += 1;
    } else if (response.ok) {
      ok += 1;
    } else {
      otherErrors += 1;
    }

    if (SLEEP_MS > 0) {
      await sleep(SLEEP_MS);
    }
  }

  return { label, total: count, ok, rateLimited, otherErrors };
};

const logResult = (result: TestResult) => {
  console.log(
    `${result.label}: total=${result.total} ok=${result.ok} rateLimited=${result.rateLimited} otherErrors=${result.otherErrors}`,
  );
};

const main = async () => {
  console.log(`Base URL: ${BASE_URL}`);

  if (!AUTH_TOKEN) {
    console.log('Skipping authenticated tests: set AUTH_TOKEN to test global/LLM limits.');
    return;
  }

  if (!LLM_FILE_PATH) {
    console.log('Skipping LLM tests: set LLM_FILE_PATH to test LLM limits.');
    return;
  }

  const fileData = await readFile(LLM_FILE_PATH);
  const fileName = LLM_FILE_PATH.split('/').pop() ?? 'document';

  const llmResult = await runBurst(
    `llm (${LLM_ENDPOINT})`,
    () => {
      const formData = new FormData();
      formData.append('file', new Blob([fileData], { type: getContentType(fileName) }), fileName);
      return fetch(`${BASE_URL}${LLM_ENDPOINT}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        body: formData,
      });
    },
    LLM_BURST,
  );
  logResult(llmResult);

  const globalResult = await runBurst(
    'global (/classes)',
    () =>
      fetch(`${BASE_URL}/classes`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
      }),
    GLOBAL_BURST,
  );
  logResult(globalResult);

  const publicResult = await runBurst(
    'public (/)',
    () => fetch(`${BASE_URL}/health`, { method: 'GET' }),
    PUBLIC_BURST,
  );
  logResult(publicResult);
};

main().catch((error) => {
  console.error('Rate limit test failed:', error);
});
