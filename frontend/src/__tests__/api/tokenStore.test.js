import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../../api/tokenStore";

describe("Token Store", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  describe("getAccessToken", () => {
    test("should return null when no token is stored", () => {
      expect(getAccessToken()).toBeNull();
    });

    test("should return the stored access token", () => {
      setAccessToken("test-access-token");

      expect(getAccessToken()).toBe("test-access-token");
    });
  });

  describe("setAccessToken", () => {
    test("should store the access token in memory", () => {
      setAccessToken("abc123");

      expect(getAccessToken()).toBe("abc123");
    });

    test("should replace the existing access token", () => {
      setAccessToken("old-token");
      setAccessToken("new-token");

      expect(getAccessToken()).toBe("new-token");
    });
  });

  describe("clearAccessToken", () => {
    test("should clear the access token", () => {
      setAccessToken("test-token");

      clearAccessToken();

      expect(getAccessToken()).toBeNull();
    });

    test("should remain null when clearing an empty store", () => {
      clearAccessToken();

      expect(getAccessToken()).toBeNull();
    });
  });
});