"use client";
import { LoginForm } from "@/components/login-form";
import { WhySaiServerPromo } from "@/components/why-sai-server-promo";
export default function LoginPage() {
    return (<div id="login-page" className="flex flex-1 items-center justify-center py-4 px-4 sm:py-2">
      <div id="login-page-grid" className="grid w-full max-w-md grid-cols-[minmax(0,1fr)] items-stretch gap-6 lg:max-w-6xl lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-10">
        <div id="login-page-form">
          <LoginForm />
        </div>
        <WhySaiServerPromo />
      </div>
    </div>);
}
