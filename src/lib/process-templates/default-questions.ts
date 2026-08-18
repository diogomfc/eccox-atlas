/**
 * Roteiro padrao de entrevista para um Processo, alinhado 1:1 as secoes 1-4 do
 * "Modelo de Processo POP ECCOX - V3.docx". A secao 5 (Desenho do Processo) nao
 * tem pergunta: e derivada automaticamente do grupo que contem a pergunta do
 * tipo STEPS (o Gatilho e os Passos), nao pelo nome do grupo — o gestor pode
 * renomear "Passos" livremente sem quebrar o desenho.
 *
 * Usado em dois lugares: no seed (aplica este roteiro aos processos importados
 * do catalogo V6) e na tela de novo processo (opcao "começar do modelo padrão").
 * Gestor pode editar, reordenar, renomear ou criar grupos novos depois.
 */

import type { QuestionInputKind } from "@/generated/prisma/client";

export interface DefaultQuestion {
  order: number;
  questionText: string;
  helperText?: string;
  inputKind: QuestionInputKind;
  placeholder?: string;
  required: boolean;
  /** Marca a fonte do desenho automático do fluxo (seção 5) — ver `ProcessQuestion.isFlowSource`. */
  isFlowSource?: boolean;
}

export interface DefaultSection {
  label: string;
  order: number;
  questions: DefaultQuestion[];
}

export const DEFAULT_PROCESS_SECTIONS: DefaultSection[] = [
  {
    label: "Objetivo",
    order: 1,
    questions: [
      {
        order: 1,
        questionText:
          "Em uma a três frases, o que este processo entrega e qual necessidade atende?",
        helperText: "Fale como explicaria para alguém que acabou de entrar na Eccox.",
        inputKind: "LONG_TEXT",
        placeholder:
          "Ex: Garante que toda solicitação de contrato seja analisada, aprovada por alçada e arquivada.",
        required: true,
      },
    ],
  },
  {
    label: "Responsável",
    order: 2,
    questions: [
      {
        order: 1,
        questionText: "Qual cargo é o dono deste processo?",
        helperText: "Cargo ou função, nunca o nome da pessoa. Um único dono.",
        inputKind: "TEXT",
        placeholder: "Ex: Coordenador Jurídico",
        required: true,
      },
      {
        order: 2,
        questionText: "Há executores de apoio, que atuam sob orientação do dono?",
        helperText:
          "Cargos que ajudam na execução, sem substituir a responsabilidade do dono. Deixe em branco se não houver.",
        inputKind: "LIST",
        placeholder: "Ex: Analista Jurídico Pleno",
        required: false,
      },
    ],
  },
  {
    label: "Ferramentas",
    order: 3,
    questions: [
      {
        order: 1,
        questionText: "Quais sistemas e ferramentas são usados hoje?",
        helperText:
          "A diretriz do projeto é manter as ferramentas atuais — liste o que realmente se usa.",
        inputKind: "LIST",
        placeholder: "Ex: Monday",
        required: true,
      },
    ],
  },
  {
    label: "Passos",
    order: 4,
    questions: [
      {
        order: 1,
        questionText: "O que faz este processo começar?",
        helperText:
          "Um pedido que chega, uma data do calendário, um alerta de sistema — vira o ponto de partida do desenho do processo.",
        inputKind: "TEXT",
        placeholder: "Ex: Chegada de solicitação no Monday",
        required: true,
      },
      {
        order: 2,
        questionText: "Descreva a sequência de execução, um passo por linha.",
        helperText:
          "Para cada passo: o que fazer, como fazer no detalhe, em que ferramenta e qual cargo executa.",
        inputKind: "STEPS",
        required: true,
        isFlowSource: true,
      },
    ],
  },
];
