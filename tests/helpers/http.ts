type TestRequest = {
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  user?: {
    id: string;
    email?: string;
    name?: string;
    emailVerified?: boolean;
  };
  files?: unknown;
  file?: unknown;
  on?: (event: string, cb: () => void) => void;
  headers?: Record<string, string>;
  path?: string;
  ip?: string;
};

type TestResponse = {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  writes: string[];
  ended: boolean;
  status: (code: number) => TestResponse;
  json: (body: unknown) => TestResponse;
  send: (body: unknown) => TestResponse;
  setHeader: (name: string, value: string) => TestResponse;
  flushHeaders: () => void;
  write: (chunk: string) => void;
  end: () => void;
};

export const createRequest = (partial: Partial<TestRequest> = {}): TestRequest => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  path: '/',
  ...partial,
});

export const createResponse = (): TestResponse => {
  const res: TestResponse = {
    statusCode: 200,
    payload: undefined,
    headers: {},
    writes: [],
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
    send(body: unknown) {
      this.payload = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    flushHeaders() {
      return;
    },
    write(chunk: string) {
      this.writes.push(chunk);
    },
    end() {
      this.ended = true;
    },
  };

  return res;
};
