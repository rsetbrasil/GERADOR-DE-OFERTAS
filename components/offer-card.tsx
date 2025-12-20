"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Offer } from "@/lib/types"
import { Check, Download, Pencil, Trash2, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useRef, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrencyInput } from "@/lib/utils"

interface OfferCardProps {
  offer: Offer
  onDelete: (id: string) => void
  onUpdate?: (offer: Offer) => void
  selected?: boolean
  onToggleSelect?: () => void
}

export function OfferBadge({ offer }: { offer: Offer }) {
  const sanitizedPrice = offer.price.replace(/[^\d,]/g, "")
  const [reais, centavos] = sanitizedPrice.split(",")

  return (
    <Card
      className="w-full rounded-3xl border-[10px] shadow-2xl py-0 gap-0 overflow-visible"
      style={{ backgroundColor: "#facc15", borderColor: "#facc15" }}
    >
      <div className="relative p-3">
        <div className="offer-badge absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[35%]">
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
                className="relative -top-[14px] inline-block translate-x-[10px] text-4xl font-black text-white tracking-widest leading-none"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
              >
                OFERTA
              </span>
            </div>
          </div>
        </div>

        <div
          className="border-[6px] rounded-2xl p-6 pt-8 min-h-[300px] flex flex-col items-center justify-center overflow-hidden"
          style={{ borderColor: "#dc2626", backgroundColor: "#facc15" }}
        >
          <div className="text-center mb-3 w-full">
            <h3 className="text-2xl font-black text-black uppercase leading-tight">{offer.productName}</h3>
          </div>

          <div className="flex items-end justify-center gap-2 w-full">
            <span className="text-4xl font-black text-black leading-none">R$</span>
            <span className="text-[104px] font-black text-black leading-none tracking-tighter">{reais || "0"}</span>
            <div className="flex flex-col items-start leading-none pb-2">
              <span className="text-4xl font-black text-black leading-none">,{centavos || "00"}</span>
              <span className="text-3xl font-black text-black leading-none mt-1">{offer.unit}</span>
            </div>
          </div>
          {offer.extraText && (
            <div className="mt-10 w-full text-center">
              <p className="text-2xl font-black text-black leading-tight uppercase">{offer.extraText}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function OfferCard({ offer, onDelete, onUpdate, selected = false, onToggleSelect }: OfferCardProps) {
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(offer.productName)
  const [draftPrice, setDraftPrice] = useState(offer.price)
  const [draftUnit, setDraftUnit] = useState(offer.unit)
  const [draftExtraText, setDraftExtraText] = useState(offer.extraText ?? "")

  useEffect(() => {
    if (isEditing) return
    setDraftName(offer.productName)
    setDraftPrice(offer.price)
    setDraftUnit(offer.unit)
    setDraftExtraText(offer.extraText ?? "")
  }, [isEditing, offer.extraText, offer.price, offer.productName, offer.unit])

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const root = clonedDoc.documentElement
          root.style.setProperty("--background", "#ffffff")
          root.style.setProperty("--foreground", "#111827")
          root.style.setProperty("--card", "#ffffff")
          root.style.setProperty("--card-foreground", "#111827")
          root.style.setProperty("--popover", "#ffffff")
          root.style.setProperty("--popover-foreground", "#111827")
          root.style.setProperty("--primary", "#dc2626")
          root.style.setProperty("--primary-foreground", "#ffffff")
          root.style.setProperty("--secondary", "#fde68a")
          root.style.setProperty("--secondary-foreground", "#111827")
          root.style.setProperty("--muted", "#f3f4f6")
          root.style.setProperty("--muted-foreground", "#6b7280")
          root.style.setProperty("--accent", "#fde68a")
          root.style.setProperty("--accent-foreground", "#111827")
          root.style.setProperty("--destructive", "#ef4444")
          root.style.setProperty("--destructive-foreground", "#ffffff")
          root.style.setProperty("--border", "#e5e7eb")
          root.style.setProperty("--input", "#e5e7eb")
          root.style.setProperty("--ring", "#dc2626")
        },
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

  const handleStartEdit = () => {
    setDraftName(offer.productName)
    setDraftPrice(offer.price)
    setDraftUnit(offer.unit)
    setDraftExtraText(offer.extraText ?? "")
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setDraftName(offer.productName)
    setDraftPrice(offer.price)
    setDraftUnit(offer.unit)
    setDraftExtraText(offer.extraText ?? "")
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    const nextName = draftName.trim()
    const nextPrice = draftPrice.trim()
    const nextUnit = draftUnit.trim()
    const nextExtraText = draftExtraText.trim()

    if (!nextName || !nextPrice || !nextUnit) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, preço e unidade.",
        variant: "destructive",
      })
      return
    }

    const updatedOffer: Offer = {
      ...offer,
      productName: nextName,
      price: nextPrice,
      unit: nextUnit,
    }

    if (nextExtraText) {
      updatedOffer.extraText = nextExtraText
    } else {
      delete (updatedOffer as any).extraText
    }

    onUpdate?.(updatedOffer)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="fixed -left-[9999px] top-0">
          <div id={`offer-badge-${offer.id}`}>
            <OfferBadge offer={offer} />
          </div>
        </div>

        <div
          id={`offer-${offer.id}`}
          ref={cardRef}
          className="bg-white p-6 w-full transition-all"
          style={{
            boxShadow: selected ? "0 0 0 4px #ef4444, 0 0 0 6px #ffffff" : undefined,
          }}
        >
          <OfferBadge offer={offer} />
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

      {onUpdate && (
        <div className="rounded-md border-2 border-gray-200 bg-white p-3">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="border-2 border-gray-300 font-bold"
              />
              <Input
                value={draftExtraText}
                onChange={(e) => setDraftExtraText(e.target.value)}
                placeholder="Texto opcional abaixo do preço"
                className="border-2 border-gray-300 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-gray-700">R$</div>
                  <Input
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(formatCurrencyInput(e.target.value))}
                    className="border-2 border-gray-300"
                  />
                </div>
                <select
                  value={draftUnit}
                  onChange={(e) => setDraftUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="UND">UND</option>
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="PCT">PCT</option>
                  <option value="CX">CX</option>
                  <option value="FARDO">FARDO</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">
                  <Check className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" className="font-bold">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleStartEdit} variant="outline" className="w-full font-bold">
              <Pencil className="mr-2 h-4 w-4" />
              Editar (nome, preço, und)
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          Baixar
        </Button>
        <Button onClick={handleDelete} variant="destructive" size="lg" className="font-bold">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
