"use client"

import { Zap, Clock, Save, SkipForward } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const INFO_CARDS = [
  { icon: Clock, title: "Takes about 5 minutes", description: "We'll walk you through each section quickly" },
  { icon: Save, title: "Save progress anytime", description: "Your data is saved as you go — come back whenever" },
  { icon: SkipForward, title: "Skip optional steps", description: "Only the essentials are required to get started" },
]

export function StepWelcome() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 shadow-lg shadow-indigo-100">
          <Zap className="h-10 w-10 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to Fakturator</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
          Let&apos;s set up your workspace in a few minutes. We&apos;ll collect your company
          details, services, and preferences so everything is ready from day one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {INFO_CARDS.map((card) => (
          <Card key={card.title} className="border-slate-100">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <card.icon className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{card.title}</p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
