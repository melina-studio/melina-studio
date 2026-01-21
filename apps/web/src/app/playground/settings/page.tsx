"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    SettingsSidebar,
    GeneralSettings,
    AIModelSettings,
    UsageSettings,
    AnalyticsSettings,
    MelinaMCPSettings,
    BillingSettings,
    AboutSettings,
} from "@/components/custom/Settings";
import type { SettingsSection } from "@/components/custom/Settings";

export default function Settings() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState<SettingsSection>("general");

    const renderContent = () => {
        switch (activeSection) {
            case "general":
                return <GeneralSettings />;
            case "melina":
                return <AIModelSettings />;
            case "usage":
                return <UsageSettings />;
            case "analytics":
                return <AnalyticsSettings />;
            case "melina-mcp":
                return <MelinaMCPSettings />;
            case "billing":
                return <BillingSettings />;
            case "about":
                return <AboutSettings />;
            default:
                return <GeneralSettings />;
        }
    };

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="shrink-0 px-4 pt-8 pb-6 lg:px-8 lg:pt-12">
                <div className="mx-auto max-w-5xl">
                    <div className="flex flex-col gap-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="w-fit -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>

                        <div className="flex flex-col gap-1">
                            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your workspace settings and preferences.
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-border mt-8" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden px-4 lg:px-8">
                <div className="mx-auto max-w-5xl h-full flex flex-col lg:flex-row gap-8 lg:gap-12 py-6">
                    {/* Sidebar - Fixed on desktop */}
                    <div className="shrink-0">
                        {/* Mobile horizontal tabs */}
                        <div className="flex lg:hidden overflow-x-auto pb-2 -mx-4 px-4 gap-2 scrollbar-hide">
                            <MobileTabButton
                                active={activeSection === "general"}
                                onClick={() => setActiveSection("general")}
                            >
                                General
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "melina"}
                                onClick={() => setActiveSection("melina")}
                            >
                                Melina
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "usage"}
                                onClick={() => setActiveSection("usage")}
                            >
                                Usage
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "analytics"}
                                onClick={() => setActiveSection("analytics")}
                            >
                                Analytics
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "melina-mcp"}
                                onClick={() => setActiveSection("melina-mcp")}
                            >
                                MCP
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "billing"}
                                onClick={() => setActiveSection("billing")}
                            >
                                Billing
                            </MobileTabButton>
                            <MobileTabButton
                                active={activeSection === "about"}
                                onClick={() => setActiveSection("about")}
                            >
                                About
                            </MobileTabButton>
                        </div>

                        {/* Desktop sidebar */}
                        <div className="hidden lg:block">
                            <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 min-w-0 overflow-y-auto pb-8">
                        <div className="bg-card rounded-xl border border-border/50 p-6 lg:p-8 shadow-sm">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mobile tab button component
function MobileTabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer
        ${active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }
      `}
        >
            {children}
        </button>
    );
}
