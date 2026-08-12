import { jest } from "@jest/globals";

// ======================================================
// MOCK AXIOS INSTANCE
// ======================================================

// Axios instances are callable:
// client(config)
//
// Therefore the mock must also be a function.

const mockAxiosInstance = jest.fn();

mockAxiosInstance.interceptors = {
  request: {
    use: jest.fn(),
  },

  response: {
    use: jest.fn(),
  },
};

mockAxiosInstance.post = jest.fn();

const mockAxiosCreate = jest.fn(
  () => mockAxiosInstance
);

// ======================================================
// MOCK TOKEN STORE
// ======================================================

const mockGetAccessToken = jest.fn();
const mockSetAccessToken = jest.fn();
const mockClearAccessToken = jest.fn();

// ======================================================
// MOCK MODULES
// ======================================================

jest.unstable_mockModule("axios", () => ({
  default: {
    create: mockAxiosCreate,
  },
}));

jest.unstable_mockModule(
  "../../api/tokenStore.js",
  () => ({
    getAccessToken: mockGetAccessToken,
    setAccessToken: mockSetAccessToken,
    clearAccessToken: mockClearAccessToken,
  })
);

// ======================================================
// IMPORT CLIENT AFTER MOCKS
// ======================================================

const {
  default: client,
  refreshAccessToken,
} = await import(
  "../../api/client.js"
);

// ======================================================
// CAPTURE INTERCEPTORS
// ======================================================

let requestInterceptor;
let responseSuccessInterceptor;
let responseErrorInterceptor;

beforeAll(() => {
  const requestCalls =
    mockAxiosInstance.interceptors
      .request.use.mock.calls;

  expect(requestCalls.length).toBeGreaterThan(0);

  requestInterceptor =
    requestCalls[0][0];

  const responseCalls =
    mockAxiosInstance.interceptors
      .response.use.mock.calls;

  expect(responseCalls.length).toBeGreaterThan(0);

  responseSuccessInterceptor =
    responseCalls[0][0];

  responseErrorInterceptor =
    responseCalls[0][1];
});

// ======================================================
// TEST SUITE
// ======================================================

describe("API Client", () => {
  beforeEach(() => {
    // IMPORTANT:
    // Do NOT use jest.clearAllMocks() here.
    //
    // axios.create() and interceptor registration
    // happen when client.js is imported.
    //
    // Clearing all mocks would erase those calls.

    mockGetAccessToken.mockClear();
    mockSetAccessToken.mockClear();
    mockClearAccessToken.mockClear();

    mockAxiosInstance.mockClear();
    mockAxiosInstance.post.mockReset();

    mockGetAccessToken.mockReturnValue(null);
  });

  // ====================================================
  // AXIOS CONFIGURATION
  // ====================================================

  describe("Axios configuration", () => {
    test("should create axios instance", () => {
      expect(
        mockAxiosCreate
      ).toHaveBeenCalledTimes(1);
    });

    test("should configure withCredentials as true", () => {
      expect(
        mockAxiosCreate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });

    test("should configure a base URL", () => {
      expect(
        mockAxiosCreate
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String),
        })
      );
    });

    test("should export axios client as default", () => {
      expect(client).toBe(
        mockAxiosInstance
      );
    });
  });

  // ====================================================
  // REQUEST INTERCEPTOR
  // ====================================================

  describe("Request interceptor", () => {
    test("should register request interceptor", () => {
      expect(
        mockAxiosInstance.interceptors
          .request.use
      ).toHaveBeenCalledTimes(1);
    });

    test("should add Authorization header when token exists", () => {
      mockGetAccessToken.mockReturnValue(
        "access-token-123"
      );

      const config = {
        headers: {},
      };

      const result =
        requestInterceptor(config);

      expect(
        mockGetAccessToken
      ).toHaveBeenCalledTimes(1);

      expect(
        result.headers.Authorization
      ).toBe(
        "Bearer access-token-123"
      );

      expect(result).toBe(config);
    });

    test("should not add Authorization header when token does not exist", () => {
      mockGetAccessToken.mockReturnValue(
        null
      );

      const config = {
        headers: {},
      };

      const result =
        requestInterceptor(config);

      expect(
        result.headers.Authorization
      ).toBeUndefined();

      expect(result).toBe(config);
    });

    test("should preserve request configuration", () => {
      mockGetAccessToken.mockReturnValue(
        "token123"
      );

      const config = {
        url: "/products",
        method: "GET",
        headers: {},
        timeout: 5000,
      };

      const result =
        requestInterceptor(config);

      expect(result.url).toBe(
        "/products"
      );

      expect(result.method).toBe(
        "GET"
      );

      expect(result.timeout).toBe(
        5000
      );

      expect(
        result.headers.Authorization
      ).toBe(
        "Bearer token123"
      );
    });

    test("should call getAccessToken for every request", () => {
      mockGetAccessToken.mockReturnValue(
        "token123"
      );

      const config1 = {
        headers: {},
      };

      const config2 = {
        headers: {},
      };

      requestInterceptor(config1);
      requestInterceptor(config2);

      expect(
        mockGetAccessToken
      ).toHaveBeenCalledTimes(2);
    });
  });

  // ====================================================
  // SUCCESS RESPONSE INTERCEPTOR
  // ====================================================

  describe("Response success interceptor", () => {
    test("should return successful response unchanged", () => {
      const response = {
        status: 200,
        data: {
          message: "Success",
        },
      };

      const result =
        responseSuccessInterceptor(
          response
        );

      expect(result).toBe(
        response
      );
    });

    test("should return 201 response unchanged", () => {
      const response = {
        status: 201,
        data: {
          id: "product123",
        },
      };

      expect(
        responseSuccessInterceptor(
          response
        )
      ).toEqual(response);
    });

    test("should return response data unchanged", () => {
      const response = {
        status: 200,
        data: {
          products: [],
        },
      };

      expect(
        responseSuccessInterceptor(
          response
        )
      ).toEqual(response);
    });
  });

  // ====================================================
  // REFRESH ACCESS TOKEN
  // ====================================================

  describe("refreshAccessToken", () => {
    test("should call /auth/refresh", async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "new-access-token",
        },
      });

      const result =
        await refreshAccessToken();

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledTimes(1);

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledWith(
        "/auth/refresh"
      );

      expect(result).toBe(
        "new-access-token"
      );
    });

    test("should save new access token", async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "new-token-123",
        },
      });

      await refreshAccessToken();

      expect(
        mockSetAccessToken
      ).toHaveBeenCalledTimes(1);

      expect(
        mockSetAccessToken
      ).toHaveBeenCalledWith(
        "new-token-123"
      );
    });

    test("should return refreshed token", async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "refreshed-token",
        },
      });

      const result =
        await refreshAccessToken();

      expect(result).toBe(
        "refreshed-token"
      );
    });

    test("should reject when refresh fails", async () => {
      const error = new Error(
        "Refresh failed"
      );

      mockAxiosInstance.post.mockRejectedValue(
        error
      );

      await expect(
        refreshAccessToken()
      ).rejects.toThrow(
        "Refresh failed"
      );

      expect(
        mockSetAccessToken
      ).not.toHaveBeenCalled();
    });

    test("should prevent duplicate refresh requests", async () => {
      let resolveRefresh;

      const pendingRefresh =
        new Promise((resolve) => {
          resolveRefresh = resolve;
        });

      mockAxiosInstance.post.mockReturnValue(
        pendingRefresh
      );

      const firstCall =
        refreshAccessToken();

      const secondCall =
        refreshAccessToken();

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledTimes(1);

      resolveRefresh({
        data: {
          token: "shared-token",
        },
      });

      const results =
        await Promise.all([
          firstCall,
          secondCall,
        ]);

      expect(results[0]).toBe(
        "shared-token"
      );

      expect(results[1]).toBe(
        "shared-token"
      );

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledTimes(1);
    });

    test("should allow a new refresh after previous refresh completes", async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: {
            token: "token-one",
          },
        })
        .mockResolvedValueOnce({
          data: {
            token: "token-two",
          },
        });

      const first =
        await refreshAccessToken();

      const second =
        await refreshAccessToken();

      expect(first).toBe(
        "token-one"
      );

      expect(second).toBe(
        "token-two"
      );

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledTimes(2);
    });
  });

  // ====================================================
  // RESPONSE ERROR INTERCEPTOR
  // ====================================================

  describe("Response error interceptor", () => {
    test("should register response interceptor", () => {
      expect(
        mockAxiosInstance.interceptors
          .response.use
      ).toHaveBeenCalledTimes(1);
    });

    test("should reject non-401 errors", async () => {
      const error = {
        config: {
          url: "/products",
        },

        response: {
          status: 500,

          data: {
            message: "Server error",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);
    });

    test("should reject 404 errors", async () => {
      const error = {
        config: {
          url: "/products/123",
        },

        response: {
          status: 404,

          data: {
            message: "Not found",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);
    });

    // ==================================================
    // TOKEN EXPIRED
    // ==================================================

    test("should refresh token when TOKEN_EXPIRED occurs", async () => {
      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "new-token",
        },
      });

      mockAxiosInstance.mockResolvedValue({
        data: {
          success: true,
        },
      });

      const result =
        await responseErrorInterceptor(
          error
        );

      expect(
        mockAxiosInstance.post
      ).toHaveBeenCalledWith(
        "/auth/refresh"
      );

      expect(
        mockSetAccessToken
      ).toHaveBeenCalledWith(
        "new-token"
      );

      expect(
        error.config._retried
      ).toBe(true);

      expect(
        error.config.headers.Authorization
      ).toBe(
        "Bearer new-token"
      );

      expect(
        mockAxiosInstance
      ).toHaveBeenCalledWith(
        error.config
      );

      expect(result).toEqual({
        data: {
          success: true,
        },
      });
    });

    test("should mark request as retried", async () => {
      const config = {
        url: "/orders",
        headers: {},
      };

      const error = {
        config,

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "retry-token",
        },
      });

      mockAxiosInstance.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await responseErrorInterceptor(
        error
      );

      expect(
        config._retried
      ).toBe(true);
    });

    test("should add refreshed token to Authorization header", async () => {
      const config = {
        url: "/orders",
        headers: {},
      };

      const error = {
        config,

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "refreshed-abc",
        },
      });

      mockAxiosInstance.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await responseErrorInterceptor(
        error
      );

      expect(
        config.headers.Authorization
      ).toBe(
        "Bearer refreshed-abc"
      );
    });

    test("should replay original request", async () => {
      const config = {
        url: "/products",
        method: "GET",
        headers: {},
      };

      const error = {
        config,

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          token: "replay-token",
        },
      });

      mockAxiosInstance.mockResolvedValue({
        data: {
          products: [],
        },
      });

      const result =
        await responseErrorInterceptor(
          error
        );

      expect(
        mockAxiosInstance
      ).toHaveBeenCalledWith(
        config
      );

      expect(result).toEqual({
        data: {
          products: [],
        },
      });
    });

    // ==================================================
    // AUTH ENDPOINTS
    // ==================================================

    test("should not refresh token for /auth/login", async () => {
      const error = {
        config: {
          url: "/auth/login",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockAxiosInstance.post
      ).not.toHaveBeenCalled();

      expect(
        mockClearAccessToken
      ).not.toHaveBeenCalled();
    });

    test("should not refresh token for /auth/refresh", async () => {
      const error = {
        config: {
          url: "/auth/refresh",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockClearAccessToken
      ).not.toHaveBeenCalled();
    });

    test("should not refresh token for /auth/register", async () => {
      const error = {
        config: {
          url: "/auth/register",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockAxiosInstance.post
      ).not.toHaveBeenCalled();
    });

    // ==================================================
    // ALREADY RETRIED
    // ==================================================

    test("should not retry already retried request", async () => {
      const error = {
        config: {
          url: "/products",
          headers: {},
          _retried: true,
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockGetAccessToken.mockReturnValue(
        "existing-token"
      );

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockAxiosInstance.post
      ).not.toHaveBeenCalled();

      expect(
        mockClearAccessToken
      ).toHaveBeenCalledTimes(1);
    });

    // ==================================================
    // REFRESH FAILURE
    // ==================================================

    test("should clear access token when refresh fails", async () => {
      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(
        new Error(
          "Refresh failed"
        )
      );

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockClearAccessToken
      ).toHaveBeenCalledTimes(1);
    });

    test("should dispatch auth:unauthorized when refresh fails", async () => {
      const eventHandler = jest.fn();

      window.addEventListener(
        "auth:unauthorized",
        eventHandler
      );

      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "TOKEN_EXPIRED",
          },
        },
      };

      mockAxiosInstance.post.mockRejectedValue(
        new Error(
          "Refresh failed"
        )
      );

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        eventHandler
      ).toHaveBeenCalledTimes(1);

      expect(
        eventHandler.mock.calls[0][0].type
      ).toBe(
        "auth:unauthorized"
      );

      window.removeEventListener(
        "auth:unauthorized",
        eventHandler
      );
    });

    // ==================================================
    // GENERIC 401
    // ==================================================

    test("should clear token for generic 401 when token exists", async () => {
      mockGetAccessToken.mockReturnValue(
        "existing-token"
      );

      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "INVALID_TOKEN",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockClearAccessToken
      ).toHaveBeenCalledTimes(1);
    });

    test("should dispatch auth:unauthorized for generic 401", async () => {
      mockGetAccessToken.mockReturnValue(
        "existing-token"
      );

      const eventHandler = jest.fn();

      window.addEventListener(
        "auth:unauthorized",
        eventHandler
      );

      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "INVALID_TOKEN",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        eventHandler
      ).toHaveBeenCalledTimes(1);

      expect(
        eventHandler.mock.calls[0][0].type
      ).toBe(
        "auth:unauthorized"
      );

      window.removeEventListener(
        "auth:unauthorized",
        eventHandler
      );
    });

    test("should not clear token for generic 401 when no token exists", async () => {
      mockGetAccessToken.mockReturnValue(
        null
      );

      const error = {
        config: {
          url: "/products",
          headers: {},
        },

        response: {
          status: 401,

          data: {
            code: "INVALID_TOKEN",
          },
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockClearAccessToken
      ).not.toHaveBeenCalled();
    });

    // ==================================================
    // NETWORK ERROR
    // ==================================================

    test("should reject network error", async () => {
      const error = {
        config: {
          url: "/products",
        },

        response: undefined,

        message: "Network Error",
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);

      expect(
        mockClearAccessToken
      ).not.toHaveBeenCalled();
    });

    test("should reject error with no config", async () => {
      const error = {
        response: {
          status: 500,
        },
      };

      await expect(
        responseErrorInterceptor(error)
      ).rejects.toBe(error);
    });
  });
});