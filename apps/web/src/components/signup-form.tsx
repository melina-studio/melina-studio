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

interface SignupFormProps extends React.ComponentProps<"form"> {
  onSwitchToLogin?: () => void;
}

export function SignupForm({
  className,
  onSwitchToLogin,
  ...props
}: SignupFormProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    console.log(name, email, password);
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
        <Field className="gap-1.5">
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input id="signup-password" type="password" required />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            required
          />
        </Field>
        <Field className="mb-3 mt-1">
          <Button type="submit" className="cursor-pointer">
            Sign up
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field className="gap-2 mt-3">
          <Button variant="outline" type="button" className="cursor-pointer">
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
