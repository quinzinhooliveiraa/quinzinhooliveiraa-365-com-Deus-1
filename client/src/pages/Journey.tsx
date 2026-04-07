import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronRight,
  LockKeyhole,
  Crown,
  Flame,
  CheckCircle2,
  Check,
  Clock,
  Target,
  Heart,
  Compass,
  Users,
  Brain,
  Sprout,
  Moon,
  Trophy,
  Sparkles,
  Smartphone,
  Briefcase,
  Shield,
  Zap,
  Calendar,
  Play,
  Eye,
  Footprints,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export interface JourneyDay {
  id: string;
  day: number;
  title: string;
  description: string;
  type: "reflexao" | "acao" | "escrita" | "meditacao" | "desafio" | "leitura" | "app";
  duration: string;
  appLink?: string;
}

export interface JourneyData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  totalDays: number;
  days: JourneyDay[];
  unlockAfter?: string;
  season?: string;
}

export const JOURNEYS: JourneyData[] = [
  {
    id: "autoconhecimento",
    title: "Quem Sou Eu?",
    subtitle: "30 dias de autoconhecimento",
    description: "Pare de viver no piloto automático. Descubra quem você é de verdade — sem filtros, sem expectativas.",
    icon: "brain",
    color: "violet",
    gradientFrom: "#7c3aed",
    gradientTo: "#a78bfa",
    totalDays: 30,
    season: "Temporada 1",
    days: [
      { id: "auto-1", day: 1, title: "O Piloto Automático", description: "Liste 5 coisas que você faz todo dia sem pensar. Para cada uma: é uma escolha sua ou um hábito herdado?", type: "reflexao", duration: "10 min" },
      { id: "auto-2", day: 2, title: "Quem Sou Sem Instagram?", description: "Se as redes sociais acabassem amanhã, o que sobraria da sua identidade? Escreva sem censura.", type: "escrita", duration: "15 min" },
      { id: "auto-3", day: 3, title: "Exercício do Espelho", description: "Olhe no espelho por 3 minutos em silêncio. Sem celular. O que você sente? O que aparece?", type: "meditacao", duration: "5 min" },
      { id: "auto-4", day: 4, title: "Vá às Perguntas", description: "Abra as Perguntas no app, tema Identidade. Responda 3 perguntas no seu diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "auto-5", day: 5, title: "A Máscara Social", description: "Qual versão de você aparece no trabalho? E com amigos? E com família? São todas você?", type: "reflexao", duration: "10 min" },
      { id: "auto-6", day: 6, title: "Carta à Criança Interior", description: "Escreva uma carta para o seu eu de 10 anos. O que diria? O que aquela criança precisa ouvir?", type: "escrita", duration: "15 min" },
      { id: "auto-7", day: 7, title: "Um Dia Sem Personagem", description: "Hoje, em pelo menos uma conversa, diga exatamente o que sente. Sem filtrar.", type: "desafio", duration: "dia todo" },
      { id: "auto-8", day: 8, title: "Valores vs. Realidade", description: "Liste seus 5 maiores valores. Agora olhe sua última semana: você viveu de acordo com eles?", type: "reflexao", duration: "10 min" },
      { id: "auto-9", day: 9, title: "Rótulos que Carrego", description: "Liste todos os rótulos que te deram: 'responsável', 'engraçado', 'forte'. Quais são seus e quais são dos outros?", type: "escrita", duration: "10 min" },
      { id: "auto-10", day: 10, title: "Registre no Diário", description: "Abra o Diário no app. Escreva: 'Hoje descobri sobre mim que...' Complete com honestidade.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "auto-11", day: 11, title: "O Que Me Irrita?", description: "O que mais te irrita nos outros? Reflexão: alguma dessas coisas existe em você? (Spoiler: provavelmente sim.)", type: "reflexao", duration: "10 min" },
      { id: "auto-12", day: 12, title: "Corpo e Mente", description: "Onde seu corpo guarda tensão? Ombros? Mandíbula? Faça um scan de 5 minutos deitado.", type: "meditacao", duration: "10 min" },
      { id: "auto-13", day: 13, title: "Autossabotagem Real", description: "Em que áreas você se sabota? Procrastinar coisas importantes, fugir de conversas, comparação... Seja honesto.", type: "escrita", duration: "15 min" },
      { id: "auto-14", day: 14, title: "Checkpoint: Semana 2", description: "Releia tudo que escreveu até aqui. O que te surpreendeu? Abra o Diário e registre seus insights.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "auto-15", day: 15, title: "Dizer Não Sem Culpa", description: "Diga 'não' para algo hoje. Sem desculpa, sem justificativa excessiva. Apenas: 'não consigo agora'.", type: "desafio", duration: "dia todo" },
      { id: "auto-16", day: 16, title: "Meus Medos Reais", description: "Liste seus 5 maiores medos. Não os genéricos — os reais. Medo de fracassar em quê? Medo de perder quem?", type: "escrita", duration: "15 min" },
      { id: "auto-17", day: 17, title: "Energia +/-", description: "Liste 5 coisas que te dão energia e 5 que drenam. Quanto tempo você gasta em cada grupo?", type: "reflexao", duration: "10 min" },
      { id: "auto-18", day: 18, title: "Responda no App", description: "Vá às Perguntas, tema Identidade. Escolha a pergunta que mais te assusta e responda no Diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "auto-19", day: 19, title: "Desconectar 3 Horas", description: "Fique 3 horas sem redes sociais. Sem stories, sem scroll. Registre como se sentiu depois.", type: "desafio", duration: "3 horas" },
      { id: "auto-20", day: 20, title: "O Que Finjo Não Sentir", description: "Que emoção você mais reprime? Raiva? Tristeza? Medo? Por quê?", type: "reflexao", duration: "10 min" },
      { id: "auto-21", day: 21, title: "Vulnerabilidade Real", description: "Compartilhe algo vulnerável com alguém de confiança hoje. Algo que normalmente esconderia.", type: "desafio", duration: "variável" },
      { id: "auto-22", day: 22, title: "Perdão Necessário", description: "Escreva uma carta de perdão — para alguém ou para si mesmo. Não precisa enviar. Precisa sentir.", type: "escrita", duration: "15 min" },
      { id: "auto-23", day: 23, title: "Silêncio de 15 Minutos", description: "Sente sem fazer nada. Sem celular, sem música. 15 minutos. Observe o que surge na mente.", type: "meditacao", duration: "15 min" },
      { id: "auto-24", day: 24, title: "Minha Contradição", description: "Qual é sua maior contradição? (Ex: 'Quero conexão mas me afasto.' 'Quero mudar mas tenho medo.')", type: "reflexao", duration: "10 min" },
      { id: "auto-25", day: 25, title: "Registre Sua Evolução", description: "Abra o Diário. Escreva sobre quem você era no dia 1 e quem está se tornando.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "auto-26", day: 26, title: "Conversa Adiada", description: "Tenha aquela conversa que você vem adiando. Não precisa ser perfeita — precisa ser real.", type: "desafio", duration: "variável" },
      { id: "auto-27", day: 27, title: "Meu Legado", description: "Se morresse amanhã, pelo que gostaria de ser lembrado? Isso está alinhado com como vive hoje?", type: "reflexao", duration: "15 min" },
      { id: "auto-28", day: 28, title: "Ritual Pessoal", description: "Crie um ritual diário de 5 minutos que represente quem você quer ser. Comece hoje.", type: "acao", duration: "10 min" },
      { id: "auto-29", day: 29, title: "Reflexão Final", description: "Vá às Perguntas, tema Identidade. Responda: 'Você se conhece ou apenas se acostumou consigo mesmo?'", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "auto-30", day: 30, title: "Carta ao Eu Futuro", description: "Escreva uma carta para o seu eu daqui a 1 ano. Guarde no Diário. Releia quando a hora chegar.", type: "escrita", duration: "20 min" },
    ],
  },
  {
    id: "detox-digital",
    title: "Detox Digital",
    subtitle: "30 dias contra o vício em telas",
    description: "Pare de viver pela tela do celular. Retome o controle do seu tempo, atenção e saúde mental.",
    icon: "smartphone",
    color: "red",
    gradientFrom: "#dc2626",
    gradientTo: "#f87171",
    totalDays: 30,
    season: "Temporada 1",
    days: [
      { id: "detox-1", day: 1, title: "Diagnóstico Brutal", description: "Veja seu tempo de tela de ontem. Quantas horas? Em quais apps? Escreva o número sem julgamento.", type: "reflexao", duration: "5 min" },
      { id: "detox-2", day: 2, title: "Primeira Hora Sagrada", description: "Hoje: não pegue o celular na primeira hora após acordar. Faça qualquer outra coisa.", type: "desafio", duration: "1 hora" },
      { id: "detox-3", day: 3, title: "Notificações Off", description: "Desative TODAS as notificações de redes sociais. Só deixe ligado: ligações e mensagens reais.", type: "acao", duration: "5 min" },
      { id: "detox-4", day: 4, title: "Diário da Ansiedade Digital", description: "Toda vez que pegar o celular sem motivo hoje, anote: que hora, o que sentia, o que fez.", type: "escrita", duration: "dia todo" },
      { id: "detox-5", day: 5, title: "Reflita no App", description: "Vá às Perguntas, tema Identidade. Responda: 'Qual é a diferença entre o que você mostra no Instagram e quem você é de verdade?'", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "detox-6", day: 6, title: "Refeição Sem Tela", description: "Faça todas as refeições de hoje sem celular na mesa. Sem YouTube, sem scroll. Sinta a comida.", type: "desafio", duration: "dia todo" },
      { id: "detox-7", day: 7, title: "Caminhada Analógica", description: "Saia para uma caminhada de 20 minutos sem fone e sem celular (ou no bolso, modo avião).", type: "acao", duration: "20 min" },
      { id: "detox-8", day: 8, title: "Por Que Eu Scrolo?", description: "Reflexão honesta: o que você busca no scroll infinito? Validação? Distração? Fuga de quê?", type: "reflexao", duration: "10 min" },
      { id: "detox-9", day: 9, title: "Unfollow Massivo", description: "Deixe de seguir pelo menos 20 perfis que não agregam nada real à sua vida. Sem culpa.", type: "acao", duration: "15 min" },
      { id: "detox-10", day: 10, title: "3 Horas Sem Redes", description: "Escolha um período de 3 horas hoje para ficar completamente sem redes sociais.", type: "desafio", duration: "3 horas" },
      { id: "detox-11", day: 11, title: "Registre no Diário", description: "Abra o Diário. Escreva: 'O que eu faria com 3 horas extras por dia?' (Esse é seu tempo de tela.)", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "detox-12", day: 12, title: "Comparação é Veneno", description: "Liste 3 vezes que se comparou com alguém nas redes esta semana. O que sentiu? Era real?", type: "escrita", duration: "10 min" },
      { id: "detox-13", day: 13, title: "Modo Avião à Noite", description: "A partir de hoje, celular em modo avião 1 hora antes de dormir. Use um despertador real.", type: "acao", duration: "noite" },
      { id: "detox-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Compare seu tempo de tela com o dia 1. Melhorou? O que mudou na sua rotina e humor?", type: "reflexao", duration: "10 min" },
      { id: "detox-15", day: 15, title: "Presença Total", description: "No próximo encontro social, guarde o celular. 100% presente. Observe como as pessoas reagem.", type: "desafio", duration: "variável" },
      { id: "detox-16", day: 16, title: "Hobby Analógico", description: "Dedique 30 minutos a algo que não envolva tela: desenhar, cozinhar, ler físico, instrumento.", type: "acao", duration: "30 min" },
      { id: "detox-17", day: 17, title: "Dopamina Real", description: "O scroll libera dopamina barata. Liste 5 coisas que te dão dopamina real: exercício, conquista, conexão...", type: "reflexao", duration: "10 min" },
      { id: "detox-18", day: 18, title: "Diário de Gratidão Offline", description: "Escreva 5 coisas boas do seu dia que não precisaram de internet para existir.", type: "escrita", duration: "10 min" },
      { id: "detox-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Solidão. A solidão que você sente é real ou é solidão digital?", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "detox-20", day: 20, title: "Dia Inteiro Sem Stories", description: "Não poste e não veja stories por 24 horas. O mundo continua girando.", type: "desafio", duration: "24 horas" },
      { id: "detox-21", day: 21, title: "Tédio Produtivo", description: "Quando sentir tédio hoje, NÃO pegue o celular. Fique entediado. Observe o que surge.", type: "desafio", duration: "dia todo" },
      { id: "detox-22", day: 22, title: "Relações Reais vs. Digitais", description: "Quantas conversas significativas você teve esta semana? Presenciais vs. online?", type: "reflexao", duration: "10 min" },
      { id: "detox-23", day: 23, title: "Meditação Sem Guia", description: "Medite 10 minutos sem app de meditação. Só você, silêncio e respiração.", type: "meditacao", duration: "10 min" },
      { id: "detox-24", day: 24, title: "Limpar o Feed", description: "Curadoria radical: deixe apenas conteúdos que te fazem pensar, crescer ou rir de verdade.", type: "acao", duration: "20 min" },
      { id: "detox-25", day: 25, title: "Registre Sua Evolução", description: "Abra o Diário. Como sua relação com o celular mudou? O que conquistou? O que ainda é difícil?", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "detox-26", day: 26, title: "Conversa Face a Face", description: "Ligue ou encontre alguém pessoalmente. Nada de mensagem de texto. Voz ou presença.", type: "desafio", duration: "variável" },
      { id: "detox-27", day: 27, title: "Manhã Completa Offline", description: "Das 7h ao meio-dia sem redes sociais. Apenas trabalho/estudo e vida real.", type: "desafio", duration: "5 horas" },
      { id: "detox-28", day: 28, title: "Identidade Além da Tela", description: "Se suas redes sociais sumissem hoje, quem você seria? Escreva sem pressa.", type: "escrita", duration: "15 min" },
      { id: "detox-29", day: 29, title: "Regras Pessoais", description: "Crie 5 regras pessoais para o uso de celular que vai seguir daqui pra frente. Assine.", type: "escrita", duration: "10 min" },
      { id: "detox-30", day: 30, title: "Compare e Celebre", description: "Veja seu tempo de tela. Compare com o dia 1. Abra o Diário e celebre sua evolução.", type: "app", duration: "15 min", appLink: "/journal" },
    ],
  },
  {
    id: "proposito-profissional",
    title: "E Agora, Profissão?",
    subtitle: "30 dias para encontrar seu caminho",
    description: "Para quem não sabe o que fazer da vida. Chega de pressão — vamos descobrir juntos o que faz sentido pra você.",
    icon: "briefcase",
    color: "amber",
    gradientFrom: "#d97706",
    gradientTo: "#fbbf24",
    totalDays: 30,
    season: "Temporada 1",
    days: [
      { id: "prof-1", day: 1, title: "Pressão Silenciosa", description: "De onde vem a pressão de 'saber o que fazer'? Família? Amigos? Redes sociais? Escreva honestamente.", type: "reflexao", duration: "10 min" },
      { id: "prof-2", day: 2, title: "O Que Me Faz Perder a Hora", description: "Liste 5 atividades que te fazem perder a noção do tempo. Sem pensar em dinheiro ou prestígio.", type: "escrita", duration: "10 min" },
      { id: "prof-3", day: 3, title: "Reflita no App", description: "Vá às Perguntas, tema Propósito. Responda 3 perguntas que te chamem atenção no seu Diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "prof-4", day: 4, title: "Sucesso Redefinido", description: "Escreva SUA definição de sucesso. Não a dos seus pais, nem a do LinkedIn. A SUA.", type: "escrita", duration: "10 min" },
      { id: "prof-5", day: 5, title: "Conversas que Abrem Portas", description: "Mande mensagem para alguém que trabalha com algo que te interessa. Pergunte como é a rotina real.", type: "acao", duration: "15 min" },
      { id: "prof-6", day: 6, title: "Habilidades Escondidas", description: "Liste tudo que você sabe fazer — até coisas 'bobas'. Cozinhar, organizar, ouvir, criar memes. Tudo conta.", type: "escrita", duration: "10 min" },
      { id: "prof-7", day: 7, title: "Um Dia de Experiência", description: "Faça algo que nunca fez por 30 minutos: programe, cozinhe algo novo, desenhe, grave um vídeo.", type: "desafio", duration: "30 min" },
      { id: "prof-8", day: 8, title: "Ikigai Pessoal", description: "Desenhe: O que amo + O que faço bem + O que o mundo precisa + O que posso ser pago. Onde se cruzam?", type: "escrita", duration: "20 min" },
      { id: "prof-9", day: 9, title: "Medo do Fracasso", description: "O que exatamente você teme quando pensa em 'não dar certo'? Detalhe. O medo perde poder quando nomeado.", type: "reflexao", duration: "10 min" },
      { id: "prof-10", day: 10, title: "Registre no Diário", description: "Abra o Diário. Escreva: 'Se dinheiro não fosse problema, eu estaria...' Complete sem censura.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "prof-11", day: 11, title: "Mentores Invisíveis", description: "Quem te inspira? 3 pessoas reais (não celebridades). O que cada uma te ensina sobre viver/trabalhar?", type: "reflexao", duration: "10 min" },
      { id: "prof-12", day: 12, title: "Propósito ≠ Profissão", description: "Seu propósito não precisa ser seu emprego. Reflita: o que você faria de graça? O que faz por obrigação?", type: "reflexao", duration: "10 min" },
      { id: "prof-13", day: 13, title: "Teste de 1 Hora", description: "Escolha algo que te interessa e dedique 1 hora aprendendo online. Gostou? Sentiria tesão de continuar?", type: "acao", duration: "1 hora" },
      { id: "prof-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Releia tudo que escreveu. Algum padrão apareceu? O que te surpreendeu? Registre no Diário.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "prof-15", day: 15, title: "Carta ao LinkedIn", description: "Se pudesse escrever o que quiser na bio do LinkedIn sem medo de julgamento, o que colocaria?", type: "escrita", duration: "10 min" },
      { id: "prof-16", day: 16, title: "5 Vidas Possíveis", description: "Se pudesse viver 5 vidas paralelas, qual profissão teria em cada uma? Liste sem filtro.", type: "escrita", duration: "10 min" },
      { id: "prof-17", day: 17, title: "Conversa Real", description: "Pergunte a 3 pessoas diferentes: 'O que você acha que eu faria bem?' Anote sem contestar.", type: "desafio", duration: "dia todo" },
      { id: "prof-18", day: 18, title: "Micro-Experimento", description: "Escolha 1 das suas '5 vidas' do dia 16. Faça algo concreto hoje relacionado: pesquise, teste, crie.", type: "acao", duration: "30 min" },
      { id: "prof-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Propósito. Responda: 'O que te faz levantar da cama todos os dias?'", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "prof-20", day: 20, title: "Eliminação por Experiência", description: "Liste 3 coisas que você SABE que não quer fazer. Eliminar opções também é avanço.", type: "reflexao", duration: "10 min" },
      { id: "prof-21", day: 21, title: "Projeto-Semente", description: "Pense num mini-projeto pessoal que te anime. Blog, canal, produto, serviço. Dê o primeiro micro-passo.", type: "acao", duration: "20 min" },
      { id: "prof-22", day: 22, title: "Impacto que Quero Causar", description: "Se pudesse resolver 1 problema do mundo, qual seria? Isso pode ser pista do seu caminho.", type: "reflexao", duration: "10 min" },
      { id: "prof-23", day: 23, title: "Meditação de Intenção", description: "10 minutos em silêncio com 1 pergunta: 'O que meu coração quer que eu faça?' Não force a resposta.", type: "meditacao", duration: "10 min" },
      { id: "prof-24", day: 24, title: "Currículo de Vida", description: "Escreva um currículo, mas com experiências de VIDA, não de trabalho. Viagens, superações, amizades.", type: "escrita", duration: "15 min" },
      { id: "prof-25", day: 25, title: "Registre no Diário", description: "Abra o Diário. Escreva: 'Daqui a 5 anos, quero que minha vida seja assim...' Detalhe.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "prof-26", day: 26, title: "Sair da Teoria", description: "Pare de pesquisar e FAÇA algo hoje. Qualquer ação concreta, mesmo pequena, vale mais que 100 planos.", type: "desafio", duration: "variável" },
      { id: "prof-27", day: 27, title: "Aceitar o Não-Saber", description: "Tá tudo bem não saber ainda. Escreva: 'Eu me permito não ter todas as respostas agora.'", type: "escrita", duration: "10 min" },
      { id: "prof-28", day: 28, title: "Rede de Apoio", description: "Conte para alguém de confiança sobre algo que descobriu nessa jornada. Verbalizar solidifica.", type: "desafio", duration: "variável" },
      { id: "prof-29", day: 29, title: "Manifesto Pessoal", description: "Escreva um manifesto de 10 frases sobre o que você defende, acredita e quer para sua vida.", type: "escrita", duration: "15 min" },
      { id: "prof-30", day: 30, title: "1 Compromisso Real", description: "Escolha 1 ação concreta para os próximos 30 dias. Não precisa ser 'a resposta' — precisa ser um passo.", type: "reflexao", duration: "15 min" },
    ],
  },
  {
    id: "conexao",
    title: "Conexão de Verdade",
    subtitle: "30 dias de relações reais",
    description: "Para quem tem 500 seguidores mas ninguém pra ligar às 3h da manhã. Reconecte-se com as pessoas — e consigo.",
    icon: "heart",
    color: "rose",
    gradientFrom: "#e11d48",
    gradientTo: "#fb7185",
    totalDays: 30,
    season: "Temporada 2",
    days: [
      { id: "con-1", day: 1, title: "Mapa de Relações", description: "Desenhe 3 círculos: íntimos (ligaria às 3h), amigos, conhecidos. Quantas pessoas em cada?", type: "reflexao", duration: "10 min" },
      { id: "con-2", day: 2, title: "Escuta Radical", description: "Na próxima conversa, apenas ouça. Sem interromper, sem preparar resposta, sem olhar o celular. Só ouvir.", type: "desafio", duration: "variável" },
      { id: "con-3", day: 3, title: "Mensagem Inesperada", description: "Mande uma mensagem sincera para alguém que não espera. 'Lembrei de você. Tá tudo bem?'", type: "acao", duration: "5 min" },
      { id: "con-4", day: 4, title: "Reflita no App", description: "Vá às Perguntas, tema Relações. Responda 3 perguntas no seu Diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "con-5", day: 5, title: "Linguagem do Amor", description: "Qual é a sua? (Palavras, toque, tempo, presentes, atos?) E das 3 pessoas mais próximas?", type: "reflexao", duration: "10 min" },
      { id: "con-6", day: 6, title: "Presença > Presentes", description: "No próximo encontro, guarde o celular no bolso. Esteja 100% ali. Observe a diferença.", type: "desafio", duration: "variável" },
      { id: "con-7", day: 7, title: "Agradecimento Real", description: "Agradeça 3 pessoas hoje — pessoalmente ou por mensagem. Seja específico sobre o PORQUÊ.", type: "acao", duration: "15 min" },
      { id: "con-8", day: 8, title: "Conflito ≠ Fim", description: "Como você lida com conflitos? Foge? Ataca? Engole? Escreva seu padrão com honestidade.", type: "reflexao", duration: "10 min" },
      { id: "con-9", day: 9, title: "Vulnerabilidade Corajosa", description: "Compartilhe algo vulnerável com alguém de confiança. Algo que normalmente esconderia.", type: "desafio", duration: "variável" },
      { id: "con-10", day: 10, title: "Registre no Diário", description: "Abra o Diário. Escreva sobre a relação que mais te importa e o que ela precisa de você.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "con-11", day: 11, title: "Perdão em Andamento", description: "Há alguém que você precisa perdoar? Escreva o que sente. Não precisa enviar, precisa processar.", type: "escrita", duration: "15 min" },
      { id: "con-12", day: 12, title: "Elogio Genuíno", description: "Elogie 3 pessoas hoje de forma específica. Não 'você é legal' — 'admiro como você lida com...'", type: "desafio", duration: "dia todo" },
      { id: "con-13", day: 13, title: "Encontro Real", description: "Marque um encontro presencial com alguém que só fala por mensagem. Café, caminhada, qualquer coisa.", type: "acao", duration: "1 hora" },
      { id: "con-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Como suas relações mudaram? Registre seus insights no Diário.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "con-15", day: 15, title: "Limites Com Amor", description: "Em qual relação você precisa de um limite? Escreva o que diria. Se tiver coragem, diga.", type: "reflexao", duration: "10 min" },
      { id: "con-16", day: 16, title: "Herança Emocional", description: "Que padrões de relacionamento você herdou da família? Quais quer manter e quais quer mudar?", type: "escrita", duration: "15 min" },
      { id: "con-17", day: 17, title: "Pedido de Desculpas", description: "Peça desculpas a alguém, mesmo por algo pequeno. Humildade genuína conecta mais que qualquer palavrão bonito.", type: "desafio", duration: "variável" },
      { id: "con-18", day: 18, title: "Silêncio Compartilhado", description: "Fique em silêncio com alguém por 5 minutos. Sem celular. Apenas presença. Observe o que sente.", type: "meditacao", duration: "5 min" },
      { id: "con-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Relações. 'Quantas das suas amizades sobreviveriam sem Internet?' Reflita no Diário.", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "con-20", day: 20, title: "Generosidade Silenciosa", description: "Faça algo generoso sem contar para ninguém. Pague um café, ajude um estranho, doe algo.", type: "acao", duration: "variável" },
      { id: "con-21", day: 21, title: "Dependência vs. Parceria", description: "Em qual relação você depende demais? Em qual é parceiro? A diferença importa.", type: "reflexao", duration: "10 min" },
      { id: "con-22", day: 22, title: "Carta ao Amigo Distante", description: "Escreva para alguém que se afastou. Pode ser no Diário. Se quiser, mande de verdade.", type: "escrita", duration: "15 min" },
      { id: "con-23", day: 23, title: "Comunicação Não-Violenta", description: "Pratique: Observação + Sentimento + Necessidade + Pedido. Use em uma conversa real hoje.", type: "desafio", duration: "variável" },
      { id: "con-24", day: 24, title: "Humor Conecta", description: "Faça alguém rir hoje genuinamente. O humor é uma das formas mais poderosas de conexão.", type: "acao", duration: "variável" },
      { id: "con-25", day: 25, title: "Registre no Diário", description: "Abra o Diário. 'O que eu trago de bom para as pessoas ao meu redor?' Escreva com honestidade.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "con-26", day: 26, title: "Dia de Sim", description: "Aceite um convite social que normalmente recusaria. Saia da caverna.", type: "desafio", duration: "variável" },
      { id: "con-27", day: 27, title: "Qualidade > Quantidade", description: "Não precisa de 50 amigos. Precisa de 3 reais. Quem são os seus? Você nutre essas relações?", type: "reflexao", duration: "10 min" },
      { id: "con-28", day: 28, title: "Amor-Bondade", description: "Medite 10 min desejando felicidade: para si, para alguém amado, para alguém difícil, para todos.", type: "meditacao", duration: "10 min" },
      { id: "con-29", day: 29, title: "O Que Eu Ofereço", description: "O que você traz para seus relacionamentos? E o que espera receber? Está equilibrado?", type: "reflexao", duration: "10 min" },
      { id: "con-30", day: 30, title: "1 Gesto Concreto", description: "Escolha 1 relação para nutrir ativamente. Faça o primeiro gesto agora. Ligue, visite, escreva.", type: "acao", duration: "15 min" },
    ],
  },
  {
    id: "ansiedade",
    title: "Cala a Boca, Ansiedade",
    subtitle: "30 dias contra a ansiedade",
    description: "Para quem vive no futuro, sofre antes da hora e não consegue desligar a mente. Vamos juntos.",
    icon: "shield",
    color: "blue",
    gradientFrom: "#2563eb",
    gradientTo: "#60a5fa",
    totalDays: 30,
    season: "Temporada 2",
    days: [
      { id: "ans-1", day: 1, title: "Mapa da Ansiedade", description: "Liste 5 coisas que te causam ansiedade hoje. Para cada uma: é algo que você pode controlar?", type: "reflexao", duration: "10 min" },
      { id: "ans-2", day: 2, title: "Respiração 4-7-8", description: "Quando a ansiedade vier: inspire 4s, segure 7s, expire 8s. Faça 5 rodadas agora. Decore esse exercício.", type: "meditacao", duration: "5 min" },
      { id: "ans-3", day: 3, title: "Diário da Ansiedade", description: "Toda vez que sentir ansiedade hoje, anote: o gatilho, a sensação no corpo, quanto durou.", type: "escrita", duration: "dia todo" },
      { id: "ans-4", day: 4, title: "Reflita no App", description: "Vá às Perguntas, tema Incerteza. Responda 3 perguntas no Diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "ans-5", day: 5, title: "O Pior Cenário", description: "Escreva seu pior cenário para algo que te preocupa. Depois: 'Se acontecesse, eu sobreviveria?' Quase sempre: sim.", type: "reflexao", duration: "10 min" },
      { id: "ans-6", day: 6, title: "Grounding 5-4-3-2-1", description: "Quando ansioso: 5 coisas que vê, 4 que ouve, 3 que toca, 2 que cheira, 1 que prova. Volta pro presente.", type: "meditacao", duration: "5 min" },
      { id: "ans-7", day: 7, title: "Movimento Anti-Ansiedade", description: "Quando a ansiedade apertar: 20 agachamentos, 20 polichinelos, 10 flexões. O corpo resolve o que a mente não consegue.", type: "acao", duration: "10 min" },
      { id: "ans-8", day: 8, title: "Comparação é Ansiedade", description: "Quantas vezes hoje você se comparou com alguém? Em quê? A comparação alimenta a ansiedade — perceba.", type: "reflexao", duration: "dia todo" },
      { id: "ans-9", day: 9, title: "Decisão Imperfeita", description: "Tome uma decisão que tem adiado. Qualquer uma. A perfeição paralisa — ação imperfeita liberta.", type: "desafio", duration: "variável" },
      { id: "ans-10", day: 10, title: "Registre no Diário", description: "Abra o Diário. 'O que minha ansiedade está tentando me dizer?' Às vezes ela é um aviso, não um inimigo.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "ans-11", day: 11, title: "Futuro vs. Presente", description: "Quantos dos seus problemas atuais são REAIS agora vs. 'e se acontecer'? Liste e separe.", type: "reflexao", duration: "10 min" },
      { id: "ans-12", day: 12, title: "Noite Sem Tela", description: "1 hora antes de dormir: sem celular. Leia, tome chá, converse. A noite dita o sono — o sono dita a ansiedade.", type: "desafio", duration: "1 hora" },
      { id: "ans-13", day: 13, title: "Conversa com o Medo", description: "Escreva um diálogo entre você e sua ansiedade. O que ela diria? E o que você responderia?", type: "escrita", duration: "15 min" },
      { id: "ans-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Compare sua ansiedade com o dia 1 (0-10). O que ajudou? Registre no Diário.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "ans-15", day: 15, title: "Planejamento Flexível", description: "Planeje algo com 3 cenários: ideal, aceitável, plano B. A rigidez alimenta a ansiedade.", type: "acao", duration: "15 min" },
      { id: "ans-16", day: 16, title: "Pedir Ajuda", description: "Peça ajuda para algo hoje. A vulnerabilidade de pedir reduz a ansiedade de ter que dar conta sozinho.", type: "desafio", duration: "variável" },
      { id: "ans-17", day: 17, title: "Caminhar é Meditar", description: "Caminhada de 20 minutos focando nos passos. Cada passo = um pensamento que vai embora.", type: "meditacao", duration: "20 min" },
      { id: "ans-18", day: 18, title: "Gratidão pelo Presente", description: "Liste 5 coisas que estão BEM agora. A ansiedade te faz esquecer o que já funciona.", type: "escrita", duration: "10 min" },
      { id: "ans-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Incerteza. 'Você controla ou é controlado(a) pelos seus medos?'", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "ans-20", day: 20, title: "Erro Intencional", description: "Erre de propósito em algo pequeno. Quebre a louça da perfeição. O mundo não acaba.", type: "desafio", duration: "variável" },
      { id: "ans-21", day: 21, title: "Rotina de Âncora", description: "Crie 1 ritual matinal de 5 minutos. Sempre igual. Previsibilidade reduz ansiedade.", type: "acao", duration: "5 min" },
      { id: "ans-22", day: 22, title: "Cafeína e Ansiedade", description: "Reduza cafeína pela metade hoje. Observe se há diferença no nível de ansiedade.", type: "desafio", duration: "dia todo" },
      { id: "ans-23", day: 23, title: "Meditação do Barco", description: "Visualize-se num barco em um rio calmo. A corrente te leva. Solte os remos. 10 minutos.", type: "meditacao", duration: "10 min" },
      { id: "ans-24", day: 24, title: "Luto do Controle", description: "Escreva: 'Eu solto o controle sobre ___.' Complete com aquilo que você precisa soltar.", type: "escrita", duration: "10 min" },
      { id: "ans-25", day: 25, title: "Registre no Diário", description: "Abra o Diário. O que sua ansiedade te protege de fazer? O que você faria se ela calasse?", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "ans-26", day: 26, title: "Micro-Coragem", description: "Faça 3 coisas que te dão um leve desconforto hoje. Não 50% fora do conforto — apenas 5%.", type: "desafio", duration: "dia todo" },
      { id: "ans-27", day: 27, title: "Reescreva a Narrativa", description: "Substitua 'E se der errado?' por 'E se der certo?' em 3 situações da sua semana.", type: "reflexao", duration: "10 min" },
      { id: "ans-28", day: 28, title: "Confiar no Processo", description: "Escreva: 'Eu confio que ___.' Complete com o que precisa acreditar agora.", type: "escrita", duration: "10 min" },
      { id: "ans-29", day: 29, title: "Kit Anti-Ansiedade", description: "Monte seu kit pessoal: 3 exercícios de respiração, 3 ações físicas, 3 frases que te acalmam.", type: "escrita", duration: "15 min" },
      { id: "ans-30", day: 30, title: "Mantra do Navegante", description: "Crie seu mantra pessoal para momentos de ansiedade. Memorize. Registre no Diário como encerramento.", type: "app", duration: "15 min", appLink: "/journal" },
    ],
  },
  {
    id: "crescimento",
    title: "Sair da Estagnação",
    subtitle: "30 dias de evolução real",
    description: "Para quem sente que está parado na vida. Chega de planejar — hora de agir e construir.",
    icon: "sprout",
    color: "emerald",
    gradientFrom: "#059669",
    gradientTo: "#34d399",
    totalDays: 30,
    season: "Temporada 2",
    days: [
      { id: "cresc-1", day: 1, title: "Raio-X da Vida", description: "Nota de 1-10 para: Saúde, Relações, Propósito, Mente, Diversão. Onde está a urgência?", type: "reflexao", duration: "10 min" },
      { id: "cresc-2", day: 2, title: "1 Micro-Hábito", description: "Escolha 1 hábito absurdamente pequeno: 1 copo d'água, 5 min de leitura, 10 flexões. Comece HOJE.", type: "acao", duration: "5 min" },
      { id: "cresc-3", day: 3, title: "Zona de Expansão", description: "Faça algo 5% fora do seu conforto. Não 50%. Crescimento é gradual, não trauma.", type: "desafio", duration: "variável" },
      { id: "cresc-4", day: 4, title: "Reflita no App", description: "Vá às Perguntas, tema Crescimento. Responda 3 perguntas que te desafiem.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "cresc-5", day: 5, title: "Vitórias Ignoradas", description: "Liste 5 pequenas vitórias recentes que você não celebrou. Reconhecer progresso gera mais progresso.", type: "escrita", duration: "10 min" },
      { id: "cresc-6", day: 6, title: "Feedback Corajoso", description: "Peça feedback honesto a alguém: 'O que posso melhorar?' Ouça sem se defender. Agradeça.", type: "desafio", duration: "variável" },
      { id: "cresc-7", day: 7, title: "Eliminar 1 Hábito", description: "Identifique 1 hábito que não te serve. (Scroll antes de dormir? Procrastinar? Junk food?) Comece a substituir.", type: "acao", duration: "10 min" },
      { id: "cresc-8", day: 8, title: "30 Min de Movimento", description: "Dança, corrida, yoga, academia, caminhada rápida. 30 minutos de movimento intencional.", type: "acao", duration: "30 min" },
      { id: "cresc-9", day: 9, title: "Aprender Algo Novo", description: "20 minutos aprendendo algo totalmente novo: idioma, instrumento, skill digital, receita.", type: "acao", duration: "20 min" },
      { id: "cresc-10", day: 10, title: "Registre no Diário", description: "Abra o Diário. 'O que me impede de ser a pessoa que admiro?' Escreva com honestidade brutal.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "cresc-11", day: 11, title: "Crenças Limitantes", description: "'Não sou bom o suficiente.' 'Não mereço.' 'Não tenho talento.' Qual crença te trava? Desafie-a.", type: "reflexao", duration: "10 min" },
      { id: "cresc-12", day: 12, title: "Dieta de Informação", description: "Consuma apenas conteúdo intencional hoje. Zero scroll automático. Você escolhe o que entra.", type: "desafio", duration: "dia todo" },
      { id: "cresc-13", day: 13, title: "Foco Total", description: "1 hora de trabalho/estudo sem NENHUMA distração. Modo avião. Timer ligado. Observe o poder.", type: "desafio", duration: "1 hora" },
      { id: "cresc-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Reveja suas notas do dia 1. Algo mudou? Registre no Diário.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "cresc-15", day: 15, title: "Fracasso = Informação", description: "Relembre um fracasso. Extraia 3 aprendizados concretos. O fracasso é dado, não veredicto.", type: "escrita", duration: "10 min" },
      { id: "cresc-16", day: 16, title: "Organize o Espaço", description: "Organize um espaço físico (quarto, mesa, armário). Ambiente limpo = clareza mental.", type: "acao", duration: "30 min" },
      { id: "cresc-17", day: 17, title: "Ensinar para Crescer", description: "Ensine algo que sabe a alguém. O ensino é a forma mais poderosa de aprendizado.", type: "acao", duration: "15 min" },
      { id: "cresc-18", day: 18, title: "Descanso Sem Culpa", description: "Descanse de verdade hoje. Sem culpa, sem 'deveria estar produzindo'. O crescimento precisa de pausa.", type: "acao", duration: "variável" },
      { id: "cresc-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Crescimento. 'O que você está adiando que poderia mudar tudo?'", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "cresc-20", day: 20, title: "Consistência > Intensidade", description: "Seu micro-hábito do dia 2 — ainda está fazendo? Se parou, recomece. Sem drama, sem culpa.", type: "desafio", duration: "5 min" },
      { id: "cresc-21", day: 21, title: "Crie Algo", description: "Crie: desenho, poema, música, receita, texto. Não precisa ser bom. Precisa ser seu.", type: "acao", duration: "30 min" },
      { id: "cresc-22", day: 22, title: "Conversa Elevadora", description: "Converse com alguém que pensa diferente de você. Não para debater — para aprender.", type: "desafio", duration: "variável" },
      { id: "cresc-23", day: 23, title: "Meditação de Aceitação", description: "'Aqui está bom. E vou avançar.' Aceite onde está AGORA enquanto caminha pra frente.", type: "meditacao", duration: "10 min" },
      { id: "cresc-24", day: 24, title: "Mentoria Informal", description: "Ajude alguém mais novo ou menos experiente com algo que você já domina.", type: "acao", duration: "variável" },
      { id: "cresc-25", day: 25, title: "Registre no Diário", description: "Abra o Diário. Liste suas 5 maiores evoluções nos últimos 25 dias. Celebre cada uma.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "cresc-26", day: 26, title: "Identidade de Crescimento", description: "'Eu sou alguém que ___.' Complete com 5 frases sobre quem você está se tornando.", type: "escrita", duration: "10 min" },
      { id: "cresc-27", day: 27, title: "Compaixão Pelo Processo", description: "'Eu me permito crescer no meu tempo.' O crescimento não é linear — e tudo bem.", type: "meditacao", duration: "5 min" },
      { id: "cresc-28", day: 28, title: "Próximos Passos", description: "Liste 3 ações concretas para os próximos 30 dias. Pequenas, alcançáveis, suas.", type: "escrita", duration: "10 min" },
      { id: "cresc-29", day: 29, title: "Gratidão Pelo Caminho", description: "Agradeça a si mesmo por cada dia completado. Mostrar compromisso JÁ é evolução.", type: "escrita", duration: "10 min" },
      { id: "cresc-30", day: 30, title: "Novas Notas", description: "Refaça o Raio-X do dia 1. Compare. Registre no Diário com orgulho.", type: "app", duration: "15 min", appLink: "/journal" },
    ],
  },
  {
    id: "solidao",
    title: "Estar Só, Não Sozinho",
    subtitle: "30 dias de solitude",
    description: "Para quem confunde solidão com fracasso. Aprenda a ser sua própria companhia — e gostar disso.",
    icon: "moon",
    color: "indigo",
    gradientFrom: "#4f46e5",
    gradientTo: "#818cf8",
    totalDays: 30,
    season: "Temporada 3",
    days: [
      { id: "sol-1", day: 1, title: "Sozinho vs. Solitário", description: "Qual é a diferença entre estar sozinho e estar solitário? Qual você sente mais? Escreva.", type: "reflexao", duration: "10 min" },
      { id: "sol-2", day: 2, title: "Café Consigo", description: "Tome um café/chá sozinho em silêncio. Sem celular. Observe o mundo ao redor.", type: "acao", duration: "15 min" },
      { id: "sol-3", day: 3, title: "15 Minutos de Nada", description: "Fique 15 minutos sem fazer absolutamente nada. Sem celular, sem TV, sem leitura. Apenas SER.", type: "meditacao", duration: "15 min" },
      { id: "sol-4", day: 4, title: "Reflita no App", description: "Vá às Perguntas, tema Solidão. Responda 3 perguntas no Diário.", type: "app", duration: "15 min", appLink: "/questions" },
      { id: "sol-5", day: 5, title: "Passeio Solo", description: "Vá a um lugar novo sozinho: parque, museu, bairro diferente. Sem pressa, sem destino.", type: "acao", duration: "1 hora" },
      { id: "sol-6", day: 6, title: "O Que Evito Fazer Só", description: "Restaurante? Cinema? Festa? O que você evita fazer sozinho? Por vergonha de quem?", type: "reflexao", duration: "10 min" },
      { id: "sol-7", day: 7, title: "Refeição Sem Tela", description: "Faça uma refeição sozinho sem nenhuma tela. Sinta cada sabor. Seja sua própria companhia.", type: "desafio", duration: "30 min" },
      { id: "sol-8", day: 8, title: "Carta de Amor Próprio", description: "Escreva uma carta de amor para si mesmo. Sem ironia, sem vergonha. Com ternura real.", type: "escrita", duration: "15 min" },
      { id: "sol-9", day: 9, title: "O Medo do Vazio", description: "O que você teme encontrar quando está a sós com seus pensamentos? Escreva sem filtro.", type: "reflexao", duration: "10 min" },
      { id: "sol-10", day: 10, title: "Registre no Diário", description: "Abra o Diário. 'A solidão me ensinou...' Complete com 5 coisas.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "sol-11", day: 11, title: "Criar Sozinho", description: "Crie algo só — desenhe, escreva, cozinhe, dance. Sem plateia, sem likes. Só prazer.", type: "acao", duration: "20 min" },
      { id: "sol-12", day: 12, title: "Natureza Solo", description: "Passe 20 minutos na natureza sozinho. Árvore, praça, céu. Sem fone de ouvido.", type: "acao", duration: "20 min" },
      { id: "sol-13", day: 13, title: "Abraço Próprio", description: "Abraçe a si mesmo. Braços cruzados sobre o peito. Respire fundo. Diga: 'Estou aqui comigo.'", type: "meditacao", duration: "5 min" },
      { id: "sol-14", day: 14, title: "Checkpoint: 2 Semanas", description: "Como está sua relação com a solitude? O que mudou? Registre no Diário.", type: "app", duration: "15 min", appLink: "/journal" },
      { id: "sol-15", day: 15, title: "Cinema/Filme Solo", description: "Assista um filme sozinho. Sem compartilhar nos stories. Só para você.", type: "desafio", duration: "2 horas" },
      { id: "sol-16", day: 16, title: "Hobby Resgatado", description: "Resgate 1 hobby que abandonou por 'não ter com quem fazer'. Faça sozinho. Vale.", type: "acao", duration: "30 min" },
      { id: "sol-17", day: 17, title: "Escrita Livre", description: "10 minutos escrevendo sem parar. Sem tema, sem filtro. Puro fluxo de consciência.", type: "escrita", duration: "10 min" },
      { id: "sol-18", day: 18, title: "4 Horas Offline", description: "4 horas sem redes sociais. A solidão digital é diferente da solidão real. Sinta a diferença.", type: "desafio", duration: "4 horas" },
      { id: "sol-19", day: 19, title: "Reflita no App", description: "Vá às Perguntas, tema Solidão. 'A solidão que você sente é real ou é solidão de redes sociais?'", type: "app", duration: "10 min", appLink: "/questions" },
      { id: "sol-20", day: 20, title: "Prazer Sem Testemunha", description: "Faça algo prazeroso SÓ para você. Cozinhe, dance, leia. Sem contar para ninguém.", type: "acao", duration: "30 min" },
      { id: "sol-21", day: 21, title: "Jantar Especial Solo", description: "Prepare uma refeição especial para si. Com capricho, com vela se quiser. Você merece.", type: "acao", duration: "1 hora" },
      { id: "sol-22", day: 22, title: "Observar o Mundo", description: "Sente em um lugar movimentado sozinho. Observe as pessoas. Invente histórias. Esteja presente.", type: "acao", duration: "20 min" },
      { id: "sol-23", day: 23, title: "Meditação da Lua", description: "À noite, observe o céu. Você está sozinho ali, mas faz parte de algo imenso.", type: "meditacao", duration: "10 min" },
      { id: "sol-24", day: 24, title: "Solidão Escolhida = Liberdade", description: "Quando você ESCOLHE estar só, o que sente? Compare com quando a solidão te pega de surpresa.", type: "reflexao", duration: "10 min" },
      { id: "sol-25", day: 25, title: "Registre no Diário", description: "Abra o Diário. Escreva 10 coisas que ama em si mesmo. Sem modéstia. Com verdade.", type: "app", duration: "10 min", appLink: "/journal" },
      { id: "sol-26", day: 26, title: "Ritual Noturno Solo", description: "Crie um ritual só seu antes de dormir. Chá, leitura, música baixa. Algo sagrado.", type: "acao", duration: "20 min" },
      { id: "sol-27", day: 27, title: "Caminhada de Despedida", description: "Caminhada de 20 minutos como ritual. Cada passo = um obrigado a você por ter chegado até aqui.", type: "acao", duration: "20 min" },
      { id: "sol-28", day: 28, title: "Autocompaixão", description: "'Eu mereço minha própria gentileza. Eu sou digno de amor — inclusive o meu.' Medite com isso.", type: "meditacao", duration: "10 min" },
      { id: "sol-29", day: 29, title: "Releitura da Jornada", description: "Releia tudo que escreveu. O que o 'você solo' te ensinou?", type: "reflexao", duration: "20 min" },
      { id: "sol-30", day: 30, title: "Promessa a Mim", description: "Escreva 1 compromisso consigo mesmo que vai honrar. Registre no Diário. Assine embaixo.", type: "app", duration: "15 min", appLink: "/journal" },
    ],
  },
];

const ICON_MAP: Record<string, any> = {
  brain: Brain,
  compass: Compass,
  heart: Heart,
  target: Target,
  sprout: Sprout,
  moon: Moon,
  smartphone: Smartphone,
  briefcase: Briefcase,
  shield: Shield,
};

interface ProgressData {
  journeyId: string;
  completedDays: string[];
}

const QUIZ_QUESTIONS = [
  {
    question: "Quando você deita à noite e fica pensando, o que mais aparece?",
    subtitle: "Escolha o que mais combina com você",
    options: [
      { label: "Fico repassando coisas que fiz ou disse, tentando entender quem eu sou", journeys: ["autoconhecimento", "solidao"] },
      { label: "Penso se estou no caminho certo ou perdendo tempo", journeys: ["proposito-profissional", "crescimento"] },
      { label: "Lembro de conversas difíceis ou relações que me machucam", journeys: ["relacoes", "autoconhecimento"] },
      { label: "Sinto uma ansiedade sobre o que vai acontecer amanhã, semana que vem, no futuro", journeys: ["incerteza", "crescimento"] },
    ],
  },
  {
    question: "Se um amigo próximo descrevesse você em uma palavra, qual seria?",
    subtitle: "Seja honesto(a), não ideal",
    options: [
      { label: "Intenso(a) — sinto tudo muito forte", journeys: ["autoconhecimento", "solidao"] },
      { label: "Perdido(a) — ainda buscando meu lugar", journeys: ["proposito-profissional", "incerteza"] },
      { label: "Disponível — sempre coloco os outros primeiro", journeys: ["relacoes", "solidao"] },
      { label: "Inquieto(a) — nunca estou satisfeito com onde estou", journeys: ["crescimento", "proposito-profissional"] },
    ],
  },
  {
    question: "Qual dessas frases te causa mais desconforto?",
    subtitle: "A que mais dói provavelmente é a mais importante",
    options: [
      { label: "\"Você se conhece ou apenas se acostumou consigo mesmo?\"", journeys: ["autoconhecimento", "crescimento"] },
      { label: "\"Você está construindo algo ou apenas sobrevivendo?\"", journeys: ["proposito-profissional", "crescimento"] },
      { label: "\"As pessoas ao seu redor te conhecem de verdade?\"", journeys: ["relacoes", "solidao"] },
      { label: "\"E se tudo der errado? Você aguenta?\"", journeys: ["incerteza", "autoconhecimento"] },
    ],
  },
  {
    question: "Quando foi a última vez que você ficou um dia inteiro sem celular?",
    subtitle: "Sua relação com telas diz muito sobre você",
    options: [
      { label: "Nem lembro. Preciso dele pra não ficar sozinho(a) com meus pensamentos", journeys: ["solidao", "autoconhecimento"] },
      { label: "Tento, mas fico ansioso(a) pensando que estou perdendo algo", journeys: ["incerteza", "solidao"] },
      { label: "Já fiz, mas senti falta das conversas e interações", journeys: ["relacoes", "solidao"] },
      { label: "Consigo tranquilo. Meu problema não é com telas", journeys: ["crescimento", "proposito-profissional"] },
    ],
  },
  {
    question: "O que você faria se tivesse 100% de certeza de que não ia falhar?",
    subtitle: "Sua resposta revela o que o medo esconde",
    options: [
      { label: "Mostraria quem realmente sou, sem máscaras", journeys: ["autoconhecimento", "relacoes"] },
      { label: "Largaria tudo e começaria o projeto dos meus sonhos", journeys: ["proposito-profissional", "crescimento"] },
      { label: "Teria conversas que evito há muito tempo com pessoas importantes", journeys: ["relacoes", "autoconhecimento"] },
      { label: "Tomaria uma decisão grande que fico adiando por medo", journeys: ["incerteza", "crescimento"] },
    ],
  },
  {
    question: "Nos seus relacionamentos (amizade, namoro, família), qual é o padrão que mais se repete?",
    subtitle: "Padrões revelam o que precisamos trabalhar",
    options: [
      { label: "Dou muito de mim e recebo pouco — me anulo pelos outros", journeys: ["relacoes", "autoconhecimento"] },
      { label: "Me afasto quando as coisas ficam profundas demais", journeys: ["solidao", "relacoes"] },
      { label: "Comparo minha vida com a dos outros e me sinto pra baixo", journeys: ["crescimento", "autoconhecimento"] },
      { label: "Tenho medo de ser abandonado(a) ou rejeitado(a)", journeys: ["incerteza", "relacoes"] },
    ],
  },
  {
    question: "Quando alguém te pergunta \"o que você quer da vida?\", o que sente?",
    subtitle: "A emoção que surge é a pista",
    options: [
      { label: "Um vazio — porque genuinamente não sei a resposta", journeys: ["proposito-profissional", "autoconhecimento"] },
      { label: "Irritação — porque todo mundo parece ter a resposta menos eu", journeys: ["crescimento", "incerteza"] },
      { label: "Angústia — sei o que quero mas não tenho coragem de ir atrás", journeys: ["incerteza", "crescimento"] },
      { label: "Tranquilidade — sei quem sou, mas preciso organizar meu caminho", journeys: ["proposito-profissional", "autoconhecimento"] },
    ],
  },
  {
    question: "Se você pudesse mudar UMA coisa em você agora, o que seria?",
    subtitle: "A mudança mais difícil é geralmente a mais necessária",
    options: [
      { label: "Parar de me sabotar e realmente me comprometer com algo", journeys: ["crescimento", "proposito-profissional"] },
      { label: "Aprender a ficar bem sozinho(a) sem precisar de validação", journeys: ["solidao", "autoconhecimento"] },
      { label: "Ter coragem de ser vulnerável com as pessoas que amo", journeys: ["relacoes", "solidao"] },
      { label: "Controlar minha ansiedade e viver mais o presente", journeys: ["incerteza", "autoconhecimento"] },
    ],
  },
];

function calculateJourneyOrder(answers: number[]): string[] {
  const scores: Record<string, number> = {};
  JOURNEYS.forEach((j) => { scores[j.id] = 0; });

  answers.forEach((answerIdx, questionIdx) => {
    const q = QUIZ_QUESTIONS[questionIdx];
    if (q && q.options[answerIdx]) {
      const selected = q.options[answerIdx];
      selected.journeys.forEach((jId, priority) => {
        scores[jId] = (scores[jId] || 0) + (3 - priority);
      });
    }
  });

  return JOURNEYS
    .map((j) => j.id)
    .sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
}

const INTRO_STEPS = [
  {
    icon: Sparkles,
    title: "Bem-vindo às Jornadas",
    description: "Jornadas são desafios de 30 dias pensados para te ajudar a crescer de verdade. Cada dia traz uma atividade diferente — reflexões, exercícios, meditações e desafios.",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    icon: Footprints,
    title: "Um passo por vez",
    description: "Você só vê a atividade de hoje e as que já fez. Os próximos dias aparecem conforme você avança. Isso não é por acaso — ver tudo de uma vez cria ruído mental e ansiedade. Aqui, você foca só no agora.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: LockKeyhole,
    title: "Desbloqueio progressivo",
    description: "Você começa com uma jornada. Ao completar, a próxima se abre. Cada jornada foi pensada para te preparar para a seguinte. Confie no processo — seu caminho será personalizado pra você.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Eye,
    title: "Por que assim?",
    description: "A mente funciona melhor com foco. Quando você vê 30 dias de uma vez, sente peso. Quando vê só o de hoje, sente leveza. Menos ruído, mais presença. Esse é o segredo da transformação real.",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

function LoadingDots({ onStep }: { onStep: () => void }) {
  useEffect(() => {
    const timer = setInterval(() => {
      onStep();
    }, 1200);
    return () => clearInterval(timer);
  }, [onStep]);

  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/40"
          style={{
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function JourneyOnboarding({ onComplete }: { onComplete: (order: string[]) => void }) {
  const [phase, setPhase] = useState<"intro" | "quiz" | "loading">("intro");
  const [introStep, setIntroStep] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [pendingOrder, setPendingOrder] = useState<string[]>([]);
  const pathRef = useRef<SVGPathElement>(null);

  if (phase === "intro") {
    const current = INTRO_STEPS[introStep];
    const StepIcon = current.icon;
    const isLastIntro = introStep === INTRO_STEPS.length - 1;

    return (
      <div className="min-h-screen pb-24 animate-in fade-in duration-500" data-testid="journey-onboarding">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-100/40 via-blue-50/20 to-transparent dark:from-violet-950/20 dark:via-blue-950/10 dark:to-transparent" />
          <div className="relative px-6 pt-14 pb-6">
            <h1 className="text-3xl font-serif text-foreground">A Jornada</h1>
            <p className="text-sm text-muted-foreground mt-1">Descubra seu caminho</p>
          </div>
        </div>

        <div className="px-6 mt-4">
          <div className="flex gap-1.5 mb-8">
            {INTRO_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= introStep ? "bg-foreground" : "bg-border"
                }`}
              />
            ))}
          </div>

          <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={introStep}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${current.bgColor}`}>
              <StepIcon size={32} className={current.color} />
            </div>
            <h2 className="text-xl font-serif text-foreground text-center mb-3" data-testid="text-onboarding-title">
              {current.title}
            </h2>
            <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-sm mx-auto">
              {current.description}
            </p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-background via-background to-transparent" style={{ paddingBottom: 'calc(5rem + var(--safe-bottom))' }}>
          <div className="flex gap-3">
            {introStep > 0 && (
              <button
                onClick={() => setIntroStep(introStep - 1)}
                className="px-5 py-3 rounded-2xl border border-border text-sm font-medium text-foreground active:scale-95 transition-all"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => {
                if (isLastIntro) {
                  setPhase("quiz");
                } else {
                  setIntroStep(introStep + 1);
                }
              }}
              className="flex-1 py-3 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              data-testid="button-onboarding-next"
            >
              {isLastIntro ? "Vamos começar o quiz" : "Continuar"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const LOADING_MESSAGES = [
    { text: "Analisando suas respostas...", icon: Brain },
    { text: "Mapeando seu momento de vida...", icon: Compass },
    { text: "Escolhendo a melhor ordem...", icon: Target },
    { text: "Montando seu caminho personalizado...", icon: Footprints },
    { text: "Sua jornada está pronta!", icon: Sparkles },
  ];

  if (phase === "loading") {
    const firstJourney = pendingOrder.length > 0 ? JOURNEYS.find(j => j.id === pendingOrder[0]) : null;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-in fade-in duration-500" data-testid="journey-loading">
        <div className="w-full max-w-sm space-y-8">
          <div className="relative w-full h-48 mx-auto">
            <svg viewBox="0 0 300 180" className="w-full h-full" fill="none">
              <path
                ref={pathRef}
                d="M20,160 C60,160 60,100 100,100 C140,100 140,50 180,50 C220,50 220,20 260,20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-border"
              />
              <path
                d="M20,160 C60,160 60,100 100,100 C140,100 140,50 180,50 C220,50 220,20 260,20"
                stroke="url(#pathGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="400"
                strokeDashoffset={400 - (loadingStep / (LOADING_MESSAGES.length - 1)) * 400}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>

              {[
                { cx: 20, cy: 160 },
                { cx: 100, cy: 100 },
                { cx: 180, cy: 50 },
                { cx: 260, cy: 20 },
              ].map((point, i) => (
                <circle
                  key={i}
                  cx={point.cx}
                  cy={point.cy}
                  r={i <= Math.floor(loadingStep * 3 / (LOADING_MESSAGES.length - 1)) ? 8 : 5}
                  className={`transition-all duration-500 ${
                    i <= Math.floor(loadingStep * 3 / (LOADING_MESSAGES.length - 1))
                      ? "fill-foreground"
                      : "fill-muted stroke-border stroke-2"
                  }`}
                />
              ))}

              <circle
                cx={20 + (loadingStep / (LOADING_MESSAGES.length - 1)) * 240}
                cy={160 - (loadingStep / (LOADING_MESSAGES.length - 1)) * 140}
                r="6"
                className="fill-primary"
                style={{ transition: "cx 1s ease-out, cy 1s ease-out" }}
              >
                <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          <div className="text-center space-y-3 animate-in fade-in duration-300" key={loadingStep}>
            {(() => {
              const msg = LOADING_MESSAGES[loadingStep];
              const MsgIcon = msg.icon;
              return (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MsgIcon size={24} className="text-primary" />
                  </div>
                  <p className="text-lg font-serif text-foreground">{msg.text}</p>
                </>
              );
            })()}
          </div>

          {loadingStep < LOADING_MESSAGES.length - 1 ? (
            <LoadingDots onStep={() => setLoadingStep(s => Math.min(s + 1, LOADING_MESSAGES.length - 1))} />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              {firstJourney && (
                <div className="p-4 rounded-2xl border border-border bg-card text-center space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: firstJourney.gradientFrom }}>
                    Sua primeira jornada
                  </p>
                  <h3 className="text-lg font-serif text-foreground">{firstJourney.title}</h3>
                  <p className="text-xs text-muted-foreground">{firstJourney.subtitle}</p>
                </div>
              )}
              <button
                onClick={() => onComplete(pendingOrder)}
                className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                data-testid="button-enter-journey"
              >
                <Play size={16} />
                Começar minha Jornada
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQ = QUIZ_QUESTIONS[quizStep];
  const isLastQuiz = quizStep === QUIZ_QUESTIONS.length - 1;
  const currentAnswer = answers[quizStep];

  const handleSelectAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[quizStep] = idx;
    setAnswers(newAnswers);
  };

  const handleFinish = async () => {
    const order = calculateJourneyOrder(answers);
    setSaving(true);
    setPendingOrder(order);
    try {
      await fetch("/api/journey/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ journeyOrder: order }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setPhase("loading");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-500" data-testid="journey-quiz">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent" />
        <div className="relative px-6 pt-14 pb-6">
          <h1 className="text-2xl font-serif text-foreground">Personalize sua Jornada</h1>
          <p className="text-sm text-muted-foreground mt-1">Responda {QUIZ_QUESTIONS.length} perguntas para criar seu caminho</p>
        </div>
      </div>

      <div className="px-6 mt-2">
        <div className="flex gap-1 mb-6">
          {QUIZ_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < quizStep ? "bg-foreground" : i === quizStep ? "bg-foreground/60" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={quizStep}>
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground mb-2">
            Pergunta {quizStep + 1} de {QUIZ_QUESTIONS.length}
          </p>
          <h2 className="text-lg font-serif text-foreground mb-1" data-testid="text-quiz-question">
            {currentQ.question}
          </h2>
          {currentQ.subtitle && (
            <p className="text-xs text-muted-foreground/70 italic mb-4">{currentQ.subtitle}</p>
          )}

          <div className="space-y-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  currentAnswer === idx
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/30"
                }`}
                data-testid={`quiz-option-${quizStep}-${idx}`}
              >
                <span className={`text-[13px] leading-snug font-medium ${currentAnswer === idx ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pt-6 bg-gradient-to-t from-background via-background to-transparent" style={{ paddingBottom: 'calc(5rem + var(--safe-bottom))' }}>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (quizStep === 0) {
                setPhase("intro");
                setIntroStep(INTRO_STEPS.length - 1);
              } else {
                setQuizStep(quizStep - 1);
              }
            }}
            className="px-5 py-3 rounded-2xl border border-border text-sm font-medium text-foreground active:scale-95 transition-all"
          >
            Voltar
          </button>
          {isLastQuiz ? (
            <button
              onClick={handleFinish}
              disabled={currentAnswer === undefined || saving}
              className="flex-1 py-3 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-finish-quiz"
            >
              {saving ? "Salvando..." : (
                <>
                  <Play size={16} />
                  Ver minha Jornada
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setQuizStep(quizStep + 1)}
              disabled={currentAnswer === undefined}
              className="flex-1 py-3 rounded-2xl bg-foreground text-background text-sm font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="button-quiz-next"
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Journey() {
  const { user, refetch: refetchUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const hasAccess = user?.hasPremium || isAdmin;
  const [progressMap, setProgressMap] = useState<Record<string, ProgressData>>({});
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [journeyOrder, setJourneyOrder] = useState<string[]>(user?.journeyOrder || []);
  const [onboardingDone, setOnboardingDone] = useState(user?.journeyOnboardingDone || false);

  useEffect(() => {
    if (user) {
      setOnboardingDone(user.journeyOnboardingDone || false);
      setJourneyOrder(user.journeyOrder || []);
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/journey/progress", { credentials: "include" })
      .then((r) => r.json())
      .then((data: any[]) => {
        const map: Record<string, ProgressData> = {};
        data.forEach((p) => {
          map[p.journeyId] = { journeyId: p.journeyId, completedDays: p.completedDays };
        });
        setProgressMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!hasAccess) {
    return (
      <div className="min-h-screen pb-24 animate-in fade-in duration-700" data-testid="page-journey-locked">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent" />
          <div className="relative px-6 pt-14 pb-8">
            <h1 className="text-3xl font-serif text-foreground">A Jornada</h1>
            <p className="text-sm text-muted-foreground mt-1">Sua jornada espiritual com 365 Encontros</p>
          </div>
        </div>
        <div className="px-6 mt-8">
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <LockKeyhole size={32} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-serif text-foreground">Acesso Bloqueado</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Seu período de teste acabou. Assine o plano premium para continuar suas jornadas. Seu progresso está salvo e esperando por você.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setLocation("/premium")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold active:scale-95 transition-all"
                data-testid="button-unlock-premium"
              >
                <Crown size={16} />
                Desbloquear Jornadas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!onboardingDone) {
    return (
      <JourneyOnboarding
        onComplete={(order) => {
          setJourneyOrder(order);
          setOnboardingDone(true);
        }}
      />
    );
  }

  const getOrderedJourneys = () => {
    if (journeyOrder.length === 0) return JOURNEYS;
    const ordered: JourneyData[] = [];
    journeyOrder.forEach((id) => {
      const j = JOURNEYS.find((j) => j.id === id);
      if (j) ordered.push(j);
    });
    JOURNEYS.forEach((j) => {
      if (!ordered.find((o) => o.id === j.id)) ordered.push(j);
    });
    return ordered;
  };

  const orderedJourneys = getOrderedJourneys();

  const isJourneyUnlocked = (journey: JourneyData, index: number): boolean => {
    if (isAdmin) return true;
    if (index === 0) return true;
    const prevJourney = orderedJourneys[index - 1];
    if (!prevJourney) return true;
    const prev = progressMap[prevJourney.id];
    if (!prev) return false;
    return prev.completedDays.length >= prevJourney.totalDays;
  };

  const getStatus = (journey: JourneyData, index: number): "locked" | "not-started" | "in-progress" | "completed" => {
    if (!isJourneyUnlocked(journey, index)) return "locked";
    const p = progressMap[journey.id];
    if (!p || p.completedDays.length === 0) return "not-started";
    if (p.completedDays.length >= journey.totalDays) return "completed";
    return "in-progress";
  };

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-700" data-testid="page-journey">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-orange-50/20 to-transparent dark:from-amber-950/20 dark:via-orange-950/10 dark:to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-48 opacity-10">
          <svg viewBox="0 0 200 100" className="w-full h-full text-amber-700 dark:text-amber-400">
            <path d="M0,80 Q30,40 60,70 T120,50 T180,65 T200,45" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M0,90 Q40,60 80,80 T160,60 T200,70" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="relative px-6 pt-14 pb-8">
          <h1 className="text-3xl font-serif text-foreground" data-testid="text-journey-title">A Jornada</h1>
          <p className="text-sm text-muted-foreground mt-1">Seu caminho personalizado</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-6 mt-2">
          <div className="relative">
            <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

            <div className="space-y-1">
              {orderedJourneys.map((journey, index) => {
                const status = getStatus(journey, index);
                const isLocked = status === "locked";
                const isInProgress = status === "in-progress";
                const isCompleted = status === "completed";

                return (
                  <div key={journey.id} className="relative flex items-start gap-4 py-4">
                    <div className="relative z-10 mt-1">
                      {isCompleted ? (
                        <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
                          <Check size={18} className="text-background" />
                        </div>
                      ) : isInProgress ? (
                        <div className="w-10 h-10 rounded-full border-[3px] border-foreground bg-background flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-foreground" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center">
                          {isLocked && <LockKeyhole size={14} className="text-muted-foreground" />}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div
                        onClick={() => !isLocked && setLocation(`/journey/${journey.id}`)}
                        className={`block ${!isLocked ? "cursor-pointer" : ""}`}
                      >
                        <h3 className={`text-lg font-serif ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                          {index + 1}. {journey.title}
                        </h3>
                        <p className={`text-sm mt-0.5 ${isLocked ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {journey.subtitle}
                        </p>

                        {isInProgress && (
                          <span
                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium active:scale-95 transition-all"
                            data-testid={`button-continue-${journey.id}`}
                          >
                            Continuar a jornada
                            <ChevronRight size={16} />
                          </span>
                        )}

                        {status === "not-started" && (
                          <span
                            className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-foreground/20 text-foreground text-sm font-medium active:scale-95 transition-all hover:bg-foreground/5"
                            data-testid={`button-start-${journey.id}`}
                          >
                            Começar jornada
                            <ChevronRight size={16} />
                          </span>
                        )}

                        {isLocked && (
                          <p className="text-[11px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                            <LockKeyhole size={10} />
                            Complete a jornada anterior
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
