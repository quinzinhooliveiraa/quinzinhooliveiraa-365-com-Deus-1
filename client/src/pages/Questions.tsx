import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Users, User, ChevronLeft, RotateCcw, Share2, Bookmark, ArrowRight,
  Heart, UserPlus, Home as HomeIcon, Wifi, MapPin, Crown, Sparkles,
  PenLine, X, Lock, Send, Copy, Check, Loader2, Mic, MicOff, Square,
  Image as ImageIcon, Shuffle, ListOrdered
} from "lucide-react";
import { generateShareImage, renderShareImageToCanvas, type ShareImageTheme } from "@/utils/shareImage";
import { useCreateEntry } from "@/hooks/useJournal";
import { useAuth } from "@/hooks/useAuth";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { useGeoPrice } from "@/hooks/useGeoPrice";
import { useQuery } from "@tanstack/react-query";

function useStripeCheckout() {
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const res = await fetch("/api/stripe/products");
      return res.json();
    },
    staleTime: 60000,
  });
  const monthlyPrice = products.find((p: any) => p.recurring?.interval === "month");
  const yearlyPrice = products.find((p: any) => p.recurring?.interval === "year");

  const checkout = async (priceId: string) => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  };

  return { monthlyPrice, yearlyPrice, checkout };
}

const SOLO_THEMES = {
  identity: {
    title: "Identidade",
    emoji: "🎭",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    questions: [
      "Se você não precisasse provar nada a ninguém, o que estaria fazendo?",
      "Você está vivendo a vida que escolheu ou a que esperavam de você?",
      "Qual parte de você que você esconde das pessoas?",
      "Se pudesse recomeçar, faria as mesmas escolhas?",
      "O que te define quando ninguém está olhando?",
      "Qual máscara você mais usa no dia a dia?",
      "Quando foi a última vez que você se sentiu 100% autêntico?",
      "Que versão de você mesmo te assusta?",
      "Você se reconhece quando se olha no espelho?",
      "Quais são os valores que você diz ter mas não pratica?",
      "O que te envergonha sobre quem você já foi?",
      "Se alguém descrevesse quem você realmente é, você concordaria?",
      "Qual é a diferença entre quem você é e quem você finge ser?",
      "Você sabe o que quer ou só sabe o que não quer?",
      "Qual rótulo te colocaram que você ainda carrega?",
      "O que te faz sentir mais vivo?",
      "Você tem coragem de ser vulnerável?",
      "Qual é a opinião que você tem medo de expressar?",
      "O que você faria diferente se ninguém te julgasse?",
      "Qual é a sua maior contradição?",
      "Você se conhece ou apenas se acostumou consigo mesmo?",
      "Se pudesse apagar uma memória, qual seria?",
      "O que você precisa aceitar sobre si mesmo?",
      "Qual é a coisa mais corajosa que você já fez por você?",
      "Se tivesse que se descrever em 3 palavras, quais seriam?",
      "Você tem medo de descobrir quem realmente é?",
      "O que você faz por obrigação que gostaria de parar?",
      "Qual é a diferença entre o que você mostra no Instagram e quem você é de verdade?",
      "O que a sua criança interior precisa ouvir de você?",
      "Qual história sobre você que você conta sempre, mas não é bem assim?",
      "Você age por convicção ou por aprovação?",
      "O que te impede de ser a pessoa que você admira?",
      "Se pudesse enviar uma mensagem anônima para alguém, o que diria?",
      "Qual é o elogio que mais te incomoda?",
      "Você tem mais medo de ser esquecido ou de ser lembrado errado?",
      "O que mudou em você nos últimos 2 anos?",
      "Você se perdoa com facilidade?",
      "Qual parte da sua personalidade é herança e qual é escolha?",
      "O que você esconde atrás do humor?",
      "Você vive para si ou para os outros?",
      "Qual é a coisa que mais te define e ninguém sabe?",
      "Quando foi a última vez que mudou de opinião sobre algo importante?",
      "Você tem medo de ser comum?",
      "O que você faz por hábito que já não faz sentido?",
      "Se pudesse trocar de vida com alguém por um dia, quem seria?",
      "Qual é o seu maior orgulho secreto?",
      "Você sabe a diferença entre o que precisa e o que quer?",
      "O que você sacrificou para ser quem é hoje?",
      "Se pudesse se reinventar completamente, o que manteria?",
      "Qual é a verdade sobre você que dói admitir?",
      "Você está fugindo de algo ou correndo para algo?",
      "O que te faz diferente de todo mundo e você ignora?",
      "Qual é a expectativa dos outros que mais pesa em você?",
      "Você se respeita tanto quanto respeita os outros?",
      "O que te impede de dizer não?",
      "Qual é o papel que você desempenha na vida que não é seu?",
      "Se desaparecesse por um mês, o que as pessoas sentiriam falta em você?",
      "O que você precisa parar de fingir?",
      "Qual foi a última vez que você defendeu algo que acredita?",
      "Você tem medo de ficar sozinho com seus pensamentos?",
      "O que te segura numa versão antiga de você?",
      "Se pudesse escolher uma qualidade nova, qual seria?",
      "Qual é a crítica que mais te afeta e por quê?",
      "Você confia em si mesmo?",
      "O que você faria se soubesse que ninguém ia te criticar?",
      "Qual é o maior mito que as pessoas acreditam sobre você?",
      "Você se sente merecedor do que tem?",
      "O que te motiva: amor ou medo?",
      "Qual é a parte de você que está pedindo para ser vista?",
      "Se pudesse voltar a ter uma fase da vida, qual escolheria?",
      "O que você acha que te torna difícil de amar?",
      "Qual é a palavra que mais te representa hoje?",
      "Você vive no automático ou está presente?",
      "O que aconteceria se você fosse brutalmente honesto consigo mesmo?",
      "Qual é o sonho que você desistiu e ainda dói?",
      "Você se adapta demais às pessoas ao redor?",
      "Qual é a sua maior insegurança que você finge não ter?",
      "O que te faz sentir pequeno?",
      "Você sabe quem é sem o seu trabalho, seus amigos e seus relacionamentos?",
      "Qual foi o momento que mais te transformou?",
      "O que você espera de si mesmo que é injusto?",
      "Você se compara demais com os outros?",
      "Qual é a versão mais honesta da sua história?",
      "O que te faria mais feliz: ser admirado ou ser compreendido?",
      "Você escolhe o conforto ou o crescimento?",
      "Qual é o peso que você carrega que não é seu?",
      "Se pudesse deixar uma carta para quem você era há 5 anos, o que escreveria?",
      "O que te impede de ser leve?",
      "Você se sabota? De que forma?",
      "Qual é a coisa mais autêntica que você fez recentemente?",
      "O que você gostaria que as pessoas entendessem sobre você sem precisar explicar?",
      "Você é a mesma pessoa quando está sozinho e quando está com os outros?",
      "Qual parte de você precisa de cura?",
      "O que significa ser você nesse momento da vida?",
      "Você se esconde atrás da produtividade?",
      "Qual é o sentimento que você mais evita?",
      "O que acontece quando você para de se comparar?",
      "Você está construindo a sua identidade ou repetindo a de alguém?",
      "Qual é a coisa mais difícil de aceitar sobre a vida adulta?",
      "Se não existissem redes sociais, quem você seria?",
      "O que te define além das suas conquistas?",
      "Você tem medo de ser esquecido?",
      "Qual é a conversa mais difícil que você precisa ter consigo mesmo?",
      "O que te faz sentir que você importa?",
      "Você é gentil consigo mesmo?",
      "Qual é a última coisa que te fez chorar e por quê?",
      "O que você gostaria de ter aprendido mais cedo?",
      "Você sabe receber amor sem desconfiar?",
      "Qual é o medo que controla suas decisões sem você perceber?",
      "O que te faz levantar nos dias difíceis?",
      "Você aceita ajuda ou acha que precisa dar conta de tudo sozinho?",
      "Qual é a maior prova de amor que você pode dar a si mesmo?",
      "O que te faria sentir completo?",
      "Você está vivendo ou sobrevivendo?",
      "Qual é o padrão que se repete na sua vida e você finge não ver?",
      "O que significa liberdade para você?",
      "Você está em paz com quem está se tornando?",
      "Qual é a pergunta que você tem medo de responder?",
      "O que te faz sentir em casa dentro de si mesmo?",
      "Você precisa de validação para se sentir suficiente?",
      "Qual é a maior lição que a dor te ensinou?",
      "O que te impede de começar de novo?",
      "Se tivesse que agradecer a si mesmo por algo, o que seria?",
      "Você se permite errar?",
      "Qual é o sentimento mais presente na sua vida hoje?",
      "O que você precisa soltar para ser livre?",
      "Você sabe a diferença entre quem você é e quem você deveria ser?",
      "O que te faz humano e você tenta esconder?",
      "Qual é a parte mais bonita de ser imperfeito?",
      "Você vive buscando um futuro ideal ou aceita o presente?",
      "O que você deseja que as gerações futuras saibam sobre você?",
      "Qual é a sua maior força que veio da sua maior fraqueza?",
      "Você tem orgulho de quem está se tornando?",
      "O que significa ser autêntico para você?",
      "Qual é a coisa mais simples que te faz feliz?",
      "Você está onde queria estar ou ainda caminhando?",
      "O que te faz sentir que está no caminho certo?",
      "Qual é a maior mentira que o mundo te fez acreditar sobre si mesmo?",
      "Você está pronto para ser quem realmente é?",
    ],
  },
  purpose: {
    title: "Propósito",
    emoji: "🧭",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    questions: [
      "Como você definiria sucesso sem usar dinheiro na definição?",
      "O que te faria pular da cama todas as manhãs?",
      "Se tivesse apenas 5 anos de vida, o que mudaria hoje?",
      "Qual é o legado que você quer deixar?",
      "Você está correndo atrás do seu sonho ou fugindo de um medo?",
      "O que você faria se soubesse que não ia falhar?",
      "Qual talento seu você está desperdiçando?",
      "O que te dá inveja revela o que você realmente quer?",
      "Você trabalha para viver ou vive para trabalhar?",
      "Se dinheiro não existisse, o que você faria da vida?",
      "Qual é a diferença entre o que você faz e o que você ama fazer?",
      "O que você faria de graça pelo resto da vida?",
      "Qual problema do mundo te incomoda tanto que você gostaria de resolver?",
      "Você está construindo algo que importa ou apenas pagando contas?",
      "O que te impede de seguir o que realmente acredita?",
      "Se pudesse ter qualquer profissão, sem pensar em salário, qual seria?",
      "Qual é o impacto que você quer causar nas pessoas ao seu redor?",
      "Você está usando seu tempo de forma significativa?",
      "O que te faz perder a noção do tempo?",
      "Se pudesse ensinar uma coisa ao mundo, o que seria?",
      "Qual é o projeto dos sonhos que você nunca começou?",
      "O que te dá senso de missão?",
      "Você está investindo nos seus sonhos ou nos sonhos de outra pessoa?",
      "Qual é a causa pela qual você lutaria mesmo sem reconhecimento?",
      "O que você quer que digam no seu funeral?",
      "Você se sente útil ou apenas ocupado?",
      "Qual é a diferença entre ter uma carreira e ter um propósito?",
      "O que te inspira a ser melhor todos os dias?",
      "Você está deixando marcas ou apenas pegadas?",
      "Se pudesse viver mil vidas, todas seriam iguais a essa?",
      "O que você precisa criar antes de morrer?",
      "Qual é a pergunta que te guia nas decisões?",
      "Você sabe por que faz o que faz?",
      "O que te move: paixão, dever ou medo?",
      "Qual é a semente que você está plantando hoje?",
      "Você contribui para o mundo ou só consome dele?",
      "O que te faz sentir que está desperdiçando seu potencial?",
      "Se pudesse dedicar sua vida a uma única coisa, o que seria?",
      "Qual é a habilidade que você tem e o mundo precisa?",
      "Você está esperando o momento certo ou evitando começar?",
      "O que te faz sentir que sua vida tem significado?",
      "Qual é a coragem que te falta para seguir seu propósito?",
      "Você sabe diferenciar ambição de propósito?",
      "O que você faria diferente se tivesse 80 anos e pudesse voltar?",
      "Qual é o maior arrependimento que você quer evitar?",
      "Você está vivendo com intenção ou no piloto automático?",
      "O que te faz sentir que está contribuindo para algo maior?",
      "Qual é a sua definição de uma vida bem vivida?",
      "O que você precisa sacrificar para alcançar o que sonha?",
      "Você está disposto a desconfortar-se pelo que acredita?",
      "O que o mundo perderia se você não existisse?",
      "Qual foi a decisão mais alinhada com seu propósito?",
      "Você está construindo pontes ou muros?",
      "O que te dá esperança quando tudo parece sem sentido?",
      "Qual é o primeiro passo que você precisa dar e está adiando?",
      "Você mede sua vida em anos ou em momentos significativos?",
      "O que te faz sentir que está no caminho errado?",
      "Se pudesse resolver um problema da sua comunidade, qual seria?",
      "Qual é a sua maior responsabilidade como ser humano?",
      "Você está fazendo a diferença na vida de alguém?",
      "O que te faz sentir realizado no final do dia?",
      "Qual é o conhecimento que você quer compartilhar com o mundo?",
      "Você sabe o que te faz feliz ou só sabe o que te distrai?",
      "O que aconteceria se você seguisse sua intuição por um mês?",
      "Qual é a história que você quer que sua vida conte?",
      "Você está criando a vida que quer ou reagindo à que tem?",
      "O que te impede de ser a pessoa que o mundo precisa?",
      "Se tivesse uma plataforma com milhões de seguidores, o que falaria?",
      "Qual é o trabalho que não parece trabalho quando você faz?",
      "Você está presente no que faz ou só fazendo por fazer?",
      "O que te faria sentir orgulho de si mesmo no final da vida?",
      "Qual é a mudança que começa por você?",
      "Você está esperando permissão para viver sua vida?",
      "O que significa fazer algo que importa para você?",
      "Qual é o seu maior sonho que parece impossível?",
      "Você acredita que veio ao mundo com um propósito?",
      "O que te impede de sonhar grande?",
      "Qual é a menor ação que teria o maior impacto na sua vida?",
      "Você se sente preso numa vida que não escolheu?",
      "O que te conecta com algo maior que você?",
      "Se pudesse começar um movimento, qual seria?",
      "Qual é a pergunta que, se respondida, mudaria tudo?",
      "Você está desperdiçando tempo com coisas que não importam?",
      "O que te faz sentir vivo de verdade?",
      "Qual é a coisa mais importante que você pode fazer hoje?",
      "Você está vivendo ou apenas existindo?",
      "O que te daria paz se alcançasse?",
      "Qual é o medo que te separa do seu propósito?",
      "Você está disposto a falhar em busca do que importa?",
      "O que significaria viver sem arrependimentos?",
      "Qual é a coragem que você precisa ter amanhã?",
      "Você sabe a diferença entre estar ocupado e ser produtivo?",
      "O que te faz sentir que faz parte de algo especial?",
      "Se pudesse mudar o mundo de uma forma, qual seria?",
      "Qual é a contribuição única que só você pode dar?",
      "Você está seguindo seu coração ou a opinião dos outros?",
      "O que te faria dizer 'valeu a pena' no fim de tudo?",
      "Qual é o chamado que você está ignorando?",
      "Você tem clareza sobre o que realmente importa?",
      "O que te faz querer ser uma pessoa melhor?",
      "Se pudesse deixar uma mensagem para o futuro, qual seria?",
      "Qual é a versão da sua vida que te faria sorrir aos 80?",
      "Você está construindo algo que vai durar?",
      "O que te inspira quando a motivação acaba?",
      "Qual é a sua razão para continuar tentando?",
      "Você está pronto para viver a vida que sempre quis?",
      "O que aconteceria se você parasse de adiar seus sonhos?",
      "Qual é o impacto que você quer ter antes de partir?",
      "Você se sente grato pelo que faz ou preso no que faz?",
      "O que te faz sentir conectado ao seu eu mais profundo?",
      "Qual é o significado que você escolhe dar à sua vida?",
      "Você acredita que ainda pode mudar o rumo de tudo?",
      "O que te faz levantar a cabeça nos dias sem esperança?",
      "Qual é a obra que você quer deixar para trás?",
      "Você está vivendo seus valores ou apenas falando sobre eles?",
      "O que a vida está tentando te ensinar agora?",
      "Qual é o próximo passo mais honesto que você pode dar?",
      "Você sente que está no lugar certo, fazendo a coisa certa?",
      "O que significaria viver com propósito a partir de hoje?",
    ],
  },
  relationships: {
    title: "Relações",
    emoji: "🤍",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    questions: [
      "Em que relacionamentos você é 100% você mesmo?",
      "Qual conversa você está evitando ter?",
      "O que você precisa ouvir mas ninguém te diz?",
      "Quem você seria se nunca tivesse conhecido a pessoa mais importante da sua vida?",
      "Você ama ou tem medo de ficar sozinho?",
      "Qual ferida antiga ainda controla seus relacionamentos?",
      "O que você pede dos outros que não dá para si mesmo?",
      "Se pudesse dizer uma verdade para alguém sem consequências, o que diria?",
      "Você atrai as pessoas certas ou repete os mesmos padrões?",
      "O que te faz confiar em alguém?",
      "Qual é a coisa mais bonita que alguém já fez por você?",
      "Você sabe amar sem querer mudar a pessoa?",
      "O que te machuca mais: ser ignorado ou ser rejeitado?",
      "Qual relação da sua vida precisa de um pedido de desculpas?",
      "Você é emocionalmente disponível para as pessoas que ama?",
      "O que você aprendeu com o relacionamento que mais te machucou?",
      "Qual é a sua linguagem do amor?",
      "Você comunica o que sente ou espera que adivinhem?",
      "O que te faz sentir amado de verdade?",
      "Qual é a relação mais difícil da sua vida agora?",
      "Você sabe receber carinho sem se sentir desconfortável?",
      "O que te faz afastar as pessoas?",
      "Qual é a coisa que mais te atrai numa pessoa?",
      "Você perdoa de verdade ou guarda ressentimento?",
      "O que te impede de se abrir com quem ama?",
      "Qual é o maior aprendizado que uma amizade te deu?",
      "Você sabe estar presente numa relação sem querer controlar?",
      "O que te faz sentir sozinho mesmo rodeado de pessoas?",
      "Qual é a relação que mais te transformou e por quê?",
      "Você tem medo de depender de alguém?",
      "O que você precisa curar para amar melhor?",
      "Qual é a pessoa que mais te inspira e por quê?",
      "Você se sente visto pelas pessoas da sua vida?",
      "O que você faria para reconquistar alguém importante?",
      "Qual é a fronteira que você precisa colocar numa relação?",
      "Você sabe a diferença entre cuidar e sufocar?",
      "O que te faz ter ciúmes e o que isso revela?",
      "Qual é a conversa mais importante que já teve na vida?",
      "Você tem coragem de ser vulnerável com quem ama?",
      "O que te impede de pedir ajuda?",
      "Qual é a pessoa que mais te conhece no mundo?",
      "Você se sente merecedor de ser amado?",
      "O que você faria se perdesse a pessoa mais importante da sua vida?",
      "Qual é o maior ato de coragem que o amor te pediu?",
      "Você trata as pessoas como quer ser tratado?",
      "O que significa lealdade para você?",
      "Qual é a relação que te ensinou mais sobre si mesmo?",
      "Você sabe lidar com conflito sem fugir ou atacar?",
      "O que te faz querer ficar perto de alguém?",
      "Qual é o maior presente que alguém pode te dar?",
      "Você se culpa quando uma relação acaba?",
      "O que te impede de confiar plenamente?",
      "Qual é a expectativa irreal que você coloca nas pessoas?",
      "Você sabe amar sem esperar nada em troca?",
      "O que te faz sentir seguro numa relação?",
      "Qual é o perdão que você ainda precisa dar?",
      "Você atrai pessoas que te completam ou que te desafiam?",
      "O que aconteceria se você fosse honesto sobre seus sentimentos?",
      "Qual é a relação da sua vida que merece mais atenção?",
      "Você se sente confortável com intimidade emocional?",
      "O que te faz ter medo de compromisso?",
      "Qual é a coisa mais difícil sobre amar alguém?",
      "Você sabe ouvir sem querer consertar?",
      "O que te faz sentir conectado a outra pessoa?",
      "Qual é a mágoa que você precisa soltar para seguir em frente?",
      "Você se entrega nos relacionamentos ou se protege?",
      "O que mudaria na sua vida se você amasse sem medo?",
      "Qual é a verdade que alguém precisava te dizer antes?",
      "Você tem medo de ser abandonado?",
      "O que te faz sentir que pertence a algum lugar?",
      "Qual é a relação mais sincera da sua vida?",
      "Você sabe estar feliz pela felicidade do outro?",
      "O que te impede de se comprometer de verdade?",
      "Qual é a coisa mais gentil que você pode fazer por alguém hoje?",
      "Você se sente compreendido pelas pessoas à sua volta?",
      "O que significaria amar sem apego?",
      "Qual é a lição mais dura que o amor te ensinou?",
      "Você sabe reconhecer quando uma relação é tóxica?",
      "O que te faz querer cuidar de alguém?",
      "Qual é a memória mais bonita que você tem com alguém?",
      "Você se comunica bem ou assume que os outros sabem o que sente?",
      "O que te faz sentir que uma amizade é verdadeira?",
      "Qual é a pessoa que te faz querer ser melhor?",
      "Você tem medo de mostrar quem realmente é num relacionamento?",
      "O que aconteceria se você dissesse tudo que guarda dentro de si?",
      "Qual é o limite que você não negocia numa relação?",
      "Você sabe ser forte sem ser frio?",
      "O que te faz sentir que vale a pena investir numa pessoa?",
      "Qual é a coisa que mais sente falta em relações passadas?",
      "Você está disponível para o amor ou se esconde dele?",
      "O que significa uma conexão profunda para você?",
      "Qual é a coisa mais importante que aprendeu sobre amar?",
      "Você sabe respeitar o espaço do outro sem se sentir rejeitado?",
      "O que te faz sentir que um relacionamento está funcionando?",
      "Qual é a parte mais difícil de manter uma relação?",
      "Você escolhe quem ama ou simplesmente acontece?",
      "O que te faz ter esperança no amor?",
      "Qual é a maior força de um relacionamento que você já viveu?",
      "Você é bom em pedir desculpas?",
      "O que te faz sentir grato pelas pessoas da sua vida?",
      "Qual é a coisa que mais te assusta sobre amar profundamente?",
      "Você está pronto para amar sem medo?",
      "O que te faz sentir que alguém te conhece de verdade?",
      "Qual é a relação que mudou quem você é?",
      "Você trata a si mesmo tão bem quanto trata quem ama?",
      "O que te impede de viver relações mais leves?",
      "Qual é a qualidade que mais valoriza nas pessoas?",
      "Você sabe quando é hora de ir embora?",
      "O que te faz lutar por uma relação?",
      "Qual é a sua maior dificuldade em se relacionar?",
      "Você acredita que existe 'a pessoa certa'?",
      "O que significaria ter relações mais honestas na sua vida?",
      "Qual é a coisa mais importante que alguém te ensinou sobre amor?",
      "Você está construindo relações que te fazem crescer?",
      "O que te faz sentir que não está sozinho nesse mundo?",
      "Qual é o próximo passo para ter relações mais saudáveis?",
      "Você ama as pessoas como elas são ou como quer que sejam?",
      "O que aconteceria se você se permitisse ser amado de verdade?",
    ],
  },
  uncertainty: {
    title: "Incerteza",
    emoji: "🌫️",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    questions: [
      "Se soubesse que vai dar certo, o que tentaria?",
      "Qual é o pior cenário que você imagina e ele é realista?",
      "O que você ganharia se parasse de controlar tudo?",
      "Qual decisão você está adiando por medo?",
      "O que o caos pode te ensinar que a ordem não pode?",
      "Quando a última vez que você se jogou sem rede de segurança?",
      "O que é pior: tentar e falhar ou nunca tentar?",
      "Que certeza você precisa largar para crescer?",
      "Você vive planejando tanto que esquece de viver?",
      "O que te assusta mais: o desconhecido ou ficar onde está?",
      "Qual é a decisão mais difícil que você precisa tomar agora?",
      "Você confia no processo mesmo sem ver o resultado?",
      "O que aconteceria se você soltasse o controle por um dia?",
      "Qual é a incerteza que mais te paralisa?",
      "Você consegue encontrar beleza no não saber?",
      "O que te impede de dar o primeiro passo?",
      "Qual é o risco que vale a pena correr?",
      "Você precisa de um plano perfeito para agir?",
      "O que te daria coragem para aceitar o imprevisível?",
      "Qual é a segurança falsa que você se apega?",
      "Você tem medo de tomar a decisão errada?",
      "O que mudaria se você aceitasse que não existe resposta certa?",
      "Qual é a pior coisa que pode acontecer e você sobreviveria?",
      "Você já perdeu algo bom por ter esperado demais?",
      "O que te impede de confiar no futuro?",
      "Qual é a parte mais difícil de não saber o que vem depois?",
      "Você consegue ficar em paz com a ambiguidade?",
      "O que te ensinou a lidar melhor com a incerteza?",
      "Qual é a zona de conforto que está te prendendo?",
      "Se pudesse eliminar uma dúvida da sua vida, qual seria?",
      "Você age mais por medo ou por fé?",
      "O que aconteceria se você confiasse mais em si mesmo?",
      "Qual é a mudança que você precisa mas tem medo de fazer?",
      "Você está esperando o momento perfeito que nunca chega?",
      "O que a incerteza já te ensinou de bom?",
      "Qual foi a melhor decisão que você tomou sem pensar demais?",
      "Você sabe a diferença entre cautela e paralisia?",
      "O que te impede de ser espontâneo?",
      "Qual é a ansiedade que governa suas escolhas?",
      "Você se prepara demais para cenários que nunca acontecem?",
      "O que te daria paz no meio do caos?",
      "Qual é o medo que você está alimentando sem perceber?",
      "Você confia que vai ficar tudo bem mesmo sem garantias?",
      "O que aconteceria se você parasse de se preocupar com o futuro?",
      "Qual é a coisa mais corajosa que a incerteza te pediu?",
      "Você tem medo de perder o que tem?",
      "O que te segura numa situação que já deveria ter saído?",
      "Qual é a pressão que você coloca em si para ter tudo resolvido?",
      "Você já encontrou algo melhor depois de perder algo que amava?",
      "O que te impede de aceitar que não sabe tudo?",
      "Qual é a maior lição que a espera te ensinou?",
      "Você vive mais no passado, presente ou futuro?",
      "O que aconteceria se você dissesse sim ao desconhecido?",
      "Qual é a coragem que te falta para mudar de rumo?",
      "Você consegue ver a incerteza como uma aventura?",
      "O que te faz querer controlar tudo ao seu redor?",
      "Qual é o plano B que você nunca explorou?",
      "Você se permite improvisar na vida?",
      "O que aconteceria se todas as suas certezas caíssem?",
      "Qual é a crença limitante que te prende ao medo?",
      "Você sabe navegar sem mapa?",
      "O que te dá forças quando o chão some?",
      "Qual é a transformação que a incerteza está pedindo de você?",
      "Você está preso na análise ou pronto para a ação?",
      "O que te faz ter esperança mesmo sem certezas?",
      "Qual é a coisa que te dá mais medo perder?",
      "Você se permite estar confuso sem precisar de uma resposta imediata?",
      "O que aconteceria se você parasse de resistir ao que não controla?",
      "Qual é a decisão que, se tomada, libertaria você?",
      "Você tem medo de mudar de ideia?",
      "O que te impede de simplesmente tentar?",
      "Qual é a pressão que te paralisa mais?",
      "Você confia no tempo?",
      "O que te faz sentir seguro quando tudo é incerto?",
      "Qual é a coisa mais bonita que nasceu de algo inesperado na sua vida?",
      "Você está lutando contra a maré ou aprendendo a surfar?",
      "O que te impede de soltar o que não funciona mais?",
      "Qual é a fé que te sustenta nos dias sombrios?",
      "Você sabe aceitar o que não pode mudar?",
      "O que te faz acreditar que vai dar certo?",
      "Qual é o salto de fé que você precisa dar?",
      "Você está vivendo com medo ou com coragem?",
      "O que a vida te ensinou sobre planos que deram errado?",
      "Qual é a incerteza que, se abraçada, te libertaria?",
      "Você tem coragem de recomeçar quantas vezes forem necessárias?",
      "O que aconteceria se você escolhesse a paz ao invés do controle?",
      "Qual é a verdade que a incerteza esconde?",
      "Você está pronto para o que não planejou?",
      "O que te impede de confiar no caminho?",
      "Qual é a maior aventura que a vida te ofereceu sem aviso?",
      "Você consegue encontrar força na vulnerabilidade?",
      "O que te faz sentir que está tudo desabando?",
      "Qual é a coragem que nasce do medo?",
      "Você sabe se render ao que não controla?",
      "O que te sustenta quando não há certezas?",
      "Qual é a surpresa que a vida pode estar te preparando?",
      "Você acredita que o melhor ainda está por vir?",
      "O que te faz continuar andando quando não vê o caminho?",
      "Qual é a paz que existe no meio da tempestade?",
      "Você está resistindo ou fluindo?",
      "O que te ensinaria a abraçar o desconhecido?",
      "Qual é a mudança que a incerteza está trazendo para sua vida?",
      "Você confia que há algo maior cuidando de você?",
      "O que te dá coragem para enfrentar o amanhã?",
      "Qual é a beleza que existe em não saber o que vem depois?",
      "Você está pronto para soltar e confiar?",
      "O que te faz sentir forte mesmo na dúvida?",
      "Qual é a lição mais preciosa que o inesperado te deu?",
      "Você tem fé suficiente para dar o próximo passo sem ver a escada?",
      "O que te impede de aceitar que a vida é uma surpresa constante?",
      "Qual é a certeza interna que nenhuma incerteza pode tirar de você?",
      "Você está pronto para viver sem garantias e mesmo assim ser feliz?",
    ],
  },
  growth: {
    title: "Crescimento",
    emoji: "🌱",
    color: "from-lime-500 to-green-600",
    bg: "bg-lime-500/10",
    border: "border-lime-500/20",
    questions: [
      "Que dor você precisa aceitar para evoluir?",
      "Qual hábito está te impedindo de ser quem você quer ser?",
      "O que a versão de você daqui a 10 anos diria para você hoje?",
      "Qual é a mentira que você mais conta para si mesmo?",
      "O que você precisa desaprender?",
      "Quando foi a última vez que você fez algo pela primeira vez?",
      "Que medo, se superado, mudaria tudo na sua vida?",
      "Você está crescendo ou apenas ficando mais velho?",
      "O que te impede de sair da zona de conforto?",
      "Qual é o hábito que mais te beneficiaria se começasse hoje?",
      "Você aceita feedback ou se defende automaticamente?",
      "O que a dor te ensinou que o conforto não poderia?",
      "Qual é a versão de você que quer matar para evoluir?",
      "Você tem coragem de abandonar quem você era?",
      "O que te segura no passado?",
      "Qual é o medo que está disfarçado de preguiça?",
      "O que você precisa enfrentar que está evitando?",
      "Qual é o limite que você impõe a si mesmo?",
      "Você está aprendendo com seus erros ou repetindo eles?",
      "O que mudaria se você investisse em si mesmo por 1 ano?",
      "Qual é a disciplina que mais te falta?",
      "Você sabe pedir ajuda quando precisa?",
      "O que te faz desistir antes de ver resultados?",
      "Qual é a mentalidade que precisa mudar para você avançar?",
      "Você se permite ser iniciante em algo?",
      "O que aconteceria se você parasse de procrastinar?",
      "Qual é a pessoa que você admira e o que pode aprender com ela?",
      "Você sabe a diferença entre paciência e conformismo?",
      "O que te faz ter medo de evoluir?",
      "Qual é o sacrifício que o crescimento exige de você?",
      "Você está confortável demais para crescer?",
      "O que te impede de ser consistente?",
      "Qual é a crença que te limita?",
      "Você se desafia o suficiente?",
      "O que aconteceria se você levasse a sério os seus sonhos?",
      "Qual é a competência que você precisa desenvolver?",
      "Você trata seus fracassos como lições ou punições?",
      "O que te faz querer evoluir?",
      "Qual é o próximo nível que você precisa alcançar?",
      "Você está investindo no que realmente importa?",
      "O que te impede de ler mais, estudar mais, praticar mais?",
      "Qual é a rotina que te transformaria em 6 meses?",
      "Você tem coragem de ser honesto sobre suas fraquezas?",
      "O que te faz voltar atrás nas suas decisões?",
      "Qual é a pergunta mais importante que pode se fazer?",
      "Você está fazendo o mínimo ou dando o seu melhor?",
      "O que aconteceria se você não tivesse medo de falhar?",
      "Qual é a lição que a vida está repetindo porque você não aprendeu?",
      "Você celebra suas pequenas vitórias?",
      "O que te impede de ter disciplina?",
      "Qual é o custo de não mudar?",
      "Você está crescendo na direção certa?",
      "O que te faz desconfortável e deveria fazer mais?",
      "Qual é a conversa que você precisa ter consigo mesmo?",
      "Você sabe transformar dor em combustível?",
      "O que te faz ter medo de ser grande?",
      "Qual é a decisão difícil que vai te levar aonde quer?",
      "Você está disposto a ser desconfortável por um tempo?",
      "O que significa amadurecer para você?",
      "Qual é a coisa mais importante que aprendeu esse ano?",
      "Você está satisfeito com o ritmo do seu crescimento?",
      "O que te segura numa mentalidade fixa?",
      "Qual é o erro que mais te ensinou na vida?",
      "Você sabe diferenciar evolução de perfeição?",
      "O que te motiva nos dias que não quer continuar?",
      "Qual é a atitude que mais te ajudaria agora?",
      "Você está usando suas dificuldades como desculpa ou degrau?",
      "O que aconteceria se você se comprometesse de verdade?",
      "Qual é a verdade que aceitar te faria crescer?",
      "Você está se comparando com os outros ou com quem era antes?",
      "O que te impede de ser a melhor versão de si?",
      "Qual é a paciência que o crescimento exige de você?",
      "Você confia no seu processo?",
      "O que te faz sentir que está evoluindo?",
      "Qual é o hábito tóxico que precisa eliminar?",
      "Você está escolhendo crescer ou está sendo forçado?",
      "O que te daria mais confiança se dominasse?",
      "Qual é a responsabilidade que está evitando assumir?",
      "Você se permite fracassar sem se destruir?",
      "O que aconteceria se dedicasse 1 hora por dia ao seu desenvolvimento?",
      "Qual é o medo que está disfarçado de racionalidade?",
      "Você está crescendo em todas as áreas da vida ou só em uma?",
      "O que te impede de cuidar melhor de si?",
      "Qual é a humildade que o crescimento exige?",
      "Você sabe quando precisa parar e quando precisa avançar?",
      "O que te faz sentir que está estagnado?",
      "Qual é a coragem que precisa ter para mudar?",
      "Você está plantando ou só colhendo?",
      "O que a pessoa mais evoluída que conhece faria no seu lugar?",
      "Qual é o investimento mais importante que pode fazer em si?",
      "Você está aberto a aprender com qualquer pessoa?",
      "O que te impede de perdoar a si mesmo e seguir?",
      "Qual é o progresso invisível que não está reconhecendo?",
      "Você sabe que crescer dói e está disposto a sentir?",
      "O que te traria mais paz: perfeição ou progresso?",
      "Qual é a coisa que precisa começar e está adiando?",
      "Você está crescendo com propósito ou por pressão?",
      "O que te faz acreditar que pode ser melhor?",
      "Qual é a maior transformação que já viveu?",
      "Você está pronto para o próximo capítulo da sua vida?",
      "O que te faz sentir que ainda tem muito a aprender?",
      "Qual é a coisa mais simples que faria diferença na sua rotina?",
      "Você está indo devagar, mas está indo?",
      "O que aconteceria se você nunca parasse de evoluir?",
      "Qual é a força que vem das suas cicatrizes?",
      "Você agradece pelo que já conquistou?",
      "O que te faz querer ser melhor amanhã do que foi hoje?",
      "Qual é o passo mais honesto que pode dar agora?",
      "Você acredita que sempre é possível recomeçar?",
      "O que te impede de acreditar no seu potencial?",
      "Qual é a semente que está plantando hoje?",
      "Você sabe que o crescimento é um caminho sem fim?",
      "O que te faz sentir orgulho do seu progresso?",
      "Qual é a lição que quer passar para quem vem depois de você?",
      "Você está disposto a ser paciente consigo mesmo?",
      "O que significaria dar o melhor de si todos os dias?",
      "Qual é a graça que existe em ser um trabalho em progresso?",
      "Você está pronto para crescer sem pressa, mas sem pausa?",
    ],
  },
  solitude: {
    title: "Solidão",
    emoji: "🌙",
    color: "from-indigo-500 to-blue-600",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    questions: [
      "Você gosta da sua própria companhia ou apenas a tolera?",
      "O que o silêncio te diz quando você finalmente para?",
      "Qual é a diferença entre estar sozinho e se sentir só?",
      "O que você descobre sobre si mesmo quando ninguém está por perto?",
      "Você busca pessoas por conexão ou por medo do vazio?",
      "Qual pensamento aparece quando você não tem distrações?",
      "A solidão é sua amiga ou sua inimiga?",
      "O que falta na sua relação consigo mesmo?",
      "Você consegue ficar em silêncio sem pegar o celular?",
      "O que te assusta sobre estar completamente sozinho?",
      "Qual é a atividade que mais gosta de fazer sozinho?",
      "Você se sente mais você quando está só?",
      "O que o vazio te ensina quando você para de fugir dele?",
      "Qual é a companhia que você precisa encontrar em si mesmo?",
      "Você usa pessoas para não ficar sozinho?",
      "O que aconteceria se você passasse um fim de semana inteiro sozinho?",
      "Qual é o pensamento que mais aparece nos momentos de silêncio?",
      "Você tem medo do que pode descobrir sobre si na solidão?",
      "O que te faz sentir mais sozinho: a presença de pessoas erradas ou a ausência de pessoas certas?",
      "Qual é a paz que só a solidão pode te dar?",
      "Você sabe se entreter sem telas?",
      "O que a solidão revela sobre suas necessidades?",
      "Qual é a diferença entre solidão escolhida e solidão imposta?",
      "Você se sente completo sozinho?",
      "O que te faz evitar ficar a sós com seus pensamentos?",
      "Qual é a liberdade que a solidão oferece?",
      "Você consegue apreciar um momento sem precisar compartilhar?",
      "O que te faz sentir em paz quando está sozinho?",
      "Qual é o barulho interno que o silêncio externo revela?",
      "Você se conhece melhor na companhia ou na solidão?",
      "O que a solidão te ensinou que nenhuma pessoa poderia?",
      "Qual é a relação entre solidão e criatividade na sua vida?",
      "Você se sente abandonado ou livre quando está só?",
      "O que te impede de aproveitar o tempo sozinho?",
      "Qual é a conversa mais importante que tem consigo mesmo?",
      "Você precisa de validação constante para se sentir bem?",
      "O que aconteceria se você abraçasse a solidão ao invés de fugir?",
      "Qual é a memória que mais te conforta nos momentos solitários?",
      "Você se sente culpado por querer ficar sozinho?",
      "O que a noite te diz quando tudo fica quieto?",
      "Qual é a companhia que não pode ser substituída?",
      "Você sabe estar só sem se sentir incompleto?",
      "O que te faz buscar distrações constantemente?",
      "Qual é o medo que mora por trás da necessidade de companhia?",
      "Você já encontrou respostas importantes na solidão?",
      "O que te faz sentir que precisa de alguém ao lado?",
      "Qual é a maior descoberta que fez em um momento de silêncio?",
      "Você consegue diferenciar solidão de depressão?",
      "O que te nutre quando ninguém está olhando?",
      "Qual é o ritual que mais te conecta consigo mesmo?",
      "Você se sente à vontade para jantar sozinho?",
      "O que te faz sentir vivo nos momentos de quietude?",
      "Qual é a força que vem de saber estar só?",
      "Você precisa de barulho para não pensar?",
      "O que aconteceria se você ouvisse mais o seu silêncio?",
      "Qual é a parte mais bonita de estar sozinho?",
      "Você confunde solidão com fracasso?",
      "O que a solidão te revela sobre seus relacionamentos?",
      "Qual é a prática que te faz sentir em paz sozinho?",
      "Você se sente mais autêntico quando está só?",
      "O que te impede de cultivar uma relação saudável com a solidão?",
      "Qual é o presente que a solidão pode te dar?",
      "Você já se sentiu mais acompanhado estando sozinho?",
      "O que te faz correr das suas próprias emoções?",
      "Qual é a meditação que a solidão naturalmente oferece?",
      "Você sabe se acalmar sem a presença de outra pessoa?",
      "O que te faz sentir que precisa preencher cada silêncio?",
      "Qual é a lição mais profunda que a solidão te deu?",
      "Você se ama o suficiente para estar consigo mesmo?",
      "O que te faz sentir reconectado quando está perdido?",
      "Qual é a sabedoria que só vem no silêncio?",
      "Você está fugindo de si mesmo ao evitar a solidão?",
      "O que aconteceria se dedicasse 30 minutos por dia ao silêncio?",
      "Qual é a emoção que a solidão mais desperta em você?",
      "Você consegue ser grato pela solidão?",
      "O que a solidão te mostra sobre o que realmente importa?",
      "Qual é o conforto que encontra em momentos de quietude?",
      "Você sabe a diferença entre estar sozinho e ser solitário?",
      "O que te faz sentir que está em boa companhia consigo mesmo?",
      "Qual é a cura que a solidão oferece para a alma?",
      "Você tem coragem de encarar o silêncio sem medo?",
      "O que aconteceria se você parasse de ter medo de estar só?",
      "Qual é a beleza que existe em ser sua própria companhia?",
      "Você sabe que a solidão pode ser um lugar de força?",
      "O que te faz sentir que está se encontrando nos momentos sós?",
      "Qual é a voz interna que mais precisa ouvir?",
      "Você consegue transformar solidão em serenidade?",
      "O que te faz sentir inteiro sem precisar de ninguém?",
      "Qual é a maior aventura que a solidão já te levou?",
      "Você está em paz com o silêncio ou lutando contra ele?",
      "O que a solidão te ensinou sobre o amor?",
      "Qual é o momento do dia que mais gosta de estar sozinho?",
      "Você se sente conectado ao universo nos momentos de solidão?",
      "O que te faz sentir que a solidão é necessária?",
      "Qual é a história que conta a si mesmo quando está só?",
      "Você encontra Deus, sentido ou propósito na solidão?",
      "O que te faz sentir que a solidão é sagrada?",
      "Qual é a transformação que acontece quando você aceita estar só?",
      "Você está pronto para fazer as pazes com a solidão?",
      "O que aconteceria se a solidão fosse sua maior professora?",
      "Qual é a música que mais combina com seus momentos solitários?",
      "Você sabe que estar sozinho não significa estar desamparado?",
      "O que a solidão revela sobre a sua relação com o tempo?",
      "Qual é a gratidão que sente por poder estar consigo mesmo?",
      "Você está aprendendo a amar a solidão ou apenas a suportar?",
      "O que te faz sentir que momentos sós são momentos de ouro?",
      "Qual é a paz que mora dentro de você e só aparece no silêncio?",
      "Você sabe que a solidão é um convite, não uma punição?",
      "O que te faz sentir completo quando mais ninguém está por perto?",
      "Qual é a lição final que a solidão quer te ensinar?",
      "Você está pronto para abraçar o silêncio e encontrar a si mesmo?",
    ],
  },
};

const CONVERSATION_QUESTIONS: Record<string, { title: string; emoji: string; color: string; questions: string[] }> = {
  amigos: {
    title: "Entre Amigos",
    emoji: "🤝",
    color: "from-sky-500 to-blue-600",
    questions: [
      "Qual é a coisa mais difícil que você já passou e nunca contou pra gente?",
      "Se você pudesse mudar uma coisa na nossa amizade, o que seria?",
      "Quando foi a última vez que eu te decepcionei sem saber?",
      "O que você admira em mim que nunca disse?",
      "Qual é o seu maior medo que seus amigos não sabem?",
      "Se a gente se conhecesse hoje, você acha que seríamos amigos?",
      "O que você gostaria que eu te perguntasse mais?",
      "Qual conselho meu você ignorou e se arrependeu?",
      "O que te incomoda em mim mas você nunca falou?",
      "Se pudesse voltar no tempo, mudaria algum momento nosso?",
      "Você sente que pode ser 100% você mesmo com a gente?",
      "Qual é a mentira mais boba que você já contou pra gente?",
      "Qual é a coisa que mais te chateia numa amizade?",
      "Você já sentiu inveja de algum de nós? De quê?",
      "Qual é o momento mais engraçado que tivemos juntos?",
      "Se pudesse mudar algo no passado do nosso grupo, o que seria?",
      "O que te faz confiar em alguém?",
      "Qual é a coisa que você mais valoriza numa amizade?",
      "Você acha que me conhece de verdade?",
      "Se um de nós precisasse de ajuda séria, como reagiria?",
      "Qual foi o melhor conselho que um amigo te deu?",
      "Você já se afastou de um amigo sem explicar por quê?",
      "O que te faz querer manter uma amizade por muitos anos?",
      "Se pudesse agradecer a um amigo por uma coisa, o que seria?",
      "Qual é a maior prova de amizade que já recebeu?",
      "Você tem medo de perder amigos com o tempo?",
      "O que mudou na nossa amizade desde o início?",
      "Qual é a coisa que nunca deveria mudar entre a gente?",
      "Você prefere poucos amigos de verdade ou muitos conhecidos?",
      "Qual é a sua maior insegurança em relação às amizades?",
      "Se pudesse apresentar todos os seus amigos, o que diria sobre mim?",
      "Você sente que dá mais do que recebe nas amizades?",
      "Qual é a memória mais bonita que tem com um amigo?",
      "O que te faz sentir incluído num grupo?",
      "Você já fingiu estar bem para não preocupar os amigos?",
      "Qual é a maior diferença entre amizade online e presencial?",
      "Se pudesse passar um dia inteiro com um amigo, o que fariam?",
      "O que um amigo pode fazer que é imperdoável para você?",
      "Qual é a qualidade que mais procura num amigo?",
      "Você já deixou de ser amigo de alguém por ciúmes?",
      "O que te faz rir mais com os amigos?",
      "Qual é o segredo que compartilha apenas com o melhor amigo?",
      "Se um amigo te pedisse para mudar algo, você mudaria?",
      "Você acha que amizade verdadeira resiste a tudo?",
      "Qual é a maior lição que aprendeu com uma amizade que acabou?",
      "O que te faz sentir grato pelos amigos que tem?",
      "Você é bom em fazer novos amigos?",
      "Qual é a coisa mais corajosa que um amigo já fez por você?",
      "Se pudesse reviver um dia com os amigos, qual seria?",
      "O que te faz sentir que uma amizade é genuína?",
      "Você já mudou por causa de uma amizade?",
      "Qual é o momento que mais te emocionou com um amigo?",
      "O que te faz sentir que pode contar com alguém?",
      "Você se considera um bom amigo?",
      "Qual é a maior aventura que viveu com amigos?",
      "O que te faz sentir que pertence ao grupo?",
      "Você já se sacrificou por um amigo?",
      "Qual é a coisa que mais te diverte em grupo?",
      "O que te faz querer estar mais presente para os amigos?",
      "Qual é a coisa mais importante que um amigo te ensinou?",
      "Se pudesse dar um presente especial a cada amigo, qual seria?",
      "Você acha que somos amigos para sempre?",
      "Qual é o sonho que compartilha com os amigos?",
      "O que te faz sentir que essa amizade vale a pena?",
      "Você já se arrependeu de algo que disse a um amigo?",
      "Qual é a tradição do grupo que mais gosta?",
      "O que te faz sentir em casa com os amigos?",
      "Se a gente se separasse, do que sentiria mais falta?",
      "Qual é o apelido mais engraçado que já teve?",
      "Você acha que amigos devem se meter na vida um do outro?",
      "O que te faz sentir orgulho dos seus amigos?",
      "Qual é a coisa mais boba que já brigamos?",
      "Se pudesse viajar com um amigo pra qualquer lugar, onde seria?",
      "O que te faz querer melhorar por causa dos amigos?",
      "Qual é a maior prova de lealdade que já deu?",
      "Você se sente compreendido pelos seus amigos?",
      "O que te faz sentir que essa amizade é especial?",
      "Qual é a coisa mais difícil de dizer para um amigo?",
      "Você já chorou por causa de uma amizade?",
      "O que te faz sorrir quando pensa nos amigos?",
      "Qual é o maior presente que a amizade te deu na vida?",
      "Se pudesse mudar o mundo com os amigos, o que fariam?",
      "O que essa amizade te ensinou sobre você mesmo?",
      "Qual é a promessa que quer fazer pros amigos?",
      "Você já se sentiu sozinho mesmo tendo amigos?",
      "O que te faz querer ser um amigo melhor?",
      "Qual é a coisa que nunca disse pros amigos e gostaria?",
      "Se tivesse que escolher uma palavra pra nossa amizade, qual seria?",
      "O que te faz ter certeza de que somos amigos de verdade?",
      "Qual é a melhor coisa de ter amigos?",
      "Você acha que amizade precisa de esforço ou é natural?",
      "O que gostaria de viver com os amigos nos próximos anos?",
      "Qual é a coisa mais honesta que pode dizer pro grupo agora?",
      "Você está feliz com as amizades que tem?",
      "O que faria diferente se pudesse começar as amizades de novo?",
      "Qual é a qualidade do grupo que mais admira?",
      "Você acredita que amizade cura?",
      "O que gostaria de agradecer ao grupo inteiro?",
      "Qual é a coisa mais bonita que já vivemos juntos?",
      "O que espera dessa amizade daqui pra frente?",
      "Qual é a frase que define nossa amizade?",
      "Você sabe o quanto é importante pra gente?",
      "O que te faz sentir que nunca vai esquecer esse grupo?",
      "Qual é a coisa que mais valoriza em cada um de nós?",
      "Se pudesse congelar um momento nosso, qual seria?",
      "O que te faz acreditar que essa amizade vai durar?",
      "Qual é a maior felicidade que os amigos te deram?",
      "Você tem orgulho de ser nosso amigo?",
      "O que diria para nós se fosse a última vez que conversássemos?",
      "Qual é o sentimento mais forte que sente pelo grupo?",
      "Você sabe que essa amizade mudou sua vida?",
      "O que gostaria que soubéssemos sobre você?",
      "Qual é a coisa mais importante que quer que a gente saiba?",
      "Você nos ama do jeito que somos?",
      "O que essa amizade significa para você em uma frase?",
    ],
  },
  casal: {
    title: "Casal",
    emoji: "💕",
    color: "from-rose-500 to-pink-600",
    questions: [
      "O que eu faço que te faz sentir mais amado(a)?",
      "Qual é o seu maior medo sobre nós dois?",
      "O que você sente falta de quando começamos a namorar?",
      "Se pudesse mudar uma coisa em mim, o que seria?",
      "Qual foi o momento que você mais sentiu orgulho de nós?",
      "O que você precisa de mim que tem medo de pedir?",
      "Como você se imagina daqui a 10 anos comigo?",
      "Qual foi a vez que mais te machuquei sem perceber?",
      "O que te faz duvidar de nós?",
      "Se pudesse reviver um momento nosso, qual seria?",
      "O que você acha que falta na nossa relação?",
      "Qual é a coisa mais difícil de amar em mim?",
      "Quando você soube que me amava de verdade?",
      "O que te faz sentir seguro(a) ao meu lado?",
      "Qual é a coisa que mais admira em nós como casal?",
      "O que eu faço que te irrita mas você nunca disse?",
      "Qual é o nosso ponto forte como casal?",
      "O que te faz querer continuar comigo?",
      "Qual foi a briga mais boba que tivemos?",
      "Se pudesse melhorar uma coisa na nossa comunicação, o que seria?",
      "O que te faz sentir mais conectado(a) a mim?",
      "Qual é a coisa que mais sente falta quando estamos separados?",
      "Você se sente ouvido(a) por mim?",
      "Qual é o seu maior sonho para nós dois?",
      "O que eu poderia fazer mais por você?",
      "Qual é a memória mais bonita do nosso relacionamento?",
      "Você se sente livre para ser você mesmo(a) comigo?",
      "O que te faz ter ciúmes e como posso ajudar?",
      "Qual é a coisa mais romântica que gostaria de viver comigo?",
      "Você acha que crescemos juntos como casal?",
      "O que te faz rir sobre nós?",
      "Qual é a nossa maior conquista como casal?",
      "O que te faz sentir amado(a) no dia a dia?",
      "Qual é a coisa que mais te atrai em mim até hoje?",
      "Você se sente apoiado(a) nos seus sonhos?",
      "O que mudou em você desde que estamos juntos?",
      "Qual é o nosso desafio mais difícil como casal?",
      "O que te faz querer cuidar de mim?",
      "Qual é a coisa que nunca quer perder entre nós?",
      "Você confia plenamente em mim?",
      "O que te faz sentir que somos parceiros de verdade?",
      "Qual é a conversa que precisamos ter e estamos adiando?",
      "O que eu faço que te faz sentir especial?",
      "Qual é a coisa mais engraçada sobre nosso relacionamento?",
      "Você se sente prioridade na minha vida?",
      "O que te faz sentir vulnerável comigo?",
      "Qual é a música que mais combina com a gente?",
      "O que te faz querer ser uma pessoa melhor por nós?",
      "Se pudesse mudar o começo da nossa história, mudaria algo?",
      "Qual é a coisa que mais te surpreendeu sobre mim?",
      "Você sente que eu te entendo de verdade?",
      "O que te faz sentir que nosso amor é diferente?",
      "Qual é a nossa linguagem do amor como casal?",
      "O que te faz ter esperança sobre o nosso futuro?",
      "Qual é a coisa mais bonita que já fiz por você?",
      "Você se sente respeitado(a) nas suas decisões?",
      "O que te faz sentir que crescemos desde o início?",
      "Qual é a tradição que gostaria de criar como casal?",
      "O que te faz querer ficar comigo nos dias difíceis?",
      "Qual é o nosso momento do dia favorito?",
      "Você se sente atraído(a) por mim da mesma forma?",
      "O que te faz sentir que posso contar contigo?",
      "Qual é a coisa que gostaria que eu dissesse mais?",
      "Você acha que nos comunicamos bem?",
      "O que te faz sentir que estamos no caminho certo?",
      "Qual é a viagem que quer fazer comigo?",
      "O que te faz sentir que somos uma equipe?",
      "Qual é a coisa que mais te emociona sobre nós?",
      "Você se sente em casa ao meu lado?",
      "O que te faz sentir que nosso amor vale a pena?",
      "Qual é a coisa que te faz sentir mais perto de mim?",
      "Se pudesse descrever nosso amor em uma palavra, qual seria?",
      "O que te faz sorrir quando pensa em nós?",
      "Qual é a coisa que mais agradece sobre nós?",
      "Você se sente feliz comigo?",
      "O que gostaria de dizer pra mim que nunca disse?",
      "Qual é a coisa mais importante que aprendeu comigo?",
      "Você me escolheria de novo?",
      "O que te faz ter certeza de que estamos juntos por amor?",
      "Qual é a surpresa que gostaria de me fazer?",
      "O que te faz sentir grato(a) por nos ter encontrado?",
      "Qual é a maior prova de amor que já me deu?",
      "Você sabe o que eu mais amo em você?",
      "O que te faz sentir que somos perfeitos nas imperfeições?",
      "Qual é o abraço nosso que mais te marcou?",
      "O que te faz querer envelhecer comigo?",
      "Qual é a promessa que quer me fazer?",
      "Você se sente completo(a) ao meu lado?",
      "O que espera de nós daqui pra frente?",
      "Qual é a coisa mais simples que te faz feliz comigo?",
      "Você sabe o quanto é importante pra mim?",
      "O que te faz sentir que esse amor é real?",
      "Qual é a coisa que mais quer viver comigo?",
      "Se pudesse escrever nossa história, como seria o próximo capítulo?",
      "O que te faz acreditar no nosso amor?",
      "Você está feliz com a pessoa que está se tornando ao meu lado?",
      "O que diria pra mim se fosse a última vez que nos víssemos?",
      "Qual é a frase que resume o que sente por mim?",
      "Você me ama mais do que quando começamos?",
      "O que te faz ter certeza de que somos pra sempre?",
      "Qual é o sentimento mais forte que sente por mim agora?",
      "Você sabe que mudou minha vida?",
      "O que gostaria que eu nunca esquecesse sobre nós?",
      "Qual é a coisa mais importante que quer que eu saiba?",
      "Você sabe que é a pessoa mais especial da minha vida?",
      "O que esse amor significa para você em uma frase?",
    ],
  },
  pais: {
    title: "Com Pai/Mãe",
    emoji: "🏠",
    color: "from-amber-500 to-orange-600",
    questions: [
      "Qual foi o momento mais difícil de ser pai/mãe?",
      "O que você gostaria de ter feito diferente na minha criação?",
      "Qual foi o dia mais feliz que eu te proporcionei?",
      "O que você mais admira em mim?",
      "Qual conselho você gostaria de ter recebido na minha idade?",
      "O que te preocupa sobre o meu futuro?",
      "Quando você percebeu que eu tinha crescido?",
      "O que você gostaria que eu soubesse sobre a sua juventude?",
      "Qual foi o maior sacrifício que fez por mim?",
      "O que você espera da nossa relação daqui pra frente?",
      "O que te deu mais orgulho como pai/mãe?",
      "Qual é o seu maior arrependimento em relação a mim?",
      "Como você se sentiu quando me viu pela primeira vez?",
      "O que você gostaria que eu entendesse sobre as suas decisões?",
      "Qual é a memória favorita que tem comigo?",
      "O que te faz chorar quando pensa em mim?",
      "Qual foi o momento que mais te desafiou como pai/mãe?",
      "O que você aprendeu sendo pai/mãe que não esperava?",
      "Qual é o maior ensinamento que quer me deixar?",
      "O que te faz ter medo por mim?",
      "Qual foi a decisão mais difícil que tomou por mim?",
      "O que mudou em você depois que eu nasci?",
      "Qual é a coisa que mais sente falta da minha infância?",
      "O que te faz sentir realizado(a) como pai/mãe?",
      "Qual é a história sobre mim quando era bebê que mais gosta?",
      "O que te faz sentir que fez um bom trabalho me criando?",
      "Qual é a coisa que nunca me disse e gostaria?",
      "O que te faz querer me proteger até hoje?",
      "Qual é a lição mais importante que aprendeu com seus pais?",
      "O que te faz sentir que nossa relação está diferente agora?",
      "Qual é a coisa que mais te diverte sobre mim?",
      "O que te faz sentir que estou crescendo bem?",
      "Qual é a preocupação que nunca compartilhou comigo?",
      "O que te faz sentir orgulhoso(a) da pessoa que estou me tornando?",
      "Qual foi o momento que mais se emocionou comigo?",
      "O que gostaria de ter me ensinado mais cedo?",
      "Qual é a coisa que mais mudou na nossa relação com o tempo?",
      "O que te faz sentir que me conhece de verdade?",
      "Qual é a coisa que mais valoriza em nossa família?",
      "O que gostaria que eu fizesse mais por você?",
      "Qual é o sonho que tem para mim?",
      "O que te faz sentir que somos parecidos?",
      "Qual é a coisa que mais te surpreende sobre mim?",
      "O que gostaria de mudar na nossa comunicação?",
      "Qual é a tradição familiar que mais valoriza?",
      "O que te faz sentir amado(a) por mim?",
      "Qual é o conselho que daria pro seu eu jovem?",
      "O que te faz querer ser um pai/mãe melhor?",
      "Qual é a coisa que mais te emociona sobre nossa relação?",
      "O que espera que eu lembre de você quando for mais velho?",
      "Qual é a lição que a paternidade/maternidade te ensinou?",
      "O que te faz sentir grato(a) por me ter?",
      "Qual é a coisa mais difícil que enfrentou por mim?",
      "O que gostaria que nossa relação fosse?",
      "Qual é a coisa que mais ama em mim?",
      "O que te faz chorar de felicidade quando pensa na família?",
      "Qual é a coisa que nunca vai esquecer sobre mim?",
      "O que te faz ter esperança no meu futuro?",
      "Qual é a maior prova de amor que me deu?",
      "O que te faz sentir que somos uma família de verdade?",
      "Qual é o momento que mais te marcou como pai/mãe?",
      "O que gostaria de ter ouvido dos seus pais?",
      "Qual é a coisa que mais gostaria de viver comigo?",
      "O que te faz sentir que está fazendo a coisa certa?",
      "Qual é a mensagem que quer que eu leve para a vida?",
      "O que te faz sentir que nosso laço é forte?",
      "Qual é a coisa que mais agradece em relação a mim?",
      "O que gostaria de dizer pra mim que nunca disse?",
      "Qual é a frase que resume o que sente por mim?",
      "O que te faz ter certeza de que me ama incondicionalmente?",
      "Qual é a coisa mais bonita sobre ser pai/mãe?",
      "O que te faz sentir que sou especial?",
      "Qual é a coisa que espera que nunca mude entre nós?",
      "O que te faz sentir que está tudo bem entre nós?",
      "Qual é o sentimento mais forte que sente por mim?",
      "O que gostaria que eu soubesse sobre o seu amor por mim?",
      "Qual é a coisa mais importante que quer me ensinar?",
      "O que te faz sentir que somos mais que pai/mãe e filho(a)?",
      "Qual é a coisa que deseja para a minha vida acima de tudo?",
      "O que te faz sentir que fez a diferença na minha vida?",
      "Qual é a coisa mais simples que te faz feliz comigo?",
      "Você sabe o quanto é importante pra mim?",
      "O que diria pra mim se fosse a última coisa que pudesse dizer?",
      "Qual é o sentimento que tem quando me vê feliz?",
      "O que esse vínculo significa para você?",
    ],
  },
  irmaos: {
    title: "Com Irmão(ã)",
    emoji: "👫",
    color: "from-teal-500 to-cyan-600",
    questions: [
      "Qual é a memória de infância mais marcante que temos juntos?",
      "Você acha que nossos pais trataram a gente de forma igual?",
      "O que você admira em mim que nunca falou?",
      "Qual é a coisa mais irritante que eu faço?",
      "Se pudesse mudar algo na nossa relação, o que seria?",
      "Você sente que me conhece de verdade?",
      "Qual foi o momento que mais precisou de mim?",
      "O que você aprendeu comigo sem perceber?",
      "Qual segredo de infância você nunca contou?",
      "Como você quer que nossa relação seja quando formos mais velhos?",
      "Qual é a briga mais boba que tivemos?",
      "Você sente ciúmes de mim em alguma coisa?",
      "O que te faz rir sobre nossa infância?",
      "Qual é a coisa que mais valoriza na nossa relação?",
      "Se pudesse reviver um momento juntos, qual seria?",
      "O que te faz sentir protetor(a) em relação a mim?",
      "Qual é a coisa que mais aprendeu comigo?",
      "Você sente que somos mais amigos ou mais irmãos?",
      "O que gostaria de me dizer que nunca disse?",
      "Qual é a coisa que mais te chateia que eu faço?",
      "Você acha que somos parecidos?",
      "O que te faz orgulho de ser meu irmão/minha irmã?",
      "Qual foi o momento mais engraçado que vivemos juntos?",
      "O que te faz sentir que me entende?",
      "Qual é a coisa que gostaria que nossos pais soubessem?",
      "Se pudesse me dar um conselho, qual seria?",
      "O que te faz sentir que posso contar contigo?",
      "Qual é a tradição entre a gente que mais gosta?",
      "Você sente que nos afastamos com o tempo?",
      "O que gostaria de fazer mais comigo?",
      "Qual é a coisa que mais me admira e nunca falou?",
      "O que te faz sentir que somos diferentes?",
      "Qual é a memória mais emocionante que temos juntos?",
      "Você acha que eu te conheço de verdade?",
      "O que te faz sentir que nossa relação é especial?",
      "Qual é a coisa que gostaria de mudar em si mesmo(a)?",
      "O que te faz querer estar mais presente na minha vida?",
      "Qual é a coisa que mais sente falta da nossa infância juntos?",
      "Você me perdoa por algo que fiz no passado?",
      "O que te faz sentir que somos família de verdade?",
      "Qual é a coisa mais bonita sobre ser irmão/irmã?",
      "O que te faz ter esperança na nossa relação?",
      "Qual é a promessa que quer me fazer?",
      "Você se sente amado(a) por mim?",
      "O que gostaria que nunca mudasse entre nós?",
      "Qual é a coisa que mais te emociona sobre a gente?",
      "O que te faz sentir que estamos juntos nisso?",
      "Qual é a frase que define nossa relação?",
      "O que espera de nós como irmãos daqui pra frente?",
      "Você sabe o quanto é importante pra mim?",
    ],
  },
  avos: {
    title: "Com Avô/Avó",
    emoji: "🫶",
    color: "from-purple-500 to-violet-600",
    questions: [
      "Qual foi o melhor conselho que já recebeu na vida?",
      "Como era o amor na sua época?",
      "Qual foi o dia mais feliz da sua vida?",
      "O que você gostaria que a minha geração soubesse?",
      "Qual foi a decisão mais corajosa que já tomou?",
      "O que te dá mais orgulho na nossa família?",
      "Qual foi o maior desafio que enfrentou?",
      "O que mudou mais no mundo desde a sua juventude?",
      "Qual lição você aprendeu tarde demais?",
      "O que você deseja para o meu futuro?",
      "Como era a vida quando você tinha a minha idade?",
      "Qual foi o momento mais difícil da sua vida?",
      "O que te faz sentir mais orgulho de si mesmo(a)?",
      "Como conheceu o vô/a vó?",
      "Qual é a coisa que mais mudou no mundo desde que era jovem?",
      "O que gostaria de ter feito diferente na vida?",
      "Qual é a tradição familiar que mais valoriza?",
      "O que aprendeu sobre o amor com o tempo?",
      "Qual é a memória mais bonita da sua infância?",
      "O que te faz sentir que viveu uma boa vida?",
      "Qual é a coisa que mais te emociona quando olha para trás?",
      "O que te dava mais felicidade quando era jovem?",
      "Qual foi o trabalho que mais gostou de fazer?",
      "O que te faz sentir que a vida valeu a pena?",
      "Qual é a coisa que mais sente falta do passado?",
      "O que gostaria de ensinar para os mais novos?",
      "Qual foi a amizade mais marcante da sua vida?",
      "O que aprendeu com os seus pais que nunca esqueceu?",
      "Qual é o valor que nunca abriu mão?",
      "O que te dá forças nos dias difíceis?",
      "Qual foi a maior alegria que um neto te deu?",
      "O que te faz sentir jovem até hoje?",
      "Qual é a história de família que mais gosta de contar?",
      "O que gostaria que eu soubesse sobre perseverança?",
      "Qual é a comida que mais traz lembranças boas?",
      "O que te faz sentir que tem uma família bonita?",
      "Qual é a música que marcou sua juventude?",
      "O que aprendeu sobre amizade ao longo da vida?",
      "Qual é a coisa que mais te surpreende nos jovens de hoje?",
      "O que gostaria que eu nunca esquecesse?",
      "Qual é a maior prova de amor que já recebeu?",
      "O que te faz sentir que ainda tem muito a viver?",
      "Qual é a coisa que mais mudou em você com o tempo?",
      "O que te faz sentir grato(a) todos os dias?",
      "Qual é a coisa mais bonita que viveu?",
      "O que gostaria de dizer para os seus netos?",
      "Qual é a sabedoria que só os anos podem dar?",
      "O que te faz acreditar que o mundo pode ser melhor?",
      "Qual é a coisa que mais quer que eu leve da sua história?",
      "O que significa família para você?",
    ],
  },
  tios: {
    title: "Com Tio(a)",
    emoji: "🤗",
    color: "from-orange-500 to-red-600",
    questions: [
      "Como era o meu pai/minha mãe quando era mais novo(a)?",
      "Qual é a história mais engraçada da família que eu não conheço?",
      "O que você aprendeu com a vida que gostaria de ter sabido antes?",
      "Qual foi o momento mais marcante da sua vida?",
      "Como era a relação de vocês quando crianças?",
      "O que você acha que nossa família faz de especial?",
      "Qual foi o seu maior arrependimento?",
      "O que você deseja para os mais novos da família?",
      "Qual tradição de família você gostaria que nunca morresse?",
      "Se pudesse dar um conselho pro seu eu de 20 anos, qual seria?",
      "O que te faz sentir mais conectado(a) à família?",
      "Qual é a memória favorita que tem comigo?",
      "O que aprendeu sendo tio(a) que não esperava?",
      "Qual é a coisa que mais admira nos seus sobrinhos?",
      "O que gostaria de ter vivido que não viveu?",
      "Qual é a diferença entre ser pai/mãe e ser tio(a)?",
      "O que te faz sentir especial na família?",
      "Qual é a coisa que mais mudou na família ao longo dos anos?",
      "O que gostaria de me ensinar sobre a vida?",
      "Qual é a lição que aprendeu com os seus pais?",
      "O que te faz sentir que nossa família é unida?",
      "Qual é a aventura que gostaria de viver com os sobrinhos?",
      "O que te faz rir quando pensa na família?",
      "Qual é a coisa que mais valoriza nas reuniões de família?",
      "O que gostaria de contar sobre a sua geração?",
      "Qual é a qualidade que mais admira na família?",
      "O que te faz sentir que pertence a essa família?",
      "Qual é a coisa que mais te surpreende sobre mim?",
      "O que gostaria que nunca mudasse na família?",
      "Qual é a história que mais te emociona da nossa família?",
      "O que espera para o futuro da nossa família?",
      "Qual é a coisa mais importante que quer me dizer?",
      "O que te faz sentir grato(a) por essa família?",
      "Qual é a coisa que nunca falou para a família e gostaria?",
      "O que significa ser tio(a) para você?",
      "Qual é a coisa que mais quer que eu leve da nossa convivência?",
      "O que te faz sentir que somos família de verdade?",
      "Qual é a promessa que faz para os mais novos?",
      "O que te faz ter orgulho de ser da nossa família?",
      "Qual é a coisa mais bonita sobre ser família?",
    ],
  },
  primos: {
    title: "Com Primo(a)",
    emoji: "✌️",
    color: "from-cyan-500 to-blue-600",
    questions: [
      "Qual é a memória mais marcante que temos juntos?",
      "Você acha que somos parecidos em alguma coisa?",
      "O que você queria ser quando era criança?",
      "Qual foi o momento mais difícil da sua vida até agora?",
      "Se a gente morasse na mesma cidade, o que faria diferente?",
      "O que você aprendeu com sua família que eu posso não ter aprendido com a minha?",
      "Qual é o seu sonho mais maluco?",
      "Você sente que nossa geração está melhor ou pior que a dos nossos pais?",
      "O que te faz mais orgulho de ser da nossa família?",
      "Qual é a coisa que você mais quer na vida agora?",
      "Qual é a tradição de família que mais curtimos juntos?",
      "O que te faz rir quando pensa na nossa infância?",
      "Qual é a coisa mais doida que já fizemos juntos?",
      "Você sente que nos conhecemos de verdade?",
      "O que gostaria de fazer mais comigo?",
      "Qual é a coisa que mais admira em mim?",
      "Se pudesse voltar no tempo para um momento nosso, qual seria?",
      "O que te faz sentir que somos mais que primos?",
      "Qual é o segredo que só conta pra primo?",
      "O que te faz querer estar mais presente na família?",
      "Qual é a coisa que mais gosta nas reuniões de família?",
      "O que aprendeu com a sua parte da família?",
      "Qual é a coisa que mais nos diferencia?",
      "Você se sente à vontade comigo?",
      "O que gostaria que nossos pais soubessem sobre a gente?",
      "Qual é a coisa mais engraçada que lembramos da infância?",
      "O que te faz sentir conectado(a) a mim?",
      "Qual é o sonho que temos em comum?",
      "O que gostaria de viver comigo nos próximos anos?",
      "Qual é a coisa que mais valoriza em ser primo(a)?",
      "O que te faz sentir que nossa família é especial?",
      "Qual é a aventura que gostaria de viver comigo?",
      "O que te surpreende sobre a nossa geração?",
      "Qual é a coisa que gostaria de mudar no mundo?",
      "O que te faz sentir que pertencemos à mesma família?",
      "Qual é a qualidade que mais admira na família?",
      "O que espera para o futuro dos primos?",
      "Qual é a coisa mais bonita sobre crescer com primos?",
      "O que te faz sentir grato(a) por me ter como primo(a)?",
      "Qual é a promessa que gostaria de me fazer?",
      "O que diria pra mim que nunca disse?",
      "Qual é a coisa que nunca vai esquecer sobre a gente?",
      "O que te faz acreditar que vamos estar sempre juntos?",
      "Qual é a coisa mais importante que quer me dizer?",
      "O que significa ser primo(a) pra você?",
      "Qual é a frase que resume a nossa relação?",
      "Você sabe o quanto é especial pra mim?",
      "O que gostaria que soubéssemos sobre você?",
      "Qual é a coisa que espera da gente como família?",
      "O que te faz sentir que essa ligação vai durar pra sempre?",
    ],
  },
  familia_toda: {
    title: "Família Toda",
    emoji: "🏡",
    color: "from-yellow-500 to-amber-600",
    questions: [
      "Qual é a tradição de família que mais te marca?",
      "Se pudesse reviver um momento em família, qual seria?",
      "O que cada um aqui fez que te marcou pra sempre?",
      "Qual é o maior orgulho de ser dessa família?",
      "O que você gostaria que mudasse na nossa dinâmica?",
      "Qual é a história de família que você mais gosta de contar?",
      "O que você aprendeu com essa família que leva pra vida?",
      "Se pudesse agradecer uma coisa a cada pessoa aqui, o que seria?",
      "Qual é o valor mais importante que essa família te passou?",
      "Como você imagina as reuniões de família daqui a 20 anos?",
      "O que falta nas nossas conversas no dia a dia?",
      "Se essa família fosse um time, qual seria o superpoder de cada um?",
      "Qual é a comida que mais representa nossa família?",
      "O que te faz sentir mais em casa quando estamos juntos?",
      "Qual é a memória mais engraçada que temos juntos?",
      "O que cada um aqui faz que ninguém mais faz?",
      "Se pudesse criar uma nova tradição familiar, qual seria?",
      "O que te faz chorar quando pensa nessa família?",
      "Qual é a pessoa que mais te surpreende aqui?",
      "O que gostaria de fazer mais juntos?",
      "Qual é a coisa que mais valoriza nas reuniões?",
      "O que te faz sentir que pertence a esse grupo?",
      "Qual é a história de família que deveria ser contada para sempre?",
      "O que cada pessoa aqui te ensinou sem saber?",
      "Qual é a coisa que mais admira nessa família?",
      "O que te faz rir quando pensa na gente?",
      "Qual é a memória mais emocionante que compartilhamos?",
      "O que gostaria de dizer a cada pessoa aqui?",
      "Qual é a música que mais representa nossa família?",
      "O que te faz sentir orgulho de carregar nosso sobrenome?",
      "Qual é a coisa que mais mudou na nossa família?",
      "O que gostaria que os mais novos soubessem?",
      "Qual é a lição que essa família te deu?",
      "O que te faz sentir que somos fortes juntos?",
      "Qual é a coisa que nunca deveria mudar na nossa família?",
      "O que gostaria de agradecer a cada um aqui?",
      "Qual é a aventura que gostaria de viver em família?",
      "O que te faz sentir que essa família é única?",
      "Qual é o valor que mais quer passar para as próximas gerações?",
      "O que te faz ter esperança no futuro da família?",
      "Qual é a coisa mais bonita sobre ser dessa família?",
      "O que gostaria que cada pessoa aqui soubesse sobre você?",
      "Qual é a coisa que mais te emociona nessas reuniões?",
      "O que te faz sentir que estamos todos conectados?",
      "Qual é a promessa que faz pra essa família?",
      "O que espera que essa família seja daqui a 50 anos?",
      "Qual é a frase que define essa família?",
      "O que te faz sentir que é amado(a) por cada um aqui?",
      "Qual é a coisa mais importante que quer dizer pra todo mundo?",
      "O que te faz ter certeza de que somos família de verdade?",
      "Qual é o cheiro que mais te lembra da família?",
      "Se pudesse voltar a ser criança por um dia em família, o que faria?",
      "Qual é a receita de família que não pode se perder?",
      "O que mais te marcou numa reunião de família?",
      "Qual é o lugar que mais te lembra da família?",
      "Se pudesse jantar com qualquer familiar que já partiu, quem seria?",
      "Qual é a frase que alguém da família sempre dizia?",
      "O que te faz sentir protegido(a) por essa família?",
      "Qual é a foto de família que mais te emociona?",
      "O que mudaria na forma como nos comunicamos?",
      "Qual é a brincadeira de infância que mais sente falta?",
      "Se essa família tivesse um lema, qual seria?",
      "Qual é a viagem em família que mais te marcou?",
      "O que cada pessoa aqui representa pra você?",
      "Qual é a data mais especial do nosso calendário familiar?",
      "Se pudesse dar um presente para a família toda, qual seria?",
      "O que te faz sentir que essa família é seu porto seguro?",
      "Qual é o sacrifício que alguém da família fez que te marca até hoje?",
      "O que te faz querer estar mais presente nas reuniões?",
      "Qual é a coisa que mais te diverte quando estamos todos juntos?",
      "Se pudesse mudar algo no passado da família, o que seria?",
      "Qual é a qualidade que essa família tem e poucas famílias têm?",
      "O que te faz sentir mais conectado(a) às suas raízes?",
      "Qual é a maior lição que aprendeu observando essa família?",
      "Se pudesse escrever um livro sobre essa família, qual seria o título?",
      "O que gostaria de ensinar para os filhos sobre essa família?",
      "Qual é a coisa que mais te surpreendeu sobre alguém aqui?",
      "O que te faz sentir que essa família evoluiu com o tempo?",
      "Qual é a tradição que gostaria de começar a partir de hoje?",
      "O que cada geração trouxe de especial para essa família?",
      "Qual é a história de superação da família que mais te inspira?",
      "Se pudesse agradecer uma pessoa aqui por algo específico, o que seria?",
      "O que te faz sentir que essa família está unida mesmo na distância?",
      "Qual é a maior riqueza que essa família te deu?",
      "O que gostaria de viver com a família antes de ficar velho?",
      "Qual é a coisa que faz essa família ser diferente de todas as outras?",
      "O que te faz sentir que o amor dessa família é incondicional?",
      "Se pudesse congelar um momento em família pra sempre, qual seria?",
      "Qual é a coisa mais simples que fazemos juntos e que te faz feliz?",
      "O que gostaria de pedir desculpas à família?",
      "Qual é a memória de Natal ou festa que mais guarda no coração?",
      "O que essa família te ensinou sobre perdão?",
      "Se pudesse passar uma mensagem para todas as gerações futuras, qual seria?",
      "Qual é a coisa que mais sente falta quando está longe da família?",
      "O que te faz ter orgulho de apresentar essa família para os outros?",
      "Qual é a coisa que cada pessoa aqui faz melhor que ninguém?",
      "O que te faz sentir que podemos superar qualquer coisa juntos?",
      "Qual é a maior prova de amor que essa família já te deu?",
      "O que gostaria que a próxima reunião tivesse de diferente?",
      "Qual é a coisa que mais te emociona sobre envelhecer com essa família?",
      "Se pudesse criar um monumento para essa família, como seria?",
      "O que essa família significa quando a vida fica difícil?",
      "Qual é a coisa que mais quer proteger nessa família?",
      "O que diria pra essa família se fosse a última vez que nos víssemos?",
      "Qual é a força invisível que mantém essa família de pé?",
      "O que te faz acreditar que essa família vai estar unida pra sempre?",
      "Qual é a bênção que essa família representa na sua vida?",
    ],
  },
};

type SoloThemeId = keyof typeof SOLO_THEMES;
type RelationType = keyof typeof CONVERSATION_QUESTIONS;
type GameMode = "sozinho" | "conversa";
type ConversaType = "presencial" | "online";

function AnswerSheet({
  question,
  onClose,
  onSaved,
  onShareAnswer,
  cardIndex,
}: {
  question: string;
  onClose: () => void;
  onSaved: () => void;
  onShareAnswer?: (answer: string, cardIndex: number) => void;
  cardIndex?: number;
}) {
  const [answer, setAnswer] = useState("");
  const createEntry = useCreateEntry();
  const handleSpeechText = useCallback((text: string) => {
    setAnswer(prev => prev ? prev.trimEnd() + " " + text : text);
  }, []);
  const { isRecording, startRecording, stopRecording, supported } = useSpeechToText(handleSpeechText);

  const handleSave = async () => {
    if (!answer.trim()) return;
    const text = `**Pergunta:** ${question}\n\n**Resposta:** ${answer}`;
    try {
      await createEntry.mutateAsync({
        text,
        tags: ["perguntas", "reflexão"],
      });
      if (onShareAnswer && cardIndex !== undefined) {
        onShareAnswer(answer, cardIndex);
      }
      onSaved();
    } catch {
      // silently handled
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 z-50 flex items-end justify-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-3xl border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Sua reflexão</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground font-serif italic leading-relaxed">
            "{question}"
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Escreva ou grave sua resposta..."
            className="w-full min-h-[120px] p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
            data-testid="textarea-answer"
          />
          {isRecording && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <p className="text-xs text-red-500 font-medium">Gravando... fale agora</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          {supported && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-xl transition-colors ${
                isRecording
                  ? "bg-red-500 text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-voice-answer"
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
            >
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!answer.trim() || createEntry.isPending}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-save-answer"
          >
            <Send size={16} />
            {createEntry.isPending ? "Salvando..." : "Salvar no Diário"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardGame({
  questions,
  title,
  emoji,
  color,
  subtitle,
  onBack,
  weightedMode,
  allowAnswer,
  isFreeLimit,
}: {
  questions: string[];
  title: string;
  emoji: string;
  color: string;
  subtitle: string;
  onBack: () => void;
  weightedMode?: boolean;
  allowAnswer?: boolean;
  isFreeLimit?: boolean;
}) {
  const sessionKey = `casa-dos-20-seen-${title}`;

  const [shuffleMode, setShuffleMode] = useState(!!weightedMode);

  const [seenIndices, setSeenIndices] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(sessionKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const isShuffling = shuffleMode;

  const getNextCard = useCallback(() => {
    if (!isShuffling) return null;
    const unseen = questions.map((_, i) => i).filter(i => !seenIndices.includes(i));
    if (unseen.length > 0) {
      return unseen[Math.floor(Math.random() * unseen.length)];
    }
    return Math.floor(Math.random() * questions.length);
  }, [isShuffling, seenIndices, questions]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (isShuffling) {
      const unseen = questions.map((_, i) => i).filter(i => !seenIndices.includes(i));
      if (unseen.length > 0) return unseen[Math.floor(Math.random() * unseen.length)];
      return 0;
    }
    return 0;
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [savedCards, setSavedCards] = useState<number[]>([]);
  const [cardsPlayed, setCardsPlayed] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showSavedCards, setShowSavedCards] = useState(false);
  const [imageTheme, setImageTheme] = useState<ShareImageTheme>(() => document.documentElement.classList.contains("dark") ? "dark" : "light");
  const questionPreviewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showImagePreview && questionPreviewRef.current) {
      renderShareImageToCanvas(questionPreviewRef.current, { text: questions[currentIndex], theme: imageTheme, type: "question" });
    }
  }, [showImagePreview, imageTheme, currentIndex, questions]);

  const resetGame = () => {
    const startIndex = isShuffling ? Math.floor(Math.random() * questions.length) : 0;
    setCurrentIndex(startIndex);
    setIsFlipped(false);
    setCardsPlayed(0);
    setShowCompleted(false);
    setSavedCards([]);
    setSeenIndices([]);
    try { localStorage.removeItem(sessionKey); } catch {}
  };

  const markSeen = (idx: number) => {
    if (isShuffling && !seenIndices.includes(idx)) {
      const updated = [...seenIndices, idx];
      setSeenIndices(updated);
      localStorage.setItem(sessionKey, JSON.stringify(updated));
    }
  };

  const handleNext = () => {
    markSeen(currentIndex);
    const played = cardsPlayed + 1;
    setCardsPlayed(played);

    if (isFreeLimit && played >= questions.length) {
      setShowCompleted(true);
      return;
    }

    if (isShuffling) {
      setIsFlipped(false);
      setTimeout(() => {
        const next = getNextCard();
        if (next !== null) setCurrentIndex(next);
      }, 200);
    } else {
      if (currentIndex < questions.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex(currentIndex + 1), 200);
      } else {
        setShowCompleted(true);
      }
    }
  };

  const handleSave = () => {
    if (!savedCards.includes(currentIndex)) {
      setSavedCards([...savedCards, currentIndex]);
    }
  };

  const handleShare = () => {
    const text = `"${questions[currentIndex]}" — 365 Encontros com Deus Pai`;
    if (navigator.share) {
      navigator.share({ title: "365 Encontros com Deus Pai", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const totalForProgress = questions.length;
  const progressValue = isShuffling
    ? Math.min(seenIndices.length + 1, totalForProgress)
    : currentIndex + 1;

  if (showCompleted && isFreeLimit) {
    return <CardGamePaywall
      title={title}
      questionsCount={questions.length}
      savedCount={savedCards.length}
      onBack={onBack}
    />;
  }

  if (showCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="text-6xl mb-6">{emoji}</div>
        <h2 className="text-2xl font-serif text-foreground mb-2">Rodada Completa!</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Você explorou {questions.length} perguntas de {title}.
          {savedCards.length > 0 && ` ${savedCards.length} foram salvas.`}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {savedCards.length > 0 && (
            <button
              onClick={() => setShowSavedCards(true)}
              className="w-full p-4 border border-primary/30 bg-primary/10 text-primary rounded-2xl font-medium flex items-center justify-center gap-2"
              data-testid="button-view-saved"
            >
              <Bookmark size={18} fill="currentColor" /> Ver {savedCards.length} cartas salvas
            </button>
          )}
          <button
            onClick={resetGame}
            className="w-full p-4 bg-primary text-primary-foreground rounded-2xl font-medium flex items-center justify-center gap-2"
            data-testid="button-replay"
          >
            <RotateCcw size={18} /> Jogar Novamente
          </button>
          <button
            onClick={onBack}
            className="w-full p-4 bg-muted text-foreground rounded-2xl font-medium"
            data-testid="button-back-categories"
          >
            Voltar
          </button>
        </div>

        {/* Saved cards panel */}
        {showSavedCards && (
          <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSavedCards(false)} />
            <div className="relative w-full max-w-md bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Bookmark size={16} className="text-primary" fill="currentColor" />
                  <h3 className="font-serif text-lg text-foreground">Cartas Salvas</h3>
                  <span className="text-xs text-muted-foreground">({savedCards.length})</span>
                </div>
                <button onClick={() => setShowSavedCards(false)} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {savedCards.map((idx, i) => (
                  <div key={idx} className={`p-4 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10`}>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">{subtitle} · #{i + 1}</p>
                    <p className="font-serif text-base text-foreground leading-relaxed">{questions[idx]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="px-6 pt-20 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted" data-testid="button-back">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            {subtitle}
          </p>
          <p className="text-xs text-foreground font-medium">
            {isShuffling
              ? `${Math.min(seenIndices.filter(i => i !== currentIndex).length + 1, questions.length)} / ${questions.length} vistas`
              : `${currentIndex + 1} / ${questions.length}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {savedCards.length > 0 && (
            <button
              onClick={() => setShowSavedCards(true)}
              className="relative p-2 rounded-full bg-primary/10 text-primary transition-colors"
              data-testid="button-open-saved"
              title="Ver cartas salvas"
            >
              <Bookmark size={18} fill="currentColor" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold flex items-center justify-center px-0.5 bg-primary text-primary-foreground">
                {savedCards.length}
              </span>
            </button>
          )}
          <button
            onClick={resetGame}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-restart-game"
            title="Reiniciar jogo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              const next = !shuffleMode;
              setShuffleMode(next);
              if (!next) {
                setCurrentIndex(0);
                setIsFlipped(false);
              }
            }}
            className={`p-2 rounded-full transition-colors ${isShuffling ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            data-testid="button-toggle-shuffle"
            title={isShuffling ? "Modo Sorteio (ativo)" : "Modo Sequencial"}
          >
            {isShuffling ? <Shuffle size={20} /> : <ListOrdered size={20} />}
          </button>
        </div>
      </div>

      {isShuffling && (
        <div className="mx-6 mb-2 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Shuffle size={12} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Modo Sorteio</span>
          </div>
        </div>
      )}

      {isFreeLimit && (
        <div className="mx-6 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <Lock size={14} className="text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Modo gratuito: {questions.length} cartas de amostra. Desbloqueie todas com o plano premium.
          </p>
        </div>
      )}

      <div className="w-full px-6 mb-3">
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
            style={{ width: `${(progressValue / totalForProgress) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-6 flex flex-col items-center justify-center" style={{ minHeight: "55vh" }}>
        <div
          className="w-full max-w-sm cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => setIsFlipped(!isFlipped)}
          data-testid="card-question"
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              aspectRatio: "3/4",
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${color} shadow-2xl flex flex-col items-center justify-center p-8`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-7xl mb-6 opacity-30">{emoji}</div>
              <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-2">
                365 Encontros
              </p>
              <h3 className="text-white text-xl font-serif text-center">{title}</h3>
              <p className="text-white/50 text-xs mt-6">Toque para revelar</p>
            </div>

            <div
              className="absolute inset-0 rounded-3xl bg-background border-2 border-border shadow-2xl flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="text-3xl mb-6">{emoji}</div>
              <p className="text-foreground font-serif text-xl text-center leading-relaxed">
                "{questions[currentIndex]}"
              </p>
              <p className="text-muted-foreground text-xs mt-6 uppercase tracking-widest">
                {title}
              </p>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="flex gap-3 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {allowAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                data-testid="button-answer-card"
                title="Responder"
              >
                <PenLine size={20} />
              </button>
            )}
            <button
              onClick={handleSave}
              className={`p-3 rounded-full border transition-colors ${
                savedCards.includes(currentIndex)
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
              data-testid="button-save-card"
            >
              <Bookmark size={20} fill={savedCards.includes(currentIndex) ? "currentColor" : "none"} />
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              data-testid="button-share-card"
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={() => setShowImagePreview(true)}
              className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              data-testid="button-image-card"
              title="Gerar imagem"
            >
              <ImageIcon size={20} />
            </button>
            <button
              onClick={handleNext}
              className={`px-6 py-3 rounded-full bg-gradient-to-r ${color} text-white font-medium flex items-center gap-2 shadow-lg`}
              data-testid="button-next-card"
            >
              {isShuffling ? (
                <>Sortear <Shuffle size={16} /></>
              ) : currentIndex < questions.length - 1 ? (
                <>Próxima <ArrowRight size={16} /></>
              ) : (
                "Finalizar"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Saved Cards Panel */}
      {showSavedCards && (
        <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSavedCards(false)} />
          <div className="relative w-full max-w-md bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <Bookmark size={16} className="text-primary" fill="currentColor" />
                <h3 className="font-serif text-lg text-foreground">Cartas Salvas</h3>
                <span className="text-xs text-muted-foreground">({savedCards.length})</span>
              </div>
              <button onClick={() => setShowSavedCards(false)} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {savedCards.map((idx, i) => (
                <div key={idx} className="p-4 rounded-2xl bg-muted/50 border border-border/40">
                  <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">{subtitle} · #{i + 1}</p>
                  <p className="font-serif text-base text-foreground leading-relaxed">{questions[idx]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showImagePreview && (
        <div className="fixed inset-x-0 top-0 bottom-[64px] sm:bottom-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowImagePreview(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl p-6 pt-8 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500 max-h-full overflow-y-auto">
            <button onClick={() => setShowImagePreview(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 rounded-full">
              <X size={18} />
            </button>
            <h3 className="text-lg font-serif text-foreground mb-4">Imagem da Pergunta</h3>
            <canvas ref={questionPreviewRef} width={540} height={540} className="w-full aspect-square rounded-2xl border border-border/30 shadow-inner mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Tema</span>
              <div className="flex rounded-full border border-border overflow-hidden">
                <button onClick={() => setImageTheme("dark")} className={`px-4 py-1.5 text-xs font-medium transition-colors ${imageTheme === "dark" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  Escuro
                </button>
                <button onClick={() => setImageTheme("light")} className={`px-4 py-1.5 text-xs font-medium transition-colors ${imageTheme === "light" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  Claro
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                generateShareImage({ text: questions[currentIndex], theme: imageTheme, type: "question" });
                setShowImagePreview(false);
              }}
              className={`w-full py-3 rounded-xl font-medium transition-all bg-gradient-to-r ${color} text-white shadow-md`}
              data-testid="button-share-question-image"
            >
              <Share2 size={18} className="inline mr-2" />
              Compartilhar Imagem
            </button>
          </div>
        </div>
      )}

      {showAnswer && (
        <AnswerSheet
          question={questions[currentIndex]}
          onClose={() => setShowAnswer(false)}
          onSaved={() => setShowAnswer(false)}
        />
      )}
    </div>
  );
}

function FamilyMemberSelect({ onSelect, onBack }: { onSelect: (member: RelationType) => void; onBack: () => void }) {
  const members: { id: RelationType; icon: typeof HomeIcon; label: string; desc: string }[] = [
    { id: "pais", icon: Crown, label: "Pai / Mãe", desc: "Conversas entre gerações" },
    { id: "irmaos", icon: UserPlus, label: "Irmão(ã)", desc: "Quem cresceu com você" },
    { id: "avos", icon: Heart, label: "Avô / Avó", desc: "Sabedoria e memórias" },
    { id: "tios", icon: Users, label: "Tio(a)", desc: "Histórias e conselhos" },
    { id: "primos", icon: Sparkles, label: "Primo(a)", desc: "Mesma geração, outros caminhos" },
    { id: "familia_toda", icon: HomeIcon, label: "Família Toda", desc: "Jogo em conjunto" },
  ];

  return (
    <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-family">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-serif text-foreground">Com quem?</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha o membro ou jogue com a família toda.</p>
      </div>
      <div className="space-y-2.5">
        {members.map((m) => {
          const Icon = m.icon;
          const data = CONVERSATION_QUESTIONS[m.id];
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-colors flex items-center gap-4 text-left active:scale-[0.98]"
              data-testid={`button-family-${m.id}`}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${data.color} flex items-center justify-center shadow-sm`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{data.questions.length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RelationSelect({
  conversaType,
  onSelect,
  onBack,
}: {
  conversaType: ConversaType;
  onSelect: (relation: RelationType) => void;
  onBack: () => void;
}) {
  const [showFamily, setShowFamily] = useState(false);

  if (showFamily) {
    return <FamilyMemberSelect onSelect={onSelect} onBack={() => setShowFamily(false)} />;
  }

  const relations: { id: RelationType | "familia"; icon: typeof Users; label: string; desc: string; isGroup?: boolean }[] = [
    { id: "amigos", icon: Users, label: "Amigos", desc: "Fortaleça laços com verdade" },
    { id: "casal", icon: Heart, label: "Casal", desc: "Aprofunde a conexão a dois" },
    { id: "familia", icon: HomeIcon, label: "Família", desc: "Pai, mãe, irmão, primo, tio...", isGroup: true },
  ];

  return (
    <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-relation">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-serif text-foreground">
          {conversaType === "presencial" ? "Jogo Presencial" : "Jogo Online"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Com quem você quer conversar?</p>
      </div>
      <div className="space-y-3">
        {relations.map((r) => {
          const Icon = r.icon;
          const data = r.id !== "familia" ? CONVERSATION_QUESTIONS[r.id] : null;
          return (
            <button
              key={r.id}
              onClick={() => {
                if (r.isGroup) {
                  setShowFamily(true);
                } else {
                  onSelect(r.id as RelationType);
                }
              }}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-colors flex items-center gap-4 text-left active:scale-[0.98]"
              data-testid={`button-relation-${r.id}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${data ? data.color : "from-yellow-500 to-amber-600"} flex items-center justify-center shadow-sm`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              {data && <span className="text-xs text-muted-foreground">{data.questions.length} cartas</span>}
              {r.isGroup && <ChevronLeft size={16} className="text-muted-foreground rotate-180" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubscriptionPlanSelector({ onBack, context }: { onBack: () => void; context: "gate" | "cards" }) {
  const { monthlyPrice, yearlyPrice, checkout } = useStripeCheckout();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const { price: geo } = useGeoPrice();

  const handleSubscribe = async () => {
    const price = selectedPlan === "yearly" ? yearlyPrice : monthlyPrice;
    if (!price) return;
    setLoading(true);
    await checkout(price.price_id);
    setLoading(false);
  };

  const yearlyMonthly = yearlyPrice ? (parseFloat(yearlyPrice.unit_amount) / 100 / 12).toFixed(2).replace(".", ",") : "6,66";
  const yearlySavings = monthlyPrice && yearlyPrice
    ? Math.round(100 - (parseFloat(yearlyPrice.unit_amount) / (parseFloat(monthlyPrice.unit_amount) * 12)) * 100)
    : 33;

  return (
    <div className={`${context === "gate" ? "px-6 pt-3 pb-8 min-h-[70vh]" : "p-8 min-h-screen"} flex flex-col items-center justify-center animate-in fade-in duration-500`}>
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mb-6 shadow-lg">
        <Crown size={32} className="text-white" />
      </div>
      <h1 className="text-2xl font-serif text-foreground text-center mb-2">
        {context === "cards" ? "Suas cartas grátis acabaram!" : "Desbloqueie Tudo"}
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-[280px] leading-relaxed mb-6">
        {context === "cards"
          ? "Assine para desbloquear todas as perguntas, modos e funcionalidades."
          : "Assine para desbloquear todas as perguntas de todos os temas e modos."}
      </p>

      <div className="w-full max-w-xs space-y-3 mb-6">
        <button
          onClick={() => setSelectedPlan("yearly")}
          className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative ${
            selectedPlan === "yearly"
              ? "border-amber-500 bg-amber-500/5"
              : "border-border hover:border-amber-500/40"
          }`}
          data-testid="plan-yearly"
        >
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-bold">
            ECONOMIZE {yearlySavings}%
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{geo.yearlyFormatted}</span>
            <span className="text-sm text-muted-foreground">/ano</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{geo.yearlyMonthlyFormatted}/mês — melhor custo-benefício</p>
        </button>

        <button
          onClick={() => setSelectedPlan("monthly")}
          className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
            selectedPlan === "monthly"
              ? "border-amber-500 bg-amber-500/5"
              : "border-border hover:border-amber-500/40"
          }`}
          data-testid="plan-monthly"
        >
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground">{geo.monthlyFormatted}</span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Flexível, cancele quando quiser</p>
        </button>
      </div>

      <ul className="w-full max-w-xs space-y-2 text-sm text-foreground mb-6">
        <li className="flex items-center gap-2">
          <Check size={16} className="text-amber-600 shrink-0" />
          <span>Todas as perguntas de todos os temas</span>
        </li>
        <li className="flex items-center gap-2">
          <Check size={16} className="text-amber-600 shrink-0" />
          <span>Modos Sozinho, Conversa e Sorteio completos</span>
        </li>
        <li className="flex items-center gap-2">
          <Check size={16} className="text-amber-600 shrink-0" />
          <span>Jornadas de 30 dias e diário ilimitado</span>
        </li>
        <li className="flex items-center gap-2">
          <Check size={16} className="text-amber-600 shrink-0" />
          <span>Criar salas online e novas perguntas toda semana</span>
        </li>
      </ul>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleSubscribe}
          disabled={loading || (!monthlyPrice && !yearlyPrice)}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-medium text-sm shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
          data-testid="button-subscribe"
        >
          {loading ? "Redirecionando..." : selectedPlan === "yearly" ? `Assinar Anual — ${geo.yearlyFormatted}/ano` : `Assinar Mensal — ${geo.monthlyFormatted}/mês`}
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl bg-muted text-foreground font-medium text-sm"
          data-testid="button-back-premium"
        >
          Voltar
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-4 text-center">
        Cancele quando quiser.{geo.currency !== "BRL" ? " Valor aproximado — cobrança em BRL." : ""}
      </p>
    </div>
  );
}

function CardGamePaywall({ title, questionsCount, savedCount, onBack }: { title: string; questionsCount: number; savedCount: number; onBack: () => void }) {
  return <SubscriptionPlanSelector onBack={onBack} context="cards" />;
}

function PremiumGate({ onBack }: { onBack: () => void }) {
  return <SubscriptionPlanSelector onBack={onBack} context="gate" />;
}

function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<((msg: any) => void)[]>([]);
  const pendingRef = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/lobby`);
    ws.onopen = () => {
      setConnected(true);
      pendingRef.current.forEach(msg => ws.send(JSON.stringify(msg)));
      pendingRef.current = [];
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handlersRef.current.forEach(h => h(msg));
      } catch {}
    };
    wsRef.current = ws;
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      pendingRef.current.push(data);
      connect();
    }
  }, [connect]);

  const onMessage = useCallback((handler: (msg: any) => void) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter(h => h !== handler);
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { connect, send, onMessage, disconnect, connected };
}

interface LobbyPlayer {
  name: string;
  id: string;
  isHost: boolean;
}

function LobbyScreen({
  mode,
  relation,
  questions,
  questionData,
  onBack,
  userName,
  isPremium,
}: {
  mode: ConversaType;
  relation: RelationType;
  questions: string[];
  questionData: { title: string; emoji: string; color: string };
  onBack: () => void;
  userName: string;
  isPremium: boolean;
}) {
  const [screen, setScreen] = useState<"choice" | "create" | "join" | "waiting" | "game">("choice");
  const [lobbyCode, setLobbyCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [myId, setMyId] = useState("");
  const [error, setError] = useState("");
  const [currentTurn, setCurrentTurn] = useState("");
  const [currentTurnName, setCurrentTurnName] = useState("");
  const [currentCard, setCurrentCard] = useState(-1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [joinAlert, setJoinAlert] = useState<string | null>(null);
  const joinAlertTimer = useRef<any>(null);
  const prevPlayerCount = useRef(0);
  const [playerAnswers, setPlayerAnswers] = useState<{ playerName: string; answer: string; cardIndex: number }[]>([]);

  const { connect, send, onMessage, disconnect } = useWebSocket();

  useEffect(() => {
    connect();
    const unsub = onMessage((msg) => {
      if (msg.type === "created") {
        setLobbyCode(msg.code);
        setMyId(msg.playerId);
        setPlayers(msg.players);
        prevPlayerCount.current = msg.players.length;
        setScreen("waiting");
      }
      if (msg.type === "joined") {
        setLobbyCode(msg.code);
        setMyId(msg.playerId);
        setPlayers(msg.players);
        prevPlayerCount.current = msg.players.length;
        setScreen("waiting");
      }
      if (msg.type === "player_joined" || msg.type === "player_left") {
        if (msg.type === "player_joined" && msg.players.length > prevPlayerCount.current) {
          const newPlayer = msg.players[msg.players.length - 1];
          if (newPlayer) {
            setJoinAlert(`${newPlayer.name} entrou na sala!`);
            if (joinAlertTimer.current) clearTimeout(joinAlertTimer.current);
            joinAlertTimer.current = setTimeout(() => setJoinAlert(null), 3000);
          }
        }
        if (msg.type === "player_left" && msg.players.length < prevPlayerCount.current) {
          setJoinAlert("Um jogador saiu da sala");
          if (joinAlertTimer.current) clearTimeout(joinAlertTimer.current);
          joinAlertTimer.current = setTimeout(() => setJoinAlert(null), 3000);
        }
        prevPlayerCount.current = msg.players.length;
        setPlayers(msg.players);
      }
      if (msg.type === "game_started") {
        setPlayers(msg.players);
        setCurrentTurn(msg.currentTurn);
        setCurrentTurnName(msg.currentTurnName);
        setCurrentCard(msg.currentCard);
        setIsFlipped(false);
        setScreen("game");
      }
      if (msg.type === "new_card") {
        setCurrentTurn(msg.currentTurn);
        setCurrentTurnName(msg.currentTurnName);
        setCurrentCard(msg.currentCard);
        setIsFlipped(false);
        setPlayerAnswers([]);
      }
      if (msg.type === "player_answer") {
        setPlayerAnswers(prev => [...prev, {
          playerName: msg.playerName,
          answer: msg.answer,
          cardIndex: msg.cardIndex,
        }]);
      }
      if (msg.type === "error") {
        setError(msg.message);
      }
    });
    return () => { unsub(); disconnect(); };
  }, []);

  const handleCreate = () => {
    send({ type: "create", name: userName, mode, relation });
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    setError("");
    send({ type: "join", name: userName, code: joinCode.toUpperCase() });
  };

  const handleStart = () => {
    send({ type: "start", totalCards: questions.length });
  };

  const handleNextCard = () => {
    send({ type: "next_card", totalCards: questions.length });
  };

  const handleLeave = () => {
    send({ type: "leave" });
    disconnect();
    onBack();
  };

  const handleShareAnswer = useCallback((answer: string, cardIndex: number) => {
    send({ type: "submit_answer", answer, cardIndex });
  }, [send]);

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isHost = players.find(p => p.id === myId)?.isHost || false;
  const isMyTurn = currentTurn === myId;

  if (screen === "game") {
    const cardIndex = Math.max(0, Math.min(currentCard, questions.length - 1));

    return (
      <div className="min-h-screen bg-background pb-24 animate-in fade-in duration-500 overflow-x-hidden">
        {joinAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg animate-in slide-in-from-top-2 fade-in duration-300">
            {joinAlert}
          </div>
        )}
        <div className="px-6 pt-8 pb-4 flex items-center justify-between">
          <button onClick={handleLeave} className="p-2 -ml-2 rounded-full hover:bg-muted" data-testid="button-leave-game">
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              {mode === "online" ? "Online" : "Presencial"}
            </p>
            <div className="flex items-center gap-2 justify-center mt-0.5">
              <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs font-bold text-foreground tracking-widest">{lobbyCode}</span>
              <span className="text-xs text-muted-foreground">· {players.length} jogadores</span>
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="px-6 mb-4">
          <div className={`p-3 rounded-xl text-center ${isMyTurn ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
            <p className="text-xs text-muted-foreground mb-0.5">Vez de</p>
            <p className={`text-sm font-medium ${isMyTurn ? "text-primary" : "text-foreground"}`}>
              {isMyTurn ? "Você!" : currentTurnName}
            </p>
          </div>
        </div>

        <div className="px-6 flex flex-col items-center justify-center" style={{ minHeight: "50vh" }}>
          <div
            className="w-full max-w-sm cursor-pointer"
            style={{ perspective: "1000px" }}
            onClick={() => setIsFlipped(!isFlipped)}
            data-testid="card-lobby-question"
          >
            <div
              className="relative w-full transition-transform duration-500"
              style={{
                aspectRatio: "3/4",
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${questionData.color} shadow-2xl flex flex-col items-center justify-center p-8`}
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="text-7xl mb-6 opacity-30">{questionData.emoji}</div>
                <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-2">365 Encontros</p>
                <h3 className="text-white text-xl font-serif text-center">{questionData.title}</h3>
                <p className="text-white/50 text-xs mt-6">Toque para revelar</p>
              </div>
              <div
                className="absolute inset-0 rounded-3xl bg-background border-2 border-border shadow-2xl flex flex-col items-center justify-center p-8"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <div className="text-3xl mb-6">{questionData.emoji}</div>
                <p className="text-foreground font-serif text-xl text-center leading-relaxed">
                  "{questions[cardIndex]}"
                </p>
                <p className="text-muted-foreground text-xs mt-6 uppercase tracking-widest">
                  {questionData.title}
                </p>
              </div>
            </div>
          </div>

          {isFlipped && (
            <div className="flex gap-3 mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {mode === "online" && (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  data-testid="button-answer-lobby"
                >
                  <PenLine size={20} />
                </button>
              )}
              <button
                onClick={() => {
                  const text = `"${questions[cardIndex]}" — 365 Encontros com Deus Pai`;
                  if (navigator.share) {
                    navigator.share({ title: "365 Encontros com Deus Pai", text }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(text);
                  }
                }}
                className="p-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                data-testid="button-share-lobby"
              >
                <Share2 size={20} />
              </button>
              {(isMyTurn || isHost) && (
                <button
                  onClick={handleNextCard}
                  className={`px-6 py-3 rounded-full bg-gradient-to-r ${questionData.color} text-white font-medium flex items-center gap-2 shadow-lg`}
                  data-testid="button-next-lobby"
                >
                  Sortear <Sparkles size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-6 mt-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-hide">
            {players.map((p) => (
              <div
                key={p.id}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium shrink-0 ${
                  p.id === currentTurn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {p.name} {p.isHost ? "👑" : ""}
              </div>
            ))}
          </div>
        </div>

        {playerAnswers.length > 0 && (
          <div className="px-6 mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Respostas dos jogadores</p>
            {playerAnswers.map((pa, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/50 border border-border animate-in fade-in slide-in-from-bottom-1 duration-300">
                <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">{pa.playerName}</p>
                <p className="text-sm text-foreground leading-relaxed">{pa.answer}</p>
              </div>
            ))}
          </div>
        )}

        {showAnswer && (
          <AnswerSheet
            question={questions[cardIndex]}
            onClose={() => setShowAnswer(false)}
            onSaved={() => setShowAnswer(false)}
            onShareAnswer={handleShareAnswer}
            cardIndex={cardIndex}
          />
        )}
      </div>
    );
  }

  if (screen === "waiting") {
    return (
      <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
        {joinAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg animate-in slide-in-from-top-2 fade-in duration-300">
            {joinAlert}
          </div>
        )}
        <div>
          <button onClick={handleLeave} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-leave-lobby">
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-2xl font-serif text-foreground">Sala de Espera</h1>
          <p className="text-sm text-muted-foreground mt-1">Compartilhe o código para outros entrarem.</p>
        </div>

        <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Código da Sala</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-4xl font-mono font-bold text-foreground tracking-[0.3em]">{lobbyCode}</p>
            <button
              onClick={copyCode}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              data-testid="button-copy-code"
            >
              {copiedCode ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-muted-foreground" />}
            </button>
          </div>
          <button
            onClick={() => {
              const text = `Entre na sala ${lobbyCode} no 365 Encontros com Deus Pai para jogar comigo!`;
              if (navigator.share) {
                navigator.share({ title: "365 Encontros — Sala", text }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text);
              }
            }}
            className="text-xs text-primary font-medium flex items-center gap-1 mx-auto"
            data-testid="button-share-code"
          >
            <Share2 size={12} /> Compartilhar
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{players.length} jogador(es) na sala</p>
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground/60">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {p.name} {p.id === myId ? "(você)" : ""}
                </p>
              </div>
              {p.isHost && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Host</span>
              )}
            </div>
          ))}
        </div>

        {isHost && players.length >= 2 && (
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium text-sm shadow-lg flex items-center justify-center gap-2"
            data-testid="button-start-game"
          >
            <Sparkles size={16} /> Iniciar Jogo ({players.length} jogadores)
          </button>
        )}

        {isHost && players.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">Aguardando mais jogadores para iniciar...</p>
        )}

        {!isHost && (
          <div className="text-center py-4">
            <Loader2 size={24} className="text-muted-foreground animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Aguardando o host iniciar o jogo...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-lobby-choice">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-serif text-foreground">
          {mode === "online" ? "Jogo Online" : "Jogo Presencial"} — Lobby
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Crie uma sala ou entre com um código.</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in duration-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => {
            if (!isPremium) {
              setError("Criar salas é exclusivo do plano premium. Peça o código de um amigo premium e entre na sala dele!");
              return;
            }
            handleCreate();
          }}
          className={`w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98] ${!isPremium ? "opacity-60" : ""}`}
          data-testid="button-create-lobby"
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${questionData.color} flex items-center justify-center shadow-sm`}>
            <Crown size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Criar Sala {!isPremium && <span className="text-[10px] text-amber-600 ml-1">PREMIUM</span>}</p>
            <p className="text-xs text-muted-foreground">{isPremium ? "Você será o host e compartilha o código" : "Apenas assinantes premium podem criar salas"}</p>
          </div>
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-background text-xs text-muted-foreground">ou</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
          <p className="text-sm font-medium text-foreground">Entrar numa Sala {!isPremium && <span className="text-[10px] text-green-600 ml-1">GRÁTIS</span>}</p>
          <div className="flex gap-2 min-w-0">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código da sala"
              maxLength={5}
              className="flex-1 min-w-0 p-3 rounded-xl bg-background border border-border text-foreground text-center text-lg font-mono tracking-[0.2em] uppercase placeholder:text-muted-foreground placeholder:text-sm placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-join-code"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.length < 5}
              className="shrink-0 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
              data-testid="button-join-lobby"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversaTypeSelect({ onSelect, onBack }: { onSelect: (type: ConversaType) => void; onBack: () => void }) {
  return (
    <div className="px-6 pt-3 pb-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-conversa">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-serif text-foreground">Modo Conversa</h1>
        <p className="text-sm text-muted-foreground mt-1">Como vocês vão jogar?</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onSelect("presencial")}
          className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
          data-testid="button-conversa-presencial"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <MapPin size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Presencial</p>
            <p className="text-xs text-muted-foreground">Juntos no mesmo lugar</p>
          </div>
        </button>

        <button
          onClick={() => onSelect("online")}
          className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
          data-testid="button-conversa-online"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Wifi size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Online</p>
            <p className="text-xs text-muted-foreground">Cada um no seu celular, com lobby</p>
          </div>
        </button>
      </div>
    </div>
  );
}

const FREE_QUESTIONS_PER_THEME = 5;

function SoloThemeSelect({ onSelect, onBack, isPremium }: { onSelect: (theme: SoloThemeId) => void; onBack: () => void; isPremium: boolean }) {
  const themes = Object.entries(SOLO_THEMES) as [SoloThemeId, typeof SOLO_THEMES[SoloThemeId]][];

  return (
    <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-solo">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-2xl font-serif text-foreground">Autoconhecimento</h1>
        <p className="text-sm text-muted-foreground mt-1">Escolha um tema e mergulhe fundo.</p>
      </div>

      {!isPremium && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Modo gratuito: {FREE_QUESTIONS_PER_THEME} cartas por tema. Desbloqueie todas com o premium!
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {themes.map(([id, t]) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`p-4 rounded-2xl ${t.bg} border ${t.border} flex flex-col gap-3 text-left hover:shadow-md transition-all active:scale-95`}
            data-testid={`button-theme-${id}`}
          >
            <div className="text-2xl">{t.emoji}</div>
            <div>
              <h3 className="font-medium text-foreground text-sm">{t.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isPremium ? `${t.questions.length} cartas` : `${FREE_QUESTIONS_PER_THEME} / ${t.questions.length} cartas`}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Questions() {
  const { user } = useAuth();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [soloTheme, setSoloTheme] = useState<SoloThemeId | null>(null);
  const [conversaType, setConversaType] = useState<ConversaType | null>(null);
  const [relation, setRelation] = useState<RelationType | null>(null);
  const [showLobby, setShowLobby] = useState(false);
  const [singleDevice, setSingleDevice] = useState(false);

  const premium = user?.hasPremium ?? false;

  if (gameMode === "sozinho" && soloTheme) {
    const theme = SOLO_THEMES[soloTheme];
    const questionsToShow = premium ? theme.questions : theme.questions.slice(0, FREE_QUESTIONS_PER_THEME);
    return (
      <CardGame
        questions={questionsToShow}
        title={theme.title}
        emoji={theme.emoji}
        color={theme.color}
        subtitle="Autoconhecimento"
        onBack={() => setSoloTheme(null)}
        allowAnswer={true}
        isFreeLimit={!premium}
      />
    );
  }

  if (gameMode === "sozinho") {
    return <SoloThemeSelect onSelect={setSoloTheme} onBack={() => setGameMode(null)} isPremium={premium} />;
  }

  if (gameMode === "conversa" && conversaType && relation && singleDevice) {
    const data = CONVERSATION_QUESTIONS[relation];
    const questionsToShow = premium ? data.questions : data.questions.slice(0, FREE_QUESTIONS_PER_THEME);
    return (
      <CardGame
        questions={questionsToShow}
        title={data.title}
        emoji={data.emoji}
        color={data.color}
        subtitle={conversaType === "presencial" ? "Presencial" : "Online"}
        onBack={() => { setSingleDevice(false); setRelation(null); }}
        weightedMode={true}
        allowAnswer={true}
        isFreeLimit={!premium}
      />
    );
  }

  if (gameMode === "conversa" && conversaType && relation && showLobby) {
    const data = CONVERSATION_QUESTIONS[relation];
    const questionsToShow = premium ? data.questions : data.questions.slice(0, FREE_QUESTIONS_PER_THEME);
    return (
      <LobbyScreen
        mode={conversaType}
        relation={relation}
        questions={questionsToShow}
        questionData={{ title: data.title, emoji: data.emoji, color: data.color }}
        onBack={() => { setShowLobby(false); setRelation(null); }}
        userName={user?.name || "Jogador"}
        isPremium={premium}
      />
    );
  }

  if (gameMode === "conversa" && conversaType && relation) {
    const data = CONVERSATION_QUESTIONS[relation];

    if (!showLobby) {
      return (
        <div className="px-6 pt-3 pb-8 space-y-6 animate-in fade-in duration-500">
          <div>
            <button onClick={() => setRelation(null)} className="p-2 -ml-2 rounded-full hover:bg-muted mb-2" data-testid="button-back-play-choice">
              <ChevronLeft size={24} className="text-foreground" />
            </button>
            <h1 className="text-2xl font-serif text-foreground">{data.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">Como quer jogar?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowLobby(true)}
              className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
              data-testid="button-play-lobby"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${data.color} flex items-center justify-center shadow-sm`}>
                <Users size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Com Lobby</p>
                <p className="text-xs text-muted-foreground">
                  {conversaType === "online"
                    ? "Crie uma sala, cada um responde no app"
                    : "Crie uma sala, cada um tira carta do celular"}
                </p>
              </div>
            </button>

            <button
              onClick={() => setSingleDevice(true)}
              className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
              data-testid="button-play-single-device"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-sm">
                <MapPin size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Um Dispositivo</p>
                <p className="text-xs text-muted-foreground">Jogar no mesmo celular, sem sala</p>
              </div>
            </button>
          </div>
        </div>
      );
    }
  }

  if (gameMode === "conversa" && conversaType) {
    return (
      <RelationSelect
        conversaType={conversaType}
        onSelect={setRelation}
        onBack={() => setConversaType(null)}
      />
    );
  }

  if (gameMode === "conversa") {
    return <ConversaTypeSelect onSelect={setConversaType} onBack={() => setGameMode(null)} />;
  }

  return (
    <div className="px-6 pt-3 pb-8 flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
      <div className="text-center space-y-3 mb-12">
        <h1 className="text-3xl font-serif text-foreground">Perguntas Profundas</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
          Perguntas que aproximam pessoas e revelam verdades.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => setGameMode("sozinho")}
          className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
          data-testid="button-mode-sozinho"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <User size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-lg text-foreground">Sozinho</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {premium ? "Temas de autoconhecimento" : `${FREE_QUESTIONS_PER_THEME} cartas grátis por tema`}
            </p>
          </div>
          {!premium && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
              Grátis
            </span>
          )}
        </button>

        <button
          onClick={() => setGameMode("conversa")}
          className="w-full p-5 rounded-2xl bg-muted/50 border border-border hover:bg-muted transition-all flex items-center gap-4 text-left active:scale-[0.98]"
          data-testid="button-mode-conversa"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
            <Users size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-lg text-foreground">Modo Conversa</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {premium ? "Presencial ou online, com quem importa" : `${FREE_QUESTIONS_PER_THEME} cartas grátis por categoria`}
            </p>
          </div>
          {!premium && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
              Grátis
            </span>
          )}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-10 text-center">
        365 Encontros com Deus Pai — Jun Date
      </p>
    </div>
  );
}
