import { Button, FieldError, Form, Input, Label, Link, TextField } from "@heroui/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import PageWrapper from "../components/PageWrapper";
import { useAuth } from "../lib/auth/AuthContext";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function () {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageWrapper>
      <div className="flex flex-col items-center gap-2 pt-8">
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="text-default-500 text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="text-sm">
            Sign up
          </Link>
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button variant="outline" fullWidth onPress={() => {}}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-default-200" />
          <span className="text-xs text-default-400">or</span>
          <div className="h-px flex-1 bg-default-200" />
        </div>

        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            name="email"
            type="email"
            isRequired
            value={email}
            onChange={setEmail}
            className="flex flex-col gap-1 w-full"
          >
            <Label className="text-sm font-medium">Email</Label>
            <Input placeholder="you@tamu.edu" className="w-full" />
            <FieldError className="text-xs" />
          </TextField>

          <TextField
            name="password"
            type="password"
            isRequired
            value={password}
            onChange={setPassword}
            className="flex flex-col gap-1 w-full"
          >
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Password</Label>
              <Link href="/forgot-password" className="text-xs">
                Forgot password?
              </Link>
            </div>
            <Input placeholder="••••••••" className="w-full" />
            <FieldError className="text-xs" />
          </TextField>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="submit" variant="primary" fullWidth isDisabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </Form>
      </div>
    </PageWrapper>
  );
}
