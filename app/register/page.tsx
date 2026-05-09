import { RegisterForm } from "@/components/register-form"

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-4 px-4 sm:py-2">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  )
}
