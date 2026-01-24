"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useRef } from "react";
import { SettingsSection, SettingsRow } from "./SettingsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Monitor,
  Mail,
  Calendar,
  CreditCard,
  Pencil,
  Camera,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export function GeneralSettings() {
  const { theme, setTheme } = useTheme();
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setEditedFirstName(user.first_name || "");
      setEditedLastName(user.last_name || "");
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  // Update user profile
  const updateUserProfile = async (data: {
    first_name?: string;
    last_name?: string;
    avatar?: File;
  }) => {
    const formData = new FormData();
    // Use !== undefined to allow empty strings if needed
    if (data.first_name !== undefined) formData.append("first_name", data.first_name);
    if (data.last_name !== undefined) formData.append("last_name", data.last_name);
    if (data.avatar) formData.append("avatar", data.avatar);

    console.log("Updating profile with:", {
      first_name: data.first_name,
      last_name: data.last_name,
      avatar: data.avatar?.name,
    });

    await updateUser(formData);
    // Don't call refreshUser - updateUser should handle user state
  };

  const handleSaveName = async () => {
    setIsSaving(true);
    try {
      // Include pending avatar if user selected one while editing
      await updateUserProfile({
        first_name: editedFirstName,
        last_name: editedLastName,
        avatar: pendingAvatarFile || undefined,
      });
      setPendingAvatarFile(null);
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedFirstName(user?.first_name || "");
    setEditedLastName(user?.last_name || "");
    setIsEditingName(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // If currently editing name, store file for later submission with name
      if (isEditingName) {
        setPendingAvatarFile(file);
      } else {
        // Upload avatar immediately if not editing name
        setIsSaving(true);
        try {
          await updateUserProfile({ avatar: file });
        } catch (error) {
          console.error("Failed to upload avatar:", error);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);

    // Also update localStorage settings for consistency
    try {
      const savedSettings = localStorage.getItem("settings");
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.theme = newTheme;
      localStorage.setItem("settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save theme to settings:", e);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSubscriptionBadge = (subscription?: string) => {
    switch (subscription) {
      case "pro":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Pro
          </Badge>
        );
      case "enterprise":
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
            Enterprise
          </Badge>
        );
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  if (!mounted) {
    return (
      <SettingsSection title="General" description="Manage your profile and preferences.">
        <SettingsRow label="Profile" description="Your account information.">
          <div className="h-16 w-full max-w-[300px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
        <SettingsRow label="Theme" description="Select your preferred color theme.">
          <div className="h-9 w-full max-w-[200px] bg-muted animate-pulse rounded-md" />
        </SettingsRow>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="General" description="Manage your profile and preferences.">
      {/* User Profile Section */}
      <SettingsRow label="Profile" description="Your account information.">
        <div className="flex items-center gap-4">
          {/* Avatar with upload capability */}
          <div className="relative group">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarPreview || undefined} alt={user?.first_name} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(user?.first_name, user?.last_name)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedFirstName}
                  onChange={(e) => setEditedFirstName(e.target.value)}
                  placeholder="First name"
                  className="h-8 w-24"
                />
                <Input
                  value={editedLastName}
                  onChange={(e) => setEditedLastName(e.target.value)}
                  placeholder="Last name"
                  className="h-8 w-24"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 cursor-pointer"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 cursor-pointer"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {user?.first_name} {user?.last_name}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
                {getSubscriptionBadge(user?.subscription)}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user?.email || "No email"}
            </div>
          </div>
        </div>
      </SettingsRow>

      {/* Account Details */}
      <SettingsRow label="Account Details" description="Additional account information.">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Member since {formatDate(user?.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span className="capitalize">{user?.subscription || "Free"} plan</span>
          </div>
        </div>
      </SettingsRow>

      {/* Theme Section */}
      <SettingsRow label="Theme" description="Select your preferred color theme.">
        <Select value={theme} onValueChange={handleThemeChange}>
          <SelectTrigger className="w-full max-w-[200px]">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </div>
            </SelectItem>
            <SelectItem value="system">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>System</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>
    </SettingsSection>
  );
}
