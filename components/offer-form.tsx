"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Offer } from "@/lib/types"
import { Plus, Upload, FileText, Check } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

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
  })
  const [importMode, setImportMode] = useState(false)
  const [importText, setImportText] = useState("")
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([])

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

    const newOffer: Offer = {
      id: Date.now().toString(),
      productName: formData.productName,
      price: formData.price,
      unit: formData.unit,
      createdAt: new Date().toISOString(),
    }

    onAddOffer(newOffer)

    // Reset form
    setFormData({
      productName: "",
      price: "",
      unit: "UND",
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
    let errors = 0

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      if (!trimmedLine) return

      // Detecta o formato da lista de bebidas: "BEATS GT — R$ 135,90"
      if (trimmedLine.includes("—") && trimmedLine.includes("R$")) {
        const parts = trimmedLine.split("—").map((p) => p.trim())
        if (parts.length >= 2) {
          const productName = parts[0]
          const priceMatch = parts[1].match(/R\$\s*(\d+[,.]?\d*)/)

          if (priceMatch && priceMatch[1]) {
            products.push({
              productName: productName,
              price: priceMatch[1],
              unit: "UND",
              selected: true, // Selected by default
            })
          } else {
            errors++
          }
        } else {
          errors++
        }
      } else {
        // Formato original: "Nome do Produto; Preço; Unidade"
        const parts = trimmedLine.split(/[;,]/).map((p) => p.trim())

        if (parts.length >= 2) {
          products.push({
            productName: parts[0],
            price: parts[1],
            unit: parts[2] || "UND",
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
        description: `${products.length} produtos encontrados${errors > 0 ? ` (${errors} linhas ignoradas)` : ""}. Selecione quais deseja criar.`,
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

    toast({
      title: "Ofertas criadas!",
      description: `${offers.length} cartazes foram criados com sucesso.`,
    })
  }

  const handleCancelImport = () => {
    setImportedProducts([])
    setImportText("")
  }

  return (
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
              setImportedProducts([])
              setImportText("")
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
            {importedProducts.length === 0 ? (
              <>
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
                    Suporta formato "PRODUTO — R$ PREÇO" ou "Produto; Preço; Unidade". Uma oferta por linha.
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
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-bold text-gray-900">
                      Selecione os produtos ({importedProducts.filter((p) => p.selected).length}/
                      {importedProducts.length})
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={toggleAllSelections}>
                      <Check className="mr-1 h-4 w-4" />
                      {importedProducts.every((p) => p.selected) ? "Desmarcar todos" : "Marcar todos"}
                    </Button>
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
                        <label
                          htmlFor={`product-${index}`}
                          className="flex-1 cursor-pointer space-y-1 text-sm leading-none"
                        >
                          <div className="font-bold text-gray-900">{product.productName}</div>
                          <div className="text-gray-600">
                            R$ {product.price} / {product.unit}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelImport}
                    className="flex-1 bg-transparent"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateFromSelected}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                    size="lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Criar Selecionados
                  </Button>
                </div>
              </>
            )}
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
                </select>
              </div>
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Criar Cartaz
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
