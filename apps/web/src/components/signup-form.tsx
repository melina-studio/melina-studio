"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";

interface SignupFormProps extends React.ComponentProps<"form"> {
  onSwitchToLogin?: () => void;
}

export function SignupForm({
  className,
  onSwitchToLogin,
  ...props
}: SignupFormProps) {
  const { signup, googleLogin } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function validatePasswords(pwd: string, confirmPwd: string) {
    if (confirmPwd && pwd !== confirmPwd) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPassword(value);
    if (confirmPassword) {
      validatePasswords(value, confirmPassword);
    }
  }

  function handleConfirmPasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value) {
      validatePasswords(password, value);
    } else {
      setPasswordMismatch(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;
    const confirmPasswordValue = formData.get("confirmPassword") as string;

    if (passwordValue !== confirmPasswordValue) {
      setPasswordMismatch(true);
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      await signup({ firstName, lastName, email, password: passwordValue });
      toast.success("Account created successfully!");
      router.push("/playground/all");
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    try {
      setIsSubmitting(true);
      await googleLogin();
    } catch (err: any) {
      toast.error(err.message || "Failed to create account with Google");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup className="gap-3">
        <div className="flex flex-col items-center gap-1 text-center mb-2">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your details below to create your account
          </p>
        </div>
        <div className="flex gap-3">
          <Field className="gap-1.5 flex-1">
            <FieldLabel htmlFor="firstName">First Name</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              required
            />
          </Field>
          <Field className="gap-1.5 flex-1">
            <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Doe"
              required
            />
          </Field>
        </div>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            name="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
          />
          {passwordMismatch && <FieldError>Passwords do not match</FieldError>}
        </Field>
        <Field className="mb-3 mt-1">
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field className="gap-2 mt-3">
          <Button
            variant="outline"
            type="button"
            className="cursor-pointer"
            onClick={handleGoogleSignup}
          >
            <Image
              src="/icons/google.svg"
              alt="Google"
              width={16}
              height={16}
              className="size-[16px]"
            />
            Sign up with Google
          </Button>
          <Button variant="outline" type="button" className="cursor-pointer">
            <Image
              src="/icons/github.svg"
              alt="GitHub"
              width={16}
              height={16}
              className="size-[16px]"
            />
            Sign up with GitHub
          </Button>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline underline-offset-4 hover:text-primary cursor-pointer"
            >
              Login
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
