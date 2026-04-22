import { DesktopRecommendedBanner } from "@/components/DesktopRecommendedBanner"

export default function GameDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="container mx-auto px-4 sm:px-6">
        <DesktopRecommendedBanner />
      </div>
    </>
  )
}
