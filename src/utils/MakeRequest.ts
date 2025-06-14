interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  queryParams?: Record<string, string | number | boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodyParams?: Record<string, any>;
  headers?: HeadersInit;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
}

const makeRequest = async (
  url: string,
  endpoint: string,
  {
    method = "GET",
    queryParams,
    bodyParams,
    headers,
  }: RequestOptions = {},
): Promise<Response> => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const queryString = queryParams
    ? "?" +
      new URLSearchParams(
        Object.entries(queryParams).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {}),
      ).toString()
    : "";

  const fullUrl = `${url}/${normalizedEndpoint}${queryString}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (method !== "GET" && bodyParams) {
    fetchOptions.body = JSON.stringify(bodyParams);
  }

  return fetch(fullUrl, fetchOptions);
};

export default makeRequest;
