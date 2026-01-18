"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

interface LoginFormProps extends React.ComponentProps<"form"> {
  onSwitchToSignup?: () => void;
}

export function LoginForm({
  className,
  onSwitchToSignup,
  ...props
}: LoginFormProps) {
  const { login, googleLogin, githubLogin } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success("Logged in successfully!");
      router.push("/playground/all");
    } catch (err: any) {
      toast.error(err.message || "Failed to login");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    setLoadingProvider("google");
    // Small delay to allow React to re-render before navigation
    setTimeout(() => {
      googleLogin();
    }, 50);
  }

  function handleGithubLogin() {
    setLoadingProvider("github");
    // Small delay to allow React to re-render before navigation
    setTimeout(() => {
      githubLogin();
    }, 50);
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>
        <Field>
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            className="cursor-pointer"
            onClick={handleGoogleLogin}
            disabled={loadingProvider !== null}
          >
            <Image
              src="/icons/google.svg"
              alt="Google"
              width={16}
              height={16}
              className="size-[16px]"
            />
            {loadingProvider === "google" ? "Redirecting..." : "Login with Google"}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="cursor-pointer"
            onClick={handleGithubLogin}
            disabled={loadingProvider !== null}
          >
            <Image
              src="/icons/github.svg"
              alt="GitHub"
              width={16}
              height={16}
              className="size-[16px]"
            />
            {loadingProvider === "github" ? "Redirecting..." : "Login with GitHub"}
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="underline underline-offset-4 hover:text-primary cursor-pointer"
            >
              Sign up
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
