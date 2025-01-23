import * as fs from "fs";
import * as YAML from "yaml";
import {
  decodeSecretLocation,
  encodeSecretLocation,
  resolveSecretLocationInProxy,
} from "../dist";
import {
  clientRender,
  FQSN,
  FullSlug,
  PlatformClient,
  PlatformSecretStore,
  Registry,
  resolveFQSN,
  SecretLocation,
  SecretResult,
  SecretStore,
  SecretType,
  unrollAssistant,
} from "../src";
import exp = require("constants");

// Test e2e flows from raw yaml -> unroll -> client render -> resolve secrets on proxy
describe("E2E Scenarios", () => {
  const userSecrets: Record<string, string> = {
    OPENAI_API_KEY: "sk-123",
  };

  const packageSecrets: Record<string, string> = {
    "test-org/assistant/ANTHROPIC_API_KEY": "sk-ant",
    "test-org/models/GEMINI_API_KEY": "gemini-api-key",
  };

  const proxyEnvSecrets: Record<string, string> = {
    ANTHROPIC_API_KEY: "sk-ant-env",
    GEMINI_API_KEY: "gemini-api-key-env",
  };

  const localUserSecretStore: SecretStore = {
    get: async function (secretName: string): Promise<string | undefined> {
      return userSecrets[secretName];
    },
    set: function (secretName: string, secretValue: string): Promise<void> {
      throw new Error("Function not implemented.");
    },
  };

  const platformClient: PlatformClient = {
    resolveFQSNs: async function (
      fqsns: FQSN[],
    ): Promise<(SecretResult | undefined)[]> {
      return await Promise.all(
        fqsns.map((fqsn) =>
          resolveFQSN("test-user", fqsn, platformSecretStore),
        ),
      );
    },
  };

  const environmentSecretStore: SecretStore = {
    get: async function (secretName: string): Promise<string | undefined> {
      return proxyEnvSecrets[secretName];
    },
    set: function (secretName: string, secretValue: string): Promise<void> {
      throw new Error("Function not implemented.");
    },
  };

  const platformSecretStore: PlatformSecretStore = {
    getSecretFromSecretLocation: async function (
      secretLocation: SecretLocation,
    ): Promise<string | undefined> {
      if (secretLocation.secretType === SecretType.Package) {
        return packageSecrets[
          encodeSecretLocation(secretLocation).split(":")[1]
        ];
      } else if (secretLocation.secretType === SecretType.User) {
        return userSecrets[secretLocation.secretName];
      } else {
        return undefined;
      }
    },
  };

  const registry: Registry = {
    getContent: async function (fullSlug: FullSlug): Promise<string> {
      return fs
        .readFileSync(
          `./test/packages/${fullSlug.ownerSlug}/${fullSlug.packageSlug}.yaml`,
        )
        .toString();
    },
  };

  it("should correctly unroll assistant", async () => {
    const unrolledConfig = await unrollAssistant(
      "test-org/assistant",
      registry,
    );

    // Test that packages were correctly unrolled and params replaced
    expect(unrolledConfig.models?.length).toBe(4);
    expect(unrolledConfig.models?.[0].apiKey).toBe(
      "${{ secrets.test-org/assistant/OPENAI_API_KEY }}",
    );
    expect(unrolledConfig.models?.[1].apiKey).toBe("sk-456");
    expect(unrolledConfig.models?.[2].apiKey).toBe(
      "${{ secrets.test-org/assistant/test-org/models/ANTHROPIC_API_KEY }}",
    );
    expect(unrolledConfig.models?.[3].apiKey).toBe(
      "${{ secrets.test-org/assistant/test-org/models/GEMINI_API_KEY }}",
    );

    expect(unrolledConfig.rules?.length).toBe(3);
    expect(unrolledConfig.docs?.[0].startUrl).toBe(
      "https://docs.python.org/release/3.13.1",
    );

    const clientRendered = await clientRender(
      YAML.stringify(unrolledConfig),
      localUserSecretStore,
      platformClient,
    );

    // Test that user secrets were injected and others were changed to use proxy
    const anthropicSecretLocation =
      "package:test-org/assistant/ANTHROPIC_API_KEY";
    const geminiSecretLocation = "package:test-org/models/GEMINI_API_KEY";
    expect(clientRendered.models?.[0].apiKey).toBe("sk-123");
    expect(clientRendered.models?.[1].apiKey).toBe("sk-456");
    expect(clientRendered.models?.[2].provider).toBe("continue-proxy");
    expect((clientRendered.models?.[2] as any).apiKeyLocation).toBe(
      anthropicSecretLocation,
    );
    expect(clientRendered.models?.[2].apiKey).toBeUndefined();
    expect(clientRendered.models?.[3].provider).toBe("continue-proxy");
    expect((clientRendered.models?.[3] as any).apiKeyLocation).toBe(
      geminiSecretLocation,
    );
    expect(clientRendered.models?.[3].apiKey).toBeUndefined();

    // Test that proxy can correctly resolve secrets
    const decodedAnthropicSecretLocation = decodeSecretLocation(
      anthropicSecretLocation,
    );
    const decodedGeminiSecretLocation =
      decodeSecretLocation(geminiSecretLocation);

    // With environment
    const antSecretValue = await resolveSecretLocationInProxy(
      decodedAnthropicSecretLocation,
      platformSecretStore,
      environmentSecretStore,
    );
    expect(antSecretValue).toBe("sk-ant-env");
    const geminiSecretValue = await resolveSecretLocationInProxy(
      decodedGeminiSecretLocation,
      platformSecretStore,
      environmentSecretStore,
    );
    expect(geminiSecretValue).toBe("gemini-api-key-env");

    // Without environment
    const antSecretValue2 = await resolveSecretLocationInProxy(
      decodedAnthropicSecretLocation,
      platformSecretStore,
      undefined,
    );
    expect(antSecretValue2).toBe("sk-ant");
    const geminiSecretValue2 = await resolveSecretLocationInProxy(
      decodedGeminiSecretLocation,
      platformSecretStore,
      undefined,
    );
    expect(geminiSecretValue2).toBe("gemini-api-key");
  });
});
