"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { requireUser } from "./shared";
import {
  UserSettingsData,
  defaultUserSettings,
  AiSettings,
  DisplaySettings,
} from "@/models/userSettings.model";

export const getUserSettings = async (): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!userSettings) {
      return {
        success: true,
        data: {
          userId: user.id,
          settings: defaultUserSettings,
        },
      };
    }

    const settings: UserSettingsData = JSON.parse(userSettings.settings);

    return {
      success: true,
      data: {
        userId: user.id,
        settings: {
          ...defaultUserSettings,
          ...settings,
        },
      },
    };
  } catch (error) {
    const msg = "Failed to fetch user settings.";
    return handleError(error, msg);
  }
};

export const updateUserSettings = async (
  settings: Partial<UserSettingsData>
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    let mergedSettings: UserSettingsData;

    if (existingSettings) {
      const currentSettings: UserSettingsData = JSON.parse(
        existingSettings.settings
      );
      mergedSettings = {
        ...defaultUserSettings,
        ...currentSettings,
        ...settings,
        ai: {
          ...defaultUserSettings.ai,
          ...currentSettings.ai,
          ...settings.ai,
        },
        display: {
          ...defaultUserSettings.display,
          ...currentSettings.display,
          ...settings.display,
        },
      };
    } else {
      mergedSettings = {
        ...defaultUserSettings,
        ...settings,
        ai: { ...defaultUserSettings.ai, ...settings.ai },
        display: { ...defaultUserSettings.display, ...settings.display },
      };
    }

    const userSettings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        settings: JSON.stringify(mergedSettings),
      },
      create: {
        userId: user.id,
        settings: JSON.stringify(mergedSettings),
      },
    });

    const parsedSettings: UserSettingsData = JSON.parse(userSettings.settings);

    return {
      success: true,
      data: {
        userId: user.id,
        settings: parsedSettings,
      },
    };
  } catch (error) {
    const msg = "Failed to update user settings.";
    return handleError(error, msg);
  }
};

export const updateAiSettings = async (
  aiSettings: AiSettings
): Promise<any | undefined> => {
  return updateUserSettings({ ai: aiSettings });
};

export const updateOpenAiCompatibleBaseUrl = async (
  baseUrl: string | null,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const existing = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    let merged: UserSettingsData;
    if (existing) {
      const current: UserSettingsData = JSON.parse(existing.settings);
      const nextAi = { ...defaultUserSettings.ai, ...current.ai } as AiSettings;
      if (baseUrl) {
        nextAi.openaiCompatibleBaseUrl = baseUrl;
      } else {
        delete (nextAi as unknown as Record<string, unknown>).openaiCompatibleBaseUrl;
      }
      merged = {
        ...defaultUserSettings,
        ...current,
        ai: nextAi,
        display: { ...defaultUserSettings.display, ...current.display },
      };
    } else {
      const nextAi: AiSettings = { ...defaultUserSettings.ai } as AiSettings;
      if (baseUrl) nextAi.openaiCompatibleBaseUrl = baseUrl;
      merged = { ...defaultUserSettings, ai: nextAi, display: { ...defaultUserSettings.display } };
    }
    const saved = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { settings: JSON.stringify(merged) },
      create: { userId: user.id, settings: JSON.stringify(merged) },
    });
    return { success: true, data: { userId: user.id, settings: JSON.parse(saved.settings) } };
  } catch (error) {
    const msg = "Failed to update OpenAI Compatible base URL.";
    return handleError(error, msg);
  }
};

export const updateDisplaySettings = async (
  displaySettings: DisplaySettings
): Promise<any | undefined> => {
  return updateUserSettings({ display: displaySettings });
};
