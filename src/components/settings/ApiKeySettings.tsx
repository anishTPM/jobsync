"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { toastSuccess, toastError } from "@/lib/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Loader2, Plus, Trash2, CheckCircle, XCircle, RefreshCw, Link2 } from "lucide-react";
import {
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  getDefaultOllamaBaseUrl,
} from "@/actions/apiKey.actions";
import { getUserSettings, updateOpenAiCompatibleBaseUrl } from "@/actions/userSettings.actions";
import type {
  ApiKeyClientResponse,
  ApiKeyProvider,
} from "@/models/apiKey.model";
import { getAiProviders } from "@/lib/ai/provider-registry";
import { AiProvider } from "@/models/ai.model";
import { checkOllamaConnection } from "@/utils/ai.utils";

interface ProviderConfig {
  id: ApiKeyProvider;
  name: string;
  placeholder: string;
  inputType: "password" | "text";
  description: string;
  sensitive: boolean;
  requiresBaseUrl?: boolean;
  baseUrlDisplayName?: string;
}

const PROVIDERS: ProviderConfig[] = getAiProviders().map((entry) => ({
  id: entry.id as ApiKeyProvider,
  name: entry.displayName,
  placeholder: entry.keyConfig.placeholder,
  inputType: entry.keyConfig.inputType,
  description: entry.keyConfig.description,
  sensitive: entry.keyConfig.sensitive,
  requiresBaseUrl: (entry as { requiresBaseUrl?: boolean }).requiresBaseUrl,
  baseUrlDisplayName: `Base URL for ${entry.displayName}`,
}));

function ApiKeySettings() {
  const [keys, setKeys] = useState<ApiKeyClientResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultOllamaUrl, setDefaultOllamaUrl] = useState(
    "http://127.0.0.1:11434",
  );
  const [editingProvider, setEditingProvider] = useState<ApiKeyProvider | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  // OpenAI Compatible dual-credential state
  const [compatibleBaseUrl, setCompatibleBaseUrl] = useState<string>("");
  const [editingCompatibleUrl, setEditingCompatibleUrl] = useState(false);
  const [compatibleUrlInput, setCompatibleUrlInput] = useState("");
  const [savingCompatibleUrl, setSavingCompatibleUrl] = useState(false);
  const [deletingCompatibleUrl, setDeletingCompatibleUrl] = useState(false);

  const recheckOllamaConnection = async () => {
    setOllamaChecking(true);
    const result = await checkOllamaConnection(AiProvider.OLLAMA);
    setOllamaConnected(result.isConnected);
    setOllamaChecking(false);
  };

  useEffect(() => {
    fetchKeys();
    getDefaultOllamaBaseUrl().then(setDefaultOllamaUrl);
    recheckOllamaConnection();
    fetchCompatibleBaseUrl();
  }, []);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const result = await getUserApiKeys();
      if (result.success && result.data) {
        setKeys(result.data);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompatibleBaseUrl = async () => {
    try {
      const result = await getUserSettings();
      if (result.success && result.data?.settings?.ai?.openaiCompatibleBaseUrl) {
        setCompatibleBaseUrl(result.data.settings.ai.openaiCompatibleBaseUrl);
      } else {
        setCompatibleBaseUrl("");
      }
    } catch {
      setCompatibleBaseUrl("");
    }
  };

  const handleSaveCompatibleBaseUrl = async () => {
    const url = compatibleUrlInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toastError("Please enter a valid URL (e.g. https://api.example.com/v1).");
      return;
    }
    setSavingCompatibleUrl(true);
    try {
      const result = await updateOpenAiCompatibleBaseUrl(url);
      if (result?.success !== false) {
        setCompatibleBaseUrl(url);
        setEditingCompatibleUrl(false);
        setCompatibleUrlInput("");
        toastSuccess("Base URL saved.", "Saved!");
      } else {
        toastError(result?.message || "Failed to save base URL");
      }
    } catch (error) {
      console.error(error);
      toastError("Failed to save base URL");
    } finally {
      setSavingCompatibleUrl(false);
    }
  };

  const handleDeleteCompatibleBaseUrl = async () => {
    setDeletingCompatibleUrl(true);
    try {
      const result = await updateOpenAiCompatibleBaseUrl(null);
      if (result?.success !== false) {
        setCompatibleBaseUrl("");
        toastSuccess("Base URL removed.", "Deleted");
      } else {
        toastError(result?.message || "Could not clear Base URL — please set it to an empty value manually.");
      }
    } catch {
      toastError("Failed to delete base URL");
    } finally {
      setDeletingCompatibleUrl(false);
    }
  };

  const getKeyForProvider = (provider: ApiKeyProvider) =>
    keys.find((k) => k.provider === provider);

  const isBaseUrlProvider = (providerId: string) => {
    const entry = getAiProviders().find((e) => e.id === providerId);
    return entry?.credentialType === "base-url";
  };

  const handleVerifyAndSave = async (provider: ApiKeyProvider) => {
    if (!inputValue.trim()) return;

    setVerifying(true);
    try {
      const body: Record<string, string> = { provider, key: inputValue };
      if (provider === "openai-compatible" && compatibleBaseUrl.trim()) {
        body.baseUrl = compatibleBaseUrl.trim();
      } else if (provider === "openai-compatible") {
        // Try UserSettings baseUrl before verify so the verifier can use it
        try {
          const s = await getUserSettings();
          const url = s?.data?.settings?.ai?.openaiCompatibleBaseUrl;
          if (url) body.baseUrl = String(url);
        } catch {
          // ignore
        }
      }
      const verifyRes = await fetch("/api/settings/api-keys/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        toastError(verifyData.error || "Could not verify the key", "Verification failed");
        return;
      }

      const providerConfig = PROVIDERS.find((p) => p.id === provider);
      const saveResult = await saveApiKey({
        provider,
        key: inputValue,
        sensitive: providerConfig?.sensitive ?? true,
      });
      if (saveResult.success) {
        toastSuccess(`${PROVIDERS.find((p) => p.id === provider)?.name} key verified and saved.`, "API key saved");
        setEditingProvider(null);
        setInputValue("");
        await fetchKeys();
      } else {
        toastError(saveResult.message || "Failed to save API key", "Save failed");
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toastError("An unexpected error occurred");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async (provider: ApiKeyProvider) => {
    setDeleting(provider);
    try {
      const result = await deleteApiKey(provider);
      if (result.success) {
        toastSuccess(`${PROVIDERS.find((p) => p.id === provider)?.name} key removed.`, "API key deleted");
        await fetchKeys();
      } else {
        toastError(result.message || "Failed to delete API key");
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = () => {
    setEditingProvider(null);
    setInputValue("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for AI providers and external services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading keys...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Manage your API keys for AI providers and external services. Keys are
          encrypted and stored securely.
        </p>
      </div>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => {
          const existingKey = getKeyForProvider(provider.id);
          const isEditing = editingProvider === provider.id;
          const isBaseUrl = isBaseUrlProvider(provider.id);
          const isCompatible = provider.id === "openai-compatible";

          return (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {provider.description}
                      {isBaseUrl && (
                        <span className="block text-xs text-muted-foreground/70 mt-0.5">
                          Default: {provider.id === "ollama" ? defaultOllamaUrl : provider.placeholder}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {!isCompatible ? (
                    existingKey ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {provider.sensitive
                          ? `····${existingKey.last4}`
                          : existingKey.displayValue || existingKey.last4}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not configured</Badge>
                    )
                  ) : (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      <Badge variant={existingKey ? "default" : "secondary"} className={existingKey ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : undefined}>
                        {existingKey ? <><CheckCircle className="h-3 w-3 mr-1" />Key ····{existingKey.last4}</> : "Key not set"}
                      </Badge>
                      <Badge variant={compatibleBaseUrl ? "default" : "secondary"} className={compatibleBaseUrl ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900" : undefined}>
                        {compatibleBaseUrl ? <><Link2 className="h-3 w-3 mr-1" />Base URL set</> : "Base URL not set"}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              {provider.id === "ollama" && (
                <div className="px-6 pb-3">
                  <div className="flex items-center gap-2">
                    {ollamaChecking ? (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Checking...</span>
                      </div>
                    ) : ollamaConnected === true ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Ollama is running</span>
                      </div>
                    ) : ollamaConnected === false ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Ollama is not running</span>
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={recheckOllamaConnection}
                      disabled={ollamaChecking}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${ollamaChecking ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              )}
              <CardContent>
                {isCompatible ? (
                  <div className="space-y-4">
                    {/* Base URL row */}
                    <div className={editingCompatibleUrl ? "space-y-3 rounded-md border p-3" : ""}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm">Base URL</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {compatibleBaseUrl || "Not set — e.g. https://api.example.com/v1"}
                          </p>
                        </div>
                        {!editingCompatibleUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingCompatibleUrl(true);
                              setCompatibleUrlInput(compatibleBaseUrl || "");
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {compatibleBaseUrl ? "Update Base URL" : "Add base URL"}
                          </Button>
                        )}
                      </div>
                      {editingCompatibleUrl && (
                        <>
                          <Input
                            id="key-openai-compatible-baseurl"
                            type="text"
                            placeholder="https://api.example.com/v1"
                            value={compatibleUrlInput}
                            onChange={(e) => setCompatibleUrlInput(e.target.value)}
                            className="mt-2"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={handleSaveCompatibleBaseUrl}
                              disabled={!compatibleUrlInput.trim() || savingCompatibleUrl}
                            >
                              {savingCompatibleUrl && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCompatibleUrl(false);
                                setCompatibleUrlInput("");
                              }}
                            >
                              Cancel
                            </Button>
                            {compatibleBaseUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto text-destructive hover:text-destructive"
                                onClick={handleDeleteCompatibleBaseUrl}
                                disabled={deletingCompatibleUrl}
                              >
                                {deletingCompatibleUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* API Key row */}
                    {isEditing ? (
                      <div className="space-y-3 rounded-md border p-3">
                        <div>
                          <Label htmlFor={`key-${provider.id}`}>API Key</Label>
                          <Input
                            id={`key-${provider.id}`}
                            type={provider.inputType}
                            placeholder={provider.placeholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerifyAndSave(provider.id)}
                            disabled={!inputValue.trim() || verifying}
                          >
                            {verifying && (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            )}
                            Verify & Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProvider(provider.id);
                            setInputValue("");
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {existingKey ? "Update Key" : "Add Key"}
                        </Button>
                        {existingKey && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === provider.id}
                              >
                                {deleting === provider.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete your{" "}
                                  {provider.name} key? The system will fall back to
                                  the server environment variable if available.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(provider.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                ) : isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`key-${provider.id}`}>
                        {isBaseUrl ? "Base URL" : "API Key"}
                      </Label>
                      <Input
                        id={`key-${provider.id}`}
                        type={provider.inputType}
                        placeholder={
                          isBaseUrl && provider.id === "ollama"
                            ? defaultOllamaUrl
                            : provider.placeholder
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleVerifyAndSave(provider.id)}
                        disabled={!inputValue.trim() || verifying}
                      >
                        {verifying && (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        )}
                        Verify & Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProvider(provider.id);
                        setInputValue("");
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {existingKey ? "Update Key" : "Add Key"}
                    </Button>
                    {existingKey && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={deleting === provider.id}
                          >
                            {deleting === provider.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete your{" "}
                              {provider.name} key? The system will fall back to
                              the server environment variable if available.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(provider.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ApiKeySettings;
