import { describe, expect, it } from "vitest";
import { withoutContentLength } from "../../../infrastructure/aws/opennext/headers";

describe("Lambda streaming wrapper fix", () => {
  it("drops Content-Length in any casing and keeps the other headers", () => {
    expect(
      withoutContentLength({ "content-length": "180294", "Content-Type": "text/html", etag: "x" }),
    ).toEqual({ "Content-Type": "text/html", etag: "x" });
    expect(withoutContentLength({ "Content-Length": "1" })).toEqual({});
  });
});
