"use client"

import { useState, useEffect } from "react"
import { OfferForm } from "@/components/offer-form"
import { OfferCard } from "@/components/offer-card"
import type { Offer } from "@/lib/types"
import { Tag, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const { toast } = useToast()
  const [offers, setOffers] = useState<Offer[]>([])
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set())

  useEffect(() => {
    const savedOffers = localStorage.getItem("promotional-offers")
    if (savedOffers) {
      try {
        const parsed = JSON.parse(savedOffers)
        setOffers(parsed)
      } catch (error) {
        console.error("Erro ao carregar ofertas salvas:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (offers.length > 0) {
      localStorage.setItem("promotional-offers", JSON.stringify(offers))
    } else {
      localStorage.removeItem("promotional-offers")
    }
  }, [offers])

  const handleAddOffer = (offer: Offer) => {
    setOffers((prev) => [offer, ...prev])
  }

  const handleAddMultipleOffers = (newOffers: Offer[]) => {
    setOffers((prev) => [...newOffers, ...prev])
  }

  const handleDeleteOffer = (id: string) => {
    setOffers((prev) => prev.filter((offer) => offer.id !== id))
    setSelectedOffers((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const toggleOfferSelection = (id: string) => {
    setSelectedOffers((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAllOffers = () => {
    setSelectedOffers(new Set(offers.map((offer) => offer.id)))
  }

  const clearAllSelections = () => {
    setSelectedOffers(new Set())
  }

  const handleDownloadSelected = async () => {
    if (selectedOffers.size === 0) {
      toast({
        title: "Nenhuma oferta selecionada",
        description: "Selecione pelo menos uma oferta para baixar.",
        variant: "destructive",
      })
      return
    }

    const selectedOffersList = offers.filter((offer) => selectedOffers.has(offer.id))

    // Group offers in pairs for A4 pages
    const pages: Offer[][] = []
    for (let i = 0; i < selectedOffersList.length; i += 2) {
      pages.push(selectedOffersList.slice(i, i + 2))
    }

    toast({
      title: "Gerando PDF...",
      description: `Processando ${pages.length} página(s) A4...`,
    })

    // Generate each A4 page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageOffers = pages[pageIndex]

      // Create temporary container for the A4 page
      const container = document.createElement("div")
      container.style.width = "210mm"
      container.style.minHeight = "297mm"
      container.style.background = "white"
      container.style.display = "flex"
      container.style.flexDirection = "column"
      container.style.position = "absolute"
      container.style.left = "-9999px"
      document.body.appendChild(container)

      // Add each offer to the page
      for (const offer of pageOffers) {
        const offerElement = document.getElementById(`offer-${offer.id}`)
        if (offerElement) {
          const clone = offerElement.cloneNode(true) as HTMLElement
          clone.style.flex = "1"
          clone.style.display = "flex"
          clone.style.justifyContent = "center"
          clone.style.alignItems = "center"
          container.appendChild(clone)
        }
      }

      // If only one offer, add divider
      if (pageOffers.length === 1) {
        const divider = document.createElement("div")
        divider.style.flex = "1"
        divider.style.borderTop = "2px dashed #ccc"
        container.appendChild(divider)
      } else {
        // Add divider between two offers
        const firstOffer = container.children[0] as HTMLElement
        firstOffer.style.borderBottom = "2px dashed #ccc"
      }

      // Generate image
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      })

      // Download
      const link = document.createElement("a")
      link.download = `ofertas-a4-pagina-${pageIndex + 1}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()

      // Cleanup
      document.body.removeChild(container)
    }

    toast({
      title: "Download concluído!",
      description: `${pages.length} página(s) A4 baixada(s) com sucesso.`,
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <header className="border-b-4 border-red-600 bg-gradient-to-r from-red-600 to-red-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 shadow-lg">
              <Tag className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white text-balance">GERADOR DE OFERTAS</h1>
              <p className="text-sm font-semibold text-yellow-300">Crie cartazes promocionais impactantes!</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Formulário */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <OfferForm onAddOffer={handleAddOffer} onAddMultipleOffers={handleAddMultipleOffers} />
          </div>

          {/* Grid de cartazes */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Suas Ofertas</h2>
                <p className="text-sm text-gray-600">
                  {offers.length} {offers.length === 1 ? "oferta criada" : "ofertas criadas"}
                  {selectedOffers.size > 0 && ` • ${selectedOffers.size} selecionada(s)`}
                </p>
              </div>

              {offers.length > 0 && (
                <div className="flex gap-2">
                  {selectedOffers.size === offers.length ? (
                    <Button variant="outline" size="sm" onClick={clearAllSelections}>
                      Desmarcar todas
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={selectAllOffers}>
                      Selecionar todas
                    </Button>
                  )}
                  {selectedOffers.size > 0 && (
                    <Button size="sm" onClick={handleDownloadSelected} className="bg-red-600 hover:bg-red-700">
                      <Download className="mr-2 h-4 w-4" />
                      Baixar A4 ({selectedOffers.size})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {offers.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-12 text-center">
                <Tag className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhuma oferta ainda</h3>
                <p className="mt-2 text-sm text-gray-600">Crie sua primeira oferta usando o formulário ao lado</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onDelete={handleDeleteOffer}
                    selected={selectedOffers.has(offer.id)}
                    onToggleSelect={() => toggleOfferSelection(offer.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
