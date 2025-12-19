"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Offer } from "@/lib/types"
import { Plus, Upload, FileText, Check, Download, Printer } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { OfferBadge } from "@/components/offer-card"

const IMPORT_DRAFT_STORAGE_KEY = "import-draft-products"

interface OfferFormProps {
  onAddOffer: (offer: Offer) => void
  onAddMultipleOffers: (offers: Offer[]) => void
}

interface ImportedProduct {
  productName: string
  price: string
  unit: string
  selected: boolean
}

export function OfferForm({ onAddOffer, onAddMultipleOffers }: OfferFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    productName: "",
    price: "",
    unit: "UND",
    extraText: "",
  })
  const [importMode, setImportMode] = useState(false)
  const [importText, setImportText] = useState("")
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(IMPORT_DRAFT_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as {
        importMode?: boolean
        importText?: string
        importedProducts?: ImportedProduct[]
      }

      if (typeof parsed.importText === "string") setImportText(parsed.importText)
      if (Array.isArray(parsed.importedProducts)) setImportedProducts(parsed.importedProducts)

      const hasDraft =
        (typeof parsed.importText === "string" && parsed.importText.trim().length > 0) ||
        (Array.isArray(parsed.importedProducts) && parsed.importedProducts.length > 0)

      if (typeof parsed.importMode === "boolean") setImportMode(parsed.importMode)
      else if (hasDraft) setImportMode(true)
    } catch {
      localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const hasDraft = importText.trim().length > 0 || importedProducts.length > 0

    if (!hasDraft && !importMode) {
      localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY)
      window.dispatchEvent(new Event("import-draft-updated"))
      return
    }

    localStorage.setItem(
      IMPORT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        importMode,
        importText,
        importedProducts,
      }),
    )
    window.dispatchEvent(new Event("import-draft-updated"))
  }, [importMode, importText, importedProducts])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productName || !formData.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do produto e o preço.",
        variant: "destructive",
      })
      return
    }

    const extraText = formData.extraText.trim()

    const newOffer: Offer = {
      id: Date.now().toString(),
      productName: formData.productName,
      price: formData.price,
      unit: formData.unit,
      createdAt: new Date().toISOString(),
      ...(extraText ? { extraText } as Pick<Offer, "extraText"> : {}),
    }

    onAddOffer(newOffer)

    // Reset form
    setFormData({
      productName: "",
      price: "",
      unit: "UND",
      extraText: "",
    })

    toast({
      title: "Oferta criada!",
      description: "Seu cartaz promocional foi criado com sucesso.",
    })
  }

  const handleParseList = () => {
    if (!importText.trim()) {
      toast({
        title: "Lista vazia",
        description: "Cole ou digite a lista de produtos para importar.",
        variant: "destructive",
      })
      return
    }

    const lines = importText.trim().split("\n")
    const products: ImportedProduct[] = []
    let missingPrice = 0
    let errors = 0

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

    let inferredUnit = "UND"

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      if (!trimmedLine.includes("R$")) {
        inferredUnit = inferUnitFromHeader(trimmedLine, inferredUnit)
        return
      }

      // Detecta o formato da lista de bebidas: "BEATS GT — R$ 135,90"
      if (trimmedLine.includes("—") && trimmedLine.includes("R$")) {
        const parts = trimmedLine.split("—").map((p) => p.trim())
        if (parts.length >= 2) {
          const productName = parts[0]
          const price = parsePrice(parts[1])

          if (price) {
            products.push({
              productName: productName,
              price,
              unit: inferredUnit,
              selected: true, // Selected by default
            })
          } else {
            missingPrice++
          }
        } else {
          errors++
        }
      } else {
        // Formato original: "Nome do Produto; Preço; Unidade"
        const parts = trimmedLine.split(/[;,]/).map((p) => p.trim())

        if (parts.length >= 2) {
          const price = parts[1] || ""
          if (!price) {
            missingPrice++
            return
          }

          products.push({
            productName: parts[0],
            price,
            unit: parts[2] || inferredUnit,
            selected: true,
          })
        } else {
          errors++
        }
      }
    })

    if (products.length > 0) {
      setImportedProducts(products)
      toast({
        title: "Lista processada!",
        description: `${products.length} produtos encontrados${
          missingPrice > 0 || errors > 0 ? ` (${[missingPrice > 0 ? `${missingPrice} sem preço` : null, errors > 0 ? `${errors} inválidas` : null].filter(Boolean).join(", ")} ignoradas)` : ""
        }. Selecione quais deseja criar.`,
      })
    } else {
      toast({
        title: "Erro ao processar",
        description: "Nenhum produto válido foi encontrado.",
        variant: "destructive",
      })
    }
  }

  const toggleProductSelection = (index: number) => {
    setImportedProducts((prev) =>
      prev.map((product, i) => (i === index ? { ...product, selected: !product.selected } : product)),
    )
  }

  const toggleAllSelections = () => {
    const allSelected = importedProducts.every((p) => p.selected)
    setImportedProducts((prev) => prev.map((product) => ({ ...product, selected: !allSelected })))
  }

  const updateImportedProduct = (index: number, patch: Partial<ImportedProduct>) => {
    setImportedProducts((prev) => prev.map((product, i) => (i === index ? { ...product, ...patch } : product)))
  }

  const handleCreateFromSelected = () => {
    const selectedProducts = importedProducts.filter((p) => p.selected)

    if (selectedProducts.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione pelo menos um produto para criar ofertas.",
        variant: "destructive",
      })
      return
    }

    const offers: Offer[] = selectedProducts.map((product, index) => ({
      id: `${Date.now()}-${index}`,
      productName: product.productName,
      price: product.price,
      unit: product.unit,
      createdAt: new Date().toISOString(),
    }))

    onAddMultipleOffers(offers)
    setImportedProducts([])
    setImportText("")
    setImportMode(false)
    localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY)
    window.dispatchEvent(new Event("import-draft-updated"))

    toast({
      title: "Ofertas criadas!",
      description: `${offers.length} cartazes foram criados com sucesso.`,
    })
  }

  const handleCancelImport = () => {
    setImportedProducts([])
    setImportText("")
    setImportMode(false)
    localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY)
    window.dispatchEvent(new Event("import-draft-updated"))
  }

  const handleDownloadImportedA4 = async () => {
    const selectedIndices: number[] = []
    importedProducts.forEach((p, index) => {
      if (p.selected) selectedIndices.push(index)
    })

    if (selectedIndices.length !== 2) {
      toast({
        title: "Selecione 2 produtos",
        description: "Selecione exatamente 2 produtos para imprimir em uma folha A4.",
        variant: "destructive",
      })
      return
    }

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

    const appendBadgeByIndex = (index: number, slot: HTMLDivElement) => {
      const badgeElement = document.getElementById(`imported-badge-${index}`)
      if (!badgeElement) return
      const scale = 1.35
      const clone = badgeElement.cloneNode(true) as HTMLElement
      clone.id = `imported-badge-${index}-print`
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
    appendBadgeByIndex(selectedIndices[0], top)
    container.appendChild(top)

    const divider = document.createElement("div")
    divider.style.borderTop = "2px dashed #ccc"
    divider.style.margin = "24px 0"
    container.appendChild(divider)

    const bottom = createSlot()
    appendBadgeByIndex(selectedIndices[1], bottom)
    container.appendChild(bottom)

    try {
      const html2canvas = (await import("html2canvas")).default
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

      const link = document.createElement("a")
      link.download = "importados-a4.png"
      link.href = canvas.toDataURL("image/png")
      link.click()
    } finally {
      document.body.removeChild(container)
    }
  }

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

  const handlePrintImportedA4 = async () => {
    const selectedIndices: number[] = []
    importedProducts.forEach((p, index) => {
      if (p.selected) selectedIndices.push(index)
    })

    if (selectedIndices.length !== 2) {
      toast({
        title: "Selecione 2 produtos",
        description: "Selecione exatamente 2 produtos para imprimir em uma folha A4.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Preparando impressão...",
      description: "Renderizando 1 página A4...",
    })

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

    const appendBadgeByIndex = (index: number, slot: HTMLDivElement) => {
      const badgeElement = document.getElementById(`imported-badge-${index}`)
      if (!badgeElement) return
      const scale = 1.35
      const clone = badgeElement.cloneNode(true) as HTMLElement
      clone.id = `imported-badge-${index}-print`
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
    appendBadgeByIndex(selectedIndices[0], top)
    container.appendChild(top)

    const divider = document.createElement("div")
    divider.style.borderTop = "2px dashed #ccc"
    divider.style.margin = "24px 0"
    container.appendChild(divider)

    const bottom = createSlot()
    appendBadgeByIndex(selectedIndices[1], bottom)
    container.appendChild(bottom)

    let src = ""
    try {
      const html2canvas = (await import("html2canvas")).default
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
      src = canvas.toDataURL("image/png")
    } finally {
      document.body.removeChild(container)
    }
    await printA4Images([src])
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-red-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-700">
          <CardTitle className="flex items-center gap-2 text-white">
            {importMode ? <FileText className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {importMode ? "Importar Lista" : "Nova Oferta"}
          </CardTitle>
          <CardDescription className="text-yellow-200">
            {importMode
              ? "Cole sua lista e selecione os produtos para criar ofertas"
              : "Preencha os dados para criar um cartaz promocional"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-2">
            <Button
              type="button"
              variant={!importMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setImportMode(false)
              }}
              className={!importMode ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Plus className="mr-1 h-4 w-4" />
              Individual
            </Button>
            <Button
              type="button"
              variant={importMode ? "default" : "outline"}
              size="sm"
              onClick={() => setImportMode(true)}
              className={importMode ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <Upload className="mr-1 h-4 w-4" />
              Importar Lista
            </Button>
          </div>

          {importMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="importText" className="text-base font-bold text-gray-900">
                  Cole sua lista aqui
                </Label>
                <Textarea
                  id="importText"
                  placeholder="Formato: Produto; Preço; Unidade&#10;Exemplo:&#10;Arroz Tipo 1; 4,99; KG&#10;Feijão Preto; 7,50; KG&#10;&#10;Ou formato:&#10;PRODUTO — R$ PREÇO&#10;BEATS GT — R$ 135,90&#10;CORONA EXTRA — R$ 149,90"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[200px] border-2 border-gray-300 font-mono text-sm"
                />
                <p className="text-xs text-gray-600">
                  Suporta formato &quot;PRODUTO — R$ PREÇO&quot; ou &quot;Produto; Preço; Unidade&quot;. Uma oferta por
                  linha.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleParseList}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                size="lg"
              >
                <Upload className="mr-2 h-5 w-5" />
                Processar Lista
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-base font-bold text-gray-900">
                  Nome do Produto *
                </Label>
                <Input
                  id="productName"
                  placeholder="Ex: Refrigerante Coca-Cola 2L"
                  value={formData.productName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, productName: e.target.value }))}
                  className="border-2 border-gray-300 text-lg"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-base font-bold text-gray-900">
                    Preço *
                  </Label>
                  <Input
                    id="price"
                    placeholder="9,99"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="border-2 border-gray-300 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-base font-bold text-gray-900">
                    Unidade
                  </Label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="flex h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="UND">UND</option>
                    <option value="KG">KG</option>
                    <option value="L">L</option>
                    <option value="PCT">PCT</option>
                    <option value="CX">CX</option>
                    <option value="FARDO">FARDO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extraText" className="text-base font-bold text-gray-900">
                  Texto opcional abaixo do preço
                </Label>
                <Input
                  id="extraText"
                  placeholder="Ex: À vista, no cartão, oferta válida até..."
                  value={formData.extraText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, extraText: e.target.value }))}
                  className="border-2 border-gray-300 text-lg"
                />
              </div>

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Criar Cartaz
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {importedProducts.length > 0 && (
        <Card className="border-2 border-gray-200 bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Produtos importados</CardTitle>
                <CardDescription>
                  {importedProducts.filter((p) => p.selected).length}/{importedProducts.length} selecionados
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={toggleAllSelections}>
                <Check className="mr-1 h-4 w-4" />
                {importedProducts.every((p) => p.selected) ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="fixed -left-[9999px] top-0">
              {importedProducts.map((product, index) => {
                const offer: Offer = {
                  id: `imported-${index}`,
                  productName: product.productName,
                  price: product.price,
                  unit: product.unit,
                  createdAt: new Date().toISOString(),
                }
                return (
                  <div key={index} id={`imported-badge-${index}`}>
                    <OfferBadge offer={offer} />
                  </div>
                )
              })}
            </div>

            <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-md border-2 border-gray-300 p-3">
              {importedProducts.map((product, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-md border-2 p-3 transition-colors ${
                    product.selected ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <Checkbox
                    id={`product-${index}`}
                    checked={product.selected}
                    onCheckedChange={() => toggleProductSelection(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      id={`product-name-${index}`}
                      value={product.productName}
                      onChange={(e) => updateImportedProduct(index, { productName: e.target.value })}
                      className="border-2 border-gray-300 font-bold"
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-gray-700">R$</div>
                        <Input
                          id={`product-price-${index}`}
                          value={product.price}
                          onChange={(e) => updateImportedProduct(index, { price: e.target.value })}
                          className="border-2 border-gray-300"
                        />
                      </div>

                      <select
                        id={`product-unit-${index}`}
                        value={product.unit}
                        onChange={(e) => updateImportedProduct(index, { unit: e.target.value })}
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
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleDownloadImportedA4}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar A4 (2)
              </Button>
              <Button type="button" variant="outline" onClick={handlePrintImportedA4} size="lg">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir A4 (2)
              </Button>
              <Button type="button" variant="outline" onClick={handleCancelImport} className="bg-transparent" size="lg">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateFromSelected}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Selecionados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
