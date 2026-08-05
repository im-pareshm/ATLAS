"use client";

import Image from "next/image";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(130% 90% at 50% -10%, var(--color-mint-tint) 0%, var(--color-ground) 55%)",
      }}
    >
      <div className="w-full max-w-[400px] animate-fade-up text-center">
        <div className="mb-[22px] inline-flex items-center gap-[9px]">
          <Image
            src="/brand-icon.png"
            alt="ATLAS"
            width={34}
            height={34}
            className="h-[34px] w-[34px] rounded-[10px] object-cover shadow-[0_8px_20px_-8px_#4f7c6baa]"
          />
          <span className="text-[22px] font-extrabold tracking-[-.02em]">
            ATLAS
          </span>
        </div>

        <h1 className="mb-2 text-[27px] font-extrabold tracking-[-.02em]">
          Your month, in one view
        </h1>
        <p className="mb-[26px] text-[15px] leading-[1.5] text-secondary">
          Plan what&apos;s due, tick off what&apos;s paid, and always know the
          cash left.
        </p>

        <form
          action={action}
          data-testid="login-form"
          className="rounded-[18px] bg-card p-[26px_24px] text-left shadow-login"
        >
          <label className="mb-[6px] block text-[12.5px] font-semibold text-secondary">
            Email
          </label>
          <input
            data-testid="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue=""
            className="mb-[15px] w-full rounded-[11px] border border-inputborder bg-inputbg p-[12px_13px] text-[15px] outline-none"
          />

          <label className="mb-[6px] block text-[12.5px] font-semibold text-secondary">
            Password
          </label>
          <input
            data-testid="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
            className="mb-[20px] w-full rounded-[11px] border border-inputborder bg-inputbg p-[12px_13px] text-[15px] outline-none placeholder:text-faint2"
          />

          {state.error ? (
            <p
              data-testid="login-error"
              className="mb-3 text-[13px] font-medium text-clay"
            >
              {state.error}
            </p>
          ) : null}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={pending}
            className="w-full rounded-[11px] bg-teal p-[13px] text-[15px] font-bold text-white shadow-[0_8px_18px_-8px_#4f7c6bcc] transition-colors hover:bg-teal-hover disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-[14px] text-[13px] text-faint2">
          Single user - sign in with your seeded credentials
        </p>
      </div>
    </div>
  );
}
