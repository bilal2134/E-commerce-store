/**
 * CloudFront Functions (cloudfront-js-2.0). Included in the CloudFront
 * flat-rate plans, unlike Lambda@Edge.
 */

/**
 * Viewer request for the app (Lambda) behaviour:
 * - www.<domain> → <domain> (one canonical host for SEO)
 * - forwards the viewer Host as x-forwarded-host, because the origin request
 *   policy replaces Host with the Function URL's; Next's Server Actions compare
 *   Origin with x-forwarded-host.
 */
export function appViewerRequest(apexDomain: string | undefined): string {
  const redirect = apexDomain
    ? `
  if (host === "www.${apexDomain}") {
    var qs = Object.keys(request.querystring).map(function (k) {
      var v = request.querystring[k];
      return v.multiValue
        ? v.multiValue.map(function (m) { return k + "=" + m.value; }).join("&")
        : k + (v.value === "" ? "" : "=" + v.value);
    }).join("&");
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "https://${apexDomain}" + request.uri + (qs ? "?" + qs : "") } },
    };
  }`
    : "";
  return `function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : "";${redirect}
  request.headers["x-forwarded-host"] = { value: host };
  return request;
}`;
}
