import { ConfigResult, ModelRole } from "@continuedev/config-yaml";

import { AutocompleteInput } from "../autocomplete/util/types";
import { ProfileDescription } from "../config/ConfigHandler";
import { OrganizationDescription } from "../config/ProfileLifecycleManager";
import { SharedConfigSchema } from "../config/sharedConfig";

import { DevDataLogEvent } from "@continuedev/config-yaml";
import type {
  BrowserSerializedContinueConfig,
  ChatMessage,
  ContextItem,
  ContextItemWithId,
  ContextProviderWithParams,
  ContextSubmenuItem,
  DiffLine,
  DocsIndexingDetails,
  ExperimentalModelRoles,
  FileSymbolMap,
  IdeSettings,
  LLMFullCompletionOptions,
  ModelDescription,
  PromptLog,
  RangeInFile,
  SerializedContinueConfig,
  Session,
  SessionMetadata,
  SiteIndexingConfig,
  SlashCommandDescription,
  ToolCall,
} from "../";
import { GlobalContextModelSelections } from "../util/GlobalContext";

export type OnboardingModes = "Local" | "Best" | "Custom" | "Quickstart";

export interface ListHistoryOptions {
  offset?: number;
  limit?: number;
}

export type ToCoreFromIdeOrWebviewProtocol = {
  // Special
  ping: [string, string];
  abort: [undefined, void];

  // History
  "history/list": [ListHistoryOptions, SessionMetadata[]];
  "history/delete": [{ id: string }, void];
  "history/load": [{ id: string }, Session];
  "history/save": [Session, void];
  "devdata/log": [DevDataLogEvent, void];
  "config/addOpenAiKey": [string, void];
  "config/addModel": [
    {
      model: SerializedContinueConfig["models"][number];
      role?: keyof ExperimentalModelRoles;
    },
    void,
  ];
  "config/newPromptFile": [undefined, void];
  "config/ideSettingsUpdate": [IdeSettings, void];
  "config/getSerializedProfileInfo": [
    undefined,
    {
      result: ConfigResult<BrowserSerializedContinueConfig>;
      profileId: string | null;
    },
  ];
  "config/deleteModel": [{ title: string }, void];
  "config/addContextProvider": [ContextProviderWithParams, void];
  "config/reload": [undefined, ConfigResult<BrowserSerializedContinueConfig>];
  "config/listProfiles": [
    undefined,
    { profiles: ProfileDescription[] | null; selectedProfileId: string | null },
  ];
  "config/refreshProfiles": [undefined, void];
  "config/openProfile": [{ profileId: string | undefined }, void];
  "config/updateSharedConfig": [SharedConfigSchema, SharedConfigSchema];
  "config/updateSelectedModel": [
    {
      profileId: string;
      role: ModelRole;
      title: string | null;
    },
    GlobalContextModelSelections,
  ];
  "context/getContextItems": [
    {
      name: string;
      query: string;
      fullInput: string;
      selectedCode: RangeInFile[];
      selectedModelTitle: string;
    },
    ContextItemWithId[],
  ];
  "context/getSymbolsForFiles": [{ uris: string[] }, FileSymbolMap];
  "context/loadSubmenuItems": [{ title: string }, ContextSubmenuItem[]];
  "autocomplete/complete": [AutocompleteInput, string[]];
  "context/addDocs": [SiteIndexingConfig, void];
  "context/removeDocs": [Pick<SiteIndexingConfig, "startUrl">, void];
  "context/indexDocs": [{ reIndex: boolean }, void];
  "autocomplete/cancel": [undefined, void];
  "autocomplete/accept": [{ completionId: string }, void];
  "llm/complete": [
    {
      prompt: string;
      completionOptions: LLMFullCompletionOptions;
      title: string;
    },
    string,
  ];
  "llm/listModels": [{ title: string }, string[] | undefined];
  "llm/streamComplete": [
    {
      prompt: string;
      completionOptions: LLMFullCompletionOptions;
      title: string;
    },
    AsyncGenerator<string>,
  ];
  "llm/streamChat": [
    {
      messages: ChatMessage[];
      completionOptions: LLMFullCompletionOptions;
      title: string;
      legacySlashCommandData?: {
        command: SlashCommandDescription;
        input: string;
        contextItems: ContextItemWithId[];
        historyIndex: number;
        selectedCode: RangeInFile[];
      };
    },
    AsyncGenerator<ChatMessage, PromptLog>,
  ];
  streamDiffLines: [
    {
      prefix: string;
      highlighted: string;
      suffix: string;
      input: string;
      language: string | undefined;
      modelTitle: string | undefined;
    },
    AsyncGenerator<DiffLine>,
  ];
  "chatDescriber/describe": [
    {
      selectedModelTitle: string;
      text: string;
    },
    string | undefined,
  ];
  "stats/getTokensPerDay": [
    undefined,
    { day: string; promptTokens: number; generatedTokens: number }[],
  ];
  "stats/getTokensPerModel": [
    undefined,
    { model: string; promptTokens: number; generatedTokens: number }[],
  ];
  "tts/kill": [undefined, void];

  // Codebase indexing
  "index/setPaused": [boolean, void];
  "index/forceReIndex": [
    undefined | { dirs?: string[]; shouldClearIndexes?: boolean },
    void,
  ];
  "index/indexingProgressBarInitialized": [undefined, void];
  completeOnboarding: [
    {
      mode: OnboardingModes;
    },
    void,
  ];

  // File changes
  "files/changed": [{ uris?: string[] }, void];
  "files/opened": [{ uris?: string[] }, void];
  "files/created": [{ uris?: string[] }, void];
  "files/deleted": [{ uris?: string[] }, void];
  "files/closed": [{ uris?: string[] }, void];

  // Docs etc. Indexing. TODO move codebase to this
  "indexing/reindex": [{ type: string; id: string }, void];
  "indexing/abort": [{ type: string; id: string }, void];
  "indexing/setPaused": [{ type: string; id: string; paused: boolean }, void];
  "docs/getSuggestedDocs": [undefined, void];
  "docs/initStatuses": [undefined, void];
  "docs/getDetails": [{ startUrl: string }, DocsIndexingDetails];
  addAutocompleteModel: [{ model: ModelDescription }, void];

  "auth/getAuthUrl": [{ useOnboarding: boolean }, { url: string }];
  "tools/call": [
    { toolCall: ToolCall; selectedModelTitle: string },
    { contextItems: ContextItem[] },
  ];
  "clipboardCache/add": [{ content: string }, void];
  "controlPlane/openUrl": [{ path: string; orgSlug: string | undefined }, void];
  "controlPlane/listOrganizations": [undefined, OrganizationDescription[]];
};
