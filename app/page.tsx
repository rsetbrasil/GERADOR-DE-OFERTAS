"use client"

import { useState, useEffect, useRef } from "react"
import { OfferForm } from "@/components/offer-form"
import { OfferCard } from "@/components/offer-card"
import type { Offer } from "@/lib/types"
import { Tag, Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/firebase"
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, writeBatch } from "firebase/firestore"

export default function Home() {
  const { toast } = useToast()
  const [offers, setOffers] = useState<Offer[]>([])
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const hasMigratedRef = useRef(false)

  const printA4Images = async (images: string[]) => {
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.setAttribute("aria-hidden", "true")
    document.body.appendChild(iframe)

    const printDoc = iframe.contentDocument
    if (!printDoc) {
      document.body.removeChild(iframe)
      return
    }

    printDoc.open()
    printDoc.write("<!doctype html><html><head><meta charset='utf-8'><title>Impressão A4</title></head><body></body></html>")
    printDoc.close()

    const style = printDoc.createElement("style")
    style.textContent = `
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: white; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      img { width: 210mm; height: 297mm; display: block; page-break-after: always; }
      img:last-child { page-break-after: auto; }
    `
    printDoc.head.appendChild(style)

    const loadPromises: Promise<void>[] = []
    images.forEach((src) => {
      const img = printDoc.createElement("img")
      img.src = src
      loadPromises.push(
        new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        }),
      )
      printDoc.body.appendChild(img)
    })

    await Promise.all(loadPromises)
    await new Promise<void>((resolve) => setTimeout(resolve, 150))

    const win = iframe.contentWindow
    if (!win) {
      document.body.removeChild(iframe)
      return
    }

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    win.onafterprint = cleanup
    win.focus()
    win.print()

    setTimeout(cleanup, 10_000)
  }

  useEffect(() => {
    const userKey = "firebase-anon-user-id"
    const existingUserId = typeof localStorage !== "undefined" ? localStorage.getItem(userKey) : null
    const nextUserId =
      existingUserId ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

    if (!existingUserId && typeof localStorage !== "undefined") {
      localStorage.setItem(userKey, nextUserId)
    }
    setUserId(nextUserId)
  }, [])

  useEffect(() => {
    const offersQuery = query(collection(db, "offers"))

    const unsubscribe = onSnapshot(
      offersQuery,
      (snapshot) => {
        const remoteOffers: Offer[] = snapshot.docs
          .map((d) => {
            const data = d.data() as Omit<Offer, "id">
            return { ...data, id: d.id }
          })
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

        setOffers(remoteOffers)
      },
      (error) => {
        console.error("Erro ao ouvir ofertas do Firebase:", error)
      },
    )

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId || hasMigratedRef.current) return
    hasMigratedRef.current = true

    const migrateFromUserCollection = async () => {
      try {
        const oldSnapshot = await getDocs(collection(db, "users", userId, "offers"))
        if (oldSnapshot.empty) return

        const batch = writeBatch(db)
        oldSnapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data() as Omit<Offer, "id">
          batch.set(doc(db, "offers", docSnapshot.id), data)
        })
        await batch.commit()
      } catch (error) {
        console.error("Erro ao migrar ofertas antigas do usuário:", error)
      }
    }

    const importDefaultList = async (force = false) => {
      try {
        if (!force) {
          const snapshot = await getDocs(collection(db, "offers"))
          if (!snapshot.empty) return
        }

        const { productsList } = await import("@/lib/products-data")
        const lines = productsList.trim().split("\n")
        const offers: Offer[] = []
        let inferredUnit = "UND"

        const inferUnitFromHeader = (header: string, currentUnit: string) => {
          if (/\bCAIXA\b/i.test(header)) return "CX"
          if (/\bLATAS\b/i.test(header)) return "PCT"
          if (/\bFARDO\b/i.test(header)) return "FARDO"
          return currentUnit
        }

        const parsePrice = (text: string) => {
          const match = text.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d+)?)/)
          return match?.[1] ?? null
        }

        lines.forEach((line, index) => {
          const trimmedLine = line.trim()
          if (!trimmedLine) return

          if (!trimmedLine.includes("R$")) {
            inferredUnit = inferUnitFromHeader(trimmedLine, inferredUnit)
            return
          }

          if (trimmedLine.includes("—") && trimmedLine.includes("R$")) {
            const parts = trimmedLine.split("—").map((p) => p.trim())
            if (parts.length >= 2) {
              const productName = parts[0]
              const price = parsePrice(parts[1])

              if (price) {
                offers.push({
                  id: `${Date.now()}-${index}`,
                  productName: productName,
                  price,
                  unit: inferredUnit,
                  createdAt: new Date().toISOString(),
                })
              }
            }
          }
        })

        if (offers.length > 0) {
          toast({
             title: "Iniciando importação...",
             description: `Preparando ${offers.length} produtos para importação.`,
          })
          
          const chunkSize = 10
          const chunks = []
          for (let i = 0; i < offers.length; i += chunkSize) {
            chunks.push(offers.slice(i, i + chunkSize))
          }

          let importedCount = 0
          for (const chunk of chunks) {
            const batch = writeBatch(db)
            chunk.forEach((offer) => {
              batch.set(doc(db, "offers", offer.id), offer)
            })
            await batch.commit()
            importedCount += chunk.length
            // Increased delay to 500ms to avoid rate limiting and connection issues
            await new Promise((resolve) => setTimeout(resolve, 500))
          }

          toast({
            title: "Lista importada!",
            description: `${importedCount} produtos foram adicionados ao banco de dados.`,
          })
        }
      } catch (error) {
        console.error("Erro ao importar lista padrão:", error)
        toast({
          title: "Erro na importação",
          description: "Ocorreu um erro ao tentar importar os produtos. Verifique o console.",
          variant: "destructive",
        })
      }
    }

    void migrateFromUserCollection()
    void importDefaultList()
    // Expose for manual triggering if needed (temporary)
    // @ts-ignore
    window.forceImportProducts = () => importDefaultList(true)
  }, [userId, toast])

  const handleManualImport = async () => {
    // @ts-ignore
    if (window.forceImportProducts) {
       // @ts-ignore
       await window.forceImportProducts()
    }
  }

  const handleAddOffer = (offer: Offer) => {
    setOffers((prev) => [offer, ...prev])
    void setDoc(doc(db, "offers", offer.id), offer, { merge: true }).catch(() => {
      toast({
        title: "Falha ao salvar no Firebase",
        description: "Sua oferta foi salva localmente, mas não sincronizou.",
        variant: "destructive",
      })
    })
  }

  const handleAddMultipleOffers = (newOffers: Offer[]) => {
    setOffers((prev) => [...newOffers, ...prev])
    const batch = writeBatch(db)
    newOffers.forEach((offer) => {
      batch.set(doc(db, "offers", offer.id), offer, { merge: true })
    })
    void batch.commit().catch(() => {
      toast({
        title: "Falha ao salvar no Firebase",
        description: "As ofertas foram salvas localmente, mas não sincronizaram.",
        variant: "destructive",
      })
    })
  }

  const handleDeleteOffer = (id: string) => {
    setOffers((prev) => prev.filter((offer) => offer.id !== id))
    setSelectedOffers((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    void deleteDoc(doc(db, "offers", id)).catch(() => {
      toast({
        title: "Falha ao remover no Firebase",
        description: "A oferta foi removida localmente, mas não sincronizou.",
        variant: "destructive",
      })
    })
  }

  const handleUpdateOffer = (updated: Offer) => {
    setOffers((prev) => prev.map((offer) => (offer.id === updated.id ? updated : offer)))
    void setDoc(doc(db, "offers", updated.id), updated, { merge: true }).catch(() => {
      toast({
        title: "Falha ao atualizar no Firebase",
        description: "A oferta foi atualizada localmente, mas não sincronizou.",
        variant: "destructive",
      })
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

  const filteredOffers = offers.filter((offer) => {
    if (!searchTerm.trim()) return true
    const query = searchTerm.toLowerCase()
    return (
      offer.productName.toLowerCase().includes(query) ||
      offer.unit.toLowerCase().includes(query) ||
      offer.price.toLowerCase().includes(query) ||
      (offer.extraText ? offer.extraText.toLowerCase().includes(query) : false)
    )
  })

  const selectAllOffers = () => {
    const source = searchTerm.trim() ? filteredOffers : offers
    setSelectedOffers(new Set(source.map((offer) => offer.id)))
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

      const container = document.createElement("div")
      container.style.width = "210mm"
      container.style.minHeight = "297mm"
      container.style.background = "white"
      container.style.display = "flex"
      container.style.flexDirection = "column"
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.padding = "24px"
      document.body.appendChild(container)

      const createSlot = () => {
        const slot = document.createElement("div")
        slot.style.flex = "1"
        slot.style.display = "flex"
        slot.style.alignItems = "center"
        slot.style.justifyContent = "center"
        slot.style.width = "100%"
        return slot
      }

      const appendBadge = (offer: Offer, slot: HTMLDivElement) => {
        const badgeElement = document.getElementById(`offer-badge-${offer.id}`)
        if (!badgeElement) return
        const scale = 1.35
        const clone = badgeElement.cloneNode(true) as HTMLElement
        clone.id = `offer-badge-${offer.id}-page-${pageIndex}`
        clone.style.width = `${100 / scale}%`
        clone.style.height = `${100 / scale}%`
        clone.style.display = "flex"
        clone.style.alignItems = "center"
        clone.style.justifyContent = "center"
        clone.style.transform = `scale(${scale})`
        clone.style.transformOrigin = "center"
        slot.appendChild(clone)
      }

      const top = createSlot()
      appendBadge(pageOffers[0], top)
      container.appendChild(top)

      const divider = document.createElement("div")
      divider.style.borderTop = "2px dashed #ccc"
      divider.style.margin = "24px 0"
      container.appendChild(divider)

      const bottom = createSlot()
      if (pageOffers[1]) appendBadge(pageOffers[1], bottom)
      container.appendChild(bottom)

      // Generate image
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
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

  const handlePrintSelected = async () => {
    if (selectedOffers.size === 0) {
      toast({
        title: "Nenhuma oferta selecionada",
        description: "Selecione pelo menos uma oferta para imprimir.",
        variant: "destructive",
      })
      return
    }

    const selectedOffersList = offers.filter((offer) => selectedOffers.has(offer.id))
    const pages: Offer[][] = []
    for (let i = 0; i < selectedOffersList.length; i += 2) {
      pages.push(selectedOffersList.slice(i, i + 2))
    }

    toast({
      title: "Preparando impressão...",
      description: `Renderizando ${pages.length} página(s) A4...`,
    })

    const images: string[] = []

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageOffers = pages[pageIndex]

      const container = document.createElement("div")
      container.style.width = "210mm"
      container.style.minHeight = "297mm"
      container.style.background = "white"
      container.style.display = "flex"
      container.style.flexDirection = "column"
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.padding = "24px"
      document.body.appendChild(container)

      const createSlot = () => {
        const slot = document.createElement("div")
        slot.style.flex = "1"
        slot.style.display = "flex"
        slot.style.alignItems = "center"
        slot.style.justifyContent = "center"
        slot.style.width = "100%"
        return slot
      }

      const appendBadge = (offer: Offer, slot: HTMLDivElement) => {
        const badgeElement = document.getElementById(`offer-badge-${offer.id}`)
        if (!badgeElement) return
        const scale = 1.35
        const clone = badgeElement.cloneNode(true) as HTMLElement
        clone.id = `offer-badge-${offer.id}-print-${pageIndex}`
        clone.style.width = `${100 / scale}%`
        clone.style.height = `${100 / scale}%`
        clone.style.display = "flex"
        clone.style.alignItems = "center"
        clone.style.justifyContent = "center"
        clone.style.transform = `scale(${scale})`
        clone.style.transformOrigin = "center"
        slot.appendChild(clone)
      }

      const top = createSlot()
      appendBadge(pageOffers[0], top)
      container.appendChild(top)

      const divider = document.createElement("div")
      divider.style.borderTop = "2px dashed #ccc"
      divider.style.margin = "24px 0"
      container.appendChild(divider)

      const bottom = createSlot()
      if (pageOffers[1]) appendBadge(pageOffers[1], bottom)
      container.appendChild(bottom)

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
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

      images.push(canvas.toDataURL("image/png"))
      document.body.removeChild(container)
    }

    await printA4Images(images)
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
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Suas Ofertas</h2>
                <p className="text-sm text-gray-600">
                  {offers.length} {offers.length === 1 ? "oferta criada" : "ofertas criadas"}
                  {selectedOffers.size > 0 && ` • ${selectedOffers.size} selecionada(s)`}
                </p>
              </div>

              {offers.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por produto, preço, texto..."
                      className="w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-red-500"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
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
                    <>
                      <Button size="sm" variant="outline" onClick={handlePrintSelected}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir A4 ({selectedOffers.size})
                      </Button>
                      <Button size="sm" onClick={handleDownloadSelected} className="bg-red-600 hover:bg-red-700">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar A4 ({selectedOffers.size})
                      </Button>
                    </>
                  )}
                </div>
                </div>
              )}
            </div>

            {offers.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/50 p-12 text-center">
                <Tag className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Nenhuma oferta ainda</h3>
                <p className="mt-2 text-sm text-gray-600">Crie sua primeira oferta usando o formulário ao lado</p>
                <Button variant="outline" className="mt-6" onClick={handleManualImport}>
                  Importar Lista Padrão de Produtos
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onDelete={handleDeleteOffer}
                    onUpdate={handleUpdateOffer}
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
