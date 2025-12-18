"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Offer } from "@/lib/types"
import { Download, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"

interface OfferCardProps {
  offer: Offer
  onDelete: (id: string) => void
  selected?: boolean
  onToggleSelect?: () => void
}

export function OfferCard({ offer, onDelete, selected = false, onToggleSelect }: OfferCardProps) {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
      })

      const link = document.createElement("a")
      link.download = `oferta-${offer.productName.replace(/\s+/g, "-").toLowerCase()}.png`
      link.href = canvas.toDataURL()
      link.click()

      toast({
        title: "Download realizado!",
        description: "Seu cartaz foi salvo com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar o cartaz.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = () => {
    onDelete(offer.id)
    toast({
      title: "Oferta excluída",
      description: "O cartaz foi removido.",
    })
  }

  const [reais, centavos] = offer.price.split(",")

  const OfferBadge = () => (
    <Card className="overflow-hidden border-8 border-yellow-400 bg-yellow-400 shadow-2xl rounded-3xl w-full">
      <div className="relative">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-3">
          <div className="relative">
            <svg width="240" height="80" viewBox="0 0 280 100" className="drop-shadow-lg">
              <path
                d="M 20 10 L 260 10 L 280 50 L 260 90 L 20 90 L 40 50 Z"
                fill="#DC2626"
                stroke="#B91C1C"
                strokeWidth="3"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-3xl font-black text-white tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
              >
                OFERTA
              </span>
            </div>
          </div>
        </div>

        <div className="border-4 border-red-600 bg-yellow-400 rounded-2xl p-6 pt-14 min-h-[260px] flex flex-col items-center justify-center">
          <div className="text-center mb-4">
            <h3 className="text-xl font-black text-black uppercase leading-tight">{offer.productName}</h3>
          </div>

          <div className="flex items-start justify-center gap-1">
            <span className="text-3xl font-black text-black mt-2">R$</span>
            <span className="text-[100px] font-black text-black leading-none tracking-tighter">{reais || "0"}</span>
            <div className="flex flex-col items-start mt-2">
              <span className="text-4xl font-black text-black leading-none">,{centavos || "00"}</span>
              <span className="text-3xl font-black text-black leading-none mt-1">{offer.unit}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          id={`offer-${offer.id}`}
          ref={cardRef}
          className={`bg-white p-8 w-full transition-all ${selected ? "ring-4 ring-red-500 ring-offset-2" : ""}`}
          style={{ aspectRatio: "210/297" }}
        >
          <div className="flex flex-col gap-8 h-full">
            <div className="flex-1">
              <OfferBadge />
            </div>
            <div className="border-t-2 border-dashed border-gray-400" />
            <div className="flex-1">
              <OfferBadge />
            </div>
          </div>
        </div>

        {onToggleSelect && (
          <div className="absolute top-4 right-4 z-20">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-colors ${
                selected ? "bg-red-600 border-red-600" : "bg-white border-gray-300"
              }`}
            >
              <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          Baixar A4
        </Button>
        <Button onClick={handleDelete} variant="destructive" size="lg" className="font-bold">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
