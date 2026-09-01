import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFlashcard } from "@/lib/flashcards/service";
import type { Flashcard } from "@/lib/flashcards/types";

const COMMON_SUBJECTS = [
  "Direito Tributário",
  "Legislação Tributária",
  "Direito Constitucional",
  "Direito Administrativo",
  "Contabilidade Geral",
  "Auditoria Fiscal",
  "Raciocínio Lógico-Matemático",
  "Direito Financeiro",
];

interface CreateFlashcardDialogProps {
  onCardCreated: (card: Flashcard) => void;
  defaultSubject?: string;
  defaultLawTagId?: string;
  defaultErrorEntryId?: string;
  triggerBtn?: React.ReactNode;
}

export function CreateFlashcardDialog({
  onCardCreated,
  defaultSubject,
  defaultLawTagId,
  defaultErrorEntryId,
  triggerBtn,
}: CreateFlashcardDialogProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject || "Direito Tributário");
  const [customSubject, setCustomSubject] = useState("");
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [lawTagId, setLawTagId] = useState(defaultLawTagId || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontContent.trim() || !backContent.trim()) return;

    const finalSubject = subject === "outros" ? customSubject || "Geral" : subject;

    const newCard = createFlashcard({
      frontContent,
      backContent,
      subject: finalSubject,
      lawTagId: lawTagId.trim() || undefined,
      errorEntryId: defaultErrorEntryId,
    });

    onCardCreated(newCard);
    setFrontContent("");
    setBackContent("");
    setLawTagId("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerBtn || (
          <Button className="gap-2" id="create-flashcard-trigger">
            <Plus className="h-4 w-4" />
            Novo Flashcard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Novo Flashcard de Alta Retenção</DialogTitle>
          <DialogDescription>
            Crie um cartão de estudo espaçado para memorizar conceitos chave, prazos ou lei seca.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fc-subject">Matéria</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="fc-subject">
                <SelectValue placeholder="Selecione a matéria" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value="outros">+ Outra Matéria</SelectItem>
              </SelectContent>
            </Select>

            {subject === "outros" && (
              <Input
                placeholder="Digite o nome da matéria"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                className="mt-2"
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fc-front">Frente (Pergunta / Gatilho Mental)</Label>
            <Textarea
              id="fc-front"
              placeholder="Ex.: Qual a alíquota máxima do ITCMD segundo a Resolução do Senado nº 9/1992?"
              rows={3}
              value={frontContent}
              onChange={(e) => setFrontContent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fc-back">Verso (Resposta / Fundamento Legal)</Label>
            <Textarea
              id="fc-back"
              placeholder="Ex.: 8% (oito por cento), conforme fixa a Resolução SF nº 9/92 nos termos do art. 155, § 1º, IV da CF/88."
              rows={4}
              value={backContent}
              onChange={(e) => setBackContent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fc-lawtag">LawTag / Vínculo com Legislação (Opcional)</Label>
            <Input
              id="fc-lawtag"
              placeholder="Ex.: ctn-art-150 ou cf88-art-155"
              value={lawTagId}
              onChange={(e) => setLawTagId(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!frontContent.trim() || !backContent.trim()}>
              Criar Flashcard
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
