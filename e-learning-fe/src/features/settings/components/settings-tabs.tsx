"use client";

import { useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";

import { AccountSettingsSection } from "./account-settings-section";
import { AppearanceSettingsSection } from "./appearance-settings-section";
import { SecuritySettingsSection } from "./security-settings-section";

const tabs = [
  { id: "account", label: "Account" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
] as const;

type SettingsTab = (typeof tabs)[number]["id"];

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const { accessToken, replaceAccessToken } = useAuth();

  return (
    <div>
      <div className="border-b border-border">
        <nav className="flex gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative -mb-px px-0 pb-3 text-sm transition-colors
                  after:absolute after:left-0 after:-bottom-px after:w-full after:transition-all
                  ${
                    isActive
                      ? "font-bold text-foreground after:h-1 after:bg-foreground"
                      : "font-medium text-muted-foreground after:h-0.5 after:bg-transparent hover:text-foreground hover:after:bg-muted-foreground"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === "account" ? <AccountSettingsSection /> : null}

        {activeTab === "security" && accessToken ? (
          <SecuritySettingsSection
            accessToken={accessToken}
            onAccessTokenChanged={replaceAccessToken}
          />
        ) : null}

        {activeTab === "appearance" ? <AppearanceSettingsSection /> : null}
      </div>
    </div>
  );
}
