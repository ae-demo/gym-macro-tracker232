// Tests for gateway_assertion.bal, copied verbatim from the `ballerina`
// skill. Nothing here talks to a real gateway or a real database: a
// throwaway RSA keypair (tests/resources/*.pem, generated once for this
// package and meaningless outside it) stands in for the environment's
// gateway keypair, and a small diagnostic-only service — its own listener,
// its own resource, no persistence — exercises the SAME AssertionInterceptor
// the real gym-api service on port 9090 uses, without needing Postgres.
//
// Running these requires GATEWAY_ASSERTION_CERTIFICATE, _ISSUER and _HEADER
// to already be set in the process environment before `bal test` starts
// (the interceptor's `init()` panics without them, by design — see
// gateway_assertion.bal) to:
//   GATEWAY_ASSERTION_CERTIFICATE = contents of tests/resources/throwaway_certificate.pem
//   GATEWAY_ASSERTION_ISSUER      = "test-gateway"
//   GATEWAY_ASSERTION_HEADER      = "x-jwt-assertion"
// matching the constants below.

import ballerina/http;
import ballerina/jwt;
import ballerina/lang.array;
import ballerina/test;

const string TEST_ISSUER = "test-gateway";
const string TEST_HEADER = "x-jwt-assertion";
const string TEST_PRIVATE_KEY = "tests/resources/throwaway_private_key.pem";
const string OTHER_PRIVATE_KEY = "tests/resources/throwaway_other_key.pem";

listener http:Listener assertionTestListener = new (9099);

service http:InterceptableService /diagnostics on assertionTestListener {
    public function createInterceptors() returns AssertionInterceptor => new;

    resource function get whoami(http:RequestContext ctx) returns json {
        GatewayCaller? caller = gatewayCaller(ctx);
        if caller is () {
            return {authenticated: false};
        }
        return {authenticated: true, userId: caller.userId};
    }
}

final http:Client assertionTestClient = check new ("http://localhost:9099/diagnostics");

function mintAssertion(string keyFile) returns string|error {
    return jwt:issue({
        issuer: TEST_ISSUER,
        username: "trainee-42",
        expTime: 300,
        customClaims: {"scope": "targets:read logs:read", "username": "trainee42", "ouHandle": "org-1"},
        signatureConfig: {
            algorithm: jwt:RS256,
            config: {keyFile: keyFile, keyPassword: ""}
        }
    });
}

function base64UrlDecode(string segment) returns byte[]|error {
    string normalized = segment;
    normalized = re `-`.replaceAll(normalized, "+");
    normalized = re `_`.replaceAll(normalized, "/");
    int remainder = normalized.length() % 4;
    if remainder == 2 {
        normalized = normalized + "==";
    } else if remainder == 3 {
        normalized = normalized + "=";
    }
    return array:fromBase64(normalized);
}

function base64UrlEncode(byte[] data) returns string {
    string encoded = array:toBase64(data);
    encoded = re `\+`.replaceAll(encoded, "-");
    encoded = re `/`.replaceAll(encoded, "_");
    encoded = re `=+$`.replaceAll(encoded, "");
    return encoded;
}

# Decodes a valid assertion's payload, edits its `sub`, re-encodes it and
# reattaches the ORIGINAL signature — the signature no longer matches the
# edited payload, so this must be rejected as a forgery, not silently
# accepted with different claims.
function tamperPayload(string token) returns string|error {
    string[] segments = re `\.`.split(token);
    if segments.length() != 3 {
        return error("unexpected JWT shape");
    }
    byte[] payloadBytes = check base64UrlDecode(segments[1]);
    json payload = check (check string:fromBytes(payloadBytes)).fromJsonString();
    map<json> payloadMap = check payload.ensureType();
    payloadMap["sub"] = "attacker";
    string tamperedSegment = base64UrlEncode(payloadMap.toJsonString().toBytes());
    return segments[0] + "." + tamperedSegment + "." + segments[2];
}

@test:Config {}
function testValidAssertionIsAccepted() returns error? {
    string token = check mintAssertion(TEST_PRIVATE_KEY);
    http:Response response = check assertionTestClient->get("/whoami", headers = {[TEST_HEADER]: token});
    test:assertEquals(response.statusCode, 200);
    json body = check response.getJsonPayload();
    test:assertEquals(check body.authenticated, true);
    test:assertEquals(check body.userId, "trainee-42");
}

@test:Config {}
function testAssertionSignedByDifferentKeyIsRejected() returns error? {
    string token = check mintAssertion(OTHER_PRIVATE_KEY);
    http:Response response = check assertionTestClient->get("/whoami", headers = {[TEST_HEADER]: token});
    test:assertEquals(response.statusCode, 401);
}

@test:Config {}
function testTamperedPayloadIsRejectedNeverAnonymous() returns error? {
    string token = check mintAssertion(TEST_PRIVATE_KEY);
    string tampered = check tamperPayload(token);
    http:Response response = check assertionTestClient->get("/whoami", headers = {[TEST_HEADER]: tampered});
    test:assertEquals(response.statusCode, 401);
}

@test:Config {}
function testNoAssertionIsServedAnonymously() returns error? {
    http:Response response = check assertionTestClient->get("/whoami");
    test:assertEquals(response.statusCode, 200);
    json body = check response.getJsonPayload();
    test:assertEquals(check body.authenticated, false);
}
