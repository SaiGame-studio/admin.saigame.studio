import { RegisterForm } from "@/components/register-form"

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-2 px-4">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  )
}
